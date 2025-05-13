import { rtdb } from './firebase';
import { ref, set, onValue, off, remove, get, push } from 'firebase/database';

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
}

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private userId: string;
  private _roomId: string | null = null;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onConnectionStateChangeCallback: ((state: RTCPeerConnectionState) => void) | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  get roomId(): string | null {
    return this._roomId;
  }

  async initialize(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: video ? {
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
              'stun:stun2.l.google.com:19302'
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
          
          this.onRemoteStreamCallback(remoteStream);
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
      // Close existing connection
      if (this.peerConnection) {
        this.peerConnection.close();
      }

      // Reinitialize with the same stream
      await this.initialize(true, true);

      // Rejoin the room if we were in one
      if (this._roomId) {
        await this.joinRandomRoom();
      }
    } catch (error) {
      console.error('Error recreating peer connection:', error);
      }
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
      // Mark room as unavailable
      await set(ref(rtdb, `rooms/${roomId}/available`), false);
      await set(ref(rtdb, `rooms/${roomId}/lastActive`), Date.now());

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
      const roomRef = ref(rtdb, `rooms/${roomId}`);
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
    onValue(candidatesRef, async (snapshot) => {
      if (snapshot.exists()) {
        const candidates = snapshot.val() as { [key: string]: { [key: string]: RTCIceCandidateInit } };
        for (const [uid, uidCandidates] of Object.entries(candidates)) {
          if (uid !== this.userId) {
            for (const candidate of Object.values(uidCandidates)) {
              try {
                if (this.peerConnection!.remoteDescription) {
                  console.log('Adding ICE candidate from peer');
                  await this.peerConnection!.addIceCandidate(new RTCIceCandidate(candidate));
                } else {
                  console.log('Skipping ICE candidate - no remote description yet');
                }
        } catch (error) {
                console.error('Error adding ICE candidate:', error);
              }
            }
          }
        }
      }
    });
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
        const userStatsRef = ref(rtdb, `users/${this.userId}/stats/totalCalls`);
        const snapshot = await get(userStatsRef);
        const currentCalls = snapshot.exists() ? snapshot.val() : 0;
        await set(userStatsRef, currentCalls + 1);
      } catch (error) {
        console.error('Error cleaning up room:', error);
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

  onRemoteStream(callback: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback;
  }

  onConnectionStateChange(callback: (state: RTCPeerConnectionState) => void) {
    this.onConnectionStateChangeCallback = callback;
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
    const checkInterval = setInterval(() => {
      if (!this.peerConnection || !this._roomId) {
        clearInterval(checkInterval);
        return;
      }

      const state = this.peerConnection.connectionState;
      console.log('Connection check - State:', state);

      if (state === 'connected') {
        console.log('Connection established successfully');
        // Mark room as unavailable once connected
        set(ref(rtdb, `rooms/${this._roomId}/available`), false);
        clearInterval(checkInterval);
      } else if (state === 'failed' || state === 'closed') {
        console.log('Connection check failed, attempting recovery...');
        this.handleConnectionError();
        clearInterval(checkInterval);
      } else if (state === 'connecting') {
        // Check if the room still exists and is valid
        get(ref(rtdb, `rooms/${this._roomId}`)).then((snapshot) => {
          if (!snapshot.exists()) {
            console.log('Room no longer exists, cleaning up...');
            this.handleConnectionError();
            clearInterval(checkInterval);
          } else {
            const room = snapshot.val() as Room;
            const isStale = Date.now() - room.createdAt > 30000;
            if (isStale) {
              console.log('Connection taking too long, cleaning up...');
              this.handleConnectionTimeout();
              clearInterval(checkInterval);
            }
          }
        });
      }
    }, 2000); // Check more frequently - every 2 seconds

    // Clear interval after 30 seconds if still not connected
    setTimeout(() => {
      clearInterval(checkInterval);
      if (this.peerConnection?.connectionState === 'connecting') {
        console.log('Connection timeout after 30 seconds');
        this.handleConnectionTimeout();
      }
    }, 30000);
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
        const staleThreshold = Date.now() - 30000; // 30 seconds threshold
        
        for (const [roomId, room] of Object.entries(rooms)) {
          // A room is stale if:
          // 1. It hasn't been active recently
          // 2. It's available but old
          // 3. It has no offer/answer but is marked unavailable
          if (
            (room.lastActive && room.lastActive < staleThreshold) ||
            (room.available && room.createdAt < staleThreshold) ||
            (!room.available && !room.offer && !room.answer && room.createdAt < staleThreshold)
          ) {
            console.log('Cleaning up stale room:', roomId);
            await remove(ref(rtdb, `rooms/${roomId}`));
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up stale rooms:', error);
    }
  }
}
