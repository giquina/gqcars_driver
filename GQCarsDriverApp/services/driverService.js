import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../../firebase.js';

/**
 * Driver Collection Schema:
 * {
 *   id: string (document ID - driver's user ID),
 *   email: string,
 *   firstName: string,
 *   lastName: string,
 *   phone: string,
 *   profileImage: string (URL),
 *   licenseNumber: string,
 *   vehicleInfo: {
 *     make: string,
 *     model: string,
 *     year: number,
 *     color: string,
 *     licensePlate: string,
 *     vehicleType: string, // 'sedan', 'suv', 'compact', etc.
 *   },
 *   status: string, // 'online', 'offline', 'busy'
 *   location: {
 *     latitude: number,
 *     longitude: number,
 *     timestamp: timestamp
 *   },
 *   rating: number,
 *   totalRides: number,
 *   totalEarnings: number,
 *   isVerified: boolean,
 *   documents: {
 *     license: string (URL),
 *     insurance: string (URL),
 *     registration: string (URL)
 *   },
 *   createdAt: timestamp,
 *   updatedAt: timestamp
 * }
 */

const COLLECTION_NAME = 'drivers';

class DriverService {
  constructor() {
    this.collectionRef = collection(db, COLLECTION_NAME);
  }

  /**
   * Create a new driver profile
   */
  async createDriver(driverId, driverData) {
    try {
      const docRef = doc(db, COLLECTION_NAME, driverId);
      const now = new Date();
      
      const driverDoc = {
        ...driverData,
        status: 'offline',
        rating: 0,
        totalRides: 0,
        totalEarnings: 0,
        isVerified: false,
        createdAt: now,
        updatedAt: now
      };
      
      await setDoc(docRef, driverDoc);
      return { id: driverId, ...driverDoc };
    } catch (error) {
      console.error('Error creating driver:', error);
      throw new Error(`Failed to create driver: ${error.message}`);
    }
  }

  /**
   * Get driver by ID
   */
  async getDriver(driverId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, driverId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Driver not found');
      }
    } catch (error) {
      console.error('Error getting driver:', error);
      throw new Error(`Failed to get driver: ${error.message}`);
    }
  }

  /**
   * Update driver profile
   */
  async updateDriver(driverId, updateData) {
    try {
      const docRef = doc(db, COLLECTION_NAME, driverId);
      const updateDoc = {
        ...updateData,
        updatedAt: new Date()
      };
      
      await updateDoc(docRef, updateDoc);
      return await this.getDriver(driverId);
    } catch (error) {
      console.error('Error updating driver:', error);
      throw new Error(`Failed to update driver: ${error.message}`);
    }
  }

  /**
   * Update driver status (online/offline/busy)
   */
  async updateDriverStatus(driverId, status) {
    try {
      const docRef = doc(db, COLLECTION_NAME, driverId);
      await updateDoc(docRef, {
        status,
        updatedAt: new Date()
      });
      return status;
    } catch (error) {
      console.error('Error updating driver status:', error);
      throw new Error(`Failed to update driver status: ${error.message}`);
    }
  }

  /**
   * Update driver location
   */
  async updateDriverLocation(driverId, location) {
    try {
      const docRef = doc(db, COLLECTION_NAME, driverId);
      await updateDoc(docRef, {
        location: {
          ...location,
          timestamp: new Date()
        },
        updatedAt: new Date()
      });
      return location;
    } catch (error) {
      console.error('Error updating driver location:', error);
      throw new Error(`Failed to update driver location: ${error.message}`);
    }
  }

  /**
   * Get online drivers in a specific area (for admin/dispatch use)
   */
  async getOnlineDrivers() {
    try {
      const q = query(
        this.collectionRef,
        where('status', '==', 'online')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting online drivers:', error);
      throw new Error(`Failed to get online drivers: ${error.message}`);
    }
  }

  /**
   * Listen to driver status changes
   */
  subscribeToDriver(driverId, callback) {
    try {
      const docRef = doc(db, COLLECTION_NAME, driverId);
      
      return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
          callback({ id: doc.id, ...doc.data() });
        } else {
          callback(null);
        }
      }, (error) => {
        console.error('Error in driver subscription:', error);
        callback(null, error);
      });
    } catch (error) {
      console.error('Error setting up driver subscription:', error);
      throw new Error(`Failed to subscribe to driver: ${error.message}`);
    }
  }

  /**
   * Delete driver (admin function)
   */
  async deleteDriver(driverId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, driverId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting driver:', error);
      throw new Error(`Failed to delete driver: ${error.message}`);
    }
  }
}

export default new DriverService();