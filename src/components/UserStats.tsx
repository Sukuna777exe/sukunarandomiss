import React from 'react';
import { motion } from 'framer-motion';
import { CircleProgress } from './ui/circle-progress';

interface UserStatsProps {
  level: number;
  xp: number;
  totalCalls: number;
  totalMessages: number;
}

const UserStats: React.FC<UserStatsProps> = ({ level, xp, totalCalls, totalMessages }) => {
  // Calculate XP progress to next level (100 XP per level)
  const xpForNextLevel = (level + 1) * 100;
  const xpProgress = ((xp % 100) / 100) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur-md rounded-2xl p-4 border border-border/50 shadow-lg"
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <CircleProgress value={xpProgress} size="lg" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className="text-2xl font-bold text-primary">{level}</span>
              <span className="text-xs text-muted-foreground block">Level</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-medium">XP:</span>
            <span className="text-primary">{xp}</span>
            <span className="text-xs text-muted-foreground">/ {xpForNextLevel}</span>
          </div>
          
          <div className="flex gap-3 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">{totalCalls}</span> calls
            </div>
            <div>
              <span className="font-medium text-foreground">{totalMessages}</span> messages
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default UserStats; 