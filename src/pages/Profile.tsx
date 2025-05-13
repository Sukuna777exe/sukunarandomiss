
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Video, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { toast } from '@/components/ui/use-toast';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  bio: string;
  followers: string[];
  following: string[];
  joinedDate: string;
}

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        // First try to find user by username
        const usersQuery = query(collection(db, 'users'), where('username', '==', username));
        const userSnapshot = await getDocs(usersQuery);

        if (userSnapshot.empty) {
          // If no user found with that username, check if it's a UID
          const userDoc = await getDoc(doc(db, 'users', username || ''));
          if (userDoc.exists()) {
            const userData = userDoc.data() as Omit<UserProfile, 'uid'>;
            setProfile({ uid: userDoc.id, ...userData });
            setFollowerCount(userData.followers?.length || 0);
            setFollowingCount(userData.following?.length || 0);
            setIsFollowing(currentUser ? userData.followers?.includes(currentUser.uid) || false : false);
          } else {
            setProfile(null);
          }
        } else {
          const userData = userSnapshot.docs[0].data() as Omit<UserProfile, 'uid'>;
          setProfile({ uid: userSnapshot.docs[0].id, ...userData });
          setFollowerCount(userData.followers?.length || 0);
          setFollowingCount(userData.following?.length || 0);
          setIsFollowing(currentUser ? userData.followers?.includes(currentUser.uid) || false : false);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load user profile"
        });
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchProfile();
    }
  }, [username, currentUser]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "Please sign in to follow users",
        variant: "destructive"
      });
      return;
    }

    if (!profile) return;

    try {
      const userRef = doc(db, 'users', profile.uid);
      const currentUserRef = doc(db, 'users', currentUser.uid);

      if (isFollowing) {
        // Unfollow
        await updateDoc(userRef, {
          followers: arrayRemove(currentUser.uid)
        });
        await updateDoc(currentUserRef, {
          following: arrayRemove(profile.uid)
        });
        setIsFollowing(false);
        setFollowerCount(prev => prev - 1);
        toast({
          title: "Unfollowed",
          description: `You no longer follow ${profile.displayName}`
        });
      } else {
        // Follow
        await updateDoc(userRef, {
          followers: arrayUnion(currentUser.uid)
        });
        await updateDoc(currentUserRef, {
          following: arrayUnion(profile.uid)
        });
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        toast({
          title: "Following",
          description: `You are now following ${profile.displayName}`
        });
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update follow status"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center flex-col p-6">
          <h1 className="text-3xl font-bold mb-4">User Not Found</h1>
          <p className="text-lg text-muted-foreground mb-6">The profile you're looking for doesn't exist or has been removed.</p>
          <Link to="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="container max-w-5xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8">
          <Card>
            <div className="relative">
              {/* Cover Image */}
              <div className="h-48 bg-gradient-to-r from-primary/30 to-accent/30 rounded-t-lg"></div>
              
              {/* Profile Info */}
              <div className="px-6 pb-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 sm:-mt-12 gap-4 sm:gap-6">
                  <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-background shadow-lg">
                    {profile.photoURL ? (
                      <AvatarImage src={profile.photoURL} alt={profile.displayName} />
                    ) : (
                      <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                        {getInitials(profile.displayName)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  <div className="flex-1 text-center sm:text-left mt-2 sm:mt-8">
                    <h1 className="text-2xl sm:text-3xl font-bold">{profile.displayName}</h1>
                    <p className="text-muted-foreground">@{username}</p>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-4 sm:mt-8">
                    {currentUser?.uid !== profile.uid && (
                      <Button 
                        onClick={handleFollowToggle}
                        variant={isFollowing ? "outline" : "default"}
                        className="animate-fade-in"
                      >
                        {isFollowing ? 'Unfollow' : 'Follow'}
                      </Button>
                    )}
                    
                    {currentUser?.uid !== profile.uid && (
                      <Button variant="outline">
                        <MessageCircle size={18} className="mr-2" />
                        Message
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="mt-6 flex flex-col sm:flex-row gap-6">
                  <div className="flex-1">
                    <p className="text-sm sm:text-base">
                      {profile.bio || "This user hasn't added a bio yet."}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Joined {profile.joinedDate || "Recently"}
                    </p>
                  </div>
                  
                  <div className="flex gap-6 justify-center sm:justify-start">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{followerCount}</p>
                      <p className="text-sm text-muted-foreground">Followers</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-2xl font-bold">{followingCount}</p>
                      <p className="text-sm text-muted-foreground">Following</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Content Tabs */}
        <Tabs defaultValue="activity">
          <div className="border-b mb-6">
            <TabsList className="w-full sm:w-auto justify-start">
              <TabsTrigger value="activity" className="relative">
                Activity
              </TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
              {currentUser?.uid === profile.uid && (
                <TabsTrigger value="settings">Settings</TabsTrigger>
              )}
            </TabsList>
          </div>
          
          <TabsContent value="activity" className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full w-10 h-10 bg-secondary flex items-center justify-center">
                        <Video className="h-5 w-5 text-secondary-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Started a new video call</p>
                        <p className="text-sm text-muted-foreground">2 days ago</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="rounded-full w-10 h-10 bg-secondary flex items-center justify-center">
                        <Users className="h-5 w-5 text-secondary-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Followed 3 new users</p>
                        <p className="text-sm text-muted-foreground">1 week ago</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="rounded-full w-10 h-10 bg-secondary flex items-center justify-center">
                        <Heart className="h-5 w-5 text-secondary-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Received 5 new likes</p>
                        <p className="text-sm text-muted-foreground">2 weeks ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium">Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-primary">42</p>
                      <p className="text-sm text-muted-foreground">Video Calls</p>
                    </div>
                    
                    <div className="border rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-primary">157</p>
                      <p className="text-sm text-muted-foreground">Messages</p>
                    </div>
                    
                    <div className="border rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-primary">18</p>
                      <p className="text-sm text-muted-foreground">Hours Online</p>
                    </div>
                    
                    <div className="border rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-primary">89%</p>
                      <p className="text-sm text-muted-foreground">Positive Rating</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="videos" className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover-scale transition-all">
                <CardContent className="p-0 overflow-hidden">
                  <div className="aspect-video bg-muted relative rounded-t-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold">Random Call #42</h3>
                    <p className="text-sm text-muted-foreground">3 days ago • 12 minutes</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover-scale transition-all">
                <CardContent className="p-0 overflow-hidden">
                  <div className="aspect-video bg-muted relative rounded-t-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold">Random Call #41</h3>
                    <p className="text-sm text-muted-foreground">1 week ago • 8 minutes</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover-scale transition-all">
                <CardContent className="p-0 overflow-hidden">
                  <div className="aspect-video bg-muted relative rounded-t-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold">Random Call #40</h3>
                    <p className="text-sm text-muted-foreground">2 weeks ago • 15 minutes</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="about" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle>About {profile.displayName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Bio</h3>
                  <p>{profile.bio || "This user hasn't added a bio yet."}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-2">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Video Chat</Badge>
                    <Badge>Meeting New People</Badge>
                    <Badge>Languages</Badge>
                    <Badge>Technology</Badge>
                    <Badge>Travel</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {currentUser?.uid === profile.uid && (
            <TabsContent value="settings" className="animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Edit your profile information and privacy settings
                  </p>
                  <Button>Edit Profile</Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
