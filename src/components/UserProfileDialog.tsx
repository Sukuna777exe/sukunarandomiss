import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { rtdb } from '../services/firebase';
import { ref, set, onValue, off, get } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Camera, Shield, Code2, MessageSquare, Video, Sparkles, Activity } from 'lucide-react';
import { cn, getUserRole, getSecureAvatarUrl } from '@/lib/utils';
import { User, updateProfile } from 'firebase/auth';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

interface UserProfileDialogProps {
  children: React.ReactNode;
}

interface UserProfile {
  displayName: string;
  bio: string;
  avatarSeed: string;
}

interface UserStats {
  level: number;
  xp: number;
  totalCalls: number;
  totalMessages: number;
}

export function UserProfileDialog({ children }: UserProfileDialogProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({
    displayName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Anonymous',
    bio: '',
    avatarSeed: currentUser?.uid || 'default'
  });
  const [stats, setStats] = useState<UserStats>({
    level: 1,
    xp: 0,
    totalCalls: 0,
    totalMessages: 0
  });

  // Load existing profile data and stats
  useEffect(() => {
    if (!currentUser) return;

    const userProfileRef = ref(rtdb, `users/${currentUser.uid}/profile`);
    const userStatsRef = ref(rtdb, `users/${currentUser.uid}/stats`);
    
    // First, get the initial data
    Promise.all([
      get(userProfileRef),
      get(userStatsRef)
    ]).then(([profileSnapshot, statsSnapshot]) => {
      if (profileSnapshot.exists()) {
        setProfile(prevProfile => ({
          ...prevProfile,
          ...profileSnapshot.val()
        }));
      }
      if (statsSnapshot.exists()) {
        setStats(statsSnapshot.val());
      }
      setIsLoading(false);
    });

    // Then, listen for real-time updates
    const profileUnsubscribe = onValue(userProfileRef, (snapshot) => {
      if (snapshot.exists()) {
        setProfile(prevProfile => ({
          ...prevProfile,
          ...snapshot.val()
        }));
      }
    });

    const statsUnsubscribe = onValue(userStatsRef, (snapshot) => {
      if (snapshot.exists()) {
        setStats(snapshot.val());
      }
    });

    return () => {
      profileUnsubscribe();
      statsUnsubscribe();
    };
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;
    
    setIsSaving(true);
    try {
      // Save to Firebase Realtime Database
      const userProfileRef = ref(rtdb, `users/${currentUser.uid}/profile`);
      await set(userProfileRef, profile);

      // Update presence data with new profile info
      const presenceRef = ref(rtdb, `presence/${currentUser.uid}`);
      const presenceSnapshot = await get(presenceRef);
      if (presenceSnapshot.exists()) {
        const presenceData = presenceSnapshot.val();
        await set(presenceRef, {
          ...presenceData,
          displayName: profile.displayName,
          bio: profile.bio,
          avatarSeed: profile.avatarSeed,
          email: currentUser.email,
          lastSeen: presenceData.lastSeen,
          status: presenceData.status
        });
      }

      // Update display name in Firebase Auth if changed
      if (profile.displayName !== currentUser.displayName) {
        await updateProfile(currentUser, {
          displayName: profile.displayName
        });
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const generateNewAvatar = () => {
    const newSeed = Math.random().toString(36).substring(7);
    setProfile(prev => ({ ...prev, avatarSeed: newSeed }));
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Profile Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-border">
                <AvatarImage 
                  src={getSecureAvatarUrl(currentUser?.email, profile.avatarSeed)}
                  alt={profile.displayName} 
                />
                <AvatarFallback>{profile.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="outline"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-background shadow-sm"
                onClick={generateNewAvatar}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>

            {/* User Badges */}
            {currentUser?.email && getUserRole(currentUser.email) === 'admin' && (
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-primary/20 hover:bg-primary/20">
                  <Shield className="w-3 h-3 mr-1 text-primary" />
                  <span className="text-xs font-medium text-primary">ADMIN</span>
                </Badge>
                {currentUser.email === "sukunadew@gmail.com" && (
                  <Badge variant="default" className="bg-blue-500/20 hover:bg-blue-500/20">
                    <Code2 className="w-3 h-3 mr-1 text-blue-500" />
                    <span className="text-xs font-medium text-blue-500">DEV</span>
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Level and XP Progress */}
          <div className="space-y-2 bg-muted/50 p-4 rounded-lg border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium">Level {stats.level}</span>
              </div>
              <span className="text-sm text-muted-foreground">{stats.xp} XP</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(stats.xp % 100)}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {100 - (stats.xp % 100)} XP until next level
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
              <div className="flex flex-col items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={stats.totalCalls}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="text-2xl font-bold"
                  >
                    {stats.totalCalls}
                  </motion.span>
                </AnimatePresence>
                <span className="text-xs text-muted-foreground">Video Calls</span>
              </div>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
              <div className="flex flex-col items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={stats.totalMessages}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="text-2xl font-bold"
                  >
                    {stats.totalMessages}
                  </motion.span>
                </AnimatePresence>
                <span className="text-xs text-muted-foreground">Messages</span>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={profile.displayName}
                onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Enter your display name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Input
                id="bio"
                value={profile.bio}
                onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="submit"
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "relative",
              isSaving && "text-transparent"
            )}
          >
            {isSaving && (
              <Loader2 className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-spin" />
            )}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 