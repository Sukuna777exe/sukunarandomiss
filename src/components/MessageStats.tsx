import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { rtdb } from '../services/firebase';
import { ref, onValue } from 'firebase/database';
import { Sparkles } from 'lucide-react';

interface MessageStatsProps {
  userId: string;
}

interface UserStats {
  level: number;
  xp: number;
  totalCalls: number;
  totalMessages: number;
}

const MessageStats: React.FC<MessageStatsProps> = ({ userId }) => {
  const [stats, setStats] = useState<UserStats>({
    level: 1,
    xp: 0,
    totalCalls: 0,
    totalMessages: 0
  });

  useEffect(() => {
    const userStatsRef = ref(rtdb, `users/${userId}/stats`);
    const unsubscribe = onValue(userStatsRef, (snapshot) => {
      if (snapshot.exists()) {
        setStats(snapshot.val());
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const xpProgress = ((stats.xp % 100) / 100) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1.5"
    >
      <div className="relative">
        <div className="relative w-5 h-5">
          {/* Background square */}
          <div className="absolute inset-0 bg-primary/10 rounded-md" />
          {/* Progress overlay */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-primary/20 rounded-b-md transition-all duration-300 ease-out"
            style={{ height: `${xpProgress}%` }}
          />
          {/* Glowing border */}
          <div className="absolute inset-0 rounded-md border border-primary/30 shadow-[0_0_10px_rgba(var(--primary),0.2)] backdrop-blur-sm" />
          {/* Level number */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary drop-shadow-sm">
              {stats.level}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Sparkles className="w-3 h-3 text-primary" />
        <span>{stats.xp} XP</span>
      </div>
    </motion.div>
  );
};

export default MessageStats; 