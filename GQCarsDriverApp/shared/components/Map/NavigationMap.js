import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Alert, Linking } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../ui';
import { colors, spacing, typography } from '../../theme';

/**
 * NavigationMap Component
 * Specialized map for turn-by-turn navigation during active trips
 */
const NavigationMap = ({
  pickup,
  destination,
  driverLocation,
  tripStatus,
  onNavigationPress,
  onStatusUpdate,
  style,
}) => {
  const mapRef = useRef(null);
  const [region, setRegion] = useState(null);
  const [route, setRoute] = useState([]);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Determine current destination based on trip status
  const getCurrentDestination = () => {
    if (tripStatus === 'en_route_to_pickup' || tripStatus === 'arrived_at_pickup') {
      return pickup;
    }
    return destination;
  };

  const currentDestination = getCurrentDestination();

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

  // Calculate route and ETA
  useEffect(() => {
    if (driverLocation && currentDestination) {
      calculateRouteAndETA();
    }
  }, [driverLocation, currentDestination]);

  // Calculate route and estimated time
  const calculateRouteAndETA = async () => {
    try {
      if (!driverLocation || !currentDestination) return;

      // Calculate straight line distance (in production, use Google Directions API)
      const distance = calculateDistance(
        driverLocation.latitude,
        driverLocation.longitude,
        currentDestination.latitude,
        currentDestination.longitude
      );

      setDistance(distance);
      
      // Estimate ETA (assuming average speed of 30 km/h in city)
      const estimatedTimeMinutes = Math.round((distance / 30) * 60);
      setEta(estimatedTimeMinutes);

      // Create route coordinates
      const routeCoordinates = [
        {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
        },
        {
          latitude: currentDestination.latitude,
          longitude: currentDestination.longitude,
        }
      ];

      setRoute(routeCoordinates);

      // Auto-fit map to show route
      if (mapRef.current) {
        setTimeout(() => {
          mapRef.current.fitToCoordinates(routeCoordinates, {
            edgePadding: {
              top: 100,
              right: 50,
              bottom: 200,
              left: 50,
            },
            animated: true,
          });
        }, 500);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in km
    const dLat = degToRad(lat2 - lat1);
    const dLon = degToRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(degToRad(lat1)) * Math.cos(degToRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const degToRad = (deg) => {
    return deg * (Math.PI/180);
  };

  // Open external navigation app
  const openExternalNavigation = () => {
    if (!currentDestination) return;

    const { latitude, longitude } = currentDestination;
    const destination_name = tripStatus === 'en_route_to_pickup' ? 'Pickup Location' : 'Destination';
    
    Alert.alert(
      'Open Navigation',
      `Navigate to ${destination_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Google Maps',
          onPress: () => {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
            Linking.openURL(url);
            setIsNavigating(true);
          }
        },
        {
          text: 'Apple Maps',
          onPress: () => {
            const url = `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`;
            Linking.openURL(url);
            setIsNavigating(true);
          }
        }
      ]
    );
  };

  // Handle arrived button press
  const handleArrivedPress = () => {
    if (onStatusUpdate) {
      onStatusUpdate();
    }
  };

  // Get navigation instructions based on status
  const getNavigationInstructions = () => {
    switch (tripStatus) {
      case 'en_route_to_pickup':
        return {
          title: 'Navigate to Pickup',
          subtitle: 'Drive to passenger location',
          buttonText: 'Arrived at Pickup',
        };
      case 'arrived_at_pickup':
        return {
          title: 'At Pickup Location',
          subtitle: 'Waiting for passenger',
          buttonText: 'Start Trip',
        };
      case 'passenger_onboard':
        return {
          title: 'Navigate to Destination',
          subtitle: 'Passenger onboard',
          buttonText: 'Arrived at Destination',
        };
      default:
        return {
          title: 'Navigation',
          subtitle: 'Follow the route',
          buttonText: 'Continue',
        };
    }
  };

  const instructions = getNavigationInstructions();

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsTraffic={true}
        followsUserLocation={true}
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
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.driverMarker}>
              <Ionicons name="car" size={20} color={colors.white} />
            </View>
          </Marker>
        )}

        {/* Current destination marker */}
        {currentDestination && (
          <Marker
            coordinate={{
              latitude: currentDestination.latitude,
              longitude: currentDestination.longitude,
            }}
            title={tripStatus === 'en_route_to_pickup' ? 'Pickup' : 'Destination'}
            description={currentDestination.address}
          >
            <View style={[
              styles.destinationMarker,
              { backgroundColor: tripStatus === 'en_route_to_pickup' ? colors.success : colors.danger }
            ]}>
              <Ionicons 
                name={tripStatus === 'en_route_to_pickup' ? 'person' : 'flag'} 
                size={20} 
                color={colors.white} 
              />
            </View>
          </Marker>
        )}

        {/* Route polyline */}
        {route.length > 0 && (
          <Polyline
            coordinates={route}
            strokeWidth={5}
            strokeColor={colors.primary}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>

      {/* Navigation controls overlay */}
      <View style={styles.navigationOverlay}>
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>{instructions.title}</Text>
          <Text style={styles.instructionSubtitle}>{instructions.subtitle}</Text>
          
          {eta !== null && distance !== null && (
            <View style={styles.etaContainer}>
              <View style={styles.etaItem}>
                <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
                <Text style={styles.etaText}>{eta} min</Text>
              </View>
              <View style={styles.etaItem}>
                <Ionicons name="car-outline" size={16} color={colors.text.secondary} />
                <Text style={styles.etaText}>{distance.toFixed(1)} km</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Open Navigation"
            variant="primary"
            onPress={openExternalNavigation}
            style={styles.navButton}
          />
          
          <Button
            title={instructions.buttonText}
            variant="success"
            onPress={handleArrivedPress}
            style={styles.statusButton}
          />
        </View>
      </View>
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

  navigationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    padding: spacing.md,
  },

  instructionCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  instructionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },

  instructionSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },

  etaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  etaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },

  etaText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    fontWeight: typography.weights.semibold,
  },

  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  navButton: {
    flex: 1,
  },

  statusButton: {
    flex: 1,
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

  destinationMarker: {
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

export default NavigationMap;