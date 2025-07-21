import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../../firebase.js';

/**
 * Ride Requests Collection Schema:
 * {
 *   id: string (document ID - auto-generated),
 *   passengerId: string,
 *   passengerInfo: {
 *     name: string,
 *     phone: string,
 *     rating: number
 *   },
 *   pickupLocation: {
 *     latitude: number,
 *     longitude: number,
 *     address: string,
 *     placeName: string
 *   },
 *   dropoffLocation: {
 *     latitude: number,
 *     longitude: number,
 *     address: string,
 *     placeName: string
 *   },
 *   rideType: string, // 'standard', 'premium', 'shared'
 *   estimatedDistance: number, // in kilometers
 *   estimatedDuration: number, // in minutes
 *   estimatedFare: number,
 *   status: string, // 'pending', 'accepted', 'cancelled', 'expired'
 *   assignedDriverId: string (optional),
 *   requestTime: timestamp,
 *   acceptedTime: timestamp (optional),
 *   expiresAt: timestamp,
 *   specialRequests: string (optional),
 *   paymentMethod: string, // 'cash', 'card', 'wallet'
 *   promoCode: string (optional),
 *   discount: number (optional),
 *   createdAt: timestamp,
 *   updatedAt: timestamp
 * }
 */

const COLLECTION_NAME = 'ride_requests';

class RideRequestService {
  constructor() {
    this.collectionRef = collection(db, COLLECTION_NAME);
  }

  /**
   * Create a new ride request
   */
  async createRideRequest(requestData) {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (5 * 60 * 1000)); // 5 minutes expiry
      
      const rideRequest = {
        ...requestData,
        status: 'pending',
        requestTime: now,
        expiresAt,
        createdAt: now,
        updatedAt: now
      };
      
      const docRef = await addDoc(this.collectionRef, rideRequest);
      return { id: docRef.id, ...rideRequest };
    } catch (error) {
      console.error('Error creating ride request:', error);
      throw new Error(`Failed to create ride request: ${error.message}`);
    }
  }

  /**
   * Get ride request by ID
   */
  async getRideRequest(requestId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, requestId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Ride request not found');
      }
    } catch (error) {
      console.error('Error getting ride request:', error);
      throw new Error(`Failed to get ride request: ${error.message}`);
    }
  }

  /**
   * Get pending ride requests for drivers
   */
  async getPendingRideRequests(driverLocation = null, radiusKm = 10) {
    try {
      const now = new Date();
      const q = query(
        this.collectionRef,
        where('status', '==', 'pending'),
        where('expiresAt', '>', now),
        orderBy('expiresAt'),
        orderBy('requestTime'),
        limit(20)
      );
      
      const querySnapshot = await getDocs(q);
      let requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // If driver location is provided, filter by distance
      if (driverLocation) {
        requests = requests.filter(request => {
          const distance = this.calculateDistance(
            driverLocation.latitude,
            driverLocation.longitude,
            request.pickupLocation.latitude,
            request.pickupLocation.longitude
          );
          return distance <= radiusKm;
        });
      }

      return requests;
    } catch (error) {
      console.error('Error getting pending ride requests:', error);
      throw new Error(`Failed to get pending ride requests: ${error.message}`);
    }
  }

  /**
   * Accept a ride request
   */
  async acceptRideRequest(requestId, driverId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, requestId);
      const now = new Date();
      
      await updateDoc(docRef, {
        status: 'accepted',
        assignedDriverId: driverId,
        acceptedTime: now,
        updatedAt: now
      });
      
      return await this.getRideRequest(requestId);
    } catch (error) {
      console.error('Error accepting ride request:', error);
      throw new Error(`Failed to accept ride request: ${error.message}`);
    }
  }

  /**
   * Cancel a ride request
   */
  async cancelRideRequest(requestId, reason = '') {
    try {
      const docRef = doc(db, COLLECTION_NAME, requestId);
      
      await updateDoc(docRef, {
        status: 'cancelled',
        cancellationReason: reason,
        updatedAt: new Date()
      });
      
      return await this.getRideRequest(requestId);
    } catch (error) {
      console.error('Error cancelling ride request:', error);
      throw new Error(`Failed to cancel ride request: ${error.message}`);
    }
  }

  /**
   * Listen to ride requests for a specific driver area
   */
  subscribeToRideRequests(callback, driverLocation = null) {
    try {
      const now = new Date();
      const q = query(
        this.collectionRef,
        where('status', '==', 'pending'),
        where('expiresAt', '>', now),
        orderBy('expiresAt'),
        orderBy('requestTime')
      );
      
      return onSnapshot(q, (querySnapshot) => {
        let requests = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter by location if provided
        if (driverLocation) {
          requests = requests.filter(request => {
            const distance = this.calculateDistance(
              driverLocation.latitude,
              driverLocation.longitude,
              request.pickupLocation.latitude,
              request.pickupLocation.longitude
            );
            return distance <= 10; // 10km radius
          });
        }

        callback(requests);
      }, (error) => {
        console.error('Error in ride requests subscription:', error);
        callback([], error);
      });
    } catch (error) {
      console.error('Error setting up ride requests subscription:', error);
      throw new Error(`Failed to subscribe to ride requests: ${error.message}`);
    }
  }

  /**
   * Listen to a specific ride request
   */
  subscribeToRideRequest(requestId, callback) {
    try {
      const docRef = doc(db, COLLECTION_NAME, requestId);
      
      return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
          callback({ id: doc.id, ...doc.data() });
        } else {
          callback(null);
        }
      }, (error) => {
        console.error('Error in ride request subscription:', error);
        callback(null, error);
      });
    } catch (error) {
      console.error('Error setting up ride request subscription:', error);
      throw new Error(`Failed to subscribe to ride request: ${error.message}`);
    }
  }

  /**
   * Mark expired requests as expired (cleanup function)
   */
  async markExpiredRequests() {
    try {
      const now = new Date();
      const q = query(
        this.collectionRef,
        where('status', '==', 'pending'),
        where('expiresAt', '<=', now)
      );
      
      const querySnapshot = await getDocs(q);
      const batch = [];
      
      querySnapshot.docs.forEach((docSnap) => {
        const docRef = doc(db, COLLECTION_NAME, docSnap.id);
        batch.push(updateDoc(docRef, {
          status: 'expired',
          updatedAt: now
        }));
      });
      
      await Promise.all(batch);
      return batch.length;
    } catch (error) {
      console.error('Error marking expired requests:', error);
      throw new Error(`Failed to mark expired requests: ${error.message}`);
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = this.degToRad(lat2 - lat1);
    const dLon = this.degToRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.degToRad(lat1)) * Math.cos(this.degToRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  degToRad(deg) {
    return deg * (Math.PI/180);
  }
}

export default new RideRequestService();