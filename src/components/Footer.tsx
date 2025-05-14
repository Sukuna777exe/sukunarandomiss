import React from 'react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className }) => {
  return (
    <footer className={cn(
      "py-6 text-center text-sm bg-black",
      className
    )}>
      <div className="container mx-auto flex flex-col items-center gap-4">
        <Logo size="sm" className="opacity-75 hover:opacity-100 transition-opacity" />
        <div className="flex items-center justify-center gap-2">
          <motion.span
            className={cn(
              "text-sm font-semibold tracking-wide text-[#9333EA]",
              "select-none"
            )}
            animate={{
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            © {new Date().getFullYear()} Randomiss
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
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
          </motion.div>
          <motion.span
            className={cn(
              "text-sm font-semibold tracking-wide text-[#9333EA]",
              "select-none"
            )}
            animate={{
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
              delay: 0.5
            }}
          >
            Developed by Sukuna
          </motion.span>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 