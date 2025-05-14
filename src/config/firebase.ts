import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

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
export const auth = getAuth(app);
export const database = getDatabase(app);
export const analytics = getAnalytics(app);

export default app; 