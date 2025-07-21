import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './GQCarsDriverApp/contexts/AuthContext';
import AuthStack from './GQCarsDriverApp/navigation/AuthStack';
import TabNavigator from './GQCarsDriverApp/navigation/TabNavigator';
import DocumentVerificationScreen from './GQCarsDriverApp/screens/auth/DocumentVerificationScreen';
import { colors, spacing, typography } from './GQCarsDriverApp/shared/theme';
import './firebase'; // Initialize Firebase

// Main App Component with Authentication Logic
const AppContent = () => {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    driverProfile,
    isVerifiedDriver,
    hasPendingVerification,
    hasRequiredDocuments
  } = useAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoContainer}>
          <Ionicons name="car-outline" size={48} color={colors.primary} />
          <Text style={styles.logoText}>GQCars</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loadingSpinner} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show authentication stack if not authenticated
  if (!isAuthenticated) {
    return <AuthStack />;
  }

  // If authenticated but no driver profile, show document verification
  if (!driverProfile) {
    return <DocumentVerificationScreen />;
  }

  // If authenticated but documents not uploaded, show document verification
  if (!hasRequiredDocuments()) {
    return <DocumentVerificationScreen />;
  }

  // Show main app for verified or pending drivers
  return <TabNavigator />;
};

// Root App Component
export default function App() {
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState(null);

  useEffect(() => {
    // Firebase is initialized on import, but we can add additional setup here
    try {
      // You could add any app-specific Firebase initialization here
      setFirebaseInitialized(true);
      console.log('GQCars Driver App initialized with Firebase');
    } catch (error) {
      console.error('Error during app initialization:', error);
      setInitializationError(error.message);
    }
  }, []);

  if (initializationError) {
    return (
      <SafeAreaProvider>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={64} color={colors.danger} />
          </View>
          <Text style={styles.errorTitle}>Initialization Error</Text>
          <Text style={styles.errorMessage}>
            Failed to initialize the app: {initializationError}
          </Text>
          <Text style={styles.errorSubtext}>
            Please check your network connection and Firebase configuration.
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!firebaseInitialized) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <View style={styles.logoContainer}>
            <Ionicons name="car-outline" size={48} color={colors.primary} />
            <Text style={styles.logoText}>GQCars</Text>
          </View>
          <ActivityIndicator size="large" color={colors.primary} style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Initializing GQCars Driver...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <AppContent />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoText: {
    fontSize: 28,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  loadingSpinner: {
    marginVertical: spacing.lg,
  },
  loadingText: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  errorIcon: {
    marginBottom: spacing.lg,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  errorSubtext: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});