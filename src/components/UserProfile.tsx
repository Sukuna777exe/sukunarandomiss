import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Shield, Code2, MessageSquare, Video, Sparkles, Clock, Users } from 'lucide-react';
import { cn, getSecureAvatarUrl, getUserRole } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { rtdb } from '../services/firebase';
import { ref, onValue, off } from 'firebase/database';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    displayName: string;
    email?: string;
    bio?: string;
    avatarSeed?: string;
    lastSeen?: number;
    status?: 'online' | 'offline';
    stats?: {
      level: number;
      xp: number;
      totalMessages: number;
      totalCalls: number;
    };
  };
}

const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose, user }) => {
  const [userData, setUserData] = useState(user);
  const isUserOnline = userData.status === 'online';

  // Listen for real-time updates to user's presence data
  useEffect(() => {
    const presenceRef = ref(rtdb, `presence/${user.id}`);
    
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      if (snapshot.exists()) {
        const presenceData = snapshot.val();
        setUserData(prevData => ({
          ...prevData,
          displayName: presenceData.displayName || prevData.displayName,
          status: presenceData.status,
          lastSeen: presenceData.lastSeen,
          bio: presenceData.bio,
          avatarSeed: presenceData.avatarSeed,
          email: presenceData.email
        }));
      }
    });

    return () => {
      off(presenceRef);
    };
  }, [user.id]);

  // Listen for real-time updates to user's stats
  useEffect(() => {
    const statsRef = ref(rtdb, `users/${user.id}/stats`);
    
    const unsubscribe = onValue(statsRef, (snapshot) => {
      if (snapshot.exists()) {
        const statsData = snapshot.val();
        setUserData(prevData => ({
          ...prevData,
          stats: {
            level: statsData.level || 1,
            xp: statsData.xp || 0,
            totalMessages: statsData.totalMessages || 0,
            totalCalls: statsData.totalCalls || 0
          }
        }));
      }
    });

    return () => {
      off(statsRef);
    };
  }, [user.id]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-background/80 backdrop-blur-2xl border-border/50">
        <div className="relative">
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden rounded-lg">
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse" />
          </div>

          {/* Content */}
          <div className="relative">
            {/* Profile Header */}
            <div className="flex flex-col items-center gap-6 p-6">
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="relative"
              >
                <div className="relative group">
                  <Avatar className="h-28 w-28 border-4 border-background shadow-xl transition-transform duration-200 group-hover:scale-105">
                    <AvatarImage 
                      src={getSecureAvatarUrl(userData.email, userData.avatarSeed || userData.id)} 
                      alt={userData.displayName} 
                    />
                    <AvatarFallback>{userData.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className={cn(
                      "absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-background transition-colors duration-200",
                      isUserOnline 
                        ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse" 
                        : "bg-red-500/50"
                    )} 
                  />
                </div>

                {/* Level Badge */}
                {userData.stats && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute -top-2 -right-2 bg-primary/20 backdrop-blur-sm rounded-full p-2 border border-primary/30 shadow-[0_0_10px_rgba(var(--primary),0.2)]"
                  >
                    <Sparkles className="w-4 h-4 text-primary" />
                  </motion.div>
                )}
              </motion.div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-3 text-center"
              >
                <div className="space-y-1">
                  <AnimatePresence mode="wait">
                    <motion.h2
                      key={userData.displayName}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="text-2xl font-bold tracking-tight"
                    >
                      {userData.displayName}
                    </motion.h2>
                  </AnimatePresence>
                  {userData.email && getUserRole(userData.email) === 'admin' && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Badge variant="default" className="h-6 px-3 bg-primary/20 hover:bg-primary/20 transition-colors">
                        <Shield className="w-3 h-3 mr-1 text-primary" />
                        <span className="text-xs font-medium text-primary">ADMIN</span>
                      </Badge>
                      {userData.email === "sukunadew@gmail.com" && (
                        <Badge variant="default" className="h-6 px-3 bg-blue-500/20 hover:bg-blue-500/20 transition-colors">
                          <Code2 className="w-3 h-3 mr-1 text-blue-500" />
                          <span className="text-xs font-medium text-blue-500">DEV</span>
                        </Badge>
                      )}
                    </div>
                  )}
                  {userData.bio && (
                    <p className="text-sm text-muted-foreground mt-2 max-w-[250px] mx-auto">{userData.bio}</p>
                  )}
                </div>

                {/* Online Status */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${isUserOnline}-${userData.lastSeen}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-center justify-center gap-2 text-xs"
                  >
                    <Clock className={cn(
                      "w-3 h-3",
                      isUserOnline ? "text-green-500" : "text-muted-foreground"
                    )} />
                    {isUserOnline ? (
                      <span className="text-green-500 font-medium">Online now</span>
                    ) : (
                      <span className="text-muted-foreground">
                        Last seen {formatDistanceToNow(userData.lastSeen || Date.now(), { addSuffix: true })}
                      </span>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Stats Section */}
            {userData.stats && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="border-t border-border/50"
              >
                <div className="p-6 space-y-6">
                  {/* Level Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Level {userData.stats.level}</span>
                      <span className="text-muted-foreground">{userData.stats.xp} XP</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(userData.stats.xp % 100)}%` }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      {100 - (userData.stats.xp % 100)} XP until next level
                    </p>
                  </div>

                  {/* Activity Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="bg-muted/50 backdrop-blur-sm rounded-xl p-4 border border-border/50"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Video className="w-5 h-5 text-primary" />
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={userData.stats.totalCalls}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="text-2xl font-bold"
                          >
                            {userData.stats.totalCalls}
                          </motion.span>
                        </AnimatePresence>
                        <span className="text-xs text-muted-foreground">Video Calls</span>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.7 }}
                      className="bg-muted/50 backdrop-blur-sm rounded-xl p-4 border border-border/50"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={userData.stats.totalMessages}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="text-2xl font-bold"
                          >
                            {userData.stats.totalMessages}
                          </motion.span>
                        </AnimatePresence>
                        <span className="text-xs text-muted-foreground">Messages</span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfile; 