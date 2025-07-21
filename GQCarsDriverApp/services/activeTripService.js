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
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../../firebase.js';

/**
 * Active Trips Collection Schema:
 * {
 *   id: string (document ID - auto-generated),
 *   rideRequestId: string,
 *   driverId: string,
 *   passengerId: string,
 *   passengerInfo: {
 *     name: string,
 *     phone: string,
 *     rating: number
 *   },
 *   driverInfo: {
 *     name: string,
 *     phone: string,
 *     vehicleInfo: object,
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
 *   currentLocation: {
 *     latitude: number,
 *     longitude: number,
 *     timestamp: timestamp
 *   },
 *   route: {
 *     distance: number, // in kilometers
 *     duration: number, // in minutes
 *     polyline: string // encoded polyline for route
 *   },
 *   status: string, // 'assigned', 'en_route_pickup', 'arrived_pickup', 'passenger_onboard', 'en_route_dropoff', 'completed', 'cancelled'
 *   fareInfo: {
 *     baseFare: number,
 *     distanceFare: number,
 *     timeFare: number,
 *     surgeFare: number,
 *     discount: number,
 *     totalFare: number,
 *     driverEarning: number
 *   },
 *   rideType: string, // 'standard', 'premium', 'shared'
 *   paymentMethod: string, // 'cash', 'card', 'wallet'
 *   paymentStatus: string, // 'pending', 'paid', 'failed'
 *   startTime: timestamp,
 *   pickupTime: timestamp (optional),
 *   dropoffTime: timestamp (optional),
 *   completedTime: timestamp (optional),
 *   estimatedArrival: timestamp,
 *   actualDistance: number (optional),
 *   actualDuration: number (optional),
 *   rating: {
 *     passengerRating: number (optional),
 *     driverRating: number (optional),
 *     passengerFeedback: string (optional),
 *     driverFeedback: string (optional)
 *   },
 *   createdAt: timestamp,
 *   updatedAt: timestamp
 * }
 */

const COLLECTION_NAME = 'active_trips';

class ActiveTripService {
  constructor() {
    this.collectionRef = collection(db, COLLECTION_NAME);
  }

  /**
   * Create a new active trip from accepted ride request
   */
  async createActiveTrip(rideRequestData, driverInfo) {
    try {
      const now = new Date();
      
      const activeTrip = {
        rideRequestId: rideRequestData.id,
        driverId: rideRequestData.assignedDriverId,
        passengerId: rideRequestData.passengerId,
        passengerInfo: rideRequestData.passengerInfo,
        driverInfo,
        pickupLocation: rideRequestData.pickupLocation,
        dropoffLocation: rideRequestData.dropoffLocation,
        route: {
          distance: rideRequestData.estimatedDistance,
          duration: rideRequestData.estimatedDuration,
          polyline: ''
        },
        status: 'assigned',
        fareInfo: {
          baseFare: 0,
          distanceFare: 0,
          timeFare: 0,
          surgeFare: 0,
          discount: rideRequestData.discount || 0,
          totalFare: rideRequestData.estimatedFare,
          driverEarning: 0
        },
        rideType: rideRequestData.rideType,
        paymentMethod: rideRequestData.paymentMethod,
        paymentStatus: 'pending',
        startTime: now,
        estimatedArrival: new Date(now.getTime() + (rideRequestData.estimatedDuration * 60 * 1000)),
        rating: {},
        createdAt: now,
        updatedAt: now
      };
      
      const docRef = await addDoc(this.collectionRef, activeTrip);
      return { id: docRef.id, ...activeTrip };
    } catch (error) {
      console.error('Error creating active trip:', error);
      throw new Error(`Failed to create active trip: ${error.message}`);
    }
  }

  /**
   * Get active trip by ID
   */
  async getActiveTrip(tripId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, tripId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Active trip not found');
      }
    } catch (error) {
      console.error('Error getting active trip:', error);
      throw new Error(`Failed to get active trip: ${error.message}`);
    }
  }

  /**
   * Get active trip by driver ID
   */
  async getActiveeTripByDriver(driverId) {
    try {
      const q = query(
        this.collectionRef,
        where('driverId', '==', driverId),
        where('status', 'in', ['assigned', 'en_route_pickup', 'arrived_pickup', 'passenger_onboard', 'en_route_dropoff'])
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting active trip by driver:', error);
      throw new Error(`Failed to get active trip by driver: ${error.message}`);
    }
  }

  /**
   * Update trip status
   */
  async updateTripStatus(tripId, status, additionalData = {}) {
    try {
      const docRef = doc(db, COLLECTION_NAME, tripId);
      const now = new Date();
      
      const updateData = {
        status,
        updatedAt: now,
        ...additionalData
      };

      // Add timestamp for specific status changes
      switch (status) {
        case 'arrived_pickup':
          updateData.arrivedPickupTime = now;
          break;
        case 'passenger_onboard':
          updateData.pickupTime = now;
          break;
        case 'completed':
          updateData.completedTime = now;
          updateData.dropoffTime = now;
          break;
      }
      
      await updateDoc(docRef, updateData);
      return await this.getActiveTrip(tripId);
    } catch (error) {
      console.error('Error updating trip status:', error);
      throw new Error(`Failed to update trip status: ${error.message}`);
    }
  }

  /**
   * Update driver's current location during trip
   */
  async updateTripLocation(tripId, location) {
    try {
      const docRef = doc(db, COLLECTION_NAME, tripId);
      
      await updateDoc(docRef, {
        currentLocation: {
          ...location,
          timestamp: new Date()
        },
        updatedAt: new Date()
      });
      
      return location;
    } catch (error) {
      console.error('Error updating trip location:', error);
      throw new Error(`Failed to update trip location: ${error.message}`);
    }
  }

  /**
   * Update route information
   */
  async updateTripRoute(tripId, routeData) {
    try {
      const docRef = doc(db, COLLECTION_NAME, tripId);
      
      await updateDoc(docRef, {
        route: routeData,
        updatedAt: new Date()
      });
      
      return routeData;
    } catch (error) {
      console.error('Error updating trip route:', error);
      throw new Error(`Failed to update trip route: ${error.message}`);
    }
  }

  /**
   * Complete trip with final fare calculation
   */
  async completeTrip(tripId, finalFareInfo, actualDistance, actualDuration) {
    try {
      const docRef = doc(db, COLLECTION_NAME, tripId);
      const now = new Date();
      
      await updateDoc(docRef, {
        status: 'completed',
        fareInfo: finalFareInfo,
        actualDistance,
        actualDuration,
        completedTime: now,
        dropoffTime: now,
        paymentStatus: 'paid',
        updatedAt: now
      });
      
      return await this.getActiveTrip(tripId);
    } catch (error) {
      console.error('Error completing trip:', error);
      throw new Error(`Failed to complete trip: ${error.message}`);
    }
  }

  /**
   * Cancel active trip
   */
  async cancelTrip(tripId, reason = '', cancelledBy = 'driver') {
    try {
      const docRef = doc(db, COLLECTION_NAME, tripId);
      
      await updateDoc(docRef, {
        status: 'cancelled',
        cancellationReason: reason,
        cancelledBy,
        cancelledTime: new Date(),
        updatedAt: new Date()
      });
      
      return await this.getActiveTrip(tripId);
    } catch (error) {
      console.error('Error cancelling trip:', error);
      throw new Error(`Failed to cancel trip: ${error.message}`);
    }
  }

  /**
   * Add rating and feedback
   */
  async addTripRating(tripId, rating, feedback, raterType = 'driver') {
    try {
      const docRef = doc(db, COLLECTION_NAME, tripId);
      const trip = await this.getActiveTrip(tripId);
      
      const ratingUpdate = { ...trip.rating };
      
      if (raterType === 'driver') {
        ratingUpdate.driverRating = rating;
        ratingUpdate.driverFeedback = feedback;
      } else {
        ratingUpdate.passengerRating = rating;
        ratingUpdate.passengerFeedback = feedback;
      }
      
      await updateDoc(docRef, {
        rating: ratingUpdate,
        updatedAt: new Date()
      });
      
      return ratingUpdate;
    } catch (error) {
      console.error('Error adding trip rating:', error);
      throw new Error(`Failed to add trip rating: ${error.message}`);
    }
  }

  /**
   * Listen to active trip changes
   */
  subscribeToActiveTrip(tripId, callback) {
    try {
      const docRef = doc(db, COLLECTION_NAME, tripId);
      
      return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
          callback({ id: doc.id, ...doc.data() });
        } else {
          callback(null);
        }
      }, (error) => {
        console.error('Error in active trip subscription:', error);
        callback(null, error);
      });
    } catch (error) {
      console.error('Error setting up active trip subscription:', error);
      throw new Error(`Failed to subscribe to active trip: ${error.message}`);
    }
  }

  /**
   * Listen to driver's current trip
   */
  subscribeToDriverTrip(driverId, callback) {
    try {
      const q = query(
        this.collectionRef,
        where('driverId', '==', driverId),
        where('status', 'in', ['assigned', 'en_route_pickup', 'arrived_pickup', 'passenger_onboard', 'en_route_dropoff'])
      );
      
      return onSnapshot(q, (querySnapshot) => {
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          callback({ id: doc.id, ...doc.data() });
        } else {
          callback(null);
        }
      }, (error) => {
        console.error('Error in driver trip subscription:', error);
        callback(null, error);
      });
    } catch (error) {
      console.error('Error setting up driver trip subscription:', error);
      throw new Error(`Failed to subscribe to driver trip: ${error.message}`);
    }
  }

  /**
   * Get trip history for driver
   */
  async getDriverTripHistory(driverId, limit = 50) {
    try {
      const q = query(
        this.collectionRef,
        where('driverId', '==', driverId),
        where('status', 'in', ['completed', 'cancelled']),
        orderBy('completedTime', 'desc'),
        limit(limit)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting driver trip history:', error);
      throw new Error(`Failed to get driver trip history: ${error.message}`);
    }
  }
}

export default new ActiveTripService();