import { rtdb } from '../services/firebase';
import { ref, onValue, set, onDisconnect, off, serverTimestamp, get } from 'firebase/database';

interface UserPresence {
  displayName: string;
  lastSeen: number | object; // Firebase server timestamp can be number or object
  status: 'online' | 'offline';
  email?: string;
  bio?: string;
  avatarSeed?: string;
  stats: {
    level: number;
    xp: number;
    totalCalls: number;
    totalMessages: number;
    uniqueConnections: number;
  };
}

class PresenceService {
  private userRef: any;
  private connectedRef: any;
  private presenceRef: any;
  private heartbeatInterval: NodeJS.Timeout | null;
  private currentDisplayName: string = 'Anonymous';
  private currentEmail: string | null = null;
  private userId: string | null = null;
  private disconnectHandler: any = null;
  private profileListener: any = null;
  private currentProfile: {
    bio?: string;
    avatarSeed?: string;
  } = {};

  constructor() {
    this.userRef = null;
    this.connectedRef = ref(rtdb, '.info/connected');
    this.presenceRef = ref(rtdb, 'presence');
    this.heartbeatInterval = null;
  }

  async initializePresence(userId: string, displayName: string = 'Anonymous', email: string | null = null) {
    if (!userId) return;

    // Cleanup previous state if any
    await this.cleanup();

    this.userId = userId;
    this.currentDisplayName = displayName;
    this.currentEmail = email;
    console.log('Initializing presence with email:', email); // Debug log
    this.userRef = ref(rtdb, `presence/${userId}`);

    // Get existing profile data and user data
    try {
      const [profileSnapshot, userSnapshot, statsSnapshot] = await Promise.all([
        get(ref(rtdb, `users/${userId}/profile`)),
        get(ref(rtdb, `users/${userId}`)),
        get(ref(rtdb, `users/${userId}/stats`))
      ]);

      // Get profile data
      if (profileSnapshot.exists()) {
        const profileData = profileSnapshot.val();
        this.currentProfile = {
          bio: profileData.bio || '',
          avatarSeed: profileData.avatarSeed || userId
        };
      }

      // Get user data including email
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        // Use the most recent email, prioritizing the passed email
        this.currentEmail = email || userData.email || null;
        console.log('Retrieved user email:', this.currentEmail); // Debug log
      }

      // Get stats data
      let stats = {
        level: 1,
        xp: 0,
        totalCalls: 0,
        totalMessages: 0,
        uniqueConnections: 0
      };
      
      if (statsSnapshot.exists()) {
        stats = statsSnapshot.val();
      }

      // Set initial presence with current display name and profile data
      const presenceData: UserPresence = {
        displayName: this.currentDisplayName,
        email: this.currentEmail,
        bio: this.currentProfile.bio,
        avatarSeed: this.currentProfile.avatarSeed,
        lastSeen: serverTimestamp(),
        status: 'offline' as const,
        stats: stats
      };
      console.log('Setting initial presence data:', presenceData); // Debug log
      await this.setPresenceData(presenceData);

      // Monitor connection state
      onValue(this.connectedRef, async (snapshot) => {
        if (snapshot.val() === false) {
          await this.setOfflineStatus();
          return;
        }

        // Cancel any existing disconnect handler
        if (this.disconnectHandler) {
          this.disconnectHandler.cancel();
        }

        // Set up new disconnect handler
        this.disconnectHandler = onDisconnect(this.userRef);
        await this.disconnectHandler.set({
          displayName: this.currentDisplayName,
          email: this.currentEmail,
          bio: this.currentProfile.bio,
          avatarSeed: this.currentProfile.avatarSeed,
          lastSeen: serverTimestamp(),
          status: 'offline',
          stats: stats
        });

        // Set online status
        await this.setPresenceData({
          displayName: this.currentDisplayName,
          email: this.currentEmail,
          bio: this.currentProfile.bio,
          avatarSeed: this.currentProfile.avatarSeed,
          lastSeen: serverTimestamp(),
          status: 'online',
          stats: stats
        });
      });

      // Start heartbeat
      this.startHeartbeat();

      // Listen for profile, user data, and stats changes
      this.profileListener = onValue(ref(rtdb, `users/${userId}`), async (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          this.currentDisplayName = userData.profile?.displayName || this.currentDisplayName;
          this.currentEmail = email || userData.email || this.currentEmail;
          this.currentProfile = {
            bio: userData.profile?.bio || '',
            avatarSeed: userData.profile?.avatarSeed || userId
          };

          // Get latest stats
          const statsRef = ref(rtdb, `users/${userId}/stats`);
          const statsSnapshot = await get(statsRef);
          const currentStats = statsSnapshot.exists() ? statsSnapshot.val() : stats;

          // Update presence with new data
          await this.setPresenceData({
            displayName: this.currentDisplayName,
            email: this.currentEmail,
            bio: this.currentProfile.bio,
            avatarSeed: this.currentProfile.avatarSeed,
            lastSeen: serverTimestamp(),
            status: 'online',
            stats: currentStats
          });
        }
      });

    } catch (error) {
      console.error('Error initializing presence:', error);
    }
  }

  private async setOfflineStatus() {
    if (!this.userRef || !this.currentDisplayName) return;
    
    try {
      await this.setPresenceData({
        displayName: this.currentDisplayName,
        email: this.currentEmail,
        bio: this.currentProfile.bio,
        avatarSeed: this.currentProfile.avatarSeed,
        lastSeen: serverTimestamp(),
        status: 'offline',
        stats: {
          level: 1,
          xp: 0,
          totalCalls: 0,
          totalMessages: 0,
          uniqueConnections: 0
        }
      });
    } catch (error) {
      console.error('Error setting offline status:', error);
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      if (this.userRef && this.currentDisplayName) {
        await this.setPresenceData({
          displayName: this.currentDisplayName,
          email: this.currentEmail,
          bio: this.currentProfile.bio,
          avatarSeed: this.currentProfile.avatarSeed,
          lastSeen: serverTimestamp(),
          status: 'online',
          stats: {
            level: 1,
            xp: 0,
            totalCalls: 0,
            totalMessages: 0,
            uniqueConnections: 0
          }
        });
      }
    }, 15000);
  }

  private async setPresenceData(data: UserPresence) {
    if (!this.userRef) return;

    try {
      console.log('Setting presence data:', {
        ...data,
        displayName: data.displayName || this.currentDisplayName,
        email: this.currentEmail
      });
      await set(this.userRef, {
        ...data,
        displayName: data.displayName || this.currentDisplayName,
        email: this.currentEmail
      });
    } catch (error) {
      console.error('Error setting presence data:', error);
    }
  }

  onOnlineUsersChange(callback: (count: number) => void) {
    onValue(this.presenceRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(0);
        return;
      }

      const users = snapshot.val();
      const onlineCount = Object.values(users).filter((user: any) => {
        return user.status === 'online' && user.displayName;
      }).length;

      callback(onlineCount);
    });
  }

  async cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.userRef) {
      off(this.userRef);
    }

    if (this.profileListener) {
      off(this.profileListener);
      this.profileListener = null;
    }

    if (this.disconnectHandler) {
      this.disconnectHandler.cancel();
      this.disconnectHandler = null;
    }

    this.userRef = null;
    this.userId = null;
    this.currentDisplayName = 'Anonymous';
    this.currentEmail = null;
    this.currentProfile = {};
  }
}

export const presenceService = new PresenceService(); 