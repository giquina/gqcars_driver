import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Switch,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, StatusBadge } from '../shared/components/ui';
import { colors, spacing, typography } from '../shared/theme';
import { 
  driverService,
  locationService, 
  notificationService,
  rideRequestService,
  authService,
  earningsService 
} from '../services';

const HomeScreen = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [currentEarnings, setCurrentEarnings] = useState(0);
  const [completedTrips, setCompletedTrips] = useState(0);
  const [hoursOnline, setHoursOnline] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [availableRequests, setAvailableRequests] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Real-time listeners
  const [requestsUnsubscribe, setRequestsUnsubscribe] = useState(null);

  // Initialize services on component mount
  useEffect(() => {
    initializeHomeScreen();
    
    return () => {
      cleanup();
    };
  }, []);
  
  // Initialize home screen with services
  const initializeHomeScreen = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const user = await authService.getCurrentUser();
      if (!user) {
        console.log('No authenticated user found');
        return;
      }
      setCurrentUser(user);
      
      // Initialize notification service
      await notificationService.initialize();
      
      // Get driver profile and current status
      const driver = await driverService.getDriver(user.uid);
      setIsOnline(driver.status === 'online');
      
      // Get current location
      const location = await locationService.getCurrentLocation();
      setDriverLocation(location);
      
      // Set up real-time ride requests listener
      setupRideRequestsListener(location, driver.status === 'online');
      
      // Load today's earnings data
      await loadTodaysEarnings(user.uid);
      
      // Set driver rating
      setDriverRating(driver.rating || 0);
      
    } catch (error) {
      console.error('Error initializing home screen:', error);
      Alert.alert('Error', 'Failed to initialize. Some features may not work properly.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Set up real-time listener for available ride requests
  const setupRideRequestsListener = (location, isDriverOnline) => {
    if (!isDriverOnline || !location) {
      setAvailableRequests(0);
      return;
    }
    
    try {
      const unsubscribe = rideRequestService.subscribeToRideRequests(
        (requests, error) => {
          if (error) {
            console.error('Error in ride requests subscription:', error);
            return;
          }
          setAvailableRequests(requests.length);
        },
        location
      );
      
      setRequestsUnsubscribe(() => unsubscribe);
    } catch (error) {
      console.error('Error setting up ride requests listener:', error);
    }
  };
  
  // Load today's earnings data
  const loadTodaysEarnings = async (driverId) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dailySummary = await earningsService.getDailySummary(driverId, today);
      
      if (dailySummary && dailySummary.summary) {
        setCurrentEarnings(dailySummary.summary.totalEarnings || 0);
        setCompletedTrips(dailySummary.summary.totalTrips || 0);
        setHoursOnline(Math.round((dailySummary.summary.onlineTime || 0) / 60 * 10) / 10); // Convert minutes to hours
      } else {
        // No earnings today - set to 0
        setCurrentEarnings(0);
        setCompletedTrips(0);
        setHoursOnline(0);
      }
    } catch (error) {
      console.error('Error loading today\'s earnings:', error);
      // Keep default values on error
    }
  };
  
  // Cleanup function
  const cleanup = () => {
    if (requestsUnsubscribe) {
      requestsUnsubscribe();
      setRequestsUnsubscribe(null);
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      if (!currentUser) {
        Alert.alert('Error', 'Please sign in to change status');
        return;
      }
      
      if (isOnline) {
        Alert.alert(
          'Go Offline',
          'Are you sure you want to go offline? You will stop receiving ride requests.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Go Offline', 
              onPress: async () => {
                await goOffline();
              }
            }
          ]
        );
      } else {
        await goOnline();
      }
    } catch (error) {
      console.error('Error toggling online status:', error);
      Alert.alert('Error', 'Failed to update status. Please try again.');
    }
  };
  
  // Go online function
  const goOnline = async () => {
    try {
      // Update driver status in Firebase
      await driverService.updateDriverStatus(currentUser.uid, 'online');
      
      // Start location tracking
      await locationService.startTracking(currentUser.uid);
      
      // Get updated location
      const location = await locationService.getCurrentLocation();
      setDriverLocation(location);
      
      // Set up ride requests listener
      setupRideRequestsListener(location, true);
      
      setIsOnline(true);
      
      Alert.alert('You\'re Online!', 'You will now receive ride requests in your area.');
    } catch (error) {
      console.error('Error going online:', error);
      Alert.alert('Error', 'Failed to go online. Please check your location permissions.');
    }
  };
  
  // Go offline function
  const goOffline = async () => {
    try {
      // Update driver status in Firebase
      await driverService.updateDriverStatus(currentUser.uid, 'offline');
      
      // Stop location tracking
      await locationService.stopTracking();
      
      // Clean up ride requests listener
      cleanup();
      
      setIsOnline(false);
      setAvailableRequests(0);
      
    } catch (error) {
      console.error('Error going offline:', error);
      Alert.alert('Error', 'Failed to go offline properly.');
    }
  };

  const getStatusText = () => {
    return isOnline ? 'Online' : 'Offline';
  };

  const getStatusColor = () => {
    return isOnline ? 'online' : 'offline';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good morning, Driver!</Text>
        <Text style={styles.subGreeting}>Ready to start earning?</Text>
      </View>

      <Card style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusInfo}>
            <StatusBadge 
              status={getStatusColor()} 
              text={getStatusText()}
              size="large"
            />
            <Text style={styles.statusDescription}>
              {isOnline ? 'You are online and ready to receive ride requests' : 'Go online to start receiving ride requests'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={toggleOnlineStatus}
            trackColor={{ false: colors.border, true: colors.driver.online }}
            thumbColor={colors.surface}
          />
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Ionicons name="wallet" size={24} color={colors.driver.earnings} />
            <Text style={styles.statValue}>${currentEarnings.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Today's Earnings</Text>
          </View>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={styles.statValue}>{completedTrips}</Text>
            <Text style={styles.statLabel}>Completed Trips</Text>
          </View>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Ionicons name="time" size={24} color={colors.primary} />
            <Text style={styles.statValue}>{hoursOnline}h</Text>
            <Text style={styles.statLabel}>Hours Online</Text>
          </View>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Ionicons name="star" size={24} color={colors.warning} />
            <Text style={styles.statValue}>{driverRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </Card>
      </View>

      {/* Available Requests Card */}
      {isOnline && (
        <Card style={styles.actionCard}>
          <View style={styles.requestsHeader}>
            <Text style={styles.actionTitle}>Available Requests</Text>
            <View style={[styles.requestsBadge, { backgroundColor: availableRequests > 0 ? colors.driver.earnings : colors.border }]}>
              <Text style={[styles.requestsCount, { color: availableRequests > 0 ? colors.surface : colors.text.secondary }]}>
                {availableRequests}
              </Text>
            </View>
          </View>
          <Text style={styles.actionDescription}>
            {availableRequests > 0 
              ? `You have ${availableRequests} ride request${availableRequests > 1 ? 's' : ''} nearby`
              : 'No requests available right now. Stay online to receive new requests.'
            }
          </Text>
          {availableRequests > 0 && (
            <Button
              title={`View ${availableRequests} Request${availableRequests > 1 ? 's' : ''}`}
              variant="primary"
              size="large"
              onPress={() => {}}
              style={styles.actionButton}
            />
          )}
        </Card>
      )}
      
      {!isOnline && (
        <Card style={styles.actionCard}>
          <Text style={styles.actionTitle}>Ready to Start Driving?</Text>
          <Text style={styles.actionDescription}>
            Go online to start receiving ride requests from nearby passengers.
          </Text>
          <Button
            title="Go Online"
            variant="success"
            size="large"
            onPress={toggleOnlineStatus}
            style={styles.actionButton}
            disabled={isLoading}
          />
        </Card>
      )}

      {isOnline && (
        <Card style={styles.actionCard}>
          <Text style={styles.actionTitle}>You're Online!</Text>
          <Text style={styles.actionDescription}>
            {driverLocation 
              ? '📍 Location tracking active. You\'ll receive notifications when new ride requests are available.'
              : 'Getting your location...'}
          </Text>
          <View style={styles.onlineActions}>
            <Button
              title="View Requests"
              variant="primary"
              size="medium"
              onPress={() => {}}
              style={styles.halfButton}
            />
            <Button
              title="Go Offline"
              variant="secondary"
              size="medium"
              onPress={toggleOnlineStatus}
              style={styles.halfButton}
            />
          </View>
        </Card>
      )}
    </ScrollView>
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
  
  greeting: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  
  subGreeting: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
  },
  
  statusCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  statusInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  
  statusDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    lineHeight: typography.lineHeights.relaxed * typography.sizes.sm,
  },
  
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  
  statCard: {
    width: '48%',
    marginBottom: spacing.md,
    marginRight: '2%',
  },
  
  statContent: {
    alignItems: 'center',
  },
  
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  
  actionCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  
  actionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  
  actionDescription: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.lineHeights.relaxed * typography.sizes.md,
    marginBottom: spacing.lg,
  },
  
  actionButton: {
    marginTop: spacing.sm,
  },
  
  onlineActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  halfButton: {
    width: '48%',
  },
  
  requestsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  requestsBadge: {
    borderRadius: 20,
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  requestsCount: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
});

export default HomeScreen;