import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Alert,
  RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, StatusBadge } from '../shared/components/ui';
import { colors, spacing, typography } from '../shared/theme';

const RideRequestsScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [rideRequests] = useState([
    {
      id: '1',
      passengerName: 'John Smith',
      pickup: '123 Main St, Downtown',
      destination: 'Airport Terminal 1',
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
      pickup: '456 Oak Avenue',
      destination: 'City Mall',
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
      pickup: '789 Pine Street',
      destination: 'University Campus',
      distance: '8.7 mi',
      estimatedEarnings: 14.75,
      estimatedTime: '18 min',
      rating: 4.8,
      requestTime: '7 min ago',
      priority: 'medium'
    }
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  const acceptRide = (rideId, passengerName) => {
    Alert.alert(
      'Accept Ride Request',
      `Accept ride request from ${passengerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept', 
          onPress: () => {
            Alert.alert('Ride Accepted', 'Navigate to pickup location?');
          }
        }
      ]
    );
  };

  const declineRide = (rideId) => {
    Alert.alert(
      'Decline Ride',
      'Are you sure you want to decline this ride request?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Decline', style: 'destructive' }
      ]
    );
  };

  const renderRideRequest = ({ item }) => (
    <Card style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.passengerInfo}>
          <Text style={styles.passengerName}>{item.passengerName}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color={colors.warning} />
            <Text style={styles.rating}>{item.rating}</Text>
          </View>
        </View>
        <View style={styles.requestMeta}>
          <Text style={styles.requestTime}>{item.requestTime}</Text>
          {item.priority === 'high' && (
            <StatusBadge status="earning" text="High Priority" size="small" />
          )}
        </View>
      </View>

      <View style={styles.tripDetails}>
        <View style={styles.locationRow}>
          <Ionicons name="radio-button-on" size={16} color={colors.success} />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.pickup}
          </Text>
        </View>
        <View style={styles.locationDivider} />
        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color={colors.danger} />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.destination}
          </Text>
        </View>
      </View>

      <View style={styles.tripMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="car" size={16} color={colors.text.secondary} />
          <Text style={styles.metaText}>{item.distance}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time" size={16} color={colors.text.secondary} />
          <Text style={styles.metaText}>{item.estimatedTime}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="wallet" size={16} color={colors.driver.earnings} />
          <Text style={[styles.metaText, styles.earningsText]}>
            ${item.estimatedEarnings.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <Button
          title="Decline"
          variant="secondary"
          size="medium"
          onPress={() => declineRide(item.id)}
          style={styles.actionButton}
        />
        <Button
          title="Accept Ride"
          variant="success"
          size="medium"
          onPress={() => acceptRide(item.id, item.passengerName)}
          style={styles.actionButton}
        />
      </View>
    </Card>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="car-outline" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyTitle}>No Ride Requests</Text>
      <Text style={styles.emptyDescription}>
        Pull down to refresh or make sure you're online to receive ride requests.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Ride Requests</Text>
        <Text style={styles.headerSubtitle}>
          {rideRequests.length} request{rideRequests.length !== 1 ? 's' : ''} available
        </Text>
      </View>

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
});

export default RideRequestsScreen;