import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Heart } from 'lucide-react';

const Copyright = () => {
  return (
    <div className="w-full border-t border-border/50 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto py-4">
        <div className="flex items-center justify-center gap-3">
          <motion.span
            className={cn(
              "text-sm font-semibold tracking-wide",
              "bg-gradient-to-r from-primary via-accent to-primary",
              "bg-[size:200%_auto] bg-clip-text text-transparent",
              "select-none"
            )}
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            © 2025 Randomiss
          </motion.span>

          <motion.div
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Heart className="h-3 w-3 text-red-500 fill-red-500" />
          </motion.div>

          <motion.span
            className={cn(
              "text-sm font-medium tracking-wide",
              "bg-gradient-to-r from-accent via-primary to-accent",
              "bg-[size:200%_auto] bg-clip-text text-transparent",
              "select-none"
            )}
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
              delay: 0.5
            }}
          >
            Developed by Sukuna
          </motion.span>
        </div>
      </div>
    </div>
  );
};

export default Copyright; 