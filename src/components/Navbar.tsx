import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { signOut } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { presenceService } from '../services/presence';
import { 
  LogOut, 
  Video, 
  MessageCircle, 
  User, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Users 
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const Navbar = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      presenceService.initializePresence(currentUser.uid);
      presenceService.onOnlineUsersChange(setOnlineUsers);
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

  const NavLinks = () => (
    <>
      <Link to="/dashboard">
        <Button 
          variant={isActive('/dashboard') ? "default" : "ghost"} 
          size="sm"
          className="flex items-center space-x-1 w-full justify-start"
        >
          <User className="h-4 w-4" />
          <span>Dashboard</span>
        </Button>
      </Link>
      
      <Link to="/video">
        <Button 
          variant={isActive('/video') ? "default" : "ghost"} 
          size="sm"
          className="flex items-center space-x-1 w-full justify-start"
        >
          <Video className="h-4 w-4" />
          <span>Video Chat</span>
        </Button>
      </Link>
      
      <Link to="/messaging">
        <Button 
          variant={isActive('/messaging') ? "default" : "ghost"} 
          size="sm"
          className="flex items-center space-x-1 w-full justify-start"
        >
          <MessageCircle className="h-4 w-4" />
          <span>Messages</span>
        </Button>
      </Link>
    </>
  );

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">R</span>
          </div>
          <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            Randomiss
          </span>
        </Link>

        {currentUser ? (
          <div className="flex items-center space-x-4">
            {/* Online Users Count */}
            <div className="hidden sm:flex items-center space-x-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="online-indicator" />
                <Users className="h-4 w-4" />
                <span>{onlineUsers} online</span>
              </div>
            </div>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hidden sm:flex"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center space-x-2">
              <NavLinks />
            </div>
            
            {/* User Info and Logout */}
            <div className="hidden sm:flex items-center space-x-2">
              <span className="text-sm font-medium">
                {currentUser.displayName || currentUser.email}
              </span>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col space-y-4 mt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-sm font-medium">
                      {currentUser.displayName || currentUser.email}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="online-indicator" />
                      <Users className="h-4 w-4" />
                      <span className="text-sm">{onlineUsers} online</span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleTheme}
                    className="flex items-center space-x-2 justify-start"
                  >
                    {theme === 'light' ? (
                      <>
                        <Moon className="h-4 w-4" />
                        <span>Dark Mode</span>
                      </>
                    ) : (
                      <>
                        <Sun className="h-4 w-4" />
                        <span>Light Mode</span>
                      </>
                    )}
                  </Button>

                  <div className="space-y-2">
                    <NavLinks />
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 w-full justify-start"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>

            <Link to="/auth">
              <Button>Login</Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
