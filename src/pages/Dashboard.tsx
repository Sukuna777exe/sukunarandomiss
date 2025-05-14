import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, MessageCircle, Trophy, Sparkles } from 'lucide-react';
import { rtdb } from '../services/firebase';
import { ref, onValue, set } from 'firebase/database';
import Footer from '@/components/Footer';

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
  const [loadingStats, setLoadingStats] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !currentUser) {
      navigate('/auth');
    }
  }, [currentUser, loading, navigate]);

  // Fetch user stats from Realtime Database
  useEffect(() => {
      if (!currentUser) return;

      setLoadingStats(true);
    console.log('Setting up real-time listener for user stats...');

    // Reference to user's stats in Realtime Database
    const userStatsRef = ref(rtdb, `users/${currentUser.uid}/stats`);

    // Listen for real-time updates
    const unsubscribe = onValue(userStatsRef, (snapshot) => {
      console.log('Received stats update:', snapshot.val());
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
        // If no stats exist yet, initialize with zeros and create the stats node
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
            console.log('Initialized user stats:', initialStats);
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

    // Cleanup subscription
    return () => {
      console.log('Cleaning up stats listener');
      unsubscribe();
    };
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome, {currentUser?.displayName || 'User'}!
        </h1>
        <p className="text-muted-foreground mb-8">
          Here's your Randomiss dashboard. Start connecting with random people today!
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Stats cards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Video className="mr-2 h-5 w-5" />
                Video Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {loadingStats ? '...' : stats.totalCalls}
              </p>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Total video calls initiated
              </p>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="mr-2 h-5 w-5" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {loadingStats ? '...' : stats.totalMessages}
              </p>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Total messages sent
              </p>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="mr-2 h-5 w-5" />
                Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {loadingStats ? '...' : stats.level}
              </p>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500"
                  style={{ 
                    width: `${((stats.xp % 100) / 100) * 100}%`
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {loadingStats ? '...' : `${stats.xp} XP`}
              </p>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Your current level and progress
              </p>
            </CardFooter>
          </Card>
          
          <Card className="bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5" />
                Premium Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">Free</p>
            </CardContent>
            <CardFooter>
              <p className="text-sm opacity-90">
                Upgrade for more features!
              </p>
            </CardFooter>
          </Card>
        </div>
        
        {/* Quick actions */}
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Start a Random Video Call</CardTitle>
              <CardDescription>
                Connect with a random person via video
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Get matched with someone new from anywhere in the world and start a conversation.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => navigate('/video')} className="w-full">
                <Video className="mr-2 h-4 w-4" />
                Start Video Call
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Chat Messaging</CardTitle>
              <CardDescription>
                Text chat with random people
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Prefer typing? Start a random text conversation with someone new.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => navigate('/messaging')} variant="outline" className="w-full">
                <MessageCircle className="mr-2 h-4 w-4" />
                Start Messaging
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
