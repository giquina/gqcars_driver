import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import Constants from 'expo-constants';

// Firebase configuration
// These values should be replaced with your actual Firebase project configuration
// You can find these in your Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || "your-api-key-here",
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || "your-project-id.firebaseapp.com",
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || "your-project-id",
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || "your-project-id.appspot.com",
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || "123456789",
  appId: Constants.expoConfig?.extra?.firebaseAppId || "1:123456789:web:abcdef123456",
  measurementId: Constants.expoConfig?.extra?.firebaseMeasurementId || "G-ABCDEFGHIJ"
};

// Validate Firebase configuration
const validateFirebaseConfig = (config) => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !config[field] || config[field].includes('your-'));
  
  if (missingFields.length > 0) {
    console.warn('Firebase configuration missing or using placeholder values for:', missingFields.join(', '));
    console.warn('Please update your Firebase configuration in app.json extra section or firebase.js');
    return false;
  }
  return true;
};

// Initialize Firebase
let app;
let db;
let auth;
let analytics;

try {
  // Validate configuration before initializing
  const isConfigValid = validateFirebaseConfig(firebaseConfig);
  
  if (!isConfigValid && __DEV__) {
    console.log('Using placeholder Firebase configuration for development');
  }
  
  // Initialize Firebase app
  app = initializeApp(firebaseConfig);
  
  // Initialize Firestore
  db = getFirestore(app);
  
  // Initialize Auth
  auth = getAuth(app);
  
  // Initialize Analytics (only on web and when supported)
  if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    }).catch((error) => {
      console.warn('Analytics initialization failed:', error);
    });
  }
  
  // Connect to emulators in development
  if (__DEV__ && !db._delegate._databaseId.projectId.includes('demo-')) {
    // Uncomment these lines if you want to use Firebase emulators in development
    // Make sure to start the emulators first: firebase emulators:start
    
    // try {
    //   connectFirestoreEmulator(db, 'localhost', 8080);
    //   console.log('Connected to Firestore emulator');
    // } catch (error) {
    //   console.warn('Failed to connect to Firestore emulator:', error.message);
    // }
    
    // try {
    //   connectAuthEmulator(auth, 'http://localhost:9099');
    //   console.log('Connected to Auth emulator');
    // } catch (error) {
    //   console.warn('Failed to connect to Auth emulator:', error.message);
    // }
  }
  
  console.log('Firebase initialized successfully');
  
} catch (error) {
  console.error('Firebase initialization failed:', error);
  throw new Error(`Firebase setup failed: ${error.message}`);
}

// Export Firebase services
export { app, db, auth, analytics };

// Export configuration validation function for testing
export { validateFirebaseConfig };

// Default export for convenience
export default {
  app,
  db,
  auth,
  analytics
};