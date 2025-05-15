import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { rtdb } from '../services/firebase';
import { ref, onValue } from 'firebase/database';
import { Video, MessageSquare } from 'lucide-react';

interface MessageStatsProps {
  userId: string;
}

interface UserStats {
  totalCalls: number;
  totalMessages: number;
}

const MessageStats: React.FC<MessageStatsProps> = ({ userId }) => {
  const [stats, setStats] = useState<UserStats>({
    totalCalls: 0,
    totalMessages: 0
  });

  useEffect(() => {
    const userStatsRef = ref(rtdb, `users/${userId}/stats`);
    const unsubscribe = onValue(userStatsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setStats({
          totalCalls: data.totalCalls || 0,
          totalMessages: data.totalMessages || 0
        });
      }
    });

    return () => unsubscribe();
  }, [userId]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1.5"
    >
      <div className="flex items-center gap-1">
        <Video className="w-3 h-3 text-muted-foreground" />
        <span>{stats.totalCalls}</span>
      </div>
      <div className="flex items-center gap-1">
        <MessageSquare className="w-3 h-3 text-muted-foreground" />
        <span>{stats.totalMessages}</span>
      </div>
    </motion.div>
  );
};

export default MessageStats; 