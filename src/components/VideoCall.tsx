import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WebRTCService } from '../services/webrtc';
import { useAuth } from '../contexts/AuthContext';
import { Mic, MicOff, Video, VideoOff, PhoneOff, User, Phone, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ref, push, onValue, off } from 'firebase/database';
import { rtdb } from '../services/firebase';

interface Message {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
  senderName: string;
}

interface VideoCallProps {
  onRoomChange?: (roomId: string | null) => void;
}

const VideoCall: React.FC<VideoCallProps> = ({ onRoomChange }) => {
  const { currentUser } = useAuth();
  const [webrtcService, setWebrtcService] = useState<WebRTCService | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const playVideo = async (videoElement: HTMLVideoElement, stream: MediaStream) => {
    try {
      console.log('Attempting to play video stream:', {
        streamId: stream.id,
        tracks: stream.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState
        }))
      });

      // Clear any existing srcObject
      if (videoElement.srcObject) {
        videoElement.srcObject = null;
      }

      videoElement.srcObject = stream;
      videoElement.muted = videoElement === localVideoRef.current;
      videoElement.volume = videoElement === localVideoRef.current ? 0 : 1;

      // Ensure video is visible
      videoElement.style.display = 'block';
      
      await videoElement.play();
      console.log('Successfully playing video stream:', stream.id);
      
      // Double check track states after play
      stream.getTracks().forEach(track => {
        if (track.kind === 'video' && !track.enabled) {
          console.log('Enabling video track after play:', track.id);
          track.enabled = true;
        }
      });
    } catch (error) {
      console.error('Error playing video:', error);
      // Try playing again after a short delay
      setTimeout(async () => {
        try {
          await videoElement.play();
          console.log('Successfully playing video stream after retry:', stream.id);
        } catch (retryError) {
          console.error('Error playing video after retry:', retryError);
          toast({
            title: "Video Playback Error",
            description: "Failed to play remote video. Please try refreshing.",
            variant: "destructive",
          });
        }
      }, 1000);
    }
  };

  // Initialize WebRTC on component mount
  useEffect(() => {
    if (!currentUser) return;
    
    const initWebRTC = async () => {
      try {
        const service = new WebRTCService(currentUser.uid);
        setWebrtcService(service);
        
        // Set up callbacks
        service.onRemoteStream((stream) => {
          console.log('Received remote stream:', stream);
          setRemoteStream(stream);
          if (remoteVideoRef.current) {
            playVideo(remoteVideoRef.current, stream);
          }
          setIsConnected(true);
          setIsConnecting(false);
          toast({
            title: "Connected!",
            description: "You're now connected to a random user.",
          });
        });
        
        service.onConnectionStateChange((state) => {
          console.log('Connection state changed:', state);
          if (state === 'disconnected' || state === 'failed' || state === 'closed') {
            setIsConnected(false);
            setRemoteStream(null);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
            toast({
              title: "Disconnected",
              description: "The call has ended.",
            });
          }
        });
        
        // Initialize local stream
        const stream = await service.initialize(true, true);
        console.log('Local stream initialized:', stream);
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          playVideo(localVideoRef.current, stream);
        }
      } catch (error) {
        console.error('Error initializing WebRTC:', error);
        toast({
          title: "Error",
          description: "Failed to access camera and microphone. Please allow permissions.",
          variant: "destructive",
        });
      }
    };
    
    initWebRTC();
    
    // Cleanup on unmount
    return () => {
      if (webrtcService) {
        webrtcService.hangUp();
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [currentUser, toast]);

  // Effect to handle remote video element when stream changes
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      console.log('Setting up remote video stream:', {
        streamId: remoteStream.id,
        tracks: remoteStream.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState
        }))
      });

      // Ensure all video tracks are enabled
      remoteStream.getVideoTracks().forEach(track => {
        if (!track.enabled) {
          console.log('Enabling remote video track:', track.id);
          track.enabled = true;
        }
      });

      // Ensure audio tracks are enabled
      remoteStream.getAudioTracks().forEach(track => {
        if (!track.enabled) {
          console.log('Enabling remote audio track:', track.id);
          track.enabled = true;
        }
      });

      playVideo(remoteVideoRef.current, remoteStream);
    }
  }, [remoteStream]);

  // Add monitoring for video element state changes
  useEffect(() => {
    const remoteVideo = remoteVideoRef.current;
    if (!remoteVideo) return;

    const handleLoadedMetadata = () => {
      console.log('Remote video loadedmetadata:', {
        videoWidth: remoteVideo.videoWidth,
        videoHeight: remoteVideo.videoHeight,
        readyState: remoteVideo.readyState
      });
    };

    const handlePlaying = () => {
      console.log('Remote video playing event fired');
    };

    remoteVideo.addEventListener('loadedmetadata', handleLoadedMetadata);
    remoteVideo.addEventListener('playing', handlePlaying);

    return () => {
      remoteVideo.removeEventListener('loadedmetadata', handleLoadedMetadata);
      remoteVideo.removeEventListener('playing', handlePlaying);
    };
  }, []);

  const startRandomCall = async () => {
    if (!webrtcService) return;
    
    setIsConnecting(true);
    try {
      await webrtcService.joinRandomRoom();
      toast({
        title: "Searching",
        description: "Looking for someone to chat with...",
      });
    } catch (error) {
      console.error('Error starting random call:', error);
      setIsConnecting(false);
      toast({
        title: "Error",
        description: "Failed to start random call. Please try again.",
        variant: "destructive",
      });
    }
  };

  const endCall = async () => {
    if (!webrtcService) return;
    
    try {
      await webrtcService.hangUp();
      setIsConnected(false);
      setIsConnecting(false);
      setRemoteStream(null);
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      
      // Reinitialize local stream
      const service = new WebRTCService(currentUser!.uid);
      setWebrtcService(service);
      
      service.onRemoteStream((stream) => {
        console.log('Received remote stream after reinitialization:', stream);
        setRemoteStream(stream);
        if (remoteVideoRef.current) {
          playVideo(remoteVideoRef.current, stream);
        }
        setIsConnected(true);
        setIsConnecting(false);
      });
      
      const stream = await service.initialize(videoEnabled, audioEnabled);
      console.log('Local stream reinitialized:', stream);
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        playVideo(localVideoRef.current, stream);
      }
      
      toast({
        title: "Call ended",
        description: "You've disconnected from the call.",
      });
    } catch (error) {
      console.error('Error ending call:', error);
      toast({
        title: "Error",
        description: "Failed to end call properly.",
        variant: "destructive",
      });
    }
  };

  const toggleAudio = () => {
    if (webrtcService && localStream) {
      const newState = !audioEnabled;
      webrtcService.toggleAudio(newState);
      setAudioEnabled(newState);
    }
  };

  const toggleVideo = () => {
    if (webrtcService && localStream) {
      const newState = !videoEnabled;
      webrtcService.toggleVideo(newState);
      setVideoEnabled(newState);
    }
  };

  // Update onRoomChange when room changes
  useEffect(() => {
    if (onRoomChange) {
      onRoomChange(isConnected ? webrtcService?.roomId || null : null);
    }
  }, [isConnected, webrtcService?.roomId, onRoomChange]);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-5xl mb-4">
        {/* Local video */}
        <Card className="overflow-hidden bg-black/10 relative">
          <div className="aspect-video w-full relative">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${!videoEnabled ? 'hidden' : ''}`}
            />
            {!videoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <User className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 text-xs rounded">
              You
            </div>
          </div>
        </Card>

        {/* Remote video */}
        <Card className="overflow-hidden bg-black/10 relative">
          <div className="aspect-video w-full relative">
            {isConnected ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ display: remoteStream ? 'block' : 'none' }}
                />
                <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 text-xs rounded">
                  Random User
                </div>
                {!remoteStream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 border-4 border-primary rounded-full animate-spin border-t-transparent mb-2"></div>
                      <p className="text-sm text-muted-foreground">Waiting for remote video...</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                {isConnecting ? (
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-primary rounded-full animate-spin border-t-transparent mb-2"></div>
                    <p className="text-sm text-muted-foreground">Finding someone...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <User className="h-16 w-16 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click "Start Random Call" to begin</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-8">
        <Button
          variant={audioEnabled ? "default" : "destructive"}
          size="icon"
          onClick={toggleAudio}
        >
          {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
        
        <Button
          variant={videoEnabled ? "default" : "destructive"}
          size="icon"
          onClick={toggleVideo}
        >
          {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>
        
        {isConnected ? (
          <Button
            variant="destructive"
            onClick={endCall}
          >
            <PhoneOff className="h-4 w-4 mr-2" />
            End Call
          </Button>
        ) : (
          <Button
            onClick={startRandomCall}
            disabled={isConnecting}
          >
            <Phone className="h-4 w-4 mr-2" />
            {isConnecting ? 'Connecting...' : 'Start Random Call'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
