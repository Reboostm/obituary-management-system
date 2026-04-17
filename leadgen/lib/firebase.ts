import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAPwZXbFZxIfJukcQKozKXA3t1GYVZlUA',
  authDomain: 'reboost-leads.firebaseapp.com',
  projectId: 'reboost-leads',
  storageBucket: 'reboost-leads.firebasestorage.app',
  messagingSenderId: '960696544955',
  appId: '1:960696544955:web:c2af89154050709860f839e',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (e) {
    // Already connected
  }
}

export default app;
