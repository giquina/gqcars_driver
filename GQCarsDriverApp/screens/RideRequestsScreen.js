import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Alert,
  RefreshControl,
  AppState,
  TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, StatusBadge } from '../shared/components/ui';
import { RideRequestMap } from '../shared/components/Map';
import { colors, spacing, typography } from '../shared/theme';
import { 
  rideRequestService, 
  notificationService, 
  locationService, 
  driverService,
  authService 
} from '../services';

const RideRequestsScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [rideRequests, setRideRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [requestTimeouts, setRequestTimeouts] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  const unsubscribeRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  
  // Mock data for fallback (with coordinates for map)
  const mockRequests = [
    {
      id: '1',
      passengerName: 'John Smith',
      pickup: {
        address: '123 Main St, Downtown',
        latitude: 40.7589,
        longitude: -73.9851,
      },
      destination: {
        address: 'Airport Terminal 1',
        latitude: 40.6413,
        longitude: -73.7781,
      },
      distance: '12.5 mi',
      estimatedEarnings: 18.50,
      estimatedTime: '25 min',
      rating: 4.9,
      requestTime: '2 min ago',
      priority: 'high'
    },
    {
      id: '2',
      passengerName: 'Sarah Johnson',
      pickup: {
        address: '456 Oak Avenue',
        latitude: 40.7505,
        longitude: -73.9934,
      },
      destination: {
        address: 'City Mall',
        latitude: 40.7614,
        longitude: -73.9776,
      },
      distance: '6.2 mi',
      estimatedEarnings: 12.25,
      estimatedTime: '15 min',
      rating: 4.7,
      requestTime: '5 min ago',
      priority: 'medium'
    },
    {
      id: '3',
      passengerName: 'Mike Wilson',
      pickup: {
        address: '789 Pine Street',
        latitude: 40.7448,
        longitude: -74.0048,
      },
      destination: {
        address: 'University Campus',
        latitude: 40.7282,
        longitude: -73.9942,
      },
      distance: '8.7 mi',
      estimatedEarnings: 14.75,
      estimatedTime: '18 min',
      rating: 4.8,
      requestTime: '7 min ago',
      priority: 'medium'
    }
  ];

  // Initialize services and start real-time listeners
  useEffect(() => {
    initializeScreen();
    
    // Handle app state changes
    const handleAppStateChange = (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground, refresh data
        refreshRideRequests();
      }
      appStateRef.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      cleanup();
      subscription?.remove();
    };
  }, []);
  
  // Initialize screen with services
  const initializeScreen = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user
      const user = await authService.getCurrentUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }
      setCurrentUser(user);
      
      // Initialize notification service
      await notificationService.initialize();
      
      // Get driver location
      const location = await locationService.getCurrentLocation();
      setDriverLocation(location);
      
      // Start listening to ride requests
      startRideRequestListener(location);
      
    } catch (error) {
      console.error('Error initializing ride requests screen:', error);
      setError(error.message);
      // Fallback to mock data
      setRideRequests(mockRequests);
    } finally {
      setLoading(false);
    }
  };
  
  // Start real-time ride request listener
  const startRideRequestListener = (location) => {
    try {
      unsubscribeRef.current = rideRequestService.subscribeToRideRequests(
        (requests, error) => {
          if (error) {
            console.error('Error in ride requests subscription:', error);
            setError('Failed to load ride requests');
            return;
          }
          
          // Process new requests for notifications
          const newRequests = requests.filter(request => 
            !rideRequests.find(existing => existing.id === request.id)
          );
          
          newRequests.forEach(request => {
            handleNewRideRequest(request);
          });
          
          setRideRequests(requests);
          setError(null);
        },
        location
      );
    } catch (error) {
      console.error('Error starting ride request listener:', error);
      setError('Failed to connect to ride request service');
    }
  };
  
  // Handle new incoming ride requests
  const handleNewRideRequest = async (request) => {
    try {
      // Show notification alert
      await notificationService.showUrgentRideAlert(request);
      
      // Start timeout countdown
      startRequestTimeout(request.id);
      
      console.log('New ride request received:', request.id);
    } catch (error) {
      console.error('Error handling new ride request:', error);
    }
  };
  
  // Start timeout countdown for a request
  const startRequestTimeout = (requestId) => {
    const timeoutDuration = 30000; // 30 seconds
    const warningTime = 10000; // Show warning at 10 seconds left
    
    // Clear existing timeout if any
    if (requestTimeouts[requestId]) {
      clearTimeout(requestTimeouts[requestId]);
    }
    
    // Set warning timeout
    const warningTimeout = setTimeout(() => {
      notificationService.showTimeoutWarning(10);
    }, timeoutDuration - warningTime);
    
    // Set expiration timeout
    const expirationTimeout = setTimeout(() => {
      handleRequestTimeout(requestId);
    }, timeoutDuration);
    
    setRequestTimeouts(prev => ({
      ...prev,
      [requestId]: { warning: warningTimeout, expiration: expirationTimeout }
    }));
  };
  
  // Handle request timeout
  const handleRequestTimeout = (requestId) => {
    Alert.alert(
      'Request Expired',
      'The ride request has expired due to no response.',
      [{ text: 'OK' }]
    );
    
    // Clear timeout
    clearRequestTimeout(requestId);
  };
  
  // Clear request timeout
  const clearRequestTimeout = (requestId) => {
    if (requestTimeouts[requestId]) {
      clearTimeout(requestTimeouts[requestId].warning);
      clearTimeout(requestTimeouts[requestId].expiration);
      
      setRequestTimeouts(prev => {
        const updated = { ...prev };
        delete updated[requestId];
        return updated;
      });
    }
  };
  
  // Refresh ride requests manually
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshRideRequests();
    } catch (error) {
      console.error('Error refreshing ride requests:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Refresh ride requests data
  const refreshRideRequests = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      setDriverLocation(location);
      
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      
      startRideRequestListener(location);
    } catch (error) {
      console.error('Error refreshing ride requests:', error);
      setError('Failed to refresh ride requests');
    }
  };
  
  // Clean up resources
  const cleanup = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    // Clear all timeouts
    Object.keys(requestTimeouts).forEach(requestId => {
      clearRequestTimeout(requestId);
    });
  };

  const acceptRide = async (rideId, passengerName) => {
    try {
      if (!currentUser) {
        Alert.alert('Error', 'Please sign in to accept rides');
        return;
      }
      
      Alert.alert(
        'Accept Ride Request',
        `Accept ride request from ${passengerName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Accept', 
            onPress: async () => {
              try {
                // Clear timeout for this request
                clearRequestTimeout(rideId);
                
                // Accept the ride in Firebase
                const acceptedRide = await rideRequestService.acceptRideRequest(rideId, currentUser.uid);
                
                // Update driver status to busy
                await driverService.updateDriverStatus(currentUser.uid, 'busy');
                
                // Show success notification
                await notificationService.showRideAcceptedNotification();
                
                Alert.alert(
                  'Ride Accepted!', 
                  'Navigate to pickup location?',
                  [
                    { text: 'Later', style: 'cancel' },
                    { text: 'Navigate', onPress: () => navigateToPickup(acceptedRide) }
                  ]
                );
              } catch (error) {
                console.error('Error accepting ride:', error);
                Alert.alert('Error', 'Failed to accept ride. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in accept ride process:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const declineRide = async (rideId) => {
    try {
      Alert.alert(
        'Decline Ride',
        'Are you sure you want to decline this ride request?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Decline', 
            style: 'destructive',
            onPress: async () => {
              try {
                // Clear timeout for this request
                clearRequestTimeout(rideId);
                
                // Remove from local state immediately for better UX
                setRideRequests(prev => prev.filter(request => request.id !== rideId));
                
                console.log('Ride declined:', rideId);
              } catch (error) {
                console.error('Error declining ride:', error);
                Alert.alert('Error', 'Failed to decline ride.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in decline ride process:', error);
    }
  };
  
  // Navigate to pickup location
  const navigateToPickup = (ride) => {
    // This would integrate with navigation (maps)
    console.log('Navigating to pickup:', ride.pickupLocation);
    // For now, just log - would implement actual navigation
  };
  
  // Format request data for display
  const formatRequestForDisplay = (request) => {
    const timeAgo = getTimeAgo(request.requestTime);
    const estimatedTime = `${Math.round(request.estimatedDuration)} min`;
    const distance = `${request.estimatedDistance.toFixed(1)} km`;
    
    return {
      id: request.id,
      passengerName: request.passengerInfo.name,
      pickup: request.pickupLocation.address,
      destination: request.dropoffLocation.address,
      distance: distance,
      estimatedEarnings: request.estimatedFare,
      estimatedTime: estimatedTime,
      rating: request.passengerInfo.rating,
      requestTime: timeAgo,
      priority: getPriorityLevel(request)
    };
  };
  
  // Calculate time ago from timestamp
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const requestTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = now - requestTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };
  
  // Determine priority level
  const getPriorityLevel = (request) => {
    const fare = request.estimatedFare;
    const distance = request.estimatedDistance;
    
    if (fare > 25 || distance > 15) return 'high';
    if (fare > 15 || distance > 8) return 'medium';
    return 'low';
  };

  const renderRideRequest = ({ item }) => {
    // Format the request for display
    const displayItem = item.passengerInfo ? formatRequestForDisplay(item) : item;
    
    return (
    <Card style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.passengerInfo}>
          <Text style={styles.passengerName}>{displayItem.passengerName}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color={colors.warning} />
            <Text style={styles.rating}>{displayItem.rating}</Text>
          </View>
        </View>
        <View style={styles.requestMeta}>
          <Text style={styles.requestTime}>{displayItem.requestTime}</Text>
          {displayItem.priority === 'high' && (
            <StatusBadge status="earning" text="High Priority" size="small" />
          )}
        </View>
      </View>

      <View style={styles.tripDetails}>
        <View style={styles.locationRow}>
          <Ionicons name="radio-button-on" size={16} color={colors.success} />
          <Text style={styles.locationText} numberOfLines={1}>
            {typeof displayItem.pickup === 'string' ? displayItem.pickup : displayItem.pickup.address}
          </Text>
        </View>
        <View style={styles.locationDivider} />
        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color={colors.danger} />
          <Text style={styles.locationText} numberOfLines={1}>
            {typeof displayItem.destination === 'string' ? displayItem.destination : displayItem.destination.address}
          </Text>
        </View>
      </View>

      <View style={styles.tripMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="car" size={16} color={colors.text.secondary} />
          <Text style={styles.metaText}>{displayItem.distance}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time" size={16} color={colors.text.secondary} />
          <Text style={styles.metaText}>{displayItem.estimatedTime}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="wallet" size={16} color={colors.driver.earnings} />
          <Text style={[styles.metaText, styles.earningsText]}>
            ${displayItem.estimatedEarnings.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <Button
          title="Decline"
          variant="secondary"
          size="medium"
          onPress={() => declineRide(displayItem.id)}
          style={styles.actionButton}
        />
        <Button
          title="Accept Ride"
          variant="success"
          size="medium"
          onPress={() => acceptRide(displayItem.id, displayItem.passengerName)}
          style={styles.actionButton}
        />
      </View>
    </Card>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="car-outline" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyTitle}>No Ride Requests</Text>
      <Text style={styles.emptyDescription}>
        Pull down to refresh or make sure you're online to receive ride requests.
      </Text>
    </View>
  );

  const ErrorState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="warning-outline" size={64} color={colors.danger} />
      <Text style={styles.emptyTitle}>Connection Error</Text>
      <Text style={styles.emptyDescription}>
        {error}
      </Text>
      <Button
        title="Retry"
        variant="primary"
        size="medium"
        onPress={refreshRideRequests}
        style={styles.retryButton}
      />
    </View>
  );

  const LoadingState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>Loading Ride Requests...</Text>
      <Text style={styles.emptyDescription}>
        Setting up real-time connection...
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Available Ride Requests</Text>
            <Text style={styles.headerSubtitle}>
              {loading ? 'Loading...' : `${rideRequests.length} request${rideRequests.length !== 1 ? 's' : ''} available`}
            </Text>
            {driverLocation && (
              <Text style={styles.locationIndicator}>
                📍 Location tracking active
              </Text>
            )}
          </View>
          
          {/* View Toggle Buttons */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'list' && styles.activeToggle]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons 
                name="list" 
                size={20} 
                color={viewMode === 'list' ? colors.white : colors.text.secondary} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'map' && styles.activeToggle]}
              onPress={() => setViewMode('map')}
            >
              <Ionicons 
                name="map" 
                size={20} 
                color={viewMode === 'map' ? colors.white : colors.text.secondary} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState />
      ) : viewMode === 'map' ? (
        <RideRequestMap
          driverLocation={driverLocation}
          rideRequests={rideRequests}
          selectedRequest={selectedRequest}
          onRequestSelect={(request) => setSelectedRequest(request)}
          style={styles.map}
        />
      ) : (
        <FlatList
          data={rideRequests}
          renderItem={renderRideRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContainer,
            rideRequests.length === 0 && styles.emptyContainer
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  headerInfo: {
    flex: 1,
  },

  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: 8,
    padding: 2,
  },

  toggleButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    marginHorizontal: 1,
  },

  activeToggle: {
    backgroundColor: colors.primary,
  },

  map: {
    flex: 1,
  },
  
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  
  headerSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
  },
  
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  
  requestCard: {
    marginBottom: spacing.md,
  },
  
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  
  passengerInfo: {
    flex: 1,
  },
  
  passengerName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  rating: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  
  requestMeta: {
    alignItems: 'flex-end',
  },
  
  requestTime: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  
  tripDetails: {
    marginBottom: spacing.md,
  },
  
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  
  locationDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginLeft: 7,
    marginVertical: spacing.xs,
  },
  
  locationText: {
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  
  tripMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  metaText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  
  earningsText: {
    color: colors.driver.earnings,
    fontWeight: typography.weights.semibold,
  },
  
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  actionButton: {
    width: '48%',
  },
  
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  
  emptyDescription: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.lineHeights.relaxed * typography.sizes.md,
  },
  
  locationIndicator: {
    fontSize: typography.sizes.sm,
    color: colors.success,
    marginTop: spacing.xs,
  },
  
  retryButton: {
    marginTop: spacing.lg,
    width: '60%',
    alignSelf: 'center',
  },
});

export default RideRequestsScreen;