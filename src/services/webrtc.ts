import { rtdb } from './firebase';
import { ref, set, onValue, off, remove, get, push } from 'firebase/database';
import { isAdminUser } from '@/lib/utils';

interface Room {
  id?: string;
  createdBy: string;
  available: boolean;
  createdAt: number;
  lastActive?: number;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidates?: {
    [key: string]: RTCIceCandidateInit[];
  };
  participants?: {
    [key: string]: boolean;
  };
}

interface RemoteUserInfo {
  profile?: {
    displayName: string;
    bio: string;
    avatarSeed: string;
  };
  stats?: {
    level: number;
    xp: number;
    totalCalls: number;
    totalMessages: number;
  };
  roles?: {
    admin?: boolean;
    dev?: boolean;
  };
}

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private userId: string;
  private remoteUserId: string | null = null;
  private _roomId: string | null = null;
  private onRemoteStreamCallback: ((stream: MediaStream, userId: string) => void) | null = null;
  private onConnectionStateChangeCallback: ((state: RTCPeerConnectionState) => void) | null = null;
  private onRemoteUserInfoCallback: ((info: RemoteUserInfo) => void) | null = null;
  private screenSender: RTCRtpSender | null = null;
  private currentCamera: 'user' | 'environment' = 'user';

  constructor(userId: string) {
    this.userId = userId;
    this._roomId = null;
    this.localStream = null;
    this.peerConnection = null;
    this.remoteUserId = null;
    this.onRemoteStreamCallback = null;
    this.onConnectionStateChangeCallback = null;
    this.onRemoteUserInfoCallback = null;
  }

  get roomId(): string | null {
    return this._roomId;
  }

  async initialize(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
    try {
      // First check if there are multiple cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: video ? {
          facingMode: this.currentCamera,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio
      });

      const configuration: RTCConfiguration = {
        iceServers: [
          { 
            urls: [
              'stun:stun1.l.google.com:19302',
              'stun:stun2.l.google.com:19302',
              'stun:stun3.l.google.com:19302',
              'stun:stun4.l.google.com:19302'
            ]
          },
          {
            urls: [
              'turn:openrelay.metered.ca:80',
              'turn:openrelay.metered.ca:443',
              'turn:openrelay.metered.ca:443?transport=tcp'
            ],
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: [
              'turn:relay.metered.ca:80',
              'turn:relay.metered.ca:443',
              'turn:relay.metered.ca:443?transport=tcp'
            ],
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
        iceCandidatePoolSize: 15,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceTransportPolicy: 'all'
      };

      this.peerConnection = new RTCPeerConnection(configuration);

      // Add connection state monitoring
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log('Connection state changed:', state);
        
        switch (state) {
          case 'connecting':
            console.log('Connection establishing...');
            break;
          case 'connected':
            console.log('Connection established successfully');
            if (this._roomId) {
              // Update room status when connected
              set(ref(rtdb, `rooms/${this._roomId}/available`), false);
              set(ref(rtdb, `rooms/${this._roomId}/lastActive`), Date.now());
            }
            if (this.onConnectionStateChangeCallback) {
              this.onConnectionStateChangeCallback('connected');
            }
            break;
          case 'disconnected':
            console.log('Connection lost, attempting to reconnect...');
            this.peerConnection?.restartIce();
            if (this.onConnectionStateChangeCallback) {
              this.onConnectionStateChangeCallback('disconnected');
            }
            // Try to reconnect after a short delay
            setTimeout(() => {
              if (this.peerConnection?.connectionState === 'disconnected') {
                this.recreatePeerConnection();
              }
            }, 2000);
            break;
          case 'failed':
            console.log('Connection failed permanently');
            if (this.onConnectionStateChangeCallback) {
              this.onConnectionStateChangeCallback('failed');
            }
            this.handleConnectionError();
            break;
          case 'closed':
            console.log('Connection closed');
            if (this.onConnectionStateChangeCallback) {
              this.onConnectionStateChangeCallback('closed');
            }
            break;
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        const state = this.peerConnection?.iceConnectionState;
        console.log('ICE connection state changed:', state);
        
        switch (state) {
          case 'checking':
            console.log('Checking ICE connection...');
            break;
          case 'connected':
            console.log('ICE connection established');
            break;
          case 'completed':
            console.log('ICE connection completed');
            break;
          case 'failed':
            console.log('ICE connection failed, attempting to restart ICE');
            this.peerConnection?.restartIce();
            // If ICE restart doesn't work, recreate the connection
            setTimeout(() => {
              if (this.peerConnection?.iceConnectionState === 'failed') {
                this.recreatePeerConnection();
              }
            }, 2000);
            break;
          case 'disconnected':
            console.log('ICE connection disconnected, attempting to recover...');
            this.peerConnection?.restartIce();
            // Try to recover the connection
            setTimeout(() => {
              if (this.peerConnection?.iceConnectionState === 'disconnected') {
                this.recreatePeerConnection();
              }
            }, 2000);
            break;
        }
      };

      // Add tracks to the connection
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          console.log('Adding local track to peer connection:', track.kind, track.id);
          const sender = this.peerConnection.addTrack(track, this.localStream);
          console.log('Track added with sender:', sender.track?.id);
        }
      });

      // Handle remote tracks
      this.peerConnection.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind, event.track.id);
        
        // Ensure the track is enabled
        event.track.enabled = true;
        
        if (this.onRemoteStreamCallback && event.streams && event.streams[0]) {
          const remoteStream = event.streams[0];
          console.log('Remote stream received:', {
            id: remoteStream.id,
            active: remoteStream.active,
            tracks: remoteStream.getTracks().map(t => ({
              kind: t.kind,
              enabled: t.enabled,
              muted: t.muted,
              readyState: t.readyState
            }))
          });
          
          // Ensure all tracks are enabled
          remoteStream.getTracks().forEach(track => {
            track.enabled = true;
          });
          
          this.onRemoteStreamCallback(remoteStream, this.remoteUserId || '');
        }
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this._roomId) {
          console.log('New ICE candidate:', event.candidate.type, event.candidate.protocol);
          const candidateRef = ref(rtdb, `rooms/${this._roomId}/candidates/${this.userId}`);
          push(candidateRef, event.candidate.toJSON());
        } else if (!event.candidate) {
          console.log('ICE gathering completed');
      }
    };

      // Handle negotiation
      this.peerConnection.onnegotiationneeded = async () => {
        try {
          if (this._roomId && this.peerConnection?.signalingState === 'stable') {
            console.log('Negotiation needed, creating new offer');
            const offer = await this.peerConnection.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
              iceRestart: true
            });
            
            await this.peerConnection.setLocalDescription(offer);
            console.log('Local description set:', offer.type);
            
            await set(ref(rtdb, `rooms/${this._roomId}/offer`), {
              type: offer.type,
              sdp: offer.sdp
            });
          }
        } catch (error) {
          console.error('Error during negotiation:', error);
          this.handleConnectionError();
        }
      };

      return this.localStream;
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      throw error;
      }
  }

  private async recreatePeerConnection() {
    console.log('Attempting to recreate peer connection...');
    try {
      // Store current tracks before closing
      const currentTracks = this.localStream?.getTracks() || [];
      
      // Close existing connection
      if (this.peerConnection) {
        this.peerConnection.close();
      }

      // Create new peer connection with same configuration
      const configuration: RTCConfiguration = {
        iceServers: [
          { 
            urls: [
              'stun:stun1.l.google.com:19302',
              'stun:stun2.l.google.com:19302',
              'stun:stun3.l.google.com:19302',
              'stun:stun4.l.google.com:19302'
            ]
          },
          {
            urls: [
              'turn:openrelay.metered.ca:80',
              'turn:openrelay.metered.ca:443',
              'turn:openrelay.metered.ca:443?transport=tcp'
            ],
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: [
              'turn:relay.metered.ca:80',
              'turn:relay.metered.ca:443',
              'turn:relay.metered.ca:443?transport=tcp'
            ],
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
        iceCandidatePoolSize: 15,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceTransportPolicy: 'all'
      };

      this.peerConnection = new RTCPeerConnection(configuration);

      // Re-add all event listeners
      this.setupPeerConnectionListeners();

      // Re-add existing tracks
      currentTracks.forEach(track => {
        if (this.peerConnection && this.localStream) {
          console.log('Re-adding track to peer connection:', track.kind, track.id);
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Rejoin the room if we were in one
      if (this._roomId) {
        console.log('Attempting to rejoin room:', this._roomId);
        const roomRef = ref(rtdb, `rooms/${this._roomId}`);
        const snapshot = await get(roomRef);
        
        if (snapshot.exists()) {
          const room = snapshot.val() as Room;
          // Only rejoin if the room is still valid
          if (room.available || room.createdBy === this.userId) {
            await this.joinRandomRoom();
          } else {
            console.log('Room is no longer available, creating new room');
            this._roomId = null;
            await this.joinRandomRoom();
          }
        } else {
          console.log('Room no longer exists, creating new room');
          this._roomId = null;
          await this.joinRandomRoom();
        }
      }
    } catch (error) {
      console.error('Error recreating peer connection:', error);
      // If recreation fails, try one more time after a delay
      setTimeout(() => {
        if (!this.peerConnection || this.peerConnection.connectionState === 'failed') {
          console.log('Attempting one final connection recreation');
          this.initialize(true, true)
            .then(() => this.joinRandomRoom())
            .catch(e => console.error('Final recreation attempt failed:', e));
        }
      }, 2000);
    }
  }

  private setupPeerConnectionListeners() {
    if (!this.peerConnection) return;

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('Connection state changed:', state);
      
      switch (state) {
        case 'connecting':
          console.log('Connection establishing...');
          break;
        case 'connected':
          console.log('Connection established successfully');
          if (this._roomId) {
            set(ref(rtdb, `rooms/${this._roomId}/available`), false);
            set(ref(rtdb, `rooms/${this._roomId}/lastActive`), Date.now());
          }
          if (this.onConnectionStateChangeCallback) {
            this.onConnectionStateChangeCallback('connected');
          }
          break;
        case 'disconnected':
          console.log('Connection lost, attempting to reconnect...');
          if (this.peerConnection?.iceConnectionState !== 'failed') {
            this.peerConnection?.restartIce();
          }
          if (this.onConnectionStateChangeCallback) {
            this.onConnectionStateChangeCallback('disconnected');
          }
          // Try to reconnect after a short delay
          setTimeout(() => {
            if (this.peerConnection?.connectionState === 'disconnected') {
              this.recreatePeerConnection();
            }
          }, 2000);
          break;
        case 'failed':
          console.log('Connection failed permanently');
          if (this.onConnectionStateChangeCallback) {
            this.onConnectionStateChangeCallback('failed');
          }
          this.handleConnectionError();
          break;
        case 'closed':
          console.log('Connection closed');
          if (this.onConnectionStateChangeCallback) {
            this.onConnectionStateChangeCallback('closed');
          }
          break;
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('ICE connection state changed:', state);
      
      switch (state) {
        case 'checking':
          console.log('Checking ICE connection...');
          break;
        case 'connected':
          console.log('ICE connection established');
          break;
        case 'completed':
          console.log('ICE connection completed');
          break;
        case 'failed':
          console.log('ICE connection failed, attempting to restart ICE');
          this.peerConnection?.restartIce();
          // If ICE restart doesn't work, recreate the connection
          setTimeout(() => {
            if (this.peerConnection?.iceConnectionState === 'failed') {
              this.recreatePeerConnection();
            }
          }, 2000);
          break;
        case 'disconnected':
          console.log('ICE connection disconnected, attempting to recover...');
          this.peerConnection?.restartIce();
          // Try to recover the connection
          setTimeout(() => {
            if (this.peerConnection?.iceConnectionState === 'disconnected') {
              this.recreatePeerConnection();
            }
          }, 2000);
          break;
      }
    };

    // Handle remote tracks
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind, event.track.id);
      
      // Ensure the track is enabled
      event.track.enabled = true;
      
      if (this.onRemoteStreamCallback && event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        console.log('Remote stream received:', {
          id: remoteStream.id,
          active: remoteStream.active,
          tracks: remoteStream.getTracks().map(t => ({
            kind: t.kind,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState
          }))
        });
        
        // Ensure all tracks are enabled
        remoteStream.getTracks().forEach(track => {
          track.enabled = true;
        });
        
        this.onRemoteStreamCallback(remoteStream, this.remoteUserId || '');
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this._roomId) {
        console.log('New ICE candidate:', event.candidate.type, event.candidate.protocol);
        const candidateRef = ref(rtdb, `rooms/${this._roomId}/candidates/${this.userId}`);
        push(candidateRef, event.candidate.toJSON());
      } else if (!event.candidate) {
        console.log('ICE gathering completed');
      }
    };

    // Handle negotiation
    this.peerConnection.onnegotiationneeded = async () => {
      try {
        if (this._roomId && this.peerConnection?.signalingState === 'stable') {
          console.log('Negotiation needed, creating new offer');
          const offer = await this.peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
            iceRestart: true
          });
          
          await this.peerConnection.setLocalDescription(offer);
          console.log('Local description set:', offer.type);
          
          await set(ref(rtdb, `rooms/${this._roomId}/offer`), {
            type: offer.type,
            sdp: offer.sdp
          });
        }
      } catch (error) {
        console.error('Error during negotiation:', error);
        this.handleConnectionError();
      }
    };
  }

  async joinRandomRoom() {
    if (!this.peerConnection) throw new Error('WebRTC not initialized');
    
    console.log('Looking for available room...');
    try {
      // First, clean up any stale rooms
      await this.cleanupStaleRooms();
    
      // Then look for an available room
      const roomsRef = ref(rtdb, 'rooms');
      const snapshot = await get(roomsRef);
      let availableRoom: Room | null = null;

      if (snapshot.exists()) {
        const rooms = snapshot.val() as { [key: string]: Room };
        // Sort rooms by creation time to get the oldest first
        const sortedRooms = Object.entries(rooms)
          .sort(([, a], [, b]) => a.createdAt - b.createdAt)
          .map(([id, room]) => ({ ...room, id }));

        for (const room of sortedRooms) {
          if (room.available && room.createdBy !== this.userId) {
            // Verify room is still valid and try to claim it atomically
            const roomRef = ref(rtdb, `rooms/${room.id}`);
            const freshSnapshot = await get(roomRef);
            if (freshSnapshot.exists() && freshSnapshot.val().available) {
              // Try to claim the room by marking it unavailable
              await set(ref(rtdb, `rooms/${room.id}/available`), false);
              availableRoom = { ...room, id: room.id };
              break;
            }
          }
        }
      }

      if (availableRoom && availableRoom.id) {
        console.log('Joining existing room:', availableRoom.id);
        this._roomId = availableRoom.id;
        await this.joinRoom(this._roomId);
      } else {
        console.log('Creating new room...');
        const newRoomRef = push(roomsRef);
        this._roomId = newRoomRef.key!;
        
        const roomData: Room = {
      createdBy: this.userId,
          available: true,
          createdAt: Date.now(),
          lastActive: Date.now()
        };
        
        await set(ref(rtdb, `rooms/${this._roomId}`), roomData);
        console.log('Room created:', this._roomId);
    
        // Start monitoring room activity
        this.monitorRoomActivity();
        
        this.listenToJoiners();
      }

      // Start connection check
      this.startConnectionCheck();
    } catch (error) {
      console.error('Error in joinRandomRoom:', error);
      // Clean up if there was an error
      if (this._roomId) {
        await remove(ref(rtdb, `rooms/${this._roomId}`));
        this._roomId = null;
      }
      throw error;
    }
  }

  private async joinRoom(roomId: string) {
    console.log('Joining room:', roomId);
    try {
      // Get remote user ID from room data
      const roomRef = ref(rtdb, `rooms/${roomId}`);
      const roomSnapshot = await get(roomRef);
      if (roomSnapshot.exists()) {
        const roomData = roomSnapshot.val();
        console.log('Room data:', roomData);
        
        // The other user in the room is the remote user
        const remoteId = Object.keys(roomData.participants || {}).find(id => id !== this.userId) || roomData.createdBy;
        console.log('Found remote ID:', remoteId, 'current user ID:', this.userId);
        
        if (remoteId && remoteId !== this.userId) {
          this.remoteUserId = remoteId;
          console.log('Remote user ID set:', this.remoteUserId);
          
          // Set up real-time listeners for remote user info
          const remoteUserRef = ref(rtdb, `users/${remoteId}`);
          const remotePresenceRef = ref(rtdb, `presence/${remoteId}`);
          
          // Create a function to update remote user info
          const updateRemoteUserInfo = async () => {
            if (!this.onRemoteUserInfoCallback) {
              console.log('No remote user info callback set');
              return;
            }
            
            try {
              console.log('Fetching remote user info...');
              const [userSnapshot, presenceSnapshot] = await Promise.all([
                get(remoteUserRef),
                get(remotePresenceRef)
              ]);
              
              if (!userSnapshot.exists()) {
                console.log('No user data found for:', remoteId);
                return;
              }

              const userData = userSnapshot.val();
              const presenceData = presenceSnapshot.exists() ? presenceSnapshot.val() : null;
              console.log('Raw remote user data:', userData);
              console.log('Raw remote presence data:', presenceData);

              // Get the email from the correct location, prioritizing presence data
              const userEmail = presenceData?.email || userData.email;
              console.log('Remote user email:', userEmail);

              // Ensure all required fields are properly structured
              const info: RemoteUserInfo = {
                profile: {
                  displayName: userData.profile?.displayName || userData.displayName || userData.email?.split('@')[0] || 'Random User',
                  bio: userData.profile?.bio || userData.bio || '',
                  avatarSeed: userData.profile?.avatarSeed || userData.avatarSeed || remoteId
                },
                stats: {
                  level: userData.stats?.level || 1,
                  xp: userData.stats?.xp || 0,
                  totalCalls: userData.stats?.totalCalls || 0,
                  totalMessages: userData.stats?.totalMessages || 0
                },
                roles: {
                  admin: isAdminUser(userEmail),
                  dev: userEmail === "sukunadew@gmail.com"
                }
              };

              console.log('Processed remote user info:', info);
              this.onRemoteUserInfoCallback(info);
            } catch (error) {
              console.error('Error updating remote user info:', error);
            }
          };
          
          // Set up real-time listener with error handling and immediate update
          console.log('Setting up remote user info listener');
          onValue(remoteUserRef, 
            (snapshot) => {
              if (snapshot.exists()) {
                console.log('Remote user data updated, triggering info update');
                updateRemoteUserInfo();
              }
            },
            (error) => {
              console.error('Error in remote user listener:', error);
            }
          );

          // Also listen for presence changes
          onValue(remotePresenceRef,
            (snapshot) => {
              if (snapshot.exists()) {
                console.log('Remote presence data updated, triggering info update');
                updateRemoteUserInfo();
              }
            },
            (error) => {
              console.error('Error in remote presence listener:', error);
            }
          );
          
          // Initial fetch
          console.log('Performing initial remote user info fetch');
          await updateRemoteUserInfo();
        } else {
          console.log('No valid remote user ID found');
        }
      } else {
        console.log('Room does not exist:', roomId);
      }

      // Mark room as unavailable
      await set(ref(rtdb, `rooms/${roomId}/available`), false);
      await set(ref(rtdb, `rooms/${roomId}/lastActive`), Date.now());
      
      // Add participant to room
      await set(ref(rtdb, `rooms/${roomId}/participants/${this.userId}`), true);

      // Create and send offer
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: true
      });
      
      console.log('Created offer:', offer.type);
      await this.peerConnection!.setLocalDescription(offer);
      
      // Store the offer in the room
      await set(ref(rtdb, `rooms/${roomId}/offer`), {
        type: offer.type,
        sdp: offer.sdp
      });

      // Set up answer listener with timeout
      this.setupAnswerListener(roomId);
      
      // Set up ICE candidate listener
      this.setupIceCandidateListener(roomId);
      
      // Set up room cleanup
      onValue(roomRef, (snapshot) => {
        if (!snapshot.exists()) {
          console.log('Room was deleted, cleaning up connection');
          this.hangUp();
        }
      });
    } catch (error) {
      console.error('Error in joinRoom:', error);
      throw error;
    }
  }

  private setupAnswerListener(roomId: string) {
    const answerRef = ref(rtdb, `rooms/${roomId}/answer`);
    const answerTimeout = setTimeout(() => {
      console.log('No answer received within timeout, cleaning up...');
      off(answerRef);
      this.handleConnectionTimeout();
    }, 30000);

    onValue(answerRef, async (snapshot) => {
      if (snapshot.exists()) {
        clearTimeout(answerTimeout);
        const answer = snapshot.val() as RTCSessionDescriptionInit;
        console.log('Received answer:', answer.type);
        
        if (!this.peerConnection!.currentRemoteDescription && answer) {
        try {
            await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('Successfully set remote description from answer');
        } catch (error) {
            console.error('Error setting remote description from answer:', error);
            this.handleConnectionError();
          }
        }
      }
    });
  }
  
  private setupIceCandidateListener(roomId: string) {
    const candidatesRef = ref(rtdb, `rooms/${roomId}/candidates`);
    const pendingCandidates: RTCIceCandidate[] = [];

    onValue(candidatesRef, async (snapshot) => {
      if (snapshot.exists()) {
        const candidates = snapshot.val() as { [key: string]: { [key: string]: RTCIceCandidateInit } };
        
        for (const [uid, uidCandidates] of Object.entries(candidates)) {
          if (uid !== this.userId) {
            for (const candidate of Object.values(uidCandidates)) {
              try {
                const iceCandidate = new RTCIceCandidate(candidate);
                
                if (this.peerConnection?.remoteDescription) {
                  console.log('Adding ICE candidate:', {
                    type: iceCandidate.type,
                    protocol: iceCandidate.protocol,
                    address: iceCandidate.address,
                    port: iceCandidate.port
                  });
                  
                  await this.peerConnection.addIceCandidate(iceCandidate);
                } else {
                  console.log('Queuing ICE candidate - no remote description yet');
                  pendingCandidates.push(iceCandidate);
                }
        } catch (error) {
                console.error('Error handling ICE candidate:', error);
              }
            }
          }
        }
      }
    });

    // Add listener for remote description being set
    const originalSetRemoteDescription = this.peerConnection!.setRemoteDescription.bind(this.peerConnection);
    this.peerConnection!.setRemoteDescription = async (description: RTCSessionDescriptionInit) => {
      await originalSetRemoteDescription(description);
      
      // Process any pending candidates
      if (pendingCandidates.length > 0) {
        console.log(`Processing ${pendingCandidates.length} pending ICE candidates`);
        for (const candidate of pendingCandidates) {
          try {
            await this.peerConnection!.addIceCandidate(candidate);
          } catch (error) {
            console.error('Error adding pending ICE candidate:', error);
          }
        }
        pendingCandidates.length = 0; // Clear the array
      }
    };
  }
  
  private handleConnectionTimeout() {
    console.log('Connection attempt timed out');
    if (this.onConnectionStateChangeCallback) {
      this.onConnectionStateChangeCallback('failed');
    }
    this.hangUp();
  }

  private handleConnectionError() {
    console.log('Connection error occurred');
    if (this.onConnectionStateChangeCallback) {
      this.onConnectionStateChangeCallback('failed');
    }
    this.hangUp();
  }

  async hangUp() {
    console.log('Hanging up...');
    if (this._roomId) {
      try {
        // Remove room and chat data
        await Promise.all([
          remove(ref(rtdb, `rooms/${this._roomId}`)),
          remove(ref(rtdb, `chats/${this._roomId}`))
        ]);
        
        // Update user stats
        const userStatsRef = ref(rtdb, `users/${this.userId}/stats`);
        const snapshot = await get(userStatsRef);
        const currentStats = snapshot.exists() ? snapshot.val() : {
          totalCalls: 0,
          totalMessages: 0,
          level: 1,
          xp: 0,
          uniqueConnections: 0
        };

        // Calculate new XP and level
        const newXP = currentStats.xp + 10; // Add 10 XP per call
        const newLevel = Math.floor(1 + Math.sqrt(newXP / 100)); // Simple level calculation
        
        await set(userStatsRef, {
          ...currentStats,
          totalCalls: (currentStats.totalCalls || 0) + 1,
          xp: newXP,
          level: newLevel
        });

        // Log activity
        const activityRef = ref(rtdb, `users/${this.userId}/activities`);
        const newActivityRef = push(activityRef);
        await set(newActivityRef, {
          type: 'call',
          timestamp: Date.now()
        });

      } catch (error) {
        console.error('Error cleaning up room and updating stats:', error);
      }
    }

    // Cleanup WebRTC
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Remove listeners
    if (this._roomId) {
      off(ref(rtdb, `rooms/${this._roomId}`));
      off(ref(rtdb, `chats/${this._roomId}`));
      this._roomId = null;
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }
  
  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  onRemoteStream(callback: (stream: MediaStream, userId: string) => void) {
    this.onRemoteStreamCallback = callback;
  }

  onConnectionStateChange(callback: (state: RTCPeerConnectionState) => void) {
    this.onConnectionStateChangeCallback = callback;
  }

  onRemoteUserInfo(callback: (info: RemoteUserInfo) => void) {
    this.onRemoteUserInfoCallback = callback;
  }

  private listenToJoiners() {
    if (!this._roomId) return;

    console.log('Listening for joiners...');
    // Listen for offer
    const offerRef = ref(rtdb, `rooms/${this._roomId}/offer`);
    onValue(offerRef, async (snapshot) => {
      if (snapshot.exists() && !this.peerConnection!.currentRemoteDescription) {
        try {
          const offer = snapshot.val() as RTCSessionDescriptionInit;
          console.log('Received offer:', offer.type);
          await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
          console.log('Successfully set remote description from offer');
          
          // Create and send answer
          const answer = await this.peerConnection!.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          console.log('Created answer:', answer.type);
          await this.peerConnection!.setLocalDescription(answer);
          await set(ref(rtdb, `rooms/${this._roomId}/answer`), {
            type: answer.type,
            sdp: answer.sdp
          });

          // Start periodic connection check
          this.startConnectionCheck();
        } catch (error) {
          console.error('Error in listenToJoiners:', error);
          this.handleConnectionError();
        }
      }
    });

    // Also listen for ICE candidates here
    this.setupIceCandidateListener(this._roomId);

    // Set up room activity monitoring
    this.monitorRoomActivity();
  }

  private startConnectionCheck() {
    console.log('Starting connection check...');
    let connectionAttempts = 0;
    const maxAttempts = 3;

    const checkInterval = setInterval(() => {
      if (!this.peerConnection || !this._roomId) {
        console.log('No peer connection or room ID, clearing interval');
        clearInterval(checkInterval);
        return;
      }

      const state = this.peerConnection.connectionState;
      const iceState = this.peerConnection.iceConnectionState;
      const signalingState = this.peerConnection.signalingState;
      
      console.log('Connection check:', {
        connectionState: state,
        iceConnectionState: iceState,
        signalingState: signalingState,
        attempt: connectionAttempts + 1,
        hasLocalDescription: !!this.peerConnection.localDescription,
        hasRemoteDescription: !!this.peerConnection.remoteDescription,
        roomId: this._roomId
      });

      if (state === 'connected') {
        console.log('Connection established successfully');
        set(ref(rtdb, `rooms/${this._roomId}/available`), false);
        clearInterval(checkInterval);
      } else if (state === 'failed' || state === 'closed') {
        console.log('Connection failed or closed, attempting recovery...');
        this.handleConnectionError();
        clearInterval(checkInterval);
      } else if (state === 'connecting') {
        connectionAttempts++;
        
        // Check room state
        get(ref(rtdb, `rooms/${this._roomId}`)).then((snapshot) => {
          if (!snapshot.exists()) {
            console.log('Room no longer exists during connection attempt');
            this.handleConnectionError();
            clearInterval(checkInterval);
            return;
          }

          const room = snapshot.val() as Room;
          console.log('Room state during connection:', {
            hasOffer: !!room.offer,
            hasAnswer: !!room.answer,
            available: room.available,
            age: Date.now() - room.createdAt,
            participants: room.participants ? Object.keys(room.participants).length : 0,
            createdBy: room.createdBy,
            currentUserId: this.userId
          });

          // If we've tried too many times or the connection is taking too long
          if (connectionAttempts >= maxAttempts || Date.now() - room.createdAt > 20000) {
            console.log('Connection taking too long or too many attempts', {
              attempts: connectionAttempts,
              maxAttempts,
              age: Date.now() - room.createdAt
            });
            this.handleConnectionTimeout();
            clearInterval(checkInterval);
          } else if (iceState === 'failed') {
            console.log('ICE connection failed, attempting restart');
            this.peerConnection?.restartIce();
          }
        });
      }
    }, 2000);

    // Clear interval after 20 seconds if still not connected
    setTimeout(() => {
      if (this.peerConnection?.connectionState === 'connecting') {
        console.log('Connection timeout after 20 seconds');
        this.handleConnectionTimeout();
      }
      clearInterval(checkInterval);
    }, 20000);
  }

  private monitorRoomActivity() {
    if (!this._roomId) return;

    const roomRef = ref(rtdb, `rooms/${this._roomId}`);
    const activityInterval = setInterval(async () => {
      if (!this._roomId) {
        clearInterval(activityInterval);
        return;
      }

      try {
        // Update last active timestamp
        await set(ref(rtdb, `rooms/${this._roomId}/lastActive`), Date.now());

        // Check if the other peer is still active
        const snapshot = await get(roomRef);
        if (!snapshot.exists()) {
          console.log('Room no longer exists');
          clearInterval(activityInterval);
          this.handleConnectionError();
        }
      } catch (error) {
        console.error('Error monitoring room activity:', error);
      }
    }, 10000); // Check every 10 seconds

    // Clean up interval after 2 minutes if still connecting
    setTimeout(() => {
      clearInterval(activityInterval);
    }, 120000);
  }

  private async cleanupStaleRooms() {
    try {
      const roomsRef = ref(rtdb, 'rooms');
      const snapshot = await get(roomsRef);
      
      if (snapshot.exists()) {
        const rooms = snapshot.val() as { [key: string]: Room };
        const staleThreshold = Date.now() - 30000; // Increased to 30 seconds threshold
        
        for (const [roomId, room] of Object.entries(rooms)) {
          // A room is stale if any of these conditions are met:
          if (
            (room.lastActive && room.lastActive < staleThreshold) || // No activity
            (room.available && room.createdAt < staleThreshold) || // Old available room
            (!room.offer && room.createdAt < staleThreshold) || // No offer after creation
            (!room.answer && room.offer && Date.now() - room.createdAt > 40000) || // No answer after offer (increased timeout)
            (!room.available && !room.offer && !room.answer) // Invalid state
          ) {
            console.log('Cleaning up stale room:', roomId, {
              reason: 'Room is stale',
              lastActive: room.lastActive,
              createdAt: room.createdAt,
              hasOffer: !!room.offer,
              hasAnswer: !!room.answer,
              available: room.available,
              age: Date.now() - room.createdAt
            });
            await remove(ref(rtdb, `rooms/${roomId}`));
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up stale rooms:', error);
    }
  }

  async startScreenShare(): Promise<boolean> {
    try {
      if (!this.peerConnection) {
        console.error('No peer connection available');
        return false;
      }

      // Get screen sharing stream with audio capture option
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // Store original video track for later
      const originalVideoTrack = this.localStream?.getVideoTracks()[0];

      // Handle stream ending (user stops sharing)
      this.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('Screen sharing stopped by user');
        if (originalVideoTrack) {
        this.stopScreenShare();
        }
      });

      // Find the video sender
      const videoSender = this.peerConnection.getSenders().find(sender => 
        sender.track?.kind === 'video'
      );

      if (videoSender) {
        // Replace the camera track with screen sharing track
        const screenTrack = this.screenStream.getVideoTracks()[0];
        console.log('Replacing video track with screen share:', {
          trackId: screenTrack.id,
          trackLabel: screenTrack.label,
          trackEnabled: screenTrack.enabled
        });

        this.screenSender = videoSender;
        await videoSender.replaceTrack(screenTrack);

        // If there's system audio, add it to the peer connection
        const audioTrack = this.screenStream.getAudioTracks()[0];
        if (audioTrack) {
          console.log('Adding system audio track:', {
            trackId: audioTrack.id,
            trackLabel: audioTrack.label
          });
          this.peerConnection.addTrack(audioTrack, this.screenStream);
        }

        // Trigger renegotiation if needed
        if (this.peerConnection.signalingState === 'stable') {
          const offer = await this.peerConnection.createOffer();
          await this.peerConnection.setLocalDescription(offer);
          
          if (this._roomId) {
            await set(ref(rtdb, `rooms/${this._roomId}/offer`), {
              type: offer.type,
              sdp: offer.sdp
            });
          }
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error starting screen share:', error);
      // Clean up if there was an error
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop());
        this.screenStream = null;
      }
      return false;
    }
  }

  async stopScreenShare(): Promise<void> {
    try {
      if (this.screenStream) {
        console.log('Stopping screen share...');
        
        // Stop all tracks in the screen sharing stream
        this.screenStream.getTracks().forEach(track => {
          console.log('Stopping track:', {
            trackId: track.id,
            trackKind: track.kind,
            trackLabel: track.label
          });
          track.stop();
        });
        this.screenStream = null;

        // Replace screen sharing track with original camera track
        if (this.screenSender && this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
            console.log('Restoring camera track:', {
              trackId: videoTrack.id,
              trackLabel: videoTrack.label,
              trackEnabled: videoTrack.enabled
            });
            await this.screenSender.replaceTrack(videoTrack);

            // Trigger renegotiation if needed
            if (this.peerConnection?.signalingState === 'stable') {
              const offer = await this.peerConnection.createOffer();
              await this.peerConnection.setLocalDescription(offer);
              
              if (this._roomId) {
                await set(ref(rtdb, `rooms/${this._roomId}/offer`), {
                  type: offer.type,
                  sdp: offer.sdp
                });
              }
            }
          }
        }

        // Remove any system audio tracks from the peer connection
        if (this.peerConnection) {
          const senders = this.peerConnection.getSenders();
          for (const sender of senders) {
            if (sender.track?.kind === 'audio' && sender.track !== this.localStream?.getAudioTracks()[0]) {
              console.log('Removing system audio track');
              this.peerConnection.removeTrack(sender);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error stopping screen share:', error);
      throw error;
    }
  }

  async switchCamera(): Promise<boolean> {
    try {
      if (!this.peerConnection || !this.localStream) {
        console.error('No peer connection or local stream available');
        return false;
      }

      // First check if there are multiple cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      if (videoDevices.length < 2) {
        console.log('Only one camera available');
        return false;
      }

      // Toggle between front and back cameras
      this.currentCamera = this.currentCamera === 'user' ? 'environment' : 'user';

      // Stop all tracks before getting new stream
      this.localStream.getVideoTracks().forEach(track => track.stop());

      // Get new stream with the other camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: this.currentCamera },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      // Find the video sender
      const videoSender = this.peerConnection.getSenders().find(sender => 
        sender.track?.kind === 'video'
      );

      if (videoSender) {
        // Get the new video track
        const newVideoTrack = newStream.getVideoTracks()[0];
        
        if (!newVideoTrack) {
          throw new Error('No video track in new stream');
        }

        // Replace the current video track with the new camera track
        await videoSender.replaceTrack(newVideoTrack);

        // Update local stream's video track
        const oldTrack = this.localStream.getVideoTracks()[0];
        if (oldTrack) {
          this.localStream.removeTrack(oldTrack);
        }
        this.localStream.addTrack(newVideoTrack);

        // Keep the audio track from the original stream
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          newStream.addTrack(audioTrack);
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error switching camera:', error);
      // If exact facingMode fails, try without exact constraint
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: this.currentCamera,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: true
        });

        const videoSender = this.peerConnection?.getSenders().find(sender => 
          sender.track?.kind === 'video'
        );

        if (videoSender && this.localStream) {
          const newVideoTrack = newStream.getVideoTracks()[0];
          await videoSender.replaceTrack(newVideoTrack);

          // Update local stream's video track
          const oldTrack = this.localStream.getVideoTracks()[0];
          if (oldTrack) {
            oldTrack.stop();
            this.localStream.removeTrack(oldTrack);
          }
          this.localStream.addTrack(newVideoTrack);

          return true;
        }
      } catch (retryError) {
        console.error('Error in camera switch retry:', retryError);
      }
      return false;
    }
  }
}
