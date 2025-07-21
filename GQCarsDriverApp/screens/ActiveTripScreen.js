import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert,
  Linking 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, StatusBadge } from '../shared/components/ui';
import { colors, spacing, typography } from '../shared/theme';

const ActiveTripScreen = () => {
  const [activeTrip, setActiveTrip] = useState({
    id: 'trip_123',
    passengerName: 'John Smith',
    passengerPhone: '+1 (555) 123-4567',
    pickup: '123 Main St, Downtown',
    destination: 'Airport Terminal 1',
    distance: '12.5 mi',
    estimatedEarnings: 18.50,
    estimatedTime: '25 min',
    rating: 4.9,
    status: 'en_route_to_pickup', // en_route_to_pickup, arrived_at_pickup, passenger_onboard, arrived_at_destination
    startTime: new Date(),
    pickupETA: '8 min'
  });

  const [tripTimer, setTripTimer] = useState('00:15:32');

  const getStatusInfo = () => {
    switch (activeTrip?.status) {
      case 'en_route_to_pickup':
        return {
          title: 'Driving to Pickup',
          description: 'Navigate to passenger location',
          color: 'busy',
          action: 'Arrived at Pickup'
        };
      case 'arrived_at_pickup':
        return {
          title: 'Arrived at Pickup',
          description: 'Waiting for passenger',
          color: 'online',
          action: 'Start Trip'
        };
      case 'passenger_onboard':
        return {
          title: 'Trip in Progress',
          description: 'Passenger onboard - Navigate to destination',
          color: 'earning',
          action: 'Complete Trip'
        };
      case 'arrived_at_destination':
        return {
          title: 'Arrived at Destination',
          description: 'Trip completed',
          color: 'online',
          action: 'End Trip'
        };
      default:
        return {
          title: 'No Active Trip',
          description: 'Accept a ride request to start',
          color: 'offline',
          action: null
        };
    }
  };

  const callPassenger = () => {
    if (activeTrip?.passengerPhone) {
      Linking.openURL(`tel:${activeTrip.passengerPhone}`);
    }
  };

  const openNavigation = () => {
    const destination = activeTrip?.status === 'passenger_onboard' 
      ? activeTrip.destination 
      : activeTrip.pickup;
    
    Alert.alert(
      'Open Navigation',
      `Navigate to ${destination}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Maps', onPress: () => {} }
      ]
    );
  };

  const updateTripStatus = () => {
    const currentStatus = activeTrip?.status;
    let newStatus;
    
    switch (currentStatus) {
      case 'en_route_to_pickup':
        newStatus = 'arrived_at_pickup';
        break;
      case 'arrived_at_pickup':
        newStatus = 'passenger_onboard';
        break;
      case 'passenger_onboard':
        newStatus = 'arrived_at_destination';
        break;
      case 'arrived_at_destination':
        Alert.alert(
          'Complete Trip',
          'Mark this trip as completed?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Complete', 
              onPress: () => {
                setActiveTrip(null);
                Alert.alert('Trip Completed', 'Great job! Your earnings have been updated.');
              }
            }
          ]
        );
        return;
    }
    
    setActiveTrip({ ...activeTrip, status: newStatus });
  };

  const cancelTrip = () => {
    Alert.alert(
      'Cancel Trip',
      'Are you sure you want to cancel this trip? This may affect your driver rating.',
      [
        { text: 'No, Continue Trip', style: 'cancel' },
        { 
          text: 'Yes, Cancel Trip', 
          style: 'destructive',
          onPress: () => {
            setActiveTrip(null);
            Alert.alert('Trip Cancelled', 'Trip has been cancelled.');
          }
        }
      ]
    );
  };

  if (!activeTrip) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="car-outline" size={64} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No Active Trip</Text>
          <Text style={styles.emptyDescription}>
            Accept a ride request from the Requests tab to start a trip.
          </Text>
        </View>
      </View>
    );
  }

  const statusInfo = getStatusInfo();

  return (
    <View style={styles.container}>
      <Card style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <StatusBadge 
            status={statusInfo.color} 
            text={statusInfo.title}
            size="large"
          />
          <Text style={styles.tripTimer}>{tripTimer}</Text>
        </View>
        <Text style={styles.statusDescription}>{statusInfo.description}</Text>
      </Card>

      <Card style={styles.passengerCard}>
        <View style={styles.passengerHeader}>
          <View style={styles.passengerInfo}>
            <Text style={styles.passengerName}>{activeTrip.passengerName}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color={colors.warning} />
              <Text style={styles.rating}>{activeTrip.rating}</Text>
            </View>
          </View>
          <Button
            title="Call"
            variant="primary"
            size="small"
            onPress={callPassenger}
            style={styles.callButton}
          />
        </View>
      </Card>

      <Card style={styles.tripCard}>
        <Text style={styles.cardTitle}>Trip Details</Text>
        
        <View style={styles.locationContainer}>
          <View style={styles.locationRow}>
            <Ionicons name="radio-button-on" size={18} color={colors.success} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationText}>{activeTrip.pickup}</Text>
              {activeTrip.status === 'en_route_to_pickup' && (
                <Text style={styles.etaText}>ETA: {activeTrip.pickupETA}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.locationDivider} />
          
          <View style={styles.locationRow}>
            <Ionicons name="location" size={18} color={colors.danger} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Destination</Text>
              <Text style={styles.locationText}>{activeTrip.destination}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tripMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="car" size={16} color={colors.text.secondary} />
            <Text style={styles.metaText}>{activeTrip.distance}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time" size={16} color={colors.text.secondary} />
            <Text style={styles.metaText}>{activeTrip.estimatedTime}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="wallet" size={16} color={colors.driver.earnings} />
            <Text style={[styles.metaText, styles.earningsText]}>
              ${activeTrip.estimatedEarnings.toFixed(2)}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.actionContainer}>
        <Button
          title="Navigate"
          variant="primary"
          size="large"
          onPress={openNavigation}
          style={styles.navigateButton}
        />
        
        {statusInfo.action && (
          <Button
            title={statusInfo.action}
            variant="success"
            size="large"
            onPress={updateTripStatus}
            style={styles.actionButton}
          />
        )}
        
        <Button
          title="Cancel Trip"
          variant="danger"
          size="medium"
          onPress={cancelTrip}
          style={styles.cancelButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  
  statusCard: {
    marginBottom: spacing.md,
  },
  
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  tripTimer: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  
  statusDescription: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
  },
  
  passengerCard: {
    marginBottom: spacing.md,
  },
  
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  
  callButton: {
    minWidth: 80,
  },
  
  tripCard: {
    marginBottom: spacing.lg,
  },
  
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  
  locationContainer: {
    marginBottom: spacing.md,
  },
  
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  
  locationInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  
  locationLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  
  locationText: {
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    lineHeight: typography.lineHeights.normal * typography.sizes.md,
  },
  
  etaText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },
  
  locationDivider: {
    width: 2,
    height: 30,
    backgroundColor: colors.border,
    marginLeft: 8,
    marginVertical: spacing.xs,
  },
  
  tripMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  
  actionContainer: {
    gap: spacing.md,
  },
  
  navigateButton: {
    marginBottom: spacing.sm,
  },
  
  actionButton: {
    marginBottom: spacing.sm,
  },
  
  cancelButton: {
    marginTop: spacing.sm,
  },
  
  emptyState: {
    flex: 1,
    justifyContent: 'center',
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
});

export default ActiveTripScreen;