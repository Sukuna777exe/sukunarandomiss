import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { rtdb } from '../services/firebase';
import { ref, onValue, get } from 'firebase/database';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Sparkles, Shield, Code2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getUserRole, getSecureAvatarUrl } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface UserStats {
  level: number;
  xp: number;
  totalCalls: number;
  totalMessages: number;
}

interface OnlineUser {
  id: string;
  displayName: string;
  lastSeen: number;
  status: 'online' | 'offline';
  stats?: UserStats;
  email?: string;
  bio?: string;
  avatarSeed?: string;
}

interface OnlineUsersProps {
  className?: string;
  showHeader?: boolean;
  maxHeight?: number;
  compact?: boolean;
}

const OnlineUsers: React.FC<OnlineUsersProps> = ({ 
  className,
  showHeader = true,
  maxHeight = 120,
  compact = false
}) => {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [, setUpdateTrigger] = useState(0); // Force re-render for status updates

  const updateUserStatuses = useCallback(() => {
    setUsers(prevUsers => {
      return prevUsers.map(user => ({
        ...user,
        status: user.status
      }));
    });
  }, []);

  useEffect(() => {
    const usersRef = ref(rtdb, 'presence');
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersData = snapshot.val();

        // Create initial users list without stats
        const usersList = Object.entries(usersData).map(([id, data]: [string, any]) => ({
          id,
          displayName: data.displayName || 'Anonymous',
          lastSeen: data.lastSeen || Date.now(),
          status: data.status || 'offline',
          email: data.email,
          bio: data.bio,
          avatarSeed: data.avatarSeed
        }));

        // Update users immediately with basic info
        setUsers(usersList);

        // Fetch stats for each user
        Object.entries(usersData).forEach(async ([id]) => {
          try {
            const userStatsRef = ref(rtdb, `users/${id}/stats`);
            const statsSnapshot = await get(userStatsRef);
            
            const stats = statsSnapshot.exists() ? statsSnapshot.val() : {
              level: 1,
              xp: 0,
              totalCalls: 0,
              totalMessages: 0
            };

            // Update the specific user with their stats
            setUsers(prevUsers => {
              const updatedUsers = prevUsers.map(user => 
                user.id === id ? { ...user, stats } : user
              );
              return updatedUsers.sort((a, b) => {
                if (a.status === b.status) {
                  return a.displayName.localeCompare(b.displayName);
                }
                return a.status === 'online' ? -1 : 1;
              });
            });
          } catch (error) {
            console.error(`Error fetching stats for user ${id}:`, error);
          }
        });
      } else {
        setUsers([]);
      }
    });

    // Update statuses every 5 seconds
    const statusInterval = setInterval(() => {
      updateUserStatuses();
      setUpdateTrigger(prev => prev + 1); // Force re-render
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, [updateUserStatuses]);

  return (
    <div className={cn(
      "bg-card/50 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl",
      !compact && "h-[120px]",
      className
    )}>
      {showHeader && (
        <div className="py-1.5 px-2.5 border-b border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Online Users</span>
            <span className="text-[10px] text-muted-foreground">
              {users.filter(u => u.status === 'online').length} active
            </span>
          </div>
        </div>
      )}
      <ScrollArea className={cn(
        "px-1.5 py-1",
        !compact && "h-[84px]",
        compact && `max-h-[${maxHeight}px]`
      )}>
        <div className="space-y-1">
          {users.map((user) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex items-center justify-between px-2 py-1 rounded-md hover:bg-accent/50 transition-colors group",
                compact && "py-0.5"
              )}
            >
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "rounded-full",
                  compact ? "h-1 w-1" : "h-1.5 w-1.5",
                  user.status === 'online' 
                    ? "bg-green-500 animate-pulse" 
                    : "bg-red-500/50"
                )} />
                <div className="flex items-center gap-1">
                  <Avatar className={cn(
                    compact ? "h-5 w-5" : "h-6 w-6",
                    "border border-border",
                    getUserRole(user.email) === 'admin' && "ring-2 ring-primary/50"
                  )}>
                    <AvatarImage 
                      src={getSecureAvatarUrl(user.email, user.avatarSeed || user.id)}
                      alt={user.displayName}
                      onError={(e) => {
                        console.error('Avatar load error:', e);
                        const img = e.target as HTMLImageElement;
                        console.log('Failed URL:', img.src);
                      }}
                    />
                    <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className={cn(
                      "truncate",
                      compact ? "text-[10px]" : "text-[11px]"
                    )}>
                      {user.displayName}
                    </span>
                    {user.bio && (
                      <span className={cn(
                        "text-[9px] text-muted-foreground truncate transition-all duration-200",
                        compact ? "max-w-[100px]" : "max-w-[150px]",
                        "opacity-50 group-hover:opacity-100"
                      )}>
                        {user.bio}
                      </span>
                    )}
                  </div>
                  {getUserRole(user.email) === 'admin' && (
                    <>
                      <Badge variant="default" className="h-3 px-1 py-0 bg-primary/20 hover:bg-primary/20">
                        <Shield className="w-2 h-2 mr-0.5 text-primary" />
                        <span className="text-[8px] font-medium text-primary">ADMIN</span>
                      </Badge>
                      {user.email === "sukunadew@gmail.com" && (
                        <Badge variant="default" className="h-3 px-1 py-0 bg-blue-500/20 hover:bg-blue-500/20">
                          <Code2 className="w-2 h-2 mr-0.5 text-blue-500" />
                          <span className="text-[8px] font-medium text-blue-500">DEV</span>
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Level indicator */}
                {user.stats && (
                  <div className="flex items-center gap-1">
                    <div className="relative w-4 h-4">
                      <div className="absolute inset-0 bg-primary/10 rounded-md" />
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-primary/20 rounded-b-md transition-all duration-300 ease-out"
                        style={{ height: `${((user.stats.xp % 100) / 100) * 100}%` }}
                      />
                      <div className="absolute inset-0 rounded-md border border-primary/30 shadow-[0_0_10px_rgba(var(--primary),0.2)] backdrop-blur-sm" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-primary drop-shadow-sm">
                          {user.stats.level}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Offline time */}
                {user.status === 'offline' && (
                  <span className="text-[9px] text-muted-foreground">
                    {formatDistanceToNow(user.lastSeen, { addSuffix: true })}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default OnlineUsers; 