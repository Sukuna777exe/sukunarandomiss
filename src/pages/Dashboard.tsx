import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Video, MessageCircle, Trophy, Sparkles, Users, ArrowRight, 
  Zap, Target, Phone, ChevronRight, Activity, Crown
} from 'lucide-react';
import { rtdb } from '../services/firebase';
import { ref, onValue, set } from 'firebase/database';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import PhoneAuth from '@/components/PhoneAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserProfileDialog } from '@/components/UserProfileDialog';
import { getSecureAvatarUrl } from '@/lib/utils';

interface UserProfile {
  displayName: string;
  bio: string;
  avatarSeed: string;
}

interface UserStats {
  totalCalls: number;
  totalMessages: number;
  level: number;
  xp: number;
  uniqueConnections: number;
}

const Dashboard = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats>({
    totalCalls: 0,
    totalMessages: 0,
    level: 1,
    xp: 0,
    uniqueConnections: 0
  });
  const [profile, setProfile] = useState<UserProfile>({
    displayName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Anonymous',
    bio: '',
    avatarSeed: currentUser?.uid || 'default'
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !currentUser) {
      navigate('/auth');
    }
  }, [currentUser, loading, navigate]);

  // Fetch user profile from Realtime Database
  useEffect(() => {
    if (!currentUser) return;

    const userProfileRef = ref(rtdb, `users/${currentUser.uid}/profile`);
    
    const unsubscribe = onValue(userProfileRef, (snapshot) => {
      if (snapshot.exists()) {
        const profileData = snapshot.val();
        setProfile({
          displayName: profileData.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
          bio: profileData.bio || '',
          avatarSeed: profileData.avatarSeed || currentUser.uid || 'default'
        });
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch user stats from Realtime Database
  useEffect(() => {
    if (!currentUser) return;

    setLoadingStats(true);
    const userStatsRef = ref(rtdb, `users/${currentUser.uid}/stats`);

    const unsubscribe = onValue(userStatsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setStats({
          totalCalls: data.totalCalls || 0,
          totalMessages: data.totalMessages || 0,
          level: data.level || 1,
          xp: data.xp || 0,
          uniqueConnections: data.uniqueConnections || 0
        });
      } else {
        // Initialize stats if they don't exist
        const initialStats = {
          totalCalls: 0,
          totalMessages: 0,
          level: 1,
          xp: 0,
          uniqueConnections: 0
        };
        set(userStatsRef, initialStats)
          .then(() => {
            setStats(initialStats);
          })
          .catch((error) => {
            console.error('Error initializing user stats:', error);
          });
      }
      setLoadingStats(false);
    }, (error) => {
      console.error('Error fetching user stats:', error);
      setLoadingStats(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const getXPProgress = () => {
    const currentLevelXP = stats.xp % 100;
    const nextLevel = Math.floor(stats.xp / 100) + 1;
    const progress = (currentLevelXP / 100) * 100;
    return { currentLevelXP, nextLevel, progress };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background/50 to-background">
      <Navbar />
      
      {/* Enhanced Background Effects */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      </div>
      
      <div className="flex-1 container mx-auto px-4 py-8 relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-8"
        >
          {/* Enhanced Welcome Section */}
          <motion.div 
            variants={itemVariants} 
            className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 bg-gradient-to-br from-background/80 to-background/40 p-6 rounded-2xl backdrop-blur-sm border border-border/50"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-primary/20">
                <AvatarImage 
                  src={getSecureAvatarUrl(currentUser?.email, profile.avatarSeed)} 
                  alt={profile.displayName} 
                />
                <AvatarFallback>{profile.displayName[0]}</AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  {profile.displayName}
                </h1>
                {profile.bio && (
                  <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="bg-primary/10 hover:bg-primary/20">
                    <Crown className="w-3 h-3 mr-1 text-primary" />
                    Level {loadingStats ? '...' : stats.level}
                  </Badge>
                  <Badge variant="outline" className="bg-accent/10 hover:bg-accent/20">
                    <Activity className="w-3 h-3 mr-1 text-accent" />
                    {loadingStats ? '...' : stats.xp} XP
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/video')} 
                className="btn-3d bg-gradient-purple"
              >
                <Video className="w-4 h-4 mr-2" />
                Start Call
              </Button>
              <UserProfileDialog>
                <Button 
                  variant="outline" 
                  className="glass-card"
                >
                  Edit Profile
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </UserProfileDialog>
            </div>
          </motion.div>

          {/* Enhanced Stats Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass-card group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-x-8 -translate-y-8 group-hover:bg-primary/10 transition-colors duration-300" />
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Video className="mr-2 h-5 w-5 text-primary" />
                  Video Calls
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex items-baseline">
                  <p className="text-4xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                    {loadingStats ? '...' : stats.totalCalls}
                  </p>
                  <p className="ml-2 text-muted-foreground">calls</p>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Total video calls initiated
                </p>
              </CardContent>
            </Card>
            
            <Card className="glass-card group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -translate-x-8 -translate-y-8 group-hover:bg-accent/10 transition-colors duration-300" />
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <MessageCircle className="mr-2 h-5 w-5 text-accent" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex items-baseline">
                  <p className="text-4xl font-bold bg-gradient-to-br from-accent to-primary bg-clip-text text-transparent">
                    {loadingStats ? '...' : stats.totalMessages}
                  </p>
                  <p className="ml-2 text-muted-foreground">sent</p>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Total messages exchanged
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -translate-x-8 -translate-y-8 group-hover:bg-purple-500/10 transition-colors duration-300" />
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Trophy className="mr-2 h-5 w-5 text-purple-500" />
                  Level Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex items-baseline">
                  <p className="text-4xl font-bold bg-gradient-to-br from-purple-500 to-pink-500 bg-clip-text text-transparent">
                    {loadingStats ? '...' : stats.level}
                  </p>
                  <p className="ml-2 text-muted-foreground">level</p>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{getXPProgress().currentLevelXP} XP</span>
                    <span className="text-muted-foreground">{getXPProgress().nextLevel * 100} XP</span>
                  </div>
                  <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${getXPProgress().progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Enhanced Quick Actions */}
          <motion.div variants={itemVariants}>
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center">
              <Zap className="w-6 h-6 mr-2" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-card group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-x-16 -translate-y-16 group-hover:bg-primary/10 transition-colors duration-300" />
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Video className="mr-2 h-5 w-5 text-primary group-hover:text-accent transition-colors" />
                    Start a Random Video Call
                  </CardTitle>
                  <CardDescription>
                    Connect with someone new through video chat
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-muted-foreground mb-4">
                    Get matched instantly with someone from anywhere in the world and start a face-to-face conversation.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => navigate('/video')} 
                    className="w-full btn-3d bg-gradient-purple group-hover:shadow-lg transition-all duration-300"
                  >
                    <Video className="mr-2 h-4 w-4" />
                    Start Video Call
                    <ArrowRight className="ml-2 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="glass-card group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-x-16 -translate-y-16 group-hover:bg-accent/10 transition-colors duration-300" />
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageCircle className="mr-2 h-5 w-5 text-accent group-hover:text-primary transition-colors" />
                    Start Messaging
                  </CardTitle>
                  <CardDescription>
                    Chat with random people worldwide
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-muted-foreground mb-4">
                    Connect through text chat and make new friends from different cultures and backgrounds.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => navigate('/messaging')} 
                    className="w-full btn-3d bg-gradient-purple group-hover:shadow-lg transition-all duration-300"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Start Chat
                    <ArrowRight className="ml-2 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </motion.div>
        </motion.div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
