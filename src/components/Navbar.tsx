import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { signOut } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { presenceService } from '../services/presence';
import { rtdb } from '../services/firebase';
import { ref, onValue, off } from 'firebase/database';
import { 
  LogOut, 
  Video, 
  MessageCircle, 
  User, 
  Menu,
  Users,
  Shield,
  Code2,
  Settings
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserRole, getSecureAvatarUrl } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { UserProfileDialog } from './UserProfileDialog';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
  SheetHeader,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const Navbar = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userProfile, setUserProfile] = useState({
    displayName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Anonymous',
    avatarSeed: currentUser?.uid || 'default'
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (currentUser) {
      const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous';
      presenceService.initializePresence(currentUser.uid, displayName, currentUser.email);
      presenceService.onOnlineUsersChange(setOnlineUsers);

      // Listen for profile updates
      const userProfileRef = ref(rtdb, `users/${currentUser.uid}/profile`);
      const unsubscribe = onValue(userProfileRef, (snapshot) => {
        if (snapshot.exists()) {
          const profileData = snapshot.val();
          setUserProfile({
            displayName: profileData.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
            avatarSeed: profileData.avatarSeed || currentUser.uid || 'default'
          });
        }
      });

      return () => {
        presenceService.cleanup();
        off(userProfileRef);
      };
    }
  }, [currentUser]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const NavLink = ({ to, icon: Icon, children }: { to: string; icon: any; children: React.ReactNode }) => (
    <Link to={to}>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button 
          variant={isActive(to) ? "default" : "ghost"} 
          size="sm"
          className={cn(
            "flex items-center space-x-2 w-full justify-start transition-all duration-200",
            isActive(to) && "bg-primary/10 text-primary hover:bg-primary/20"
          )}
        >
          <Icon className="h-4 w-4" />
          <span>{children}</span>
        </Button>
      </motion.div>
      </Link>
  );

  const NavLinks = () => (
    <>
      <NavLink to="/dashboard" icon={User}>Dashboard</NavLink>
      <NavLink to="/video" icon={Video}>Video Chat</NavLink>
      <NavLink to="/messaging" icon={MessageCircle}>Messages</NavLink>
    </>
  );

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        "sticky top-0 z-50 transition-all duration-200",
        scrolled 
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm"
          : "bg-background border-b border-border"
      )}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
        <Link to="/" className="flex items-center space-x-2">
          <Logo size="sm" />
        </Link>
          </motion.div>

        {currentUser ? (
            <div className="flex items-center space-x-6">
            {/* Online Users Count */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hidden sm:flex items-center space-x-2 bg-primary/5 px-3 py-1.5 rounded-full"
              >
              <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">{onlineUsers} online</span>
              </div>
              </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center space-x-2">
              <NavLinks />
            </div>

            {/* User Info and Logout */}
            <div className="hidden sm:flex items-center space-x-3">
              <UserProfileDialog>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <div className="flex items-center space-x-2 bg-accent/50 px-3 py-1.5 rounded-full cursor-pointer hover:bg-accent/70 transition-colors">
                    <Avatar className="h-6 w-6 border-2 border-border">
                      <AvatarImage 
                        src={getSecureAvatarUrl(currentUser.email, userProfile.avatarSeed)}
                        alt={userProfile.displayName}
                      />
                      <AvatarFallback>{userProfile.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium leading-none">
                        {userProfile.displayName}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {getUserRole(currentUser.email) === 'admin' && (
                          <>
                            <Badge variant="default" className="h-3 px-1 py-0 bg-primary/20 hover:bg-primary/20">
                              <Shield className="w-2 h-2 mr-0.5 text-primary" />
                              <span className="text-[8px] font-medium text-primary">ADMIN</span>
                            </Badge>
                            {currentUser.email === "sukunadew@gmail.com" && (
                              <Badge variant="default" className="h-3 px-1 py-0 bg-blue-500/20 hover:bg-blue-500/20">
                                <Code2 className="w-2 h-2 mr-0.5 text-blue-500" />
                                <span className="text-[8px] font-medium text-blue-500">DEV</span>
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <Settings className="h-3 w-3 text-muted-foreground ml-1" />
                  </div>
                </motion.div>
              </UserProfileDialog>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                          className="bg-background/50 backdrop-blur-sm flex items-center gap-2 px-3"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                          <span className="hidden md:inline">Sign out</span>
              </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sign out of your account</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </motion.div>
            </div>

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden">
                  <Menu className="h-6 w-6" />
                    <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader className="text-left">
                    <SheetTitle>Menu</SheetTitle>
                    <SheetDescription>
                      <UserProfileDialog>
                        <div className="flex items-center space-x-2 mt-2 cursor-pointer hover:bg-accent/10 p-2 rounded-lg transition-colors">
                          <Avatar className="h-10 w-10 border-2 border-border">
                            <AvatarImage 
                              src={getSecureAvatarUrl(currentUser.email, userProfile.avatarSeed)}
                              alt={userProfile.displayName}
                            />
                            <AvatarFallback>{userProfile.displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {userProfile.displayName}
                            </span>
                            <div className="flex items-center gap-1 mt-1">
                              {getUserRole(currentUser.email) === 'admin' && (
                                <>
                                  <Badge variant="default" className="h-3 px-1 py-0 bg-primary/20 hover:bg-primary/20">
                                    <Shield className="w-2 h-2 mr-0.5 text-primary" />
                                    <span className="text-[8px] font-medium text-primary">ADMIN</span>
                                  </Badge>
                                  {currentUser.email === "sukunadew@gmail.com" && (
                                    <Badge variant="default" className="h-3 px-1 py-0 bg-blue-500/20 hover:bg-blue-500/20">
                                      <Code2 className="w-2 h-2 mr-0.5 text-blue-500" />
                                      <span className="text-[8px] font-medium text-blue-500">DEV</span>
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <Settings className="h-4 w-4 text-muted-foreground ml-auto" />
                        </div>
                      </UserProfileDialog>
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="flex flex-col space-y-4 mt-6">
                    <div className="flex items-center space-x-2 mb-2 bg-primary/5 px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        <Users className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">{onlineUsers} online</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <NavLinks />
                    </div>
                  </div>

                  <SheetFooter className="absolute bottom-4 left-4 right-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSignOut}
                      className="w-full bg-background/50 backdrop-blur-sm"
                  >
                      <LogOut className="h-4 w-4 mr-2" />
                    <span>Sign Out</span>
                  </Button>
                  </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link to="/auth">
                  <Button className="bg-primary/90 hover:bg-primary/80">Login</Button>
            </Link>
              </motion.div>
          </div>
        )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
