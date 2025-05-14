import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import GlobalChat from '../components/GlobalChat';
import { useToast } from '@/components/ui/use-toast';
import { User, MessageCircle, Users, Hash, Crown, Sparkles, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Footer from '@/components/Footer';
import { presenceService } from '../services/presence';
import { ScrollArea } from '@/components/ui/scroll-area';
import OnlineUsers from '@/components/OnlineUsers';

interface ChatRoom {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'coming' | 'premium';
  badge?: string;
}

const Messaging = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState('global');

  const chatRooms: ChatRoom[] = [
    {
      id: 'global',
      name: 'Global Chat',
      description: 'Chat with everyone',
      icon: <Hash className="h-4 w-4" />,
      status: 'active',
      badge: 'Popular'
    },
    {
      id: 'random',
      name: 'Random Chat',
      description: 'Meet new people',
      icon: <Users className="h-4 w-4" />,
      status: 'coming'
    },
    {
      id: 'premium',
      name: 'Premium Lounge',
      description: 'Exclusive chat room',
      icon: <Crown className="h-4 w-4" />,
      status: 'premium'
    }
  ];

  useEffect(() => {
    if (currentUser) {
      presenceService.initializePresence(currentUser.uid, currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous', currentUser.email);
      presenceService.onOnlineUsersChange(setOnlineUsers);
    }
  }, [currentUser]);

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

  const renderRoomBadge = (room: ChatRoom) => {
    if (room.status === 'coming') {
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          Soon
        </Badge>
      );
    }
    if (room.status === 'premium') {
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gradient-to-r from-amber-500 to-amber-600 text-white">
          PRO
        </Badge>
      );
    }
    if (room.badge) {
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {room.badge}
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background/50 to-background">
      <Navbar />
      
      <div className="flex-1 container mx-auto px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-3"
        >
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Chat Rooms
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Connect and chat with people from around the world</p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <motion.div 
            className="md:col-span-1 space-y-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <OnlineUsers compact maxHeight={150} />
            
            <div className="h-[180px] rounded-xl bg-card/50 backdrop-blur-xl border border-border/50 shadow-xl">
              <div className="py-1.5 px-2.5 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs font-medium">
                    <MessageCircle className="mr-1 h-3.5 w-3.5" />
                    Available Rooms
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-muted-foreground">{onlineUsers} online</span>
                  </div>
                </div>
              </div>
              
              <ScrollArea className="h-[calc(100%-28px)] px-1.5 py-1">
                <div className="space-y-1">
                  {chatRooms.map((room) => (
                    <motion.div 
                      key={room.id}
                      className={cn(
                        "relative rounded-lg p-1.5",
                        selectedRoom === room.id ? "bg-accent" : "hover:bg-accent/50",
                        room.status === 'active' ? "cursor-pointer" : "cursor-not-allowed opacity-70",
                        "transition-all duration-200"
                      )}
                      onClick={() => room.status === 'active' && setSelectedRoom(room.id)}
                      whileHover={{ scale: room.status === 'active' ? 1.01 : 1 }}
                      whileTap={{ scale: room.status === 'active' ? 0.99 : 1 }}
                    >
                      <div className="relative flex items-center space-x-1.5">
                        <div className={cn(
                          "h-6 w-6 rounded-md flex items-center justify-center",
                          selectedRoom === room.id ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          {room.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="font-medium text-xs leading-none">{room.name}</p>
                            {renderRoomBadge(room)}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{room.description}</p>
                        </div>
                        {room.status === 'premium' && (
                          <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </motion.div>
          
          <motion.div 
            className="md:col-span-3 h-[calc(100vh-180px)]"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="h-full rounded-xl bg-card/50 backdrop-blur-xl border border-border/50 shadow-xl overflow-hidden">
              <GlobalChat />
            </div>
          </motion.div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Messaging;
