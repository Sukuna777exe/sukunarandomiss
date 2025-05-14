import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { WebRTCService } from '../services/webrtc';
import { useAuth } from '../contexts/AuthContext';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  User, 
  Phone, 
  MonitorUp, 
  MonitorOff,
  FlipHorizontal,
  CircleSlash,
  Loader2,
  UserRound,
  SignalHigh
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

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

  const toggleScreenShare = async () => {
    if (!webrtcService) return;

    try {
      if (!isScreenSharing) {
        const success = await webrtcService.startScreenShare();
        if (success) {
          setIsScreenSharing(true);
          toast({
            title: "Screen Sharing Started",
            description: "You are now sharing your screen with system audio.",
          });
        } else {
          toast({
            title: "Screen Sharing Failed",
            description: "Failed to start screen sharing. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        await webrtcService.stopScreenShare();
        setIsScreenSharing(false);
        toast({
          title: "Screen Sharing Stopped",
          description: "Screen sharing has been stopped.",
        });
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      setIsScreenSharing(false);
      toast({
        title: "Screen Sharing Error",
        description: error instanceof Error ? error.message : "Failed to toggle screen sharing. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const handleCameraSwitch = async () => {
    if (!webrtcService || isSwitchingCamera) return;

    setIsSwitchingCamera(true);
    try {
      // First check if multiple cameras are available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      if (videoDevices.length < 2) {
        toast({
          title: "Camera Switch Failed",
          description: "No additional cameras found on your device.",
          variant: "destructive",
        });
        return;
      }

      const success = await webrtcService.switchCamera();
      if (success) {
        // Update local video display
        if (localVideoRef.current && localStream) {
          await playVideo(localVideoRef.current, localStream);
        }
        toast({
          title: "Camera Switched",
          description: "Successfully switched to the other camera.",
        });
      } else {
        toast({
          title: "Camera Switch Failed",
          description: "Unable to switch camera. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error switching camera:', error);
      toast({
        title: "Camera Switch Error",
        description: "Failed to switch camera. Please check camera permissions.",
        variant: "destructive",
      });
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  // Update onRoomChange when room changes
  useEffect(() => {
    if (onRoomChange) {
      onRoomChange(isConnected ? webrtcService?.roomId || null : null);
    }
  }, [isConnected, webrtcService?.roomId, onRoomChange]);

  return (
    <div className="w-full flex flex-col items-center justify-center relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-white/[0.02] -z-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/50 to-background/80 -z-10" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" />

      {/* Main Content Container */}
      <div className="w-full space-y-6">
        {/* Connection Status */}
        {isConnected && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <SignalHigh className="w-4 h-4 text-green-500" />
            <span>Connected with Random User</span>
          </motion.div>
        )}

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Local Video */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="overflow-hidden bg-gradient-to-br from-background/80 via-background/40 to-background/80 backdrop-blur-xl rounded-3xl border border-border/20 shadow-[0_0_40px_-15px_rgba(0,0,0,0.3)] relative group">
          <div className="aspect-video w-full relative">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
                className={cn(
                    "w-full h-full object-cover rounded-3xl transition-transform duration-500 group-hover:scale-[1.01]",
                  !videoEnabled && "hidden"
                )}
            />
            {!videoEnabled && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/90 to-muted/50 backdrop-blur-xl rounded-3xl"
                  >
                  <UserRound className="h-20 w-20 text-muted-foreground/50" />
                  </motion.div>
            )}
                <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-b-3xl" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="bg-black/60 text-white px-4 py-2 rounded-full text-sm backdrop-blur-md border border-white/10">
                  You
                </div>
                <div className="flex items-center gap-2">
                  {!audioEnabled && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="bg-destructive/90 backdrop-blur-md p-2 rounded-full border border-destructive/20 shadow-lg"
                      >
                      <MicOff className="h-4 w-4" />
                      </motion.div>
                  )}
                  {!videoEnabled && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="bg-destructive/90 backdrop-blur-md p-2 rounded-full border border-destructive/20 shadow-lg"
                      >
                      <VideoOff className="h-4 w-4" />
                      </motion.div>
                    )}
                    </div>
                </div>
            </div>
          </div>
          </motion.div>

          {/* Remote Video */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="overflow-hidden bg-gradient-to-br from-background/80 via-background/40 to-background/80 backdrop-blur-xl rounded-3xl border border-border/20 shadow-[0_0_40px_-15px_rgba(0,0,0,0.3)] relative group">
          <div className="aspect-video w-full relative">
            {isConnected ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                      className="w-full h-full object-cover rounded-3xl transition-transform duration-500 group-hover:scale-[1.01]"
                    style={{ display: remoteStream ? 'block' : 'none' }}
                />
                    <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-b-3xl" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="bg-black/60 text-white px-4 py-2 rounded-full text-sm backdrop-blur-md border border-white/10">
                  Random User
                </div>
                  </div>
                  {!remoteStream && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/90 to-muted/50 backdrop-blur-xl rounded-3xl"
                      >
                      <div className="flex flex-col items-center gap-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                            <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
                          </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Waiting for remote video...
                        </p>
                      </div>
                      </motion.div>
                  )}
              </>
            ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/90 to-muted/50 backdrop-blur-xl rounded-3xl"
                  >
                {isConnecting ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                          <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
                        </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Finding someone to connect with...
                      </p>
                  </div>
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-muted-foreground/20 rounded-full blur-xl" />
                          <UserRound className="h-20 w-20 text-muted-foreground/50 relative z-10" />
                        </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Start a random call to connect with someone
                      </p>
                  </div>
                    )}
                  </motion.div>
                )}
              </div>
          </div>
          </motion.div>
      </div>

      {/* Controls */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col items-center gap-6 w-full relative z-10"
        >
          <div className="flex flex-wrap justify-center gap-3 p-4 md:p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-full shadow-lg border border-border/50 max-w-full">
        <Button
              variant={audioEnabled ? "ghost" : "destructive"}
          size="icon"
          onClick={toggleAudio}
              className={cn(
                "rounded-full transition-all duration-200 hover:scale-110",
                audioEnabled ? "hover:bg-primary/20" : "hover:bg-destructive/90"
              )}
        >
              {audioEnabled ? 
                <Mic className="h-4 w-4 md:h-5 md:w-5" /> : 
                <MicOff className="h-4 w-4 md:h-5 md:w-5" />
              }
            </Button>
            
            <Button
              variant={videoEnabled ? "ghost" : "destructive"}
              size="icon"
              onClick={toggleVideo}
              className={cn(
                "rounded-full transition-all duration-200 hover:scale-110",
                videoEnabled ? "hover:bg-primary/20" : "hover:bg-destructive/90"
              )}
            >
              {videoEnabled ? 
                <Video className="h-4 w-4 md:h-5 md:w-5" /> : 
                <VideoOff className="h-4 w-4 md:h-5 md:w-5" />
              }
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleCameraSwitch}
              disabled={!videoEnabled || isSwitchingCamera}
              className="rounded-full transition-all duration-200 hover:scale-110 hover:bg-primary/20 relative disabled:opacity-50"
            >
              <FlipHorizontal className="h-4 w-4 md:h-5 md:w-5" />
              {isSwitchingCamera && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full">
                  <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                </div>
          )}
        </Button>
        
            {isConnected && (
              <Button
                variant={isScreenSharing ? "destructive" : "ghost"}
                size="icon"
                onClick={toggleScreenShare}
                className={cn(
                  "rounded-full transition-all duration-200 hover:scale-110",
                  isScreenSharing ? "hover:bg-destructive/90" : "hover:bg-primary/20"
                )}
              >
                {isScreenSharing ? (
                  <MonitorOff className="h-4 w-4 md:h-5 md:w-5" />
                ) : (
                  <MonitorUp className="h-4 w-4 md:h-5 md:w-5" />
                )}
              </Button>
            )}
          </div>

          {isConnected ? (
          <Button
            variant="destructive"
            onClick={endCall}
              className="rounded-full transition-all duration-200 hover:scale-105 hover:bg-destructive/90 px-6 md:px-8 py-4 md:py-6 text-sm md:text-base shadow-lg"
          >
              <PhoneOff className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              End Call
          </Button>
        ) : (
          <Button
            onClick={startRandomCall}
            disabled={isConnecting}
              className="rounded-full transition-all duration-200 hover:scale-105 bg-primary hover:bg-primary/90 text-primary-foreground px-6 md:px-8 py-4 md:py-6 text-sm md:text-base shadow-lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  Start Random Call
                </>
              )}
          </Button>
        )}
        </motion.div>
      </div>
    </div>
  );
};

export default VideoCall;
