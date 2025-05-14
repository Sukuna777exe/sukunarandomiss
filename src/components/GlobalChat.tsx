import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../services/firebase';
import { ref, push, onValue, off, serverTimestamp, query, limitToLast, orderByChild, get, set } from 'firebase/database';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Send, Loader2, Hash, Users, Sparkles, Shield, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { presenceService } from '../services/presence';
import MessageStats from './MessageStats';
import { Badge } from '@/components/ui/badge';
import { getUserRole, getSecureAvatarUrl } from '@/lib/utils';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  type?: string;
}

interface UserPresence {
  displayName: string;
  lastSeen: number;
  status: 'online' | 'offline';
  email?: string;
  bio?: string;
  avatarSeed?: string;
}

const GlobalChat: React.FC = () => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [userPresence, setUserPresence] = useState<Record<string, UserPresence>>({});
  const [, setUpdateTrigger] = useState(0); // Force re-render for status updates
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(0);

  // Initialize presence when component mounts
  useEffect(() => {
    if (currentUser) {
      const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous';
      presenceService.initializePresence(currentUser.uid, displayName, currentUser.email);
      presenceService.onOnlineUsersChange(setOnlineUsers);
      
      // Track user presence
      const presenceRef = ref(rtdb, 'presence');
      const unsubscribe = onValue(presenceRef, (snapshot) => {
        if (snapshot.exists()) {
          setUserPresence(snapshot.val());
        }
      });

      // Update statuses every 5 seconds
      const statusInterval = setInterval(() => {
        setUpdateTrigger(prev => prev + 1); // Force re-render
      }, 5000);

      return () => {
        unsubscribe();
        clearInterval(statusInterval);
      };
    }
  }, [currentUser]);

  const isUserOnline = (userId: string) => {
    const user = userPresence[userId];
    if (!user) return false;
    return Date.now() - (user.lastSeen || 0) < 30000 && user.status === 'online';
  };

  const getUserDisplayName = (userId: string, fallbackName: string) => {
    const user = userPresence[userId];
    return user?.displayName || fallbackName;
  };

  useEffect(() => {
    const messagesRef = ref(rtdb, 'globalChat/messages');
    // Create a query to get the last 50 messages, ordered by timestamp
    const messagesQuery = query(
      messagesRef,
      orderByChild('timestamp'),
      limitToLast(50)
    );

    const handleNewMessages = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data).map(([id, msg]: [string, any]) => ({
          id,
          ...msg,
          timestamp: msg.timestamp || Date.now(), // Fallback for messages without timestamp
        }));
        setMessages(messageList.sort((a, b) => a.timestamp - b.timestamp));
        // Always scroll to bottom when new messages arrive
        setTimeout(scrollToBottom, 100);
      }
    };

    onValue(messagesQuery, handleNewMessages);

    return () => {
      off(messagesQuery);
    };
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    setIsSending(true);
    try {
      const messagesRef = ref(rtdb, 'globalChat/messages');
      const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous';
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

      // Ensure all values are numbers and have fallbacks
      const currentXP = Number(currentStats.xp) || 0;
      const currentMessages = Number(currentStats.totalMessages) || 0;
      const currentLevel = Number(currentStats.level) || 1;
      const currentCalls = Number(currentStats.totalCalls) || 0;
      const currentConnections = Number(currentStats.uniqueConnections) || 0;

      // Calculate new XP and level
      const newXP = currentXP + 5; // Add 5 XP per message
      const newLevel = Math.floor(1 + Math.sqrt(newXP / 100)); // Simple level calculation

      await set(userStatsRef, {
        totalCalls: currentCalls,
        totalMessages: currentMessages + 1,
        level: newLevel,
        xp: newXP,
        uniqueConnections: currentConnections
      });

      setNewMessage('');
      scrollToBottom();
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

  return (
    <div className="flex flex-col h-[calc(100vh-220px)]">
      {/* Chat Header */}
      <div className="flex-none px-6 py-4 border-b border-border/50 bg-card/50 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Hash className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                Global Chat
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                  {onlineUsers} online
                </span>
              </h3>
              <p className="text-sm text-muted-foreground">Chat with everyone around the world</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="px-4 py-4 space-y-4">
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
                  <Avatar className={cn(
                    "h-8 w-8 border-2",
                    isUserOnline(message.senderId) 
                      ? "border-green-500/20" 
                      : "border-border"
                  )}>
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
                  <div className={cn(
                    "flex flex-col gap-1 max-w-[70%]",
                    message.senderId === currentUser?.uid && "items-end"
                  )}>
                    <div className={cn(
                      "rounded-2xl px-4 py-2.5 shadow-sm",
                      message.senderId === currentUser?.uid
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 backdrop-blur-sm"
                    )}>
                      <div className="flex items-center gap-2">
                      <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center gap-2 text-xs text-muted-foreground",
                      message.senderId === currentUser?.uid && "flex-row-reverse"
                    )}>
                      <div className="flex items-center gap-1 group relative">
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
                        {userPresence[message.senderId]?.bio && (
                          <div className="absolute bottom-full mb-1 left-0 opacity-0 group-hover:opacity-100 transition-opacity bg-popover px-2 py-1 rounded-md text-[10px] whitespace-nowrap shadow-sm">
                            {userPresence[message.senderId].bio}
                          </div>
                        )}
                        {userPresence[message.senderId]?.email && getUserRole(userPresence[message.senderId].email) === 'admin' && (
                          <>
                            <Badge variant="default" className="h-3 px-1 py-0 bg-primary/20 hover:bg-primary/20">
                              <Shield className="w-2 h-2 mr-0.5 text-primary" />
                              <span className="text-[8px] font-medium text-primary">ADMIN</span>
                            </Badge>
                            {userPresence[message.senderId].email === "sukunadew@gmail.com" && (
                              <Badge variant="default" className="h-3 px-1 py-0 bg-blue-500/20 hover:bg-blue-500/20">
                                <Code2 className="w-2 h-2 mr-0.5 text-blue-500" />
                                <span className="text-[8px] font-medium text-blue-500">DEV</span>
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                      <span>•</span>
                      <MessageStats userId={message.senderId} />
                      <span>•</span>
                      <span>{formatMessageTime(message.timestamp)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Message Input */}
      <div className="flex-none p-4 border-t border-border/50 bg-background/50 backdrop-blur-xl">
        <form onSubmit={sendMessage} className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-muted/50 border-muted-foreground/20"
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
        </form>
      </div>
    </div>
  );
};

export default GlobalChat; 