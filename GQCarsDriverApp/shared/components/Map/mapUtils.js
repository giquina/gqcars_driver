import * as Location from 'expo-location';

/**
 * Map Utilities
 * Helper functions for map calculations, routing, and navigation
 */

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = degToRad(lat2 - lat1);
  const dLon = degToRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(degToRad(lat1)) * Math.cos(degToRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Convert degrees to radians
 * @param {number} deg - Degrees
 * @returns {number} Radians
 */
export const degToRad = (deg) => {
  return deg * (Math.PI / 180);
};

/**
 * Calculate estimated time of arrival
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} averageSpeedKmh - Average speed in km/h (default: 30)
 * @returns {number} ETA in minutes
 */
export const calculateETA = (distanceKm, averageSpeedKmh = 30) => {
  return Math.round((distanceKm / averageSpeedKmh) * 60);
};

/**
 * Get map region that fits all coordinates
 * @param {Array} coordinates - Array of {latitude, longitude} objects
 * @param {number} padding - Padding factor (default: 0.01)
 * @returns {Object} Map region object
 */
export const getRegionForCoordinates = (coordinates, padding = 0.01) => {
  if (!coordinates || coordinates.length === 0) return null;

  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLng = coordinates[0].longitude;
  let maxLng = coordinates[0].longitude;

  coordinates.forEach(coord => {
    minLat = Math.min(minLat, coord.latitude);
    maxLat = Math.max(maxLat, coord.latitude);
    minLng = Math.min(minLng, coord.longitude);
    maxLng = Math.max(maxLng, coord.longitude);
  });

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const deltaLat = (maxLat - minLat) + padding;
  const deltaLng = (maxLng - minLng) + padding;

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: Math.max(deltaLat, 0.005), // Minimum zoom level
    longitudeDelta: Math.max(deltaLng, 0.005),
  };
};

/**
 * Check if a location is within a radius of another location
 * @param {Object} center - Center location {latitude, longitude}
 * @param {Object} point - Point to check {latitude, longitude}
 * @param {number} radiusKm - Radius in kilometers
 * @returns {boolean} True if point is within radius
 */
export const isWithinRadius = (center, point, radiusKm) => {
  const distance = calculateDistance(
    center.latitude,
    center.longitude,
    point.latitude,
    point.longitude
  );
  return distance <= radiusKm;
};

/**
 * Generate route coordinates for simple point-to-point navigation
 * In production, this should use Google Directions API
 * @param {Object} origin - Origin location {latitude, longitude}
 * @param {Object} destination - Destination location {latitude, longitude}
 * @returns {Array} Array of route coordinates
 */
export const generateSimpleRoute = (origin, destination) => {
  if (!origin || !destination) return [];
  
  return [
    { latitude: origin.latitude, longitude: origin.longitude },
    { latitude: destination.latitude, longitude: destination.longitude }
  ];
};

/**
 * Get optimal route using Google Directions API
 * Note: Requires Google Directions API key
 * @param {Object} origin - Origin location {latitude, longitude}
 * @param {Object} destination - Destination location {latitude, longitude}
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<Object>} Route data with coordinates, distance, and duration
 */
export const getOptimizedRoute = async (origin, destination, apiKey) => {
  try {
    if (!apiKey) {
      console.warn('Google Directions API key not provided, using simple route');
      return {
        coordinates: generateSimpleRoute(origin, destination),
        distance: calculateDistance(
          origin.latitude,
          origin.longitude,
          destination.latitude,
          destination.longitude
        ),
        duration: calculateETA(
          calculateDistance(
            origin.latitude,
            origin.longitude,
            destination.latitude,
            destination.longitude
          )
        ),
      };
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=${origin.latitude},${origin.longitude}&` +
      `destination=${destination.latitude},${destination.longitude}&` +
      `mode=driving&` +
      `key=${apiKey}`
    );

    const data = await response.json();

    if (data.status === 'OK' && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];
      
      // Decode polyline to get route coordinates
      const coordinates = decodePolyline(route.overview_polyline.points);
      
      return {
        coordinates,
        distance: leg.distance.value / 1000, // Convert to km
        duration: Math.round(leg.duration.value / 60), // Convert to minutes
        distanceText: leg.distance.text,
        durationText: leg.duration.text,
      };
    } else {
      console.warn('Google Directions API error:', data.status);
      return {
        coordinates: generateSimpleRoute(origin, destination),
        distance: calculateDistance(
          origin.latitude,
          origin.longitude,
          destination.latitude,
          destination.longitude
        ),
        duration: calculateETA(
          calculateDistance(
            origin.latitude,
            origin.longitude,
            destination.latitude,
            destination.longitude
          )
        ),
      };
    }
  } catch (error) {
    console.error('Error fetching optimized route:', error);
    return {
      coordinates: generateSimpleRoute(origin, destination),
      distance: calculateDistance(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude
      ),
      duration: calculateETA(
        calculateDistance(
          origin.latitude,
          origin.longitude,
          destination.latitude,
          destination.longitude
        )
      ),
    };
  }
};

/**
 * Decode Google polyline to coordinates
 * @param {string} encoded - Encoded polyline string
 * @returns {Array} Array of {latitude, longitude} objects
 */
export const decodePolyline = (encoded) => {
  const coordinates = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += deltaLng;

    coordinates.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5
    });
  }

  return coordinates;
};

/**
 * Get formatted address from coordinates using reverse geocoding
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<Object|null>} Address object or null
 */
export const getAddressFromCoords = async (latitude, longitude) => {
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
};

/**
 * Get coordinates from address using geocoding
 * @param {string} address - Address string
 * @returns {Promise<Object|null>} Coordinates object or null
 */
export const getCoordsFromAddress = async (address) => {
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
};

/**
 * Format distance for display
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distanceKm) => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
};

/**
 * Format duration for display
 * @param {number} durationMinutes - Duration in minutes
 * @returns {string} Formatted duration string
 */
export const formatDuration = (durationMinutes) => {
  if (durationMinutes < 60) {
    return `${durationMinutes}min`;
  }
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return `${hours}h ${minutes}min`;
};

/**
 * Check if location permissions are granted
 * @returns {Promise<boolean>} True if permissions are granted
 */
export const checkLocationPermissions = async () => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking location permissions:', error);
    return false;
  }
};

/**
 * Request location permissions
 * @returns {Promise<boolean>} True if permissions are granted
 */
export const requestLocationPermissions = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return false;
  }
};