import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc,
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase.js';

/**
 * Earnings Collection Schema:
 * {
 *   id: string (document ID - auto-generated),
 *   driverId: string,
 *   tripId: string,
 *   date: timestamp (date only, for daily aggregation),
 *   tripDetails: {
 *     pickupLocation: string,
 *     dropoffLocation: string,
 *     distance: number,
 *     duration: number,
 *     rideType: string
 *   },
 *   fareBreakdown: {
 *     baseFare: number,
 *     distanceFare: number,
 *     timeFare: number,
 *     surgeFare: number,
 *     tolls: number,
 *     tips: number,
 *     discount: number,
 *     totalFare: number
 *   },
 *   driverEarnings: {
 *     grossEarning: number, // before commission
 *     commission: number, // platform commission
 *     netEarning: number, // after commission
 *     bonus: number, // any bonus payments
 *     totalEarning: number // net + bonus
 *   },
 *   paymentMethod: string, // 'cash', 'card', 'wallet'
 *   paymentStatus: string, // 'paid', 'pending', 'processing'
 *   cashCollected: number, // for cash trips
 *   completedAt: timestamp,
 *   createdAt: timestamp,
 *   updatedAt: timestamp
 * }
 */

/**
 * Daily Earnings Summary Collection Schema:
 * Collection: earnings_daily_summary
 * {
 *   id: string (format: {driverId}_{YYYY-MM-DD}),
 *   driverId: string,
 *   date: timestamp (date only),
 *   summary: {
 *     totalTrips: number,
 *     totalDistance: number,
 *     totalDuration: number,
 *     onlineTime: number, // in minutes
 *     grossEarnings: number,
 *     commission: number,
 *     netEarnings: number,
 *     bonuses: number,
 *     tips: number,
 *     cashCollected: number,
 *     totalEarnings: number
 *   },
 *   tripTypes: {
 *     standard: number,
 *     premium: number,
 *     shared: number
 *   },
 *   paymentMethods: {
 *     cash: number,
 *     card: number,
 *     wallet: number
 *   },
 *   createdAt: timestamp,
 *   updatedAt: timestamp
 * }
 */

const EARNINGS_COLLECTION = 'earnings';
const DAILY_SUMMARY_COLLECTION = 'earnings_daily_summary';

class EarningsService {
  constructor() {
    this.earningsRef = collection(db, EARNINGS_COLLECTION);
    this.dailySummaryRef = collection(db, DAILY_SUMMARY_COLLECTION);
  }

  /**
   * Record earnings for a completed trip
   */
  async recordTripEarning(tripData) {
    try {
      const now = new Date();
      const tripDate = new Date(tripData.completedTime);
      tripDate.setHours(0, 0, 0, 0); // Set to start of day
      
      const earning = {
        driverId: tripData.driverId,
        tripId: tripData.id,
        date: Timestamp.fromDate(tripDate),
        tripDetails: {
          pickupLocation: tripData.pickupLocation.placeName || tripData.pickupLocation.address,
          dropoffLocation: tripData.dropoffLocation.placeName || tripData.dropoffLocation.address,
          distance: tripData.actualDistance || tripData.route.distance,
          duration: tripData.actualDuration || tripData.route.duration,
          rideType: tripData.rideType
        },
        fareBreakdown: {
          baseFare: tripData.fareInfo.baseFare,
          distanceFare: tripData.fareInfo.distanceFare,
          timeFare: tripData.fareInfo.timeFare,
          surgeFare: tripData.fareInfo.surgeFare,
          tolls: tripData.fareInfo.tolls || 0,
          tips: tripData.fareInfo.tips || 0,
          discount: tripData.fareInfo.discount,
          totalFare: tripData.fareInfo.totalFare
        },
        driverEarnings: {
          grossEarning: tripData.fareInfo.driverEarning,
          commission: tripData.fareInfo.totalFare - tripData.fareInfo.driverEarning,
          netEarning: tripData.fareInfo.driverEarning,
          bonus: tripData.fareInfo.bonus || 0,
          totalEarning: (tripData.fareInfo.driverEarning || 0) + (tripData.fareInfo.bonus || 0)
        },
        paymentMethod: tripData.paymentMethod,
        paymentStatus: tripData.paymentStatus,
        cashCollected: tripData.paymentMethod === 'cash' ? tripData.fareInfo.totalFare : 0,
        completedAt: Timestamp.fromDate(new Date(tripData.completedTime)),
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      };
      
      const docRef = await addDoc(this.earningsRef, earning);
      const earningRecord = { id: docRef.id, ...earning };
      
      // Update daily summary
      await this.updateDailySummary(tripData.driverId, tripDate, earning);
      
      return earningRecord;
    } catch (error) {
      console.error('Error recording trip earning:', error);
      throw new Error(`Failed to record trip earning: ${error.message}`);
    }
  }

  /**
   * Update daily earnings summary
   */
  async updateDailySummary(driverId, date, newEarning) {
    try {
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const summaryId = `${driverId}_${dateStr}`;
      const docRef = doc(db, DAILY_SUMMARY_COLLECTION, summaryId);
      
      const existingSummary = await getDoc(docRef);
      const now = new Date();
      
      let summary;
      if (existingSummary.exists()) {
        const data = existingSummary.data();
        summary = {
          ...data,
          summary: {
            totalTrips: data.summary.totalTrips + 1,
            totalDistance: data.summary.totalDistance + newEarning.tripDetails.distance,
            totalDuration: data.summary.totalDuration + newEarning.tripDetails.duration,
            onlineTime: data.summary.onlineTime, // This should be updated separately
            grossEarnings: data.summary.grossEarnings + newEarning.driverEarnings.grossEarning,
            commission: data.summary.commission + newEarning.driverEarnings.commission,
            netEarnings: data.summary.netEarnings + newEarning.driverEarnings.netEarning,
            bonuses: data.summary.bonuses + newEarning.driverEarnings.bonus,
            tips: data.summary.tips + (newEarning.fareBreakdown.tips || 0),
            cashCollected: data.summary.cashCollected + newEarning.cashCollected,
            totalEarnings: data.summary.totalEarnings + newEarning.driverEarnings.totalEarning
          },
          tripTypes: {
            ...data.tripTypes,
            [newEarning.tripDetails.rideType]: (data.tripTypes[newEarning.tripDetails.rideType] || 0) + 1
          },
          paymentMethods: {
            ...data.paymentMethods,
            [newEarning.paymentMethod]: (data.paymentMethods[newEarning.paymentMethod] || 0) + 1
          },
          updatedAt: Timestamp.fromDate(now)
        };
      } else {
        summary = {
          driverId,
          date: Timestamp.fromDate(date),
          summary: {
            totalTrips: 1,
            totalDistance: newEarning.tripDetails.distance,
            totalDuration: newEarning.tripDetails.duration,
            onlineTime: 0,
            grossEarnings: newEarning.driverEarnings.grossEarning,
            commission: newEarning.driverEarnings.commission,
            netEarnings: newEarning.driverEarnings.netEarning,
            bonuses: newEarning.driverEarnings.bonus,
            tips: newEarning.fareBreakdown.tips || 0,
            cashCollected: newEarning.cashCollected,
            totalEarnings: newEarning.driverEarnings.totalEarning
          },
          tripTypes: {
            standard: 0,
            premium: 0,
            shared: 0,
            [newEarning.tripDetails.rideType]: 1
          },
          paymentMethods: {
            cash: 0,
            card: 0,
            wallet: 0,
            [newEarning.paymentMethod]: 1
          },
          createdAt: Timestamp.fromDate(now),
          updatedAt: Timestamp.fromDate(now)
        };
      }
      
      await setDoc(docRef, summary);
      return summary;
    } catch (error) {
      console.error('Error updating daily summary:', error);
      throw new Error(`Failed to update daily summary: ${error.message}`);
    }
  }

  /**
   * Get driver's earnings for a specific date range
   */
  async getEarnings(driverId, startDate, endDate, limitCount = 50) {
    try {
      const q = query(
        this.earningsRef,
        where('driverId', '==', driverId),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc'),
        orderBy('completedAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting earnings:', error);
      throw new Error(`Failed to get earnings: ${error.message}`);
    }
  }

  /**
   * Get daily earnings summary
   */
  async getDailySummary(driverId, date) {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const summaryId = `${driverId}_${dateStr}`;
      const docRef = doc(db, DAILY_SUMMARY_COLLECTION, summaryId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting daily summary:', error);
      throw new Error(`Failed to get daily summary: ${error.message}`);
    }
  }

  /**
   * Get weekly earnings summary
   */
  async getWeeklySummary(driverId, startOfWeek) {
    try {
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const q = query(
        this.dailySummaryRef,
        where('driverId', '==', driverId),
        where('date', '>=', Timestamp.fromDate(startOfWeek)),
        where('date', '<=', Timestamp.fromDate(endOfWeek)),
        orderBy('date', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const dailySummaries = querySnapshot.docs.map(doc => doc.data());
      
      // Aggregate weekly totals
      const weeklyTotal = dailySummaries.reduce((total, day) => ({
        totalTrips: total.totalTrips + day.summary.totalTrips,
        totalDistance: total.totalDistance + day.summary.totalDistance,
        totalDuration: total.totalDuration + day.summary.totalDuration,
        onlineTime: total.onlineTime + day.summary.onlineTime,
        grossEarnings: total.grossEarnings + day.summary.grossEarnings,
        netEarnings: total.netEarnings + day.summary.netEarnings,
        bonuses: total.bonuses + day.summary.bonuses,
        tips: total.tips + day.summary.tips,
        totalEarnings: total.totalEarnings + day.summary.totalEarnings
      }), {
        totalTrips: 0,
        totalDistance: 0,
        totalDuration: 0,
        onlineTime: 0,
        grossEarnings: 0,
        netEarnings: 0,
        bonuses: 0,
        tips: 0,
        totalEarnings: 0
      });
      
      return {
        weekStart: startOfWeek,
        weekEnd: endOfWeek,
        dailySummaries,
        weeklyTotal
      };
    } catch (error) {
      console.error('Error getting weekly summary:', error);
      throw new Error(`Failed to get weekly summary: ${error.message}`);
    }
  }

  /**
   * Get monthly earnings summary
   */
  async getMonthlySummary(driverId, year, month) {
    try {
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);
      
      const q = query(
        this.dailySummaryRef,
        where('driverId', '==', driverId),
        where('date', '>=', Timestamp.fromDate(startOfMonth)),
        where('date', '<=', Timestamp.fromDate(endOfMonth)),
        orderBy('date', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const dailySummaries = querySnapshot.docs.map(doc => doc.data());
      
      // Aggregate monthly totals
      const monthlyTotal = dailySummaries.reduce((total, day) => ({
        totalTrips: total.totalTrips + day.summary.totalTrips,
        totalDistance: total.totalDistance + day.summary.totalDistance,
        totalDuration: total.totalDuration + day.summary.totalDuration,
        onlineTime: total.onlineTime + day.summary.onlineTime,
        grossEarnings: total.grossEarnings + day.summary.grossEarnings,
        netEarnings: total.netEarnings + day.summary.netEarnings,
        bonuses: total.bonuses + day.summary.bonuses,
        tips: total.tips + day.summary.tips,
        totalEarnings: total.totalEarnings + day.summary.totalEarnings
      }), {
        totalTrips: 0,
        totalDistance: 0,
        totalDuration: 0,
        onlineTime: 0,
        grossEarnings: 0,
        netEarnings: 0,
        bonuses: 0,
        tips: 0,
        totalEarnings: 0
      });
      
      return {
        year,
        month,
        monthStart: startOfMonth,
        monthEnd: endOfMonth,
        dailySummaries,
        monthlyTotal
      };
    } catch (error) {
      console.error('Error getting monthly summary:', error);
      throw new Error(`Failed to get monthly summary: ${error.message}`);
    }
  }

  /**
   * Update online time for daily summary
   */
  async updateOnlineTime(driverId, date, additionalMinutes) {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const summaryId = `${driverId}_${dateStr}`;
      const docRef = doc(db, DAILY_SUMMARY_COLLECTION, summaryId);
      
      const existingSummary = await getDoc(docRef);
      if (existingSummary.exists()) {
        const data = existingSummary.data();
        await updateDoc(docRef, {
          'summary.onlineTime': data.summary.onlineTime + additionalMinutes,
          updatedAt: Timestamp.fromDate(new Date())
        });
      }
    } catch (error) {
      console.error('Error updating online time:', error);
      throw new Error(`Failed to update online time: ${error.message}`);
    }
  }

  /**
   * Get top earning days for a driver
   */
  async getTopEarningDays(driverId, limitCount = 10) {
    try {
      const q = query(
        this.dailySummaryRef,
        where('driverId', '==', driverId),
        orderBy('summary.totalEarnings', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting top earning days:', error);
      throw new Error(`Failed to get top earning days: ${error.message}`);
    }
  }
}

export default new EarningsService();