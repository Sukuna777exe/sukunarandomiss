import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import VideoCall from '../components/VideoCall';
import Chat from '../components/Chat';
import { useToast } from '@/components/ui/use-toast';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background/50 to-background">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background/50 to-background">
      <Navbar />
      
      <div className="flex-1 container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Video Chat
          </h1>
          <p className="text-muted-foreground mt-2">
          Connect with random people through video and chat
        </p>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <motion.div 
            className="lg:col-span-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <VideoCall onRoomChange={setActiveRoomId} />
          </motion.div>
          
          <motion.div 
            className="lg:col-span-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="h-[calc(100vh-220px)] rounded-2xl bg-card/50 backdrop-blur-xl border border-border/50 shadow-xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border/50 bg-background/50 backdrop-blur-sm">
                <h2 className="font-semibold flex items-center gap-2">
                  {activeRoomId ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      Private Chat
                    </>
                  ) : (
                    'Waiting for connection...'
                  )}
                </h2>
              </div>
              {activeRoomId ? (
                <Chat roomId={activeRoomId} className="flex-1" />
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground p-4 text-center">
                  <p>Start a random call to chat with someone</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Video;
