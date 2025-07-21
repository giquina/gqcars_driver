import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';
import { calculateDistance, formatDistance } from './mapUtils';

const { width } = Dimensions.get('window');

/**
 * RideRequestMap Component
 * Shows ride request locations relative to driver position
 */
const RideRequestMap = ({
  driverLocation,
  rideRequests = [],
  selectedRequest = null,
  onRequestSelect,
  searchRadius = 5, // km
  style,
}) => {
  const mapRef = useRef(null);
  const [region, setRegion] = useState(null);

  // Initialize map region based on driver location
  useEffect(() => {
    if (driverLocation) {
      const newRegion = {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.02, // Adjust zoom level
        longitudeDelta: 0.02,
      };
      setRegion(newRegion);
    }
  }, [driverLocation]);

  // Fit map to show all ride requests
  useEffect(() => {
    if (mapRef.current && driverLocation && rideRequests.length > 0) {
      const coordinates = [
        driverLocation,
        ...rideRequests.map(request => ({
          latitude: request.pickup.latitude,
          longitude: request.pickup.longitude,
        }))
      ];

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50,
        },
        animated: true,
      });
    }
  }, [driverLocation, rideRequests]);

  // Handle request marker press
  const handleRequestPress = (request) => {
    if (onRequestSelect) {
      onRequestSelect(request);
    }
  };

  // Get distance from driver to pickup
  const getDistanceToPickup = (request) => {
    if (!driverLocation || !request.pickup) return null;
    
    const distance = calculateDistance(
      driverLocation.latitude,
      driverLocation.longitude,
      request.pickup.latitude,
      request.pickup.longitude
    );
    
    return formatDistance(distance);
  };

  return (
    <View style={[styles.container, style]}>
      {region && (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          showsUserLocation={true}
          showsMyLocationButton={true}
          mapType="standard"
          toolbarEnabled={false}
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

          {/* Search radius circle */}
          {driverLocation && (
            <Circle
              center={{
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude,
              }}
              radius={searchRadius * 1000} // Convert km to meters
              strokeColor={colors.primary}
              strokeWidth={2}
              fillColor={`${colors.primary}20`} // Semi-transparent fill
            />
          )}

          {/* Ride request markers */}
          {rideRequests.map((request) => {
            const isSelected = selectedRequest?.id === request.id;
            const distance = getDistanceToPickup(request);
            
            return (
              <Marker
                key={request.id}
                coordinate={{
                  latitude: request.pickup.latitude,
                  longitude: request.pickup.longitude,
                }}
                title={`Ride Request - ${distance}`}
                description={`${request.passengerName} • $${request.estimatedEarnings}`}
                onPress={() => handleRequestPress(request)}
              >
                <View style={[
                  styles.requestMarker,
                  isSelected && styles.selectedRequestMarker
                ]}>
                  <Text style={styles.requestPriceText}>
                    ${request.estimatedEarnings}
                  </Text>
                  <View style={styles.requestMarkerIcon}>
                    <Ionicons 
                      name="person" 
                      size={16} 
                      color={colors.white} 
                    />
                  </View>
                </View>
              </Marker>
            );
          })}

          {/* Selected request destination marker */}
          {selectedRequest?.destination && (
            <Marker
              coordinate={{
                latitude: selectedRequest.destination.latitude,
                longitude: selectedRequest.destination.longitude,
              }}
              title="Destination"
              description={selectedRequest.destination.address}
              pinColor={colors.danger}
            >
              <View style={styles.destinationMarker}>
                <Ionicons name="flag" size={16} color={colors.white} />
              </View>
            </Marker>
          )}
        </MapView>
      )}

      {!driverLocation && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your location...</Text>
        </View>
      )}
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

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
  },

  driverMarker: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
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

  requestMarker: {
    backgroundColor: colors.success,
    borderRadius: 25,
    minWidth: 50,
    height: 50,
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

  selectedRequestMarker: {
    backgroundColor: colors.warning,
    borderColor: colors.primary,
    borderWidth: 3,
  },

  requestPriceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 2,
  },

  requestMarkerIcon: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  destinationMarker: {
    backgroundColor: colors.danger,
    borderRadius: 15,
    width: 30,
    height: 30,
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

export default RideRequestMap;