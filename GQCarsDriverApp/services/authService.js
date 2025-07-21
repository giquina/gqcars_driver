import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  deleteUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../firebase';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.driverProfile = null;
  }

  /**
   * Register a new driver with email and password
   * @param {string} email 
   * @param {string} password 
   * @param {Object} driverData - Driver profile information
   */
  async registerDriver(email, password, driverData) {
    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, {
        displayName: `${driverData.firstName} ${driverData.lastName}`
      });

      // Create driver profile in Firestore
      const driverProfile = {
        uid: user.uid,
        email: user.email,
        firstName: driverData.firstName,
        lastName: driverData.lastName,
        phone: driverData.phone,
        dateOfBirth: driverData.dateOfBirth,
        licenseNumber: driverData.licenseNumber,
        vehicleInfo: driverData.vehicleInfo || {},
        status: 'pending_verification', // pending_verification, verified, suspended
        isOnline: false,
        rating: 5.0,
        totalTrips: 0,
        totalEarnings: 0,
        documents: {
          license: { verified: false, url: null },
          insurance: { verified: false, url: null },
          vehicleRegistration: { verified: false, url: null },
          profilePhoto: { verified: false, url: null }
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'drivers', user.uid), driverProfile);

      // Store user session
      await this.storeUserSession(user);

      this.currentUser = user;
      this.driverProfile = driverProfile;

      return {
        success: true,
        user,
        profile: driverProfile
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in driver with email and password
   * @param {string} email 
   * @param {string} password 
   */
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch driver profile
      const profile = await this.getDriverProfile(user.uid);
      if (!profile) {
        throw new Error('Driver profile not found. Please contact support.');
      }

      // Store user session
      await this.storeUserSession(user);

      this.currentUser = user;
      this.driverProfile = profile;

      return {
        success: true,
        user,
        profile
      };
    } catch (error) {
      console.error('Sign in error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out current user
   */
  async signOut() {
    try {
      // Update driver status to offline before signing out
      if (this.currentUser && this.driverProfile) {
        await this.updateDriverStatus(false);
      }

      await signOut(auth);
      await this.clearUserSession();

      this.currentUser = null;
      this.driverProfile = null;

      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser() {
    return auth.currentUser;
  }

  /**
   * Get driver profile from Firestore
   * @param {string} uid 
   */
  async getDriverProfile(uid) {
    try {
      const docRef = doc(db, 'drivers', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching driver profile:', error);
      throw error;
    }
  }

  /**
   * Update driver profile
   * @param {string} uid 
   * @param {Object} updates 
   */
  async updateDriverProfile(uid, updates) {
    try {
      const docRef = doc(db, 'drivers', uid);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, updateData);
      
      // Update local profile
      if (this.driverProfile && this.driverProfile.uid === uid) {
        this.driverProfile = { ...this.driverProfile, ...updateData };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating driver profile:', error);
      throw error;
    }
  }

  /**
   * Update driver online/offline status
   * @param {boolean} isOnline 
   */
  async updateDriverStatus(isOnline) {
    try {
      if (!this.currentUser) {
        throw new Error('No authenticated user');
      }

      await this.updateDriverProfile(this.currentUser.uid, { isOnline });
      return { success: true };
    } catch (error) {
      console.error('Error updating driver status:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param {string} email 
   */
  async sendPasswordResetEmail(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update user password
   * @param {string} currentPassword 
   * @param {string} newPassword 
   */
  async updatePassword(currentPassword, newPassword) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Re-authenticate user before password change
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      return { success: true };
    } catch (error) {
      console.error('Password update error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Delete user account (admin function)
   */
  async deleteAccount() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Delete driver profile from Firestore
      await deleteDoc(doc(db, 'drivers', user.uid));

      // Delete user account
      await deleteUser(user);

      await this.clearUserSession();
      this.currentUser = null;
      this.driverProfile = null;

      return { success: true };
    } catch (error) {
      console.error('Account deletion error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Check if phone number is already registered
   * @param {string} phone 
   */
  async isPhoneNumberRegistered(phone) {
    try {
      const driversRef = collection(db, 'drivers');
      const q = query(driversRef, where('phone', '==', phone));
      const querySnapshot = await getDocs(q);
      
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking phone number:', error);
      throw error;
    }
  }

  /**
   * Check if license number is already registered
   * @param {string} licenseNumber 
   */
  async isLicenseNumberRegistered(licenseNumber) {
    try {
      const driversRef = collection(db, 'drivers');
      const q = query(driversRef, where('licenseNumber', '==', licenseNumber));
      const querySnapshot = await getDocs(q);
      
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking license number:', error);
      throw error;
    }
  }

  /**
   * Upload driver document (mock implementation)
   * @param {string} documentType 
   * @param {string} fileUri 
   */
  async uploadDocument(documentType, fileUri) {
    try {
      // Mock implementation - in real app, upload to Firebase Storage
      const mockUrl = `https://storage.googleapis.com/gqcars-docs/${this.currentUser.uid}/${documentType}.jpg`;
      
      await this.updateDriverProfile(this.currentUser.uid, {
        [`documents.${documentType}.url`]: mockUrl,
        [`documents.${documentType}.uploadedAt`]: serverTimestamp()
      });

      return {
        success: true,
        url: mockUrl
      };
    } catch (error) {
      console.error('Document upload error:', error);
      throw error;
    }
  }

  /**
   * Set up auth state listener
   * @param {Function} callback 
   */
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in
        this.currentUser = user;
        try {
          this.driverProfile = await this.getDriverProfile(user.uid);
        } catch (error) {
          console.error('Error fetching driver profile on auth change:', error);
        }
      } else {
        // User is signed out
        this.currentUser = null;
        this.driverProfile = null;
      }
      callback(user);
    });
  }

  /**
   * Store user session in AsyncStorage
   * @param {Object} user 
   */
  async storeUserSession(user) {
    try {
      const sessionData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        lastLogin: new Date().toISOString()
      };
      await AsyncStorage.setItem('userSession', JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error storing user session:', error);
    }
  }

  /**
   * Clear user session from AsyncStorage
   */
  async clearUserSession() {
    try {
      await AsyncStorage.removeItem('userSession');
    } catch (error) {
      console.error('Error clearing user session:', error);
    }
  }

  /**
   * Get stored user session
   */
  async getStoredSession() {
    try {
      const sessionData = await AsyncStorage.getItem('userSession');
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('Error getting stored session:', error);
      return null;
    }
  }

  /**
   * Handle authentication errors and return user-friendly messages
   * @param {Error} error 
   */
  handleAuthError(error) {
    let message = 'An unexpected error occurred. Please try again.';

    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'This email address is already registered. Please use a different email or sign in.';
        break;
      case 'auth/weak-password':
        message = 'Password is too weak. Please use at least 6 characters.';
        break;
      case 'auth/invalid-email':
        message = 'Please enter a valid email address.';
        break;
      case 'auth/user-disabled':
        message = 'This account has been disabled. Please contact support.';
        break;
      case 'auth/user-not-found':
        message = 'No account found with this email address.';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password. Please try again.';
        break;
      case 'auth/invalid-credential':
        message = 'Invalid email or password. Please check your credentials.';
        break;
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/network-request-failed':
        message = 'Network error. Please check your internet connection.';
        break;
      default:
        if (error.message) {
          message = error.message;
        }
    }

    return new Error(message);
  }

  /**
   * Validate driver registration data
   * @param {Object} data 
   */
  validateDriverData(data) {
    const errors = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!data.password || data.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    // Name validation
    if (!data.firstName || data.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }

    if (!data.lastName || data.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }

    // Phone validation
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!data.phone || !phoneRegex.test(data.phone) || data.phone.replace(/\D/g, '').length < 10) {
      errors.phone = 'Please enter a valid phone number';
    }

    // License number validation
    if (!data.licenseNumber || data.licenseNumber.trim().length < 5) {
      errors.licenseNumber = 'Please enter a valid license number';
    }

    // Date of birth validation
    if (!data.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    } else {
      const birthDate = new Date(data.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        errors.dateOfBirth = 'You must be at least 18 years old';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

// Export singleton instance
export default new AuthService();