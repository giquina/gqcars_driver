import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import locationService from '../../../services/locationService';

/**
 * DriverMap Component
 * Main map component for driver navigation with real-time location tracking
 */
const DriverMap = ({
  pickup,
  destination,
  driverLocation,
  activeTrip,
  onLocationChange,
  onMapReady,
  showRoute = true,
  showTraffic = false,
  style,
}) => {
  const mapRef = useRef(null);
  const [region, setRegion] = useState(null);
  const [route, setRoute] = useState([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Initialize map region
  useEffect(() => {
    if (driverLocation) {
      setRegion({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [driverLocation]);

  // Calculate route when locations change
  useEffect(() => {
    if (showRoute && driverLocation && (pickup || destination)) {
      calculateRoute();
    }
  }, [driverLocation, pickup, destination, showRoute]);

  // Map ready handler
  const handleMapReady = () => {
    setIsMapReady(true);
    if (onMapReady) {
      onMapReady();
    }
  };

  // Calculate route between points
  const calculateRoute = async () => {
    try {
      if (!driverLocation) return;

      const destination_point = pickup || destination;
      if (!destination_point) return;

      // Simple straight line route (in production, you'd use Google Directions API)
      const routeCoordinates = [
        {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
        },
        {
          latitude: destination_point.latitude,
          longitude: destination_point.longitude,
        }
      ];

      setRoute(routeCoordinates);

      // Fit map to show route
      if (isMapReady && mapRef.current) {
        mapRef.current.fitToCoordinates(routeCoordinates, {
          edgePadding: {
            top: 50,
            right: 50,
            bottom: 50,
            left: 50,
          },
          animated: true,
        });
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      setMapError('Failed to calculate route');
    }
  };

  // Handle map press
  const handleMapPress = (event) => {
    if (onLocationChange) {
      onLocationChange(event.nativeEvent.coordinate);
    }
  };

  // Handle map error
  const handleMapError = (error) => {
    console.error('Map error:', error);
    setMapError('Map failed to load');
    Alert.alert(
      'Map Error',
      'There was an error loading the map. Please check your internet connection and try again.',
      [{ text: 'OK' }]
    );
  };

  if (mapError) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Ionicons name="warning" size={48} color={colors.danger} />
        <Text style={styles.errorText}>{mapError}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsTraffic={showTraffic}
        followsUserLocation={true}
        onMapReady={handleMapReady}
        onPress={handleMapPress}
        onError={handleMapError}
        mapType="standard"
        toolbarEnabled={false}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
      >
        {/* Driver location marker */}
        {driverLocation && (
          <Marker
            coordinate={{
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude,
            }}
            title="Your Location"
            description="Driver"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.driverMarker}>
              <Ionicons name="car" size={20} color={colors.white} />
            </View>
          </Marker>
        )}

        {/* Pickup location marker */}
        {pickup && (
          <Marker
            coordinate={{
              latitude: pickup.latitude,
              longitude: pickup.longitude,
            }}
            title="Pickup Location"
            description={pickup.address || "Passenger pickup"}
            pinColor={colors.success}
          >
            <View style={styles.pickupMarker}>
              <Ionicons name="person" size={20} color={colors.white} />
            </View>
          </Marker>
        )}

        {/* Destination marker */}
        {destination && (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            title="Destination"
            description={destination.address || "Trip destination"}
            pinColor={colors.danger}
          >
            <View style={styles.destinationMarker}>
              <Ionicons name="flag" size={20} color={colors.white} />
            </View>
          </Marker>
        )}

        {/* Route polyline */}
        {showRoute && route.length > 0 && (
          <Polyline
            coordinates={route}
            strokeWidth={4}
            strokeColor={colors.primary}
            lineDashPattern={[5, 10]}
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  map: {
    flex: 1,
  },

  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  driverMarker: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  pickupMarker: {
    backgroundColor: colors.success,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  destinationMarker: {
    backgroundColor: colors.danger,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default DriverMap;