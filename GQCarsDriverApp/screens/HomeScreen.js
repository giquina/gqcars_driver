import React, { useState } from 'react';
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

const HomeScreen = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [currentEarnings, setCurrentEarnings] = useState(247.50);
  const [completedTrips, setCompletedTrips] = useState(12);
  const [hoursOnline, setHoursOnline] = useState(6.5);

  const toggleOnlineStatus = () => {
    if (isOnline) {
      Alert.alert(
        'Go Offline',
        'Are you sure you want to go offline? You will stop receiving ride requests.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go Offline', onPress: () => setIsOnline(false) }
        ]
      );
    } else {
      setIsOnline(true);
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
            <Text style={styles.statValue}>4.8</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </Card>
      </View>

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
            onPress={() => setIsOnline(true)}
            style={styles.actionButton}
          />
        </Card>
      )}

      {isOnline && (
        <Card style={styles.actionCard}>
          <Text style={styles.actionTitle}>You're Online!</Text>
          <Text style={styles.actionDescription}>
            You'll receive notifications when new ride requests are available.
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
});

export default HomeScreen;