import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile,
  User,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";
import { ref, set, get, serverTimestamp } from "firebase/database";
import { isAdminUser } from "@/lib/utils";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDLddOqzzoCREHKnx_SEncULLuNNWZUURA",
  authDomain: "minew-c9c77.firebaseapp.com",
  databaseURL: "https://minew-c9c77-default-rtdb.firebaseio.com",
  projectId: "minew-c9c77",
  storageBucket: "minew-c9c77.firebasestorage.app",
  messagingSenderId: "489034285336",
  appId: "1:489034285336:web:14616e29fb1fd244c71e6d",
  measurementId: "G-Y9G43302K3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Auth functions
export const signUp = async (email: string, password: string, displayName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });

    // Initialize user data in realtime database
    const userId = userCredential.user.uid;
    const userRef = ref(rtdb, `users/${userId}`);
    
    await set(userRef, {
      profile: {
        displayName,
        bio: '',
        avatarSeed: userId
      },
      stats: {
        level: 1,
        xp: 0,
        totalCalls: 0,
        totalMessages: 0,
        uniqueConnections: 0
      },
      roles: {
        admin: isAdminUser(email),
        dev: email === "sukunadew@gmail.com"
      },
      email: email,
      createdAt: Date.now()
    });

    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const displayName = result.user.displayName || result.user.email?.split('@')[0] || 'Anonymous';
    
    // Check if user data exists in the database
    const userRef = ref(rtdb, `users/${result.user.uid}`);
    const snapshot = await get(userRef);
    
    // If user data doesn't exist, initialize it
    if (!snapshot.exists()) {
      await set(userRef, {
        profile: {
          displayName: displayName,
          bio: '',
          avatarSeed: result.user.uid
        },
        stats: {
          level: 1,
          xp: 0,
          totalCalls: 0,
          totalMessages: 0,
          uniqueConnections: 0
        },
        roles: {
          admin: isAdminUser(result.user.email),
          dev: result.user.email === "sukunadew@gmail.com"
        },
        email: result.user.email,
        createdAt: Date.now()
      });

      // Initialize presence data
      const presenceRef = ref(rtdb, `presence/${result.user.uid}`);
      await set(presenceRef, {
        displayName: displayName,
        email: result.user.email,
        bio: '',
        avatarSeed: result.user.uid,
        lastSeen: serverTimestamp(),
        status: 'online'
      });
    } else {
      // Update existing user's presence
      const presenceRef = ref(rtdb, `presence/${result.user.uid}`);
      const presenceSnapshot = await get(presenceRef);
      const userData = snapshot.val();
      
      await set(presenceRef, {
        displayName: userData.profile?.displayName || displayName,
        email: result.user.email,
        bio: userData.profile?.bio || '',
        avatarSeed: userData.profile?.avatarSeed || result.user.uid,
        lastSeen: serverTimestamp(),
        status: 'online'
      });
    }

    return result.user;
  } catch (error: any) {
    console.error('Google Sign-in Error:', error.code, error.message);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw error;
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Phone Authentication Functions
export const setupRecaptcha = (elementId: string) => {
  const auth = getAuth();
  return new RecaptchaVerifier(auth, elementId, {
    size: 'invisible',
    callback: () => {},
  });
};

export const startPhoneAuth = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => {
  const auth = getAuth();
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    return confirmationResult;
  } catch (error) {
    throw error;
  }
};

export const verifyPhoneCode = async (confirmationResult: any, code: string) => {
  try {
    const result = await confirmationResult.confirm(code);
    const user = result.user;
    
    // Get existing user data
    const userRef = ref(rtdb, `users/${user.uid}/profile`);
    const snapshot = await get(userRef);
    const existingData = snapshot.exists() ? snapshot.val() : {};
    
    // Update user's phone number while preserving existing data
    await set(userRef, {
      ...existingData,
      phoneNumber: user.phoneNumber,
      phoneVerified: true,
      phoneVerifiedAt: Date.now()
    });

    return user;
  } catch (error) {
    throw error;
  }
};

export { auth, db, rtdb, analytics, onAuthStateChanged };
