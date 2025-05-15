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
import { Loader2, Camera } from 'lucide-react';
import { cn, getUserRole, getSecureAvatarUrl } from '@/lib/utils';
import { User, updateProfile } from 'firebase/auth';

interface UserProfileDialogProps {
  children: React.ReactNode;
}

interface UserProfile {
  displayName: string;
  bio: string;
  avatarSeed: string;
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

  // Load existing profile data
  useEffect(() => {
    if (!currentUser) return;

    const userProfileRef = ref(rtdb, `users/${currentUser.uid}/profile`);
    
    // First, get the initial data
    get(userProfileRef).then((snapshot) => {
      if (snapshot.exists()) {
        setProfile(prevProfile => ({
          ...prevProfile,
          ...snapshot.val()
        }));
      }
      setIsLoading(false);
    });

    // Then, listen for real-time updates
    const unsubscribe = onValue(userProfileRef, (snapshot) => {
      if (snapshot.exists()) {
        setProfile(prevProfile => ({
          ...prevProfile,
          ...snapshot.val()
        }));
      }
    });

    return () => {
      off(userProfileRef);
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
        <div className="grid gap-4 py-4">
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
          </div>
          <div className="grid gap-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={profile.displayName}
              onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="Enter your display name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bio">Bio</Label>
            <Input
              id="bio"
              value={profile.bio}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about yourself"
            />
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