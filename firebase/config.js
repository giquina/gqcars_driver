import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyaWZfvBUFZZ9cMNEDd783-dyTzD2E5Cs",
  authDomain: "gqcars-db53b.firebaseapp.com",
  projectId: "gqcars-db53b",
  storageBucket: "gqcars-db53b.firebasestorage.app",
  messagingSenderId: "787653764344",
  appId: "1:787653764344:web:838ed115f980025218870d",
  measurementId: "G-QR71KQVKWH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
