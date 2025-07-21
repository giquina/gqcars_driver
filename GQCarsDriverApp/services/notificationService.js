import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Platform, Alert } from 'react-native';

/**
 * Notification Service for handling ride request alerts
 * Manages sound, vibration, and push notifications for drivers
 */

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.notificationPermissionGranted = false;
  }

  /**
   * Initialize the notification service
   */
  async initialize() {
    try {
      // Request notification permissions
      await this.requestPermissions();
      
      this.isInitialized = true;
      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      throw new Error(`Notification service initialization failed: ${error.message}`);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Notifications Required',
          'Please enable notifications to receive ride requests. You can change this in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Notifications.openSettingsAsync() }
          ]
        );
        return false;
      }

      this.notificationPermissionGranted = true;

      // Get push token for future use
      if (Platform.OS !== 'web') {
        const token = await Notifications.getExpoPushTokenAsync();
        console.log('Push notification token:', token.data);
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }


  /**
   * Play notification sound (using system notification sound)
   */
  async playNotificationSound() {
    try {
      // For now, we rely on the system notification sound
      // In a production app, you would load and play custom sounds here
      console.log('Playing notification sound');
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  /**
   * Trigger haptic feedback
   */
  async triggerHapticFeedback(intensity = 'heavy') {
    try {
      switch (intensity) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.error('Error triggering haptic feedback:', error);
    }
  }

  /**
   * Show local notification for ride request
   */
  async showRideRequestNotification(rideRequest) {
    try {
      if (!this.notificationPermissionGranted) {
        console.warn('Notification permissions not granted');
        return;
      }

      const { passengerInfo, pickupLocation, estimatedFare, estimatedTime } = rideRequest;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚗 New Ride Request',
          body: `${passengerInfo.name} needs a ride from ${pickupLocation.address}`,
          data: { 
            rideRequestId: rideRequest.id,
            type: 'ride_request' 
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          sticky: false,
          autoDismiss: true,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error showing ride request notification:', error);
    }
  }

  /**
   * Show urgent ride request alert with sound and vibration
   */
  async showUrgentRideAlert(rideRequest) {
    try {
      // Play sound
      await this.playNotificationSound();
      
      // Trigger strong vibration
      await this.triggerHapticFeedback('heavy');
      
      // Show notification
      await this.showRideRequestNotification(rideRequest);
      
      console.log('Urgent ride alert triggered for request:', rideRequest.id);
    } catch (error) {
      console.error('Error showing urgent ride alert:', error);
    }
  }

  /**
   * Cancel all ride request notifications
   */
  async cancelRideRequestNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }

  /**
   * Show timeout warning notification
   */
  async showTimeoutWarning(timeLeft) {
    try {
      await this.triggerHapticFeedback('medium');
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Ride Request Expiring',
          body: `${timeLeft} seconds left to respond to ride request`,
          data: { type: 'timeout_warning' },
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error showing timeout warning:', error);
    }
  }

  /**
   * Show ride accepted confirmation
   */
  async showRideAcceptedNotification() {
    try {
      await this.triggerHapticFeedback('light');
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Ride Accepted',
          body: 'You have successfully accepted the ride request',
          data: { type: 'ride_accepted' },
          sound: false,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error showing ride accepted notification:', error);
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      await this.cancelRideRequestNotifications();
      this.isInitialized = false;
    } catch (error) {
      console.error('Error cleaning up notification service:', error);
    }
  }

  /**
   * Check if notifications are properly configured
   */
  isReady() {
    return this.isInitialized && this.notificationPermissionGranted;
  }
}

export default new NotificationService();