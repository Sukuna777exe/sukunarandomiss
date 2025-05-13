import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { rtdb } from '../services/firebase';
import { ref, push, onValue, off, get, set } from 'firebase/database';
import { Send, User, Smile, Image, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

const CHAT_HEIGHT = 400; // Fixed height in pixels
const HEADER_HEIGHT = 40; // Header height (reduced from 49px)
const FOOTER_HEIGHT = 57; // Input area height (py-3 = 24px + h-9 = 36px + border 1px)
const MESSAGES_HEIGHT = CHAT_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;

const Chat: React.FC<ChatProps> = ({ roomId, className }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId || !currentUser) return;

    const messagesRef = ref(rtdb, `chats/${roomId}/messages`);
    const typingRef = ref(rtdb, `chats/${roomId}/typing/${currentUser.uid}`);

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const fetchedMessages: Message[] = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.entries(data).forEach(([key, value]: [string, any]) => {
          fetchedMessages.push({
            id: key,
            text: value.text,
            senderId: value.senderId,
            senderName: value.senderName || 'Anonymous',
            timestamp: value.timestamp,
          });
        });
      }
      fetchedMessages.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(fetchedMessages);

      // Scroll to bottom after messages update
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => {
      off(messagesRef);
      set(typingRef, null);
    };
  }, [roomId, currentUser]);

  const handleTyping = () => {
    if (!currentUser || !roomId) return;

    const typingRef = ref(rtdb, `chats/${roomId}/typing/${currentUser.uid}`);
    set(typingRef, {
      name: currentUser.displayName || currentUser.email,
      timestamp: Date.now(),
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      set(typingRef, null);
    }, 2000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !currentUser || !roomId) return;
    
    try {
      const messagesRef = ref(rtdb, `chats/${roomId}/messages`);
      const newMessageRef = push(messagesRef);
      await set(newMessageRef, {
        text: newMessage,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email,
        timestamp: Date.now(),
      });

      const userStatsRef = ref(rtdb, `users/${currentUser.uid}/stats/totalMessages`);
      const snapshot = await get(userStatsRef);
      const currentMessages = snapshot.exists() ? snapshot.val() : 0;
      await set(userStatsRef, currentMessages + 1);
      
      setNewMessage('');
      
      const typingRef = ref(rtdb, `chats/${roomId}/typing/${currentUser.uid}`);
      set(typingRef, null);

      // Scroll to bottom after sending message
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatMessageTime = (timestamp: number) => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    
    if (messageDate.toDateString() === now.toDateString()) {
      return format(messageDate, 'HH:mm');
    } else if (messageDate.getFullYear() === now.getFullYear()) {
      return format(messageDate, 'MMM d, HH:mm');
    }
    return format(messageDate, 'MMM d, yyyy HH:mm');
  };

  return (
    <div className={cn(
      'flex flex-col bg-background/50 mx-auto rounded-lg border border-border overflow-hidden',
      'w-full max-w-[800px]',
      className
    )}
    style={{
      height: `${CHAT_HEIGHT}px`,
      minHeight: `${CHAT_HEIGHT}px`,
      maxHeight: `${CHAT_HEIGHT}px`,
    }}>
      {/* Chat Header */}
      <div className="px-4 py-2 border-b border-border/50 bg-background/50 backdrop-blur-sm"
        style={{ height: `${HEADER_HEIGHT}px` }}>
        <div className="flex flex-col justify-center h-full">
          <h3 className="font-medium text-sm leading-none">Global Chat Room</h3>
          <p className="text-[10px] text-muted-foreground mt-1">Chat with everyone</p>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-thin scrollbar-thumb-accent/10 hover:scrollbar-thumb-accent/20 scrollbar-track-transparent"
        style={{
          height: `${MESSAGES_HEIGHT}px`,
          minHeight: `${MESSAGES_HEIGHT}px`,
          maxHeight: `${MESSAGES_HEIGHT}px`,
        }}
      >
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-muted-foreground"
            >
              <User className="w-8 h-8 mb-2" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Start the conversation!</p>
            </motion.div>
          ) : (
            messages.map((msg, index) => {
              const isCurrentUser = msg.senderId === currentUser?.uid;
              const showSenderName = !isCurrentUser && 
                (index === 0 || messages[index - 1].senderId !== msg.senderId);
              
              return (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cn(
                    'flex gap-2',
                    isCurrentUser ? 'justify-end' : 'justify-start'
                  )}
                >
                  {!isCurrentUser && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-2">
                      <span className="text-[10px] font-medium text-primary-foreground">
                        {msg.senderName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[70%] px-4 py-2 rounded-2xl',
                      isCurrentUser
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-accent/10 text-foreground rounded-bl-sm',
                      'shadow-sm'
                    )}
                  >
                    {showSenderName && (
                      <div className="font-medium text-[11px] mb-1 opacity-90">
                        {msg.senderName}
                      </div>
                    )}
                    <p className="break-words leading-relaxed text-sm">{msg.text}</p>
                    <div className="text-[10px] opacity-70 text-right mt-1">
                      {formatMessageTime(msg.timestamp)}
                    </div>
                  </div>
                  {isCurrentUser && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-2">
                      <span className="text-[10px] font-medium text-primary-foreground">
                        {currentUser.displayName?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
      
      {/* Input Area */}
      <div className="px-4 py-3 border-t border-border/50 bg-background/50 backdrop-blur-sm"
        style={{ height: `${FOOTER_HEIGHT}px` }}>
        <form onSubmit={sendMessage} className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                    type="button"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add emoji</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                    type="button"
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send image</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                    type="button"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Attach file</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type your message..."
            className="flex-1 h-9 text-sm bg-background/50 focus-visible:ring-primary/20"
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!newMessage.trim()}
            className="h-9 w-9"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
