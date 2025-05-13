import { rtdb } from './firebase';
import { ref, onValue, set, onDisconnect } from 'firebase/database';

class PresenceService {
  private static instance: PresenceService;
  private onlineUsersCount: number = 0;
  private onlineUsersCallback: ((count: number) => void) | null = null;
  private onlineUsers: { [key: string]: { online: boolean, lastSeen: string } } = {};

  private constructor() {}

  static getInstance(): PresenceService {
    if (!PresenceService.instance) {
      PresenceService.instance = new PresenceService();
    }
    return PresenceService.instance;
  }

  initializePresence(userId: string) {
    const userStatusRef = ref(rtdb, `status/${userId}`);
    const connectedRef = ref(rtdb, '.info/connected');

    onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        // User is connected
        const userStatus = {
          online: true,
          lastSeen: new Date().toISOString()
        };

        // When the user disconnects, update the status
        onDisconnect(userStatusRef).set({
          online: false,
          lastSeen: new Date().toISOString()
        });

        // Set the user as online
        set(userStatusRef, userStatus);
      }
    });

    // Listen to online users count
    const onlineUsersRef = ref(rtdb, 'status');
    onValue(onlineUsersRef, (snapshot) => {
      if (snapshot.exists()) {
        const users = snapshot.val();
        this.onlineUsers = users;
        const onlineCount = Object.values(users).filter((user: any) => user.online).length;
        this.onlineUsersCount = onlineCount;
        if (this.onlineUsersCallback) {
          this.onlineUsersCallback(onlineCount);
        }
      }
    });
  }

  onOnlineUsersChange(callback: (count: number) => void) {
    this.onlineUsersCallback = callback;
    // Immediately call with current count
    callback(this.onlineUsersCount);
  }

  getOnlineUsersCount(): number {
    return this.onlineUsersCount;
  }

  getOnlineUsers() {
    return Object.entries(this.onlineUsers)
      .filter(([_, status]) => status.online)
      .length;
  }
}

export const presenceService = PresenceService.getInstance(); 