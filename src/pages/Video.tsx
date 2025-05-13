import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import VideoCall from '../components/VideoCall';
import Chat from '../components/Chat';
import { useToast } from '@/components/ui/use-toast';
import Footer from '@/components/Footer';

const Video = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !currentUser) {
      toast({
        title: "Authentication required",
        description: "Please login to access video calls",
        variant: "destructive",
      });
      navigate('/auth');
    }
  }, [currentUser, loading, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Video Chat</h1>
        <p className="text-muted-foreground mb-8">
          Connect with random people through video and chat
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <VideoCall onRoomChange={setActiveRoomId} />
          </div>
          
          <div className="lg:col-span-1 h-[60vh]">
            <div className="bg-card rounded-lg border border-border h-full flex flex-col">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold">
                  {activeRoomId ? 'Private Chat' : 'Waiting for connection...'}
                </h2>
              </div>
              {activeRoomId ? (
                <Chat roomId={activeRoomId} className="flex-1" />
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Connect with someone to start chatting
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Video;
