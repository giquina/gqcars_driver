import React, { useState, useEffect, useContext } from 'react';
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
import { earningsService, authService } from '../services';
import { AuthContext } from '../contexts/AuthContext';

const EarningsScreen = () => {
  const { user } = useContext(AuthContext);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [earningsData, setEarningsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Initialize earnings data on component mount
  useEffect(() => {
    loadEarningsData();
  }, [user]);
  
  // Reload data when period changes
  useEffect(() => {
    if (user && earningsData) {
      loadEarningsData();
    }
  }, [selectedPeriod]);
  
  const loadEarningsData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const today = new Date();
      let data = {};
      
      if (selectedPeriod === 'today') {
        const todayData = await loadTodayData(today);
        data = { today: todayData };
      } else if (selectedPeriod === 'week') {
        const weekData = await loadWeekData(today);
        data = { week: weekData };
      } else if (selectedPeriod === 'month') {
        const monthData = await loadMonthData(today);
        data = { month: monthData };
      }
      
      setEarningsData(data);
    } catch (error) {
      console.error('Error loading earnings data:', error);
      setError('Failed to load earnings data');
      // Set fallback data
      setEarningsData({
        [selectedPeriod]: {
          total: 0,
          trips: 0,
          hours: 0,
          tips: 0,
          breakdown: []
        }
      });
    } finally {
      setLoading(false);
    }
  };
  
  const loadTodayData = async (today) => {
    today.setHours(0, 0, 0, 0);
    const dailySummary = await earningsService.getDailySummary(user.uid, today);
    
    if (dailySummary && dailySummary.summary) {
      // Get today's individual trip earnings for breakdown
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      const todayEarnings = await earningsService.getEarnings(user.uid, today, todayEnd, 10);
      
      return {
        total: dailySummary.summary.totalEarnings || 0,
        trips: dailySummary.summary.totalTrips || 0,
        hours: Math.round((dailySummary.summary.onlineTime || 0) / 60 * 10) / 10,
        tips: dailySummary.summary.tips || 0,
        breakdown: todayEarnings.map(earning => ({
          time: earning.completedAt?.toDate ? earning.completedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          passenger: 'Passenger', // Anonymized for privacy
          amount: earning.driverEarnings.netEarning || 0,
          tip: earning.fareBreakdown.tips || 0
        }))
      };
    }
    
    return { total: 0, trips: 0, hours: 0, tips: 0, breakdown: [] };
  };
  
  const loadWeekData = async (today) => {
    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const weekSummary = await earningsService.getWeeklySummary(user.uid, startOfWeek);
    
    if (weekSummary && weekSummary.weeklyTotal) {
      return {
        total: weekSummary.weeklyTotal.totalEarnings || 0,
        trips: weekSummary.weeklyTotal.totalTrips || 0,
        hours: Math.round((weekSummary.weeklyTotal.onlineTime || 0) / 60 * 10) / 10,
        tips: weekSummary.weeklyTotal.tips || 0,
        breakdown: []
      };
    }
    
    return { total: 0, trips: 0, hours: 0, tips: 0, breakdown: [] };
  };
  
  const loadMonthData = async (today) => {
    const monthSummary = await earningsService.getMonthlySummary(user.uid, today.getFullYear(), today.getMonth());
    
    if (monthSummary && monthSummary.monthlyTotal) {
      return {
        total: monthSummary.monthlyTotal.totalEarnings || 0,
        trips: monthSummary.monthlyTotal.totalTrips || 0,
        hours: Math.round((monthSummary.monthlyTotal.onlineTime || 0) / 60 * 10) / 10,
        tips: monthSummary.monthlyTotal.tips || 0,
        breakdown: []
      };
    }
    
    return { total: 0, trips: 0, hours: 0, tips: 0, breakdown: [] };
  };

  const currentData = earningsData ? earningsData[selectedPeriod] : { total: 0, trips: 0, hours: 0, tips: 0, breakdown: [] };

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

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Loading earnings data...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <Button
          title="Retry"
          onPress={loadEarningsData}
          variant="primary"
          style={styles.retryButton}
        />
      </View>
    );
  }
  
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
  
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  
  loadingText: {
    fontSize: typography.sizes.lg,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  
  errorText: {
    fontSize: typography.sizes.md,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  
  retryButton: {
    marginTop: spacing.md,
  },
});

export default EarningsScreen;