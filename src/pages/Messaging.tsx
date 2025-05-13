import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import Chat from '../components/Chat';
import { useToast } from '@/components/ui/use-toast';
import { User, MessageCircle, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Footer from '@/components/Footer';
import { presenceService } from '../services/presence';

const Messaging = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [onlineUsers, setOnlineUsers] = useState(0);

  // Generate a fixed room ID for the chat component
  const roomId = 'global-chat-room';

  useEffect(() => {
    if (currentUser) {
      presenceService.onOnlineUsersChange(setOnlineUsers);
    }
  }, [currentUser]);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !currentUser) {
      toast({
        title: "Authentication required",
        description: "Please login to access messaging",
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
    <div className="min-h-screen flex flex-col bg-background/95">
      <Navbar />
      
      <div className="flex-1 container mx-auto px-3 py-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-2"
        >
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Messaging
          </h1>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 h-[calc(100vh-160px)]">
          <motion.div 
            className="md:col-span-1 h-full"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="h-full bg-background/50 backdrop-blur-sm rounded-lg">
              <div className="py-2 px-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm font-semibold">
                    <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                    Chat Rooms
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <div className="online-indicator h-1.5 w-1.5" />
                    <span>{onlineUsers} online</span>
                  </div>
                </div>
              </div>
              <div className="px-2 py-1">
                <div className="space-y-1.5">
                  <motion.div 
                    className={cn(
                      "relative rounded-md p-2",
                      "bg-accent/5",
                      "transition-all duration-200",
                      "cursor-pointer group"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="relative flex items-start space-x-2">
                      <div className="relative">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                          <Users className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm mb-0.5">Global Chat</p>
                        <p className="text-[10px] text-muted-foreground">Public room</p>
                      </div>
                      <div className="online-indicator mt-1.5" />
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className={cn(
                      "rounded-md p-2",
                      "bg-muted/50",
                      "cursor-not-allowed",
                      "relative overflow-hidden"
                    )}
                  >
                    <div className="relative flex items-center space-x-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-muted-foreground">Random Chat</p>
                        <p className="text-[10px] text-muted-foreground">Coming soon</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="md:col-span-3 h-full"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="h-full flex flex-col bg-background/50 backdrop-blur-sm rounded-lg">
              <div className="border-b border-border/50 py-2 px-3">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">Global Chat Room</h3>
                      <p className="text-[10px] text-muted-foreground">Chat with everyone</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex-1">
                <Chat roomId={roomId} className="h-full" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Messaging;
