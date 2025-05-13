import React from 'react';
import { cn } from '@/lib/utils';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className }) => {
  return (
    <footer className={cn(
      "border-t border-border/50 py-6 text-center text-sm text-muted-foreground bg-background/50 backdrop-blur-sm",
      className
    )}>
      <div className="container mx-auto">
        {/* Empty footer - copyright is handled by Copyright component */}
      </div>
    </footer>
  );
};

export default Footer; 