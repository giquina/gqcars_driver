import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '../shared/components/ui';
import { colors, spacing, typography } from '../shared/theme';

const EarningsScreen = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  
  const earningsData = {
    today: {
      total: 247.50,
      trips: 12,
      hours: 6.5,
      tips: 45.00,
      breakdown: [
        { time: '2:30 PM', passenger: 'John Smith', amount: 18.50, tip: 5.00 },
        { time: '1:45 PM', passenger: 'Sarah Johnson', amount: 12.25, tip: 2.50 },
        { time: '12:30 PM', passenger: 'Mike Wilson', amount: 14.75, tip: 3.00 },
        { time: '11:15 AM', passenger: 'Emily Davis', amount: 16.80, tip: 4.20 },
        { time: '10:00 AM', passenger: 'David Brown', amount: 22.30, tip: 6.50 },
      ]
    },
    week: {
      total: 1247.80,
      trips: 58,
      hours: 32.5,
      tips: 234.50,
      breakdown: []
    },
    month: {
      total: 4829.30,
      trips: 242,
      hours: 128,
      tips: 892.60,
      breakdown: []
    }
  };

  const currentData = earningsData[selectedPeriod];

  const periods = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' }
  ];

  const calculateAverage = () => {
    if (currentData.trips === 0) return 0;
    return (currentData.total / currentData.trips).toFixed(2);
  };

  const calculateHourlyRate = () => {
    if (currentData.hours === 0) return 0;
    return (currentData.total / currentData.hours).toFixed(2);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Earnings</Text>
        <Text style={styles.headerSubtitle}>Track your driver performance</Text>
      </View>

      <View style={styles.periodSelector}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.key}
            style={[
              styles.periodButton,
              selectedPeriod === period.key && styles.activePeriod
            ]}
            onPress={() => setSelectedPeriod(period.key)}
          >
            <Text style={[
              styles.periodText,
              selectedPeriod === period.key && styles.activePeriodText
            ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card style={styles.totalEarningsCard}>
        <View style={styles.totalEarningsContent}>
          <Text style={styles.totalEarningsLabel}>Total Earnings</Text>
          <Text style={styles.totalEarningsAmount}>
            ${currentData.total.toFixed(2)}
          </Text>
          {currentData.tips > 0 && (
            <Text style={styles.tipsText}>
              Includes ${currentData.tips.toFixed(2)} in tips
            </Text>
          )}
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Ionicons name="car" size={24} color={colors.primary} />
            <Text style={styles.statValue}>{currentData.trips}</Text>
            <Text style={styles.statLabel}>Completed Trips</Text>
          </View>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Ionicons name="time" size={24} color={colors.success} />
            <Text style={styles.statValue}>{currentData.hours}h</Text>
            <Text style={styles.statLabel}>Hours Online</Text>
          </View>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Ionicons name="trending-up" size={24} color={colors.driver.earnings} />
            <Text style={styles.statValue}>${calculateAverage()}</Text>
            <Text style={styles.statLabel}>Avg per Trip</Text>
          </View>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Ionicons name="cash" size={24} color={colors.warning} />
            <Text style={styles.statValue}>${calculateHourlyRate()}</Text>
            <Text style={styles.statLabel}>Per Hour</Text>
          </View>
        </Card>
      </View>

      {selectedPeriod === 'today' && currentData.breakdown.length > 0 && (
        <Card style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Today's Trip History</Text>
          {currentData.breakdown.map((trip, index) => (
            <View key={index} style={styles.tripRow}>
              <View style={styles.tripInfo}>
                <Text style={styles.tripTime}>{trip.time}</Text>
                <Text style={styles.tripPassenger}>{trip.passenger}</Text>
              </View>
              <View style={styles.tripEarnings}>
                <Text style={styles.tripAmount}>${trip.amount.toFixed(2)}</Text>
                {trip.tip > 0 && (
                  <Text style={styles.tripTip}>+${trip.tip.toFixed(2)} tip</Text>
                )}
              </View>
            </View>
          ))}
        </Card>
      )}

      <View style={styles.actionSection}>
        <Card style={styles.payoutCard}>
          <View style={styles.payoutHeader}>
            <Ionicons name="card" size={24} color={colors.primary} />
            <Text style={styles.payoutTitle}>Instant Payout</Text>
          </View>
          <Text style={styles.payoutDescription}>
            Transfer your earnings to your bank account instantly for a small fee.
          </Text>
          <Button
            title="Cash Out Now"
            variant="primary"
            size="large"
            onPress={() => {}}
            style={styles.payoutButton}
          />
        </Card>

        <Card style={styles.documentsCard}>
          <View style={styles.documentsHeader}>
            <Ionicons name="document-text" size={24} color={colors.text.secondary} />
            <Text style={styles.documentsTitle}>Tax Documents</Text>
          </View>
          <Text style={styles.documentsDescription}>
            Download your earnings summary and tax documents.
          </Text>
          <Button
            title="View Documents"
            variant="secondary"
            size="medium"
            onPress={() => {}}
            style={styles.documentsButton}
          />
        </Card>
      </View>
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
  
  headerTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  
  headerSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
  },
  
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.xs,
  },
  
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    alignItems: 'center',
  },
  
  activePeriod: {
    backgroundColor: colors.primary,
  },
  
  periodText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  
  activePeriodText: {
    color: colors.text.inverse,
  },
  
  totalEarningsCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  
  totalEarningsContent: {
    alignItems: 'center',
  },
  
  totalEarningsLabel: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  
  totalEarningsAmount: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    color: colors.driver.earnings,
    marginBottom: spacing.xs,
  },
  
  tipsText: {
    fontSize: typography.sizes.sm,
    color: colors.success,
    fontWeight: typography.weights.medium,
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
  
  breakdownCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  
  breakdownTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  
  tripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  
  tripInfo: {
    flex: 1,
  },
  
  tripTime: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  
  tripPassenger: {
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    fontWeight: typography.weights.medium,
  },
  
  tripEarnings: {
    alignItems: 'flex-end',
  },
  
  tripAmount: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  
  tripTip: {
    fontSize: typography.sizes.sm,
    color: colors.success,
    marginTop: spacing.xs,
  },
  
  actionSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  
  payoutCard: {
    marginBottom: spacing.md,
  },
  
  payoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  payoutTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  
  payoutDescription: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    lineHeight: typography.lineHeights.relaxed * typography.sizes.md,
    marginBottom: spacing.lg,
  },
  
  payoutButton: {
    marginTop: spacing.sm,
  },
  
  documentsCard: {
    marginBottom: spacing.md,
  },
  
  documentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  documentsTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  
  documentsDescription: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    lineHeight: typography.lineHeights.relaxed * typography.sizes.md,
    marginBottom: spacing.lg,
  },
  
  documentsButton: {
    marginTop: spacing.sm,
  },
});

export default EarningsScreen;