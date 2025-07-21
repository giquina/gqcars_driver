import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Battery from 'expo-battery';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverService } from './index.js';

// Background task name for location tracking
const BACKGROUND_LOCATION_TASK = 'background-location-task';
const GEOFENCE_TASK = 'geofence-task';
const LOCATION_CACHE_KEY = 'cached_locations';
const GEOFENCES_CACHE_KEY = 'cached_geofences';
const ANALYTICS_CACHE_KEY = 'location_analytics';

/**
 * Enhanced Location Service for rideshare driver tracking
 * Features:
 * - Background location tracking with battery optimization
 * - Geofencing for pickup areas and service zones
 * - Offline location caching and sync
 * - Location sharing with passengers via Firebase
 * - Location-based analytics
 * - Intelligent battery management
 */

// Register background tasks
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    locationService.handleBackgroundLocationUpdate(locations);
  }
});

TaskManager.defineTask(GEOFENCE_TASK, ({ data, error }) => {
  if (error) {
    console.error('Geofence task error:', error);
    return;
  }
  if (data) {
    const { eventType, region } = data;
    locationService.handleGeofenceEvent(eventType, region);
  }
});

class LocationService {
  constructor() {
    this.watchId = null;
    this.currentLocation = null;
    this.isTracking = false;
    this.updateInterval = 10000; // 10 seconds
    this.driverId = null;
    this.lastUpdateTime = null;
    this.locationPermissionGranted = false;
    this.backgroundPermissionGranted = false;
    
    // Battery optimization
    this.batteryLevel = 1.0;
    this.batteryState = Battery.BatteryState.UNKNOWN;
    this.adaptiveTracking = true;
    
    // Geofencing
    this.activeGeofences = new Map();
    this.geofenceCallbacks = new Map();
    
    // Offline support
    this.cachedLocations = [];
    this.isOnline = true;
    this.syncInProgress = false;
    
    // Analytics
    this.analytics = {
      totalDistance: 0,
      totalTime: 0,
      averageSpeed: 0,
      lastLocation: null,
      sessionStart: null
    };
    
    // Location sharing
    this.sharingEnabled = false;
    this.shareWithPassengers = [];
    
    this.initialize();
  }

  /**
   * Initialize enhanced location service
   */
  async initialize() {
    try {
      // Initialize network monitoring
      this.setupNetworkMonitoring();
      
      // Initialize battery monitoring
      await this.setupBatteryMonitoring();
      
      // Load cached data
      await this.loadCachedData();
      
      // Request permissions
      await this.requestLocationPermissions();
      
      // Register background tasks
      await this.registerBackgroundTasks();
      
      console.log('Enhanced location service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize location service:', error);
      throw new Error(`Location service initialization failed: ${error.message}`);
    }
  }

  /**
   * Request location permissions with user-friendly prompts
   */
  async requestLocationPermissions() {
    try {
      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        throw new Error('Location services are not enabled on this device. Please enable location services in your device settings.');
      }

      // Request foreground permissions with context
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission is required to track your position and match you with ride requests. Please grant location access in Settings.');
      }

      this.locationPermissionGranted = true;

      // Request background permissions for continuous tracking
      const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
      if (backgroundPermission.status === 'granted') {
        this.backgroundPermissionGranted = true;
        console.log('Background location permission granted - continuous tracking enabled');
      } else {
        console.warn('Background location permission not granted. Location tracking may pause when app is backgrounded.');
        this.backgroundPermissionGranted = false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      throw error;
    }
  }

  /**
   * Setup network connectivity monitoring
   */
  setupNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      if (!wasOnline && this.isOnline) {
        console.log('Network reconnected - syncing cached locations');
        this.syncCachedLocations();
      } else if (wasOnline && !this.isOnline) {
        console.log('Network disconnected - enabling offline mode');
      }
    });
  }

  /**
   * Setup battery monitoring for adaptive tracking
   */
  async setupBatteryMonitoring() {
    try {
      this.batteryLevel = await Battery.getBatteryLevelAsync();
      this.batteryState = await Battery.getBatteryStateAsync();
      
      // Listen for battery level changes
      Battery.addBatteryLevelListener(({ batteryLevel }) => {
        this.batteryLevel = batteryLevel;
        this.adjustTrackingForBattery();
      });
      
      // Listen for battery state changes
      Battery.addBatteryStateListener(({ batteryState }) => {
        this.batteryState = batteryState;
        this.adjustTrackingForBattery();
      });
      
      console.log(`Battery monitoring initialized - Level: ${Math.round(this.batteryLevel * 100)}%, State: ${this.batteryState}`);
    } catch (error) {
      console.warn('Battery monitoring not available:', error);
    }
  }

  /**
   * Adjust tracking parameters based on battery level
   */
  adjustTrackingForBattery() {
    if (!this.adaptiveTracking || !this.isTracking) return;
    
    let newInterval = this.updateInterval;
    
    // Adjust update interval based on battery level and state
    if (this.batteryLevel < 0.15) { // Less than 15%
      newInterval = 30000; // 30 seconds
    } else if (this.batteryLevel < 0.30) { // Less than 30%
      newInterval = 20000; // 20 seconds
    } else if (this.batteryState === Battery.BatteryState.CHARGING) {
      newInterval = 5000; // 5 seconds when charging
    } else {
      newInterval = 10000; // Default 10 seconds
    }
    
    if (newInterval !== this.updateInterval) {
      console.log(`Adjusting location tracking interval to ${newInterval}ms (Battery: ${Math.round(this.batteryLevel * 100)}%)`);
      this.setUpdateInterval(newInterval);
    }
  }

  /**
   * Register background tasks for location tracking
   */
  async registerBackgroundTasks() {
    try {
      // Register background location task
      await BackgroundFetch.registerTaskAsync(BACKGROUND_LOCATION_TASK, {
        minimumInterval: this.adaptiveTracking ? 15 : 30, // seconds
        stopOnTerminate: false,
        startOnBoot: true,
      });
      
      console.log('Background location task registered');
    } catch (error) {
      console.error('Failed to register background tasks:', error);
    }
  }

  /**
   * Load cached data from storage
   */
  async loadCachedData() {
    try {
      // Load cached locations
      const cachedLocations = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
      if (cachedLocations) {
        this.cachedLocations = JSON.parse(cachedLocations);
      }
      
      // Load analytics data
      const analytics = await AsyncStorage.getItem(ANALYTICS_CACHE_KEY);
      if (analytics) {
        this.analytics = { ...this.analytics, ...JSON.parse(analytics) };
      }
      
      // Load geofences
      const geofences = await AsyncStorage.getItem(GEOFENCES_CACHE_KEY);
      if (geofences) {
        const geofenceData = JSON.parse(geofences);
        geofenceData.forEach(gf => {
          this.activeGeofences.set(gf.id, gf);
        });
      }
      
      console.log(`Loaded ${this.cachedLocations.length} cached locations and ${this.activeGeofences.size} geofences`);
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  }

  /**
   * Start enhanced location tracking with background support
   */
  async startTracking(driverId) {
    try {
      if (!this.locationPermissionGranted) {
        throw new Error('Location permissions not granted');
      }

      if (this.isTracking) {
        console.log('Location tracking already started');
        return;
      }

      this.driverId = driverId;
      this.isTracking = true;
      this.analytics.sessionStart = new Date();

      // Get initial location
      const initialLocation = await this.getCurrentLocation();
      if (initialLocation) {
        await this.updateDriverLocationInFirebase(initialLocation);
        this.analytics.lastLocation = initialLocation;
      }

      // Start foreground tracking
      await this.startForegroundTracking();
      
      // Start background tracking if permission granted
      if (this.backgroundPermissionGranted) {
        await this.startBackgroundTracking();
      }

      console.log(`Enhanced location tracking started for driver: ${driverId}`);
      console.log(`Background tracking: ${this.backgroundPermissionGranted ? 'enabled' : 'disabled'}`);
      console.log(`Adaptive tracking: ${this.adaptiveTracking ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error starting location tracking:', error);
      this.isTracking = false;
      throw new Error(`Failed to start location tracking: ${error.message}`);
    }
  }

  /**
   * Start foreground location tracking
   */
  async startForegroundTracking() {
    const accuracy = this.batteryLevel < 0.2 ? Location.Accuracy.Low : Location.Accuracy.Balanced;
    
    this.watchId = await Location.watchPositionAsync(
      {
        accuracy,
        timeInterval: this.updateInterval,
        distanceInterval: this.batteryLevel < 0.2 ? 100 : 50, // Larger distance when battery low
      },
      (location) => {
        this.handleLocationUpdate(location);
      }
    );
  }

  /**
   * Start background location tracking
   */
  async startBackgroundTracking() {
    try {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: this.updateInterval * 2, // Less frequent in background
        distanceInterval: 100,
        deferredUpdatesInterval: 60000, // Batch updates every minute
        foregroundService: {
          notificationTitle: 'GQCars Driver',
          notificationBody: 'Tracking your location for ride requests',
          notificationColor: '#4CAF50',
        },
      });
      
      console.log('Background location tracking started');
    } catch (error) {
      console.error('Failed to start background tracking:', error);
    }
  }

  /**
   * Stop all location tracking
   */
  async stopTracking() {
    try {
      // Stop foreground tracking
      if (this.watchId) {
        await Location.unsubscribeFromLocationUpdatesAsync(this.watchId);
        this.watchId = null;
      }

      // Stop background tracking
      if (this.backgroundPermissionGranted) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }

      // Save analytics before stopping
      await this.saveAnalytics();
      
      // Sync any remaining cached locations
      if (this.cachedLocations.length > 0) {
        await this.syncCachedLocations();
      }

      this.isTracking = false;
      this.driverId = null;
      this.currentLocation = null;
      this.analytics.sessionStart = null;

      console.log('Location tracking stopped');
    } catch (error) {
      console.error('Error stopping location tracking:', error);
      throw new Error(`Failed to stop location tracking: ${error.message}`);
    }
  }

  /**
   * Get current location once
   */
  async getCurrentLocation() {
    try {
      if (!this.locationPermissionGranted) {
        await this.requestLocationPermissions();
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: new Date(location.timestamp),
      };

      this.currentLocation = locationData;
      return locationData;
    } catch (error) {
      console.error('Error getting current location:', error);
      throw new Error(`Failed to get current location: ${error.message}`);
    }
  }

  /**
   * Handle location updates from the watcher
   */
  async handleLocationUpdate(location) {
    try {
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        speed: location.coords.speed,
        heading: location.coords.heading,
        timestamp: new Date(location.timestamp),
        batteryLevel: this.batteryLevel,
        source: 'foreground'
      };

      this.currentLocation = locationData;
      
      // Update analytics
      this.updateAnalytics(locationData);
      
      // Check geofences
      this.checkGeofences(locationData);

      // Update location in Firebase or cache if offline
      const now = Date.now();
      if (!this.lastUpdateTime || (now - this.lastUpdateTime) >= this.updateInterval) {
        if (this.isOnline) {
          await this.updateDriverLocationInFirebase(locationData);
          
          // Share location with passengers if enabled
          if (this.sharingEnabled) {
            await this.shareLocationWithPassengers(locationData);
          }
        } else {
          this.cacheLocation(locationData);
        }
        
        this.lastUpdateTime = now;
      }
    } catch (error) {
      console.error('Error handling location update:', error);
    }
  }

  /**
   * Handle background location updates
   */
  handleBackgroundLocationUpdate(locations) {
    if (!locations || locations.length === 0) return;
    
    locations.forEach(location => {
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        speed: location.coords.speed,
        heading: location.coords.heading,
        timestamp: new Date(location.timestamp),
        batteryLevel: this.batteryLevel,
        source: 'background'
      };
      
      this.currentLocation = locationData;
      this.updateAnalytics(locationData);
      
      // Cache location for later sync
      this.cacheLocation(locationData);
    });
    
    // Attempt to sync if online
    if (this.isOnline && this.cachedLocations.length > 0) {
      this.syncCachedLocations();
    }
  }

  /**
   * Update driver location in Firebase with retry logic
   */
  async updateDriverLocationInFirebase(locationData, retries = 3) {
    try {
      if (!this.driverId) {
        console.warn('No driver ID set, cannot update location in Firebase');
        return;
      }

      await driverService.updateDriverLocation(this.driverId, {
        ...locationData,
        updatedAt: new Date(),
        isOnline: true,
        batteryLevel: Math.round(this.batteryLevel * 100),
        trackingSource: locationData.source || 'foreground'
      });
      
      // Remove from cache if this was a cached location being synced
      this.removeCachedLocation(locationData);
      
    } catch (error) {
      console.error('Error updating driver location in Firebase:', error);
      
      if (retries > 0) {
        console.log(`Retrying Firebase location update (${retries} attempts remaining)`);
        setTimeout(() => {
          this.updateDriverLocationInFirebase(locationData, retries - 1);
        }, 2000);
      } else {
        // Cache location for later sync if all retries failed
        this.cacheLocation(locationData);
      }
    }
  }

  /**
   * Cache location for offline sync
   */
  cacheLocation(locationData) {
    this.cachedLocations.push({
      ...locationData,
      cachedAt: new Date()
    });
    
    // Keep only last 100 locations in cache
    if (this.cachedLocations.length > 100) {
      this.cachedLocations = this.cachedLocations.slice(-100);
    }
    
    // Save to persistent storage
    this.saveCachedLocations();
  }

  /**
   * Remove cached location
   */
  removeCachedLocation(locationData) {
    this.cachedLocations = this.cachedLocations.filter(
      cached => cached.timestamp !== locationData.timestamp
    );
  }

  /**
   * Save cached locations to storage
   */
  async saveCachedLocations() {
    try {
      await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(this.cachedLocations));
    } catch (error) {
      console.error('Error saving cached locations:', error);
    }
  }

  /**
   * Sync cached locations to Firebase
   */
  async syncCachedLocations() {
    if (this.syncInProgress || this.cachedLocations.length === 0) return;
    
    this.syncInProgress = true;
    
    try {
      console.log(`Syncing ${this.cachedLocations.length} cached locations`);
      
      // Sync in batches of 5 to avoid overwhelming the server
      for (let i = 0; i < this.cachedLocations.length; i += 5) {
        const batch = this.cachedLocations.slice(i, i + 5);
        
        await Promise.all(
          batch.map(location => this.updateDriverLocationInFirebase(location, 1))
        );
        
        // Small delay between batches
        if (i + 5 < this.cachedLocations.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log('Cached locations synced successfully');
    } catch (error) {
      console.error('Error syncing cached locations:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Update location analytics
   */
  updateAnalytics(locationData) {
    if (!this.analytics.lastLocation) {
      this.analytics.lastLocation = locationData;
      return;
    }
    
    const distance = this.calculateDistance(
      this.analytics.lastLocation.latitude,
      this.analytics.lastLocation.longitude,
      locationData.latitude,
      locationData.longitude
    );
    
    const timeDiff = (locationData.timestamp - this.analytics.lastLocation.timestamp) / 1000; // seconds
    
    if (distance > 0 && timeDiff > 0) {
      this.analytics.totalDistance += distance;
      this.analytics.totalTime += timeDiff;
      
      // Calculate average speed (km/h)
      if (this.analytics.totalTime > 0) {
        this.analytics.averageSpeed = (this.analytics.totalDistance / this.analytics.totalTime) * 3.6;
      }
    }
    
    this.analytics.lastLocation = locationData;
    
    // Save analytics periodically
    if (Math.random() < 0.1) { // 10% chance to save
      this.saveAnalytics();
    }
  }

  /**
   * Save analytics to storage
   */
  async saveAnalytics() {
    try {
      await AsyncStorage.setItem(ANALYTICS_CACHE_KEY, JSON.stringify(this.analytics));
    } catch (error) {
      console.error('Error saving analytics:', error);
    }
  }

  /**
   * Get location analytics
   */
  getAnalytics() {
    return {
      ...this.analytics,
      totalDistanceKm: Math.round(this.analytics.totalDistance * 100) / 100,
      totalTimeHours: Math.round((this.analytics.totalTime / 3600) * 100) / 100,
      averageSpeedKmh: Math.round(this.analytics.averageSpeed * 100) / 100
    };
  }

  /**
   * Enable location sharing with passengers
   */
  async enableLocationSharing(passengerIds = []) {
    this.sharingEnabled = true;
    this.shareWithPassengers = passengerIds;
    console.log(`Location sharing enabled for ${passengerIds.length} passengers`);
  }

  /**
   * Disable location sharing
   */
  disableLocationSharing() {
    this.sharingEnabled = false;
    this.shareWithPassengers = [];
    console.log('Location sharing disabled');
  }

  /**
   * Share location with passengers via Firebase
   */
  async shareLocationWithPassengers(locationData) {
    if (!this.sharingEnabled || this.shareWithPassengers.length === 0) return;
    
    try {
      const sharedLocationData = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        timestamp: locationData.timestamp,
        accuracy: locationData.accuracy,
        speed: locationData.speed,
        heading: locationData.heading,
        driverId: this.driverId
      };
      
      // Share with each passenger
      await Promise.all(
        this.shareWithPassengers.map(passengerId =>
          driverService.shareLocationWithPassenger(this.driverId, passengerId, sharedLocationData)
        )
      );
    } catch (error) {
      console.error('Error sharing location with passengers:', error);
    }
  }

  /**
   * Calculate distance between two points (Haversine formula)
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

  /**
   * Check if a location is within a specific radius
   */
  isWithinRadius(centerLat, centerLon, checkLat, checkLon, radiusKm) {
    const distance = this.calculateDistance(centerLat, centerLon, checkLat, checkLon);
    return distance <= radiusKm;
  }

  /**
   * Get formatted address from coordinates (reverse geocoding)
   */
  async getAddressFromCoords(latitude, longitude) {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (results && results.length > 0) {
        const address = results[0];
        return {
          street: address.street || '',
          city: address.city || '',
          region: address.region || '',
          postalCode: address.postalCode || '',
          country: address.country || '',
          formattedAddress: [
            address.street,
            address.city,
            address.region,
            address.postalCode
          ].filter(Boolean).join(', ')
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting address from coordinates:', error);
      return null;
    }
  }

  /**
   * Get coordinates from address (geocoding)
   */
  async getCoordsFromAddress(address) {
    try {
      const results = await Location.geocodeAsync(address);
      
      if (results && results.length > 0) {
        return {
          latitude: results[0].latitude,
          longitude: results[0].longitude,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting coordinates from address:', error);
      return null;
    }
  }

  /**
   * Check if location tracking is active
   */
  isTrackingActive() {
    return this.isTracking && this.watchId !== null;
  }

  /**
   * Get current tracked location
   */
  getCurrentTrackedLocation() {
    return this.currentLocation;
  }

  /**
   * Update tracking interval with battery optimization
   */
  setUpdateInterval(intervalMs) {
    const oldInterval = this.updateInterval;
    this.updateInterval = Math.max(intervalMs, 5000); // Minimum 5 seconds
    
    if (oldInterval !== this.updateInterval) {
      console.log(`Location tracking interval changed from ${oldInterval}ms to ${this.updateInterval}ms`);
      
      // Restart tracking if currently active to apply new interval
      if (this.isTracking && this.driverId) {
        this.stopTracking().then(() => {
          this.startTracking(this.driverId);
        });
      }
    }
  }

  /**
   * Enable/disable adaptive tracking based on battery
   */
  setAdaptiveTracking(enabled) {
    this.adaptiveTracking = enabled;
    console.log(`Adaptive tracking ${enabled ? 'enabled' : 'disabled'}`);
    
    if (enabled) {
      this.adjustTrackingForBattery();
    }
  }

  /**
   * Get current battery optimization settings
   */
  getBatteryStatus() {
    return {
      level: Math.round(this.batteryLevel * 100),
      state: this.batteryState,
      adaptiveTracking: this.adaptiveTracking,
      currentInterval: this.updateInterval
    };
  }

  /**
   * Get network and sync status
   */
  getNetworkStatus() {
    return {
      isOnline: this.isOnline,
      cachedLocations: this.cachedLocations.length,
      syncInProgress: this.syncInProgress,
      lastSyncTime: this.lastUpdateTime
    };
  }
}

// Create singleton instance
const locationService = new LocationService();

export default locationService;