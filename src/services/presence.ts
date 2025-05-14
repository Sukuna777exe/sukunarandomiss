import { rtdb } from '../services/firebase';
import { ref, onValue, set, onDisconnect, off, serverTimestamp, get } from 'firebase/database';

interface UserPresence {
  displayName: string;
  lastSeen: number | object; // Firebase server timestamp can be number or object
  status: 'online' | 'offline';
  email?: string;
  bio?: string;
  avatarSeed?: string;
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

    // Get existing profile data
    try {
      const profileRef = ref(rtdb, `users/${userId}/profile`);
      const profileSnapshot = await get(profileRef);
      if (profileSnapshot.exists()) {
        const profileData = profileSnapshot.val();
        this.currentProfile = {
          bio: profileData.bio || '',
          avatarSeed: profileData.avatarSeed || userId
        };
      }

      // Get existing user data to preserve display name and email
      const snapshot = await get(this.userRef);
      if (snapshot.exists()) {
        const existingData = snapshot.val();
        if (existingData?.displayName) {
          this.currentDisplayName = existingData.displayName;
        }
        // Ensure we always use the most recent email
        this.currentEmail = email || existingData?.email || null;
      }

      // Set initial presence with current display name and profile data
      const presenceData: UserPresence = {
        displayName: this.currentDisplayName,
        email: this.currentEmail, // Make sure email is included
        bio: this.currentProfile.bio,
        avatarSeed: this.currentProfile.avatarSeed,
        lastSeen: serverTimestamp(),
        status: 'offline' as const
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
          email: this.currentEmail, // Include email in disconnect handler
          bio: this.currentProfile.bio,
          avatarSeed: this.currentProfile.avatarSeed,
          lastSeen: serverTimestamp(),
          status: 'offline'
        });

        // Set online status
        await this.setPresenceData({
          displayName: this.currentDisplayName,
          email: this.currentEmail,
          bio: this.currentProfile.bio,
          avatarSeed: this.currentProfile.avatarSeed,
          lastSeen: serverTimestamp(),
          status: 'online'
        });
      });

      // Start heartbeat
      this.startHeartbeat();

      // Listen for profile changes and store the listener reference
      this.profileListener = onValue(profileRef, (snapshot) => {
        if (snapshot.exists()) {
          const profileData = snapshot.val();
          this.currentDisplayName = profileData.displayName || this.currentDisplayName;
          this.currentProfile = {
            bio: profileData.bio || '',
            avatarSeed: profileData.avatarSeed || userId
          };
          // Update presence with new profile data
          this.setPresenceData({
            displayName: this.currentDisplayName,
            email: this.currentEmail,
            bio: this.currentProfile.bio,
            avatarSeed: this.currentProfile.avatarSeed,
            lastSeen: serverTimestamp(),
            status: 'online'
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
        status: 'offline'
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
          status: 'online'
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

      const now = Date.now();
      const users = snapshot.val();
      const onlineCount = Object.values(users).filter((user: any) => {
        const timeDiff = now - (user.lastSeen || 0);
        return timeDiff < 30000 && user.status === 'online' && user.displayName;
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