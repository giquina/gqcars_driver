import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverService } from './index.js';

const GEOFENCE_TASK = 'geofence-task';
const GEOFENCES_CACHE_KEY = 'cached_geofences';

/**
 * Geofencing Service for pickup areas and service zones
 * Features:
 * - Automatic pickup area detection
 * - Service zone monitoring
 * - Event callbacks for enter/exit
 * - Persistent geofence storage
 * - Integration with ride requests
 */

// Register geofence task
TaskManager.defineTask(GEOFENCE_TASK, ({ data, error }) => {
  if (error) {
    console.error('Geofence task error:', error);
    return;
  }
  if (data) {
    const { eventType, region } = data;
    geofencingService.handleGeofenceEvent(eventType, region);
  }
});

class GeofencingService {
  constructor() {
    this.activeGeofences = new Map();
    this.geofenceCallbacks = new Map();
    this.pickupAreas = new Map();
    this.serviceZones = new Map();
    this.isMonitoring = false;
    this.driverId = null;
    
    this.initialize();
  }

  /**
   * Initialize geofencing service
   */
  async initialize() {
    try {
      await this.loadCachedGeofences();
      console.log('Geofencing service initialized');
    } catch (error) {
      console.error('Failed to initialize geofencing service:', error);
    }
  }

  /**
   * Start geofence monitoring
   */
  async startMonitoring(driverId) {
    try {
      if (this.isMonitoring) {
        console.log('Geofence monitoring already active');
        return;
      }

      this.driverId = driverId;
      this.isMonitoring = true;

      // Start monitoring all active geofences
      for (const [id, geofence] of this.activeGeofences) {
        await this.startMonitoringGeofence(geofence);
      }

      console.log(`Started monitoring ${this.activeGeofences.size} geofences`);
    } catch (error) {
      console.error('Error starting geofence monitoring:', error);
      this.isMonitoring = false;
      throw error;
    }
  }

  /**
   * Stop geofence monitoring
   */
  async stopMonitoring() {
    try {
      if (!this.isMonitoring) return;

      // Stop monitoring all geofences
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
      
      this.isMonitoring = false;
      this.driverId = null;

      console.log('Geofence monitoring stopped');
    } catch (error) {
      console.error('Error stopping geofence monitoring:', error);
    }
  }

  /**
   * Add a pickup area geofence
   */
  async addPickupArea(id, latitude, longitude, radius = 100, metadata = {}) {
    const geofence = {
      id,
      type: 'pickup',
      latitude,
      longitude,
      radius,
      metadata,
      createdAt: new Date(),
      ...metadata
    };

    this.pickupAreas.set(id, geofence);
    this.activeGeofences.set(id, geofence);

    if (this.isMonitoring) {
      await this.startMonitoringGeofence(geofence);
    }

    await this.saveCachedGeofences();
    
    console.log(`Added pickup area geofence: ${id} (${radius}m radius)`);
    return geofence;
  }

  /**
   * Add a service zone geofence
   */
  async addServiceZone(id, latitude, longitude, radius = 1000, metadata = {}) {
    const geofence = {
      id,
      type: 'service_zone',
      latitude,
      longitude,
      radius,
      metadata,
      createdAt: new Date(),
      ...metadata
    };

    this.serviceZones.set(id, geofence);
    this.activeGeofences.set(id, geofence);

    if (this.isMonitoring) {
      await this.startMonitoringGeofence(geofence);
    }

    await this.saveCachedGeofences();
    
    console.log(`Added service zone geofence: ${id} (${radius}m radius)`);
    return geofence;
  }

  /**
   * Add a custom geofence
   */
  async addGeofence(id, latitude, longitude, radius, type = 'custom', metadata = {}) {
    const geofence = {
      id,
      type,
      latitude,
      longitude,
      radius,
      metadata,
      createdAt: new Date(),
      ...metadata
    };

    this.activeGeofences.set(id, geofence);

    if (this.isMonitoring) {
      await this.startMonitoringGeofence(geofence);
    }

    await this.saveCachedGeofences();
    
    console.log(`Added ${type} geofence: ${id} (${radius}m radius)`);
    return geofence;
  }

  /**
   * Remove a geofence
   */
  async removeGeofence(id) {
    const geofence = this.activeGeofences.get(id);
    if (!geofence) {
      console.warn(`Geofence ${id} not found`);
      return;
    }

    // Remove from maps
    this.activeGeofences.delete(id);
    this.pickupAreas.delete(id);
    this.serviceZones.delete(id);
    this.geofenceCallbacks.delete(id);

    // Stop monitoring if active
    if (this.isMonitoring) {
      try {
        // Restart monitoring with updated geofences
        await this.restartMonitoring();
      } catch (error) {
        console.error('Error restarting geofence monitoring:', error);
      }
    }

    await this.saveCachedGeofences();
    
    console.log(`Removed geofence: ${id}`);
  }

  /**
   * Start monitoring a specific geofence
   */
  async startMonitoringGeofence(geofence) {
    try {
      await Location.startGeofencingAsync(GEOFENCE_TASK, [
        {
          identifier: geofence.id,
          latitude: geofence.latitude,
          longitude: geofence.longitude,
          radius: geofence.radius,
          notifyOnEnter: true,
          notifyOnExit: true,
        }
      ]);
    } catch (error) {
      console.error(`Error starting geofence monitoring for ${geofence.id}:`, error);
    }
  }

  /**
   * Restart monitoring with current geofences
   */
  async restartMonitoring() {
    if (!this.isMonitoring) return;

    // Stop current monitoring
    await Location.stopGeofencingAsync(GEOFENCE_TASK);

    // Start monitoring all active geofences
    if (this.activeGeofences.size > 0) {
      const geofences = Array.from(this.activeGeofences.values()).map(gf => ({
        identifier: gf.id,
        latitude: gf.latitude,
        longitude: gf.longitude,
        radius: gf.radius,
        notifyOnEnter: true,
        notifyOnExit: true,
      }));

      await Location.startGeofencingAsync(GEOFENCE_TASK, geofences);
    }
  }

  /**
   * Handle geofence events
   */
  handleGeofenceEvent(eventType, region) {
    const geofence = this.activeGeofences.get(region.identifier);
    if (!geofence) {
      console.warn(`Geofence event for unknown region: ${region.identifier}`);
      return;
    }

    console.log(`Geofence event: ${eventType} for ${geofence.type} ${region.identifier}`);

    // Call registered callbacks
    const callback = this.geofenceCallbacks.get(region.identifier);
    if (callback) {
      try {
        callback(eventType, geofence, region);
      } catch (error) {
        console.error('Error in geofence callback:', error);
      }
    }

    // Handle specific geofence types
    this.handleGeofenceByType(eventType, geofence, region);
  }

  /**
   * Handle geofence events by type
   */
  async handleGeofenceByType(eventType, geofence, region) {
    try {
      switch (geofence.type) {
        case 'pickup':
          await this.handlePickupAreaEvent(eventType, geofence, region);
          break;
        case 'service_zone':
          await this.handleServiceZoneEvent(eventType, geofence, region);
          break;
        default:
          console.log(`Custom geofence event: ${eventType} for ${geofence.id}`);
      }
    } catch (error) {
      console.error('Error handling geofence by type:', error);
    }
  }

  /**
   * Handle pickup area events
   */
  async handlePickupAreaEvent(eventType, geofence, region) {
    if (!this.driverId) return;

    const eventData = {
      eventType,
      geofenceId: geofence.id,
      geofenceType: 'pickup',
      driverId: this.driverId,
      timestamp: new Date(),
      metadata: geofence.metadata
    };

    if (eventType === Location.GeofencingEventType.Enter) {
      console.log(`Driver entered pickup area: ${geofence.id}`);
      
      // Notify the driver service
      await driverService.notifyPickupAreaEntry(this.driverId, geofence.id, eventData);
      
      // Update driver location with pickup area context
      await driverService.updateDriverContext(this.driverId, {
        inPickupArea: true,
        currentPickupArea: geofence.id,
        pickupAreaMetadata: geofence.metadata
      });

    } else if (eventType === Location.GeofencingEventType.Exit) {
      console.log(`Driver exited pickup area: ${geofence.id}`);
      
      // Notify the driver service
      await driverService.notifyPickupAreaExit(this.driverId, geofence.id, eventData);
      
      // Update driver location context
      await driverService.updateDriverContext(this.driverId, {
        inPickupArea: false,
        currentPickupArea: null,
        pickupAreaMetadata: null
      });
    }
  }

  /**
   * Handle service zone events
   */
  async handleServiceZoneEvent(eventType, geofence, region) {
    if (!this.driverId) return;

    const eventData = {
      eventType,
      geofenceId: geofence.id,
      geofenceType: 'service_zone',
      driverId: this.driverId,
      timestamp: new Date(),
      metadata: geofence.metadata
    };

    if (eventType === Location.GeofencingEventType.Enter) {
      console.log(`Driver entered service zone: ${geofence.id}`);
      
      // Update driver status
      await driverService.updateDriverContext(this.driverId, {
        inServiceZone: true,
        currentServiceZone: geofence.id,
        serviceZoneMetadata: geofence.metadata
      });

    } else if (eventType === Location.GeofencingEventType.Exit) {
      console.log(`Driver exited service zone: ${geofence.id}`);
      
      // Update driver status
      await driverService.updateDriverContext(this.driverId, {
        inServiceZone: false,
        currentServiceZone: null,
        serviceZoneMetadata: null
      });
      
      // Warn driver if they're going out of service area
      console.warn('Driver left service zone - may affect ride availability');
    }
  }

  /**
   * Register callback for geofence events
   */
  registerGeofenceCallback(geofenceId, callback) {
    this.geofenceCallbacks.set(geofenceId, callback);
    console.log(`Registered callback for geofence: ${geofenceId}`);
  }

  /**
   * Unregister callback for geofence events
   */
  unregisterGeofenceCallback(geofenceId) {
    this.geofenceCallbacks.delete(geofenceId);
    console.log(`Unregistered callback for geofence: ${geofenceId}`);
  }

  /**
   * Check if location is within any geofence
   */
  checkLocationInGeofences(latitude, longitude) {
    const results = [];
    
    for (const [id, geofence] of this.activeGeofences) {
      const distance = this.calculateDistance(
        latitude, longitude,
        geofence.latitude, geofence.longitude
      );
      
      if (distance <= geofence.radius / 1000) { // Convert meters to km
        results.push({
          geofenceId: id,
          geofence,
          distance: distance * 1000 // Convert back to meters
        });
      }
    }
    
    return results;
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
   * Get all active geofences
   */
  getActiveGeofences() {
    return Array.from(this.activeGeofences.values());
  }

  /**
   * Get pickup areas
   */
  getPickupAreas() {
    return Array.from(this.pickupAreas.values());
  }

  /**
   * Get service zones
   */
  getServiceZones() {
    return Array.from(this.serviceZones.values());
  }

  /**
   * Get geofence by ID
   */
  getGeofence(id) {
    return this.activeGeofences.get(id);
  }

  /**
   * Save geofences to cache
   */
  async saveCachedGeofences() {
    try {
      const geofences = Array.from(this.activeGeofences.values());
      await AsyncStorage.setItem(GEOFENCES_CACHE_KEY, JSON.stringify(geofences));
    } catch (error) {
      console.error('Error saving cached geofences:', error);
    }
  }

  /**
   * Load geofences from cache
   */
  async loadCachedGeofences() {
    try {
      const cached = await AsyncStorage.getItem(GEOFENCES_CACHE_KEY);
      if (cached) {
        const geofences = JSON.parse(cached);
        
        geofences.forEach(gf => {
          this.activeGeofences.set(gf.id, gf);
          
          if (gf.type === 'pickup') {
            this.pickupAreas.set(gf.id, gf);
          } else if (gf.type === 'service_zone') {
            this.serviceZones.set(gf.id, gf);
          }
        });
        
        console.log(`Loaded ${geofences.length} cached geofences`);
      }
    } catch (error) {
      console.error('Error loading cached geofences:', error);
    }
  }

  /**
   * Clear all geofences
   */
  async clearAllGeofences() {
    try {
      if (this.isMonitoring) {
        await Location.stopGeofencingAsync(GEOFENCE_TASK);
      }
      
      this.activeGeofences.clear();
      this.pickupAreas.clear();
      this.serviceZones.clear();
      this.geofenceCallbacks.clear();
      
      await AsyncStorage.removeItem(GEOFENCES_CACHE_KEY);
      
      console.log('All geofences cleared');
    } catch (error) {
      console.error('Error clearing geofences:', error);
    }
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      driverId: this.driverId,
      totalGeofences: this.activeGeofences.size,
      pickupAreas: this.pickupAreas.size,
      serviceZones: this.serviceZones.size,
      callbacks: this.geofenceCallbacks.size
    };
  }
}

// Create singleton instance
const geofencingService = new GeofencingService();

export default geofencingService;