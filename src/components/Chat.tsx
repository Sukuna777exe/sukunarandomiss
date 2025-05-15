import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../services/firebase';
import { ref, push, set, onValue, off, get } from 'firebase/database';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Shield, Code2, Loader2, MessageSquare, Video, Send } from 'lucide-react';
import { cn, getSecureAvatarUrl, getUserRole } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import UserProfile from './UserProfile';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
}

interface ChatProps {
  roomId: string;
  className?: string;
}

interface UserPresence {
  displayName: string;
  lastSeen: number;
  status: 'online' | 'offline';
  email?: string;
  bio?: string;
  avatarSeed?: string;
  stats?: {
    level: number;
    xp: number;
    totalCalls: number;
    totalMessages: number;
    uniqueConnections: number;
  };
}

interface UserTyping {
  name: string;
  timestamp: number;
}

interface MessageStats {
  totalCalls: number;
  totalMessages: number;
}

const Chat: React.FC<ChatProps> = ({ roomId, className }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [userPresence, setUserPresence] = useState<Record<string, UserPresence>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, UserTyping>>({});
  const [messageStats, setMessageStats] = useState<Record<string, MessageStats>>({});
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [selectedUser, setSelectedUser] = useState<{
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
  } | null>(null);

  // Load messages
  useEffect(() => {
    if (!roomId) return;

    const messagesRef = ref(rtdb, `chats/${roomId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const messagesData = snapshot.val();
        const messagesList = Object.entries(messagesData).map(([id, data]: [string, any]) => ({
          id,
          ...data
        }));
        setMessages(messagesList.sort((a, b) => a.timestamp - b.timestamp));

        if (shouldAutoScroll) {
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
        }
      }
    });

    return () => off(messagesRef);
  }, [roomId, shouldAutoScroll]);

  // Track user presence and stats
  useEffect(() => {
    if (!currentUser) return;

    const presenceRef = ref(rtdb, 'presence');
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      if (snapshot.exists()) {
        const presenceData = snapshot.val();
        // Fetch stats for each user
        const userPromises = Object.keys(presenceData).map(async (uid) => {
          const statsRef = ref(rtdb, `users/${uid}/stats`);
          const statsSnapshot = await get(statsRef);
          if (statsSnapshot.exists()) {
            presenceData[uid].stats = statsSnapshot.val();
          }
        });
        Promise.all(userPromises).then(() => {
          setUserPresence(presenceData);
        });
      }
    });

    // Initialize current user's presence with stats
    const userPresenceRef = ref(rtdb, `presence/${currentUser.uid}`);
    const userStatsRef = ref(rtdb, `users/${currentUser.uid}/stats`);
    
    Promise.all([
      get(userStatsRef),
      get(ref(rtdb, `users/${currentUser.uid}/profile`))
    ]).then(([statsSnapshot, profileSnapshot]) => {
      const stats = statsSnapshot.exists() ? statsSnapshot.val() : {
        level: 1,
        xp: 0,
        totalCalls: 0,
        totalMessages: 0,
        uniqueConnections: 0
      };
      
      const profile = profileSnapshot.exists() ? profileSnapshot.val() : {};
      
      set(userPresenceRef, {
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
        email: currentUser.email,
        lastSeen: Date.now(),
        status: 'online',
        bio: profile.bio || '',
        avatarSeed: profile.avatarSeed || currentUser.uid,
        stats
      });
    });

    // Update lastSeen and stats every 30 seconds
    const interval = setInterval(async () => {
      const statsSnapshot = await get(userStatsRef);
      const stats = statsSnapshot.exists() ? statsSnapshot.val() : {
        level: 1,
        xp: 0,
        totalCalls: 0,
        totalMessages: 0,
        uniqueConnections: 0
      };

      set(userPresenceRef, {
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
        email: currentUser.email,
        lastSeen: Date.now(),
        status: 'online',
        stats
      });
    }, 30000);

    return () => {
      off(presenceRef);
      clearInterval(interval);
      set(userPresenceRef, {
        ...userPresence[currentUser.uid],
        lastSeen: Date.now(),
        status: 'offline'
      });
    };
  }, [currentUser]);

  // Track typing users
  useEffect(() => {
    if (!roomId) return;

    const typingRef = ref(rtdb, `chats/${roomId}/typing`);
    const unsubscribe = onValue(typingRef, (snapshot) => {
      if (snapshot.exists()) {
        const typingData = snapshot.val();
        const now = Date.now();
        // Filter out stale typing indicators (older than 3 seconds)
        const activeTyping = Object.entries(typingData).reduce((acc, [uid, data]: [string, any]) => {
          if (now - data.timestamp < 3000 && uid !== currentUser?.uid) {
            acc[uid] = data;
          }
          return acc;
        }, {} as Record<string, UserTyping>);
        setTypingUsers(activeTyping);
      } else {
        setTypingUsers({});
      }
    });

    return () => off(typingRef);
  }, [roomId, currentUser?.uid]);

  // Track message stats
  useEffect(() => {
    const statsRef = ref(rtdb, 'users');
    const unsubscribe = onValue(statsRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const stats: Record<string, MessageStats> = {};
        Object.entries(usersData).forEach(([uid, data]: [string, any]) => {
          if (data.stats) {
            stats[uid] = {
              totalCalls: data.stats.totalCalls || 0,
              totalMessages: data.stats.totalMessages || 0
            };
          }
        });
        setMessageStats(stats);
      }
    });

    return () => off(statsRef);
  }, []);

  // Handle scroll
  useEffect(() => {
    const scrollArea = chatContainerRef.current;
    if (!scrollArea) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea;
      const isAtBottom = scrollHeight - (scrollTop + clientHeight) < 100;
      setShouldAutoScroll(isAtBottom);
    };

    scrollArea.addEventListener('scroll', handleScroll);
    return () => scrollArea.removeEventListener('scroll', handleScroll);
  }, []);

  const isUserOnline = (userId: string) => {
    const user = userPresence[userId];
    if (!user) return false;
    return user.status === 'online';
  };

  const getUserDisplayName = (userId: string, fallbackName: string) => {
    const user = userPresence[userId];
    return user?.displayName || fallbackName;
  };

  const handleTyping = () => {
    if (!currentUser || !roomId) return;

    const typingRef = ref(rtdb, `chats/${roomId}/typing/${currentUser.uid}`);
    set(typingRef, {
      name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
      timestamp: Date.now(),
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      set(typingRef, null);
    }, 2000);
  };

  const MessageStats = ({ userId }: { userId: string }) => {
    const stats = messageStats[userId];
    if (!stats) return null;

    return (
      <div className="flex items-center gap-2 text-[10px]">
        <div className="flex items-center gap-1">
          <Video className="w-3 h-3" />
          <span>{stats.totalCalls}</span>
        </div>
        <div className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          <span>{stats.totalMessages}</span>
        </div>
      </div>
    );
  };

  const handleScroll = () => {
    const scrollArea = chatContainerRef.current;
    if (!scrollArea) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollArea;
    const isAtBottom = scrollHeight - (scrollTop + clientHeight) < 100;
    setShouldAutoScroll(isAtBottom);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !roomId) return;
    
    setIsSending(true);
    try {
      const messagesRef = ref(rtdb, `chats/${roomId}/messages`);
      const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous';
      
      // Send the message
      await push(messagesRef, {
        text: newMessage.trim(),
        senderId: currentUser.uid,
        senderName: displayName,
        timestamp: Date.now(),
        type: 'text'
      });

      // Update user stats
      const userStatsRef = ref(rtdb, `users/${currentUser.uid}/stats`);
      const snapshot = await get(userStatsRef);
      const currentStats = snapshot.exists() ? snapshot.val() : {
        totalCalls: 0,
        totalMessages: 0,
        level: 1,
        xp: 0,
        uniqueConnections: 0
      };
      
      // Calculate new stats
      const newStats = {
        totalCalls: Number(currentStats.totalCalls) || 0,
        totalMessages: (Number(currentStats.totalMessages) || 0) + 1,
        level: Math.floor(1 + Math.sqrt((Number(currentStats.xp) || 0) / 100)),
        xp: (Number(currentStats.xp) || 0) + 5,
        uniqueConnections: Number(currentStats.uniqueConnections) || 0
      };

      // Update stats
      await set(userStatsRef, newStats);

      // Clear message and typing indicator
      setNewMessage('');
      const typingRef = ref(rtdb, `chats/${roomId}/typing/${currentUser.uid}`);
      await set(typingRef, null);

      // Scroll to bottom
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (timestamp: number) => {
    if (!timestamp) return '';
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

  const handleUserClick = (userId: string) => {
    const user = userPresence[userId];
    if (!user) return;

    // Get user stats from the messages stats
    const userStatsRef = ref(rtdb, `users/${userId}/stats`);
    get(userStatsRef).then((snapshot) => {
      if (snapshot.exists()) {
        const stats = snapshot.val();
        const userData = {
          id: userId,
          displayName: getUserDisplayName(userId, user.displayName),
          email: user.email,
          bio: user.bio,
          avatarSeed: user.avatarSeed,
          lastSeen: user.lastSeen,
          status: user.status,
          stats: {
            level: stats.level || 1,
            xp: stats.xp || 0,
            totalMessages: stats.totalMessages || 0,
            totalCalls: stats.totalCalls || 0
          }
        };
        setSelectedUser(userData);
      } else {
        const userData = {
          id: userId,
          displayName: getUserDisplayName(userId, user.displayName),
          email: user.email,
          bio: user.bio,
          avatarSeed: user.avatarSeed,
          lastSeen: user.lastSeen,
          status: user.status
        };
        setSelectedUser(userData);
      }
    }).catch(error => {
      console.error('Error fetching user stats:', error);
    });
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <ScrollArea ref={chatContainerRef} className="flex-1">
        <div className="p-4 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex items-start gap-3",
                  message.senderId === currentUser?.uid && "flex-row-reverse"
                )}
              >
                <div className="relative group">
                  <Avatar 
                    className={cn(
                      "h-8 w-8 border-2 cursor-pointer transition-transform hover:scale-110",
                      isUserOnline(message.senderId) 
                        ? "border-green-500/20" 
                        : "border-border"
                    )}
                    onClick={() => handleUserClick(message.senderId)}
                  >
                    <AvatarImage 
                      src={getSecureAvatarUrl(
                        userPresence[message.senderId]?.email,
                        userPresence[message.senderId]?.avatarSeed || message.senderId
                      )}
                    />
                    <AvatarFallback>
                      {getUserDisplayName(message.senderId, message.senderName)?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  {/* User Info Tooltip */}
                  <div className="absolute bottom-full left-0 mb-2 w-48 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    <div className="bg-popover/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border/50">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage 
                            src={getSecureAvatarUrl(
                              userPresence[message.senderId]?.email,
                              userPresence[message.senderId]?.avatarSeed || message.senderId
                            )}
                          />
                          <AvatarFallback>
                            {getUserDisplayName(message.senderId, message.senderName)?.charAt(0) || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-semibold text-sm truncate">
                              {getUserDisplayName(message.senderId, message.senderName)}
                      </span>
                            {userPresence[message.senderId]?.stats && (
                              <Badge variant="outline" className="h-4 px-1">
                                Lvl {userPresence[message.senderId].stats.level}
                              </Badge>
                            )}
                          </div>
                          {userPresence[message.senderId]?.email && getUserRole(userPresence[message.senderId].email) === 'admin' && (
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant="default" className="h-5 px-2 bg-primary/20 hover:bg-primary/20">
                                <Shield className="w-3 h-3 mr-1 text-primary" />
                                <span className="text-xs font-medium text-primary">ADMIN</span>
                              </Badge>
                              {userPresence[message.senderId].email === "sukunadew@gmail.com" && (
                                <Badge variant="default" className="h-5 px-2 bg-blue-500/20 hover:bg-blue-500/20">
                                  <Code2 className="w-3 h-3 mr-1 text-blue-500" />
                                  <span className="text-xs font-medium text-blue-500">DEV</span>
                                </Badge>
                              )}
                    </div>
                  )}
                          {userPresence[message.senderId]?.bio && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {userPresence[message.senderId].bio}
                            </p>
                          )}
                          {userPresence[message.senderId]?.stats && (
                            <div className="mt-2 space-y-1">
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ 
                                    width: `${(userPresence[message.senderId].stats.xp % 100) / 100 * 100}%` 
                                  }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>XP: {userPresence[message.senderId].stats.xp}</span>
                                <span>Next Level: {(Math.floor(userPresence[message.senderId].stats.xp / 100) + 1) * 100}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={cn(
                  "flex flex-col gap-1 max-w-[70%] sm:max-w-[80%] md:max-w-[70%] lg:max-w-[60%]",
                  message.senderId === currentUser?.uid && "items-end"
                )}>
                  <div className={cn(
                    "rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm",
                    message.senderId === currentUser?.uid
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 backdrop-blur-sm"
                  )}>
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{message.text}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground",
                    message.senderId === currentUser?.uid && "flex-row-reverse"
                  )}>
                    <div className="flex items-center gap-1">
                      <div className={cn(
                        "h-1 w-1 rounded-full",
                        isUserOnline(message.senderId)
                          ? "bg-green-500 animate-pulse"
                          : "bg-red-500/50"
                      )} />
                      <span className={cn(
                        "font-medium",
                        !isUserOnline(message.senderId) && "text-muted-foreground"
                      )}>
                        {getUserDisplayName(message.senderId, message.senderName)}
                      </span>
                    </div>
                    <span>•</span>
                    <span>{formatMessageTime(message.timestamp)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {Object.keys(typingUsers).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {Object.values(typingUsers)
                  .map(user => user.name)
                  .join(', ')}{' '}
                {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing...
              </span>
            </motion.div>
          )}
          <div ref={chatContainerRef} />
          </div>
      </ScrollArea>
      <form onSubmit={sendMessage} className="p-4 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type your message..."
            className="flex-1"
            disabled={isSending}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={isSending || !newMessage.trim()}
            className={cn(
              "rounded-full w-10 h-10",
              "bg-primary hover:bg-primary/90",
              "transition-all duration-200",
              isSending && "animate-pulse"
            )}
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </form>
      
      {/* User Profile Dialog */}
      {selectedUser && (
        <UserProfile
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          user={selectedUser}
        />
      )}
    </div>
  );
};

export default Chat;
