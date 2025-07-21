import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Switch,
  Alert,
  Image,
  TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, StatusBadge } from '../shared/components/ui';
import { colors, spacing, typography } from '../shared/theme';
import { useAuth } from '../contexts/AuthContext';

const ProfileScreen = ({ navigation }) => {
  const { 
    user, 
    driverProfile, 
    signOut, 
    isVerifiedDriver, 
    hasPendingVerification,
    isSuspended,
    getDriverName,
    getVerificationProgress
  } = useAuth();

  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    autoAcceptRides: false,
    shareLocation: true,
    darkMode: false
  });

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const showEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing feature coming soon!');
  };

  const showVehicleInfo = () => {
    Alert.alert('Vehicle Information', 'Vehicle management feature coming soon!');
  };

  const showDocuments = () => {
    navigation.navigate('DocumentVerification');
  };

  const showSupport = () => {
    Alert.alert('Support', 'Support feature coming soon!');
  };

  const showPrivacy = () => {
    Alert.alert('Privacy Policy', 'Privacy policy feature coming soon!');
  };

  const showTerms = () => {
    Alert.alert('Terms of Service', 'Terms of service feature coming soon!');
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await signOut();
              // Navigation will be handled automatically by App.js
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };

  const SettingRow = ({ title, description, value, onValueChange, icon }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Ionicons name={icon} size={20} color={colors.text.secondary} />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {description && (
            <Text style={styles.settingDescription}>{description}</Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.surface}
      />
    </View>
  );

  const MenuRow = ({ title, subtitle, icon, onPress, showArrow = true }) => (
    <View style={styles.menuRow}>
      <View style={styles.menuInfo}>
        <Ionicons name={icon} size={20} color={colors.text.secondary} />
        <View style={styles.menuText}>
          <Text style={styles.menuTitle}>{title}</Text>
          {subtitle && (
            <Text style={styles.menuSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      {showArrow && (
        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
      )}
    </View>
  );

  // Get verification status for badge
  const getVerificationStatus = () => {
    if (isVerifiedDriver()) return { status: 'online', text: 'Verified' };
    if (hasPendingVerification()) return { status: 'busy', text: 'Pending' };
    if (isSuspended()) return { status: 'offline', text: 'Suspended' };
    return { status: 'offline', text: 'Unverified' };
  };

  const verificationStatus = getVerificationStatus();
  const progress = getVerificationProgress();

  // Don't render if no user data
  if (!user || !driverProfile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Verification Progress Banner */}
      {!isVerifiedDriver() && progress < 100 && (
        <View style={styles.verificationBanner}>
          <View style={styles.bannerContent}>
            <Ionicons name="alert-circle-outline" size={24} color={colors.warning} />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Complete Your Verification</Text>
              <Text style={styles.bannerSubtitle}>
                {progress}% complete - Upload remaining documents to start driving
              </Text>
            </View>
            <TouchableOpacity onPress={showDocuments}>
              <Text style={styles.bannerAction}>Upload</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.progressBarSmall}>
            <View style={[styles.progressFillSmall, { width: `${progress}%` }]} />
          </View>
        </View>
      )}

      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ 
                uri: driverProfile.documents?.profilePhoto?.url || 'https://via.placeholder.com/80x80/CCCCCC/FFFFFF?text=Driver' 
              }}
              style={styles.avatar}
            />
            <StatusBadge 
              status={verificationStatus.status} 
              text={verificationStatus.text} 
              size="small" 
              style={styles.verifiedBadge} 
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.driverName}>{getDriverName()}</Text>
            <Text style={styles.driverEmail}>{user.email}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color={colors.warning} />
              <Text style={styles.rating}>{driverProfile.rating?.toFixed(1) || '5.0'}</Text>
              <Text style={styles.totalTrips}>• {driverProfile.totalTrips || 0} trips</Text>
            </View>
          </View>
        </View>
        <Button
          title="Edit Profile"
          variant="secondary"
          size="medium"
          onPress={showEditProfile}
          style={styles.editButton}
        />
      </Card>

      <Card style={styles.statsCard}>
        <Text style={styles.sectionTitle}>Driver Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{driverProfile.rating?.toFixed(1) || '5.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{driverProfile.totalTrips || 0}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {driverProfile.createdAt ? 
                new Date(driverProfile.createdAt.toDate()).toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                }) : 
                'Recent'
              }
            </Text>
            <Text style={styles.statLabel}>Member Since</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.menuCard}>
        <Text style={styles.sectionTitle}>Vehicle & Documents</Text>
        <MenuRow
          title="Vehicle Information"
          subtitle={driverProfile.vehicleInfo ? 
            `${driverProfile.vehicleInfo.year} ${driverProfile.vehicleInfo.make} ${driverProfile.vehicleInfo.model}` :
            'No vehicle information'
          }
          icon="car"
          onPress={showVehicleInfo}
        />
        <MenuRow
          title="Documents"
          subtitle="Driver license, insurance, registration"
          icon="document-text"
          onPress={showDocuments}
        />
      </Card>

      <Card style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>Notification Settings</Text>
        <SettingRow
          title="Push Notifications"
          description="Receive ride requests and updates"
          value={settings.pushNotifications}
          onValueChange={(value) => updateSetting('pushNotifications', value)}
          icon="notifications"
        />
        <SettingRow
          title="Email Notifications"
          description="Earnings summaries and updates"
          value={settings.emailNotifications}
          onValueChange={(value) => updateSetting('emailNotifications', value)}
          icon="mail"
        />
      </Card>

      <Card style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>Driver Preferences</Text>
        <SettingRow
          title="Auto-Accept Rides"
          description="Automatically accept ride requests"
          value={settings.autoAcceptRides}
          onValueChange={(value) => updateSetting('autoAcceptRides', value)}
          icon="refresh"
        />
        <SettingRow
          title="Share Location"
          description="Allow passengers to track your location"
          value={settings.shareLocation}
          onValueChange={(value) => updateSetting('shareLocation', value)}
          icon="location"
        />
        <SettingRow
          title="Dark Mode"
          description="Use dark theme for the app"
          value={settings.darkMode}
          onValueChange={(value) => updateSetting('darkMode', value)}
          icon="moon"
        />
      </Card>

      <Card style={styles.menuCard}>
        <Text style={styles.sectionTitle}>Support & Legal</Text>
        <MenuRow
          title="Help & Support"
          subtitle="Get help with the app"
          icon="help-circle"
          onPress={showSupport}
        />
        <MenuRow
          title="Privacy Policy"
          icon="shield-checkmark"
          onPress={showPrivacy}
        />
        <MenuRow
          title="Terms of Service"
          icon="document"
          onPress={showTerms}
        />
      </Card>

      <View style={styles.signOutSection}>
        <Button
          title="Sign Out"
          variant="danger"
          size="large"
          onPress={handleSignOut}
          style={styles.signOutButton}
        />
      </View>

      <View style={styles.versionInfo}>
        <Text style={styles.versionText}>GQCars Driver v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  
  loadingText: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
  },
  
  verificationBanner: {
    backgroundColor: '#FFF9E6',
    borderColor: colors.warning,
    borderWidth: 1,
    margin: spacing.md,
    borderRadius: 8,
    overflow: 'hidden',
  },
  
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  
  bannerText: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  
  bannerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  
  bannerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  
  bannerAction: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    padding: spacing.sm,
  },
  
  progressBarSmall: {
    height: 3,
    backgroundColor: colors.divider,
  },
  
  progressFillSmall: {
    height: '100%',
    backgroundColor: colors.warning,
  },
  
  profileCard: {
    margin: spacing.md,
    marginBottom: spacing.sm,
  },
  
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background,
  },
  
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  
  profileInfo: {
    flex: 1,
  },
  
  driverName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  
  driverEmail: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  rating: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  
  totalTrips: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  
  editButton: {
    marginTop: spacing.sm,
  },
  
  statsCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  
  menuCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  
  menuInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  menuText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  
  menuTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  
  menuSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  
  settingsCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  settingText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  
  settingTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  
  settingDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  
  signOutSection: {
    margin: spacing.md,
    marginTop: spacing.lg,
  },
  
  signOutButton: {
    marginBottom: spacing.md,
  },
  
  versionInfo: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  
  versionText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
});

export default ProfileScreen;