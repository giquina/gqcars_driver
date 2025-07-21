/**
 * Location Simulator Service
 * Simulates GPS movement for testing maps and navigation
 * Only use for development/testing purposes
 */

class LocationSimulator {
  constructor() {
    this.isSimulating = false;
    this.currentLocation = null;
    this.intervalId = null;
    this.route = [];
    this.routeIndex = 0;
    this.callbacks = [];
  }

  /**
   * Start simulating location updates along a route
   * @param {Object} startLocation - Starting location {latitude, longitude}
   * @param {Object} endLocation - Ending location {latitude, longitude}
   * @param {Function} callback - Callback function to receive location updates
   * @param {number} intervalMs - Update interval in milliseconds (default: 2000)
   * @param {number} steps - Number of steps in the route (default: 20)
   */
  startSimulation(startLocation, endLocation, callback, intervalMs = 2000, steps = 20) {
    if (this.isSimulating) {
      this.stopSimulation();
    }

    this.currentLocation = startLocation;
    this.callbacks = callback ? [callback] : [];
    this.route = this.generateRoute(startLocation, endLocation, steps);
    this.routeIndex = 0;
    this.isSimulating = true;

    // Send initial location
    this.notifyLocationUpdate(this.currentLocation);

    // Start periodic updates
    this.intervalId = setInterval(() => {
      this.updateSimulatedLocation();
    }, intervalMs);

    console.log('Location simulation started');
    return true;
  }

  /**
   * Stop location simulation
   */
  stopSimulation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isSimulating = false;
    this.route = [];
    this.routeIndex = 0;
    this.callbacks = [];

    console.log('Location simulation stopped');
  }

  /**
   * Add callback for location updates
   * @param {Function} callback - Callback function
   */
  addLocationCallback(callback) {
    if (callback && typeof callback === 'function') {
      this.callbacks.push(callback);
    }
  }

  /**
   * Remove callback
   * @param {Function} callback - Callback function to remove
   */
  removeLocationCallback(callback) {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }

  /**
   * Get current simulated location
   * @returns {Object|null} Current location or null
   */
  getCurrentLocation() {
    return this.currentLocation;
  }

  /**
   * Check if simulation is running
   * @returns {boolean} True if simulating
   */
  isRunning() {
    return this.isSimulating;
  }

  /**
   * Generate route points between start and end
   * @param {Object} start - Start location
   * @param {Object} end - End location
   * @param {number} steps - Number of route points
   * @returns {Array} Array of location points
   */
  generateRoute(start, end, steps) {
    const route = [];
    const latStep = (end.latitude - start.latitude) / steps;
    const lngStep = (end.longitude - start.longitude) / steps;

    for (let i = 0; i <= steps; i++) {
      route.push({
        latitude: start.latitude + (latStep * i),
        longitude: start.longitude + (lngStep * i),
        accuracy: 5 + Math.random() * 10, // Random accuracy 5-15m
        timestamp: new Date(),
      });
    }

    return route;
  }

  /**
   * Update to next location in route
   */
  updateSimulatedLocation() {
    if (!this.isSimulating || this.routeIndex >= this.route.length) {
      return;
    }

    this.currentLocation = {
      ...this.route[this.routeIndex],
      timestamp: new Date(),
    };

    this.notifyLocationUpdate(this.currentLocation);
    this.routeIndex++;

    // Stop when route is complete
    if (this.routeIndex >= this.route.length) {
      console.log('Route simulation completed');
      this.stopSimulation();
    }
  }

  /**
   * Notify all callbacks with location update
   * @param {Object} location - Location data
   */
  notifyLocationUpdate(location) {
    this.callbacks.forEach(callback => {
      try {
        callback(location);
      } catch (error) {
        console.error('Error in location callback:', error);
      }
    });
  }

  /**
   * Simulate movement towards a destination
   * @param {Object} destination - Target location
   * @param {Function} callback - Location update callback
   * @param {number} speedKmh - Simulation speed in km/h (default: 30)
   */
  simulateNavigationTo(destination, callback, speedKmh = 30) {
    if (!this.currentLocation) {
      this.currentLocation = {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        timestamp: new Date(),
      };
    }

    // Calculate update interval based on speed
    // Higher speed = more frequent updates for smoother movement
    const updateInterval = Math.max(1000, 60000 / speedKmh * 2); // Updates per minute based on speed
    const totalSteps = Math.max(10, Math.floor(this.calculateDistance(this.currentLocation, destination) * 10));

    this.startSimulation(
      this.currentLocation,
      destination,
      callback,
      updateInterval,
      totalSteps
    );
  }

  /**
   * Calculate distance between two points (rough approximation)
   * @param {Object} point1 - First location
   * @param {Object} point2 - Second location
   * @returns {number} Distance in kilometers
   */
  calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.degToRad(point2.latitude - point1.latitude);
    const dLng = this.degToRad(point2.longitude - point1.longitude);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.degToRad(point1.latitude)) * Math.cos(this.degToRad(point2.latitude)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  degToRad(deg) {
    return deg * (Math.PI/180);
  }

  /**
   * Simulate random movement around a center point
   * @param {Object} center - Center location
   * @param {number} radiusKm - Movement radius in kilometers
   * @param {Function} callback - Location update callback
   * @param {number} intervalMs - Update interval
   */
  simulateRandomMovement(center, radiusKm = 2, callback, intervalMs = 3000) {
    this.currentLocation = center;
    this.callbacks = callback ? [callback] : [];
    this.isSimulating = true;

    this.intervalId = setInterval(() => {
      // Generate random movement within radius
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * radiusKm;
      
      // Convert distance to lat/lng offset (rough approximation)
      const latOffset = (distance / 111) * Math.cos(angle); // ~111km per degree
      const lngOffset = (distance / (111 * Math.cos(this.degToRad(center.latitude)))) * Math.sin(angle);

      this.currentLocation = {
        latitude: center.latitude + latOffset,
        longitude: center.longitude + lngOffset,
        accuracy: 5 + Math.random() * 15,
        timestamp: new Date(),
      };

      this.notifyLocationUpdate(this.currentLocation);
    }, intervalMs);

    console.log('Random movement simulation started');
  }
}

// Export singleton instance
export default new LocationSimulator();