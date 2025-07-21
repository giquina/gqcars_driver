import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../../shared/theme';
import { Button } from '../../shared/components/ui';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <View style={styles.container}>
      {/* Background with gradient */}
      <LinearGradient
        colors={['#007AFF', '#5856D6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="car-outline" size={48} color="#FFFFFF" />
              </View>
              <Text style={styles.logoText}>GQCars</Text>
              <Text style={styles.tagline}>Drive. Earn. Succeed.</Text>
            </View>
          </View>

          {/* Content Section */}
          <View style={styles.content}>
            <View style={styles.featuresContainer}>
              <Text style={styles.title}>Start Earning Today</Text>
              <Text style={styles.subtitle}>
                Join thousands of drivers who are making money on their own schedule
              </Text>

              {/* Feature List */}
              <View style={styles.featuresList}>
                <FeatureItem
                  icon="cash-outline"
                  title="Competitive Rates"
                  description="Earn up to $25/hour with flexible scheduling"
                />
                <FeatureItem
                  icon="time-outline"
                  title="Flexible Schedule"
                  description="Drive when you want, as much as you want"
                />
                <FeatureItem
                  icon="shield-checkmark-outline"
                  title="Safe & Secure"
                  description="Built-in safety features and 24/7 support"
                />
                <FeatureItem
                  icon="trending-up-outline"
                  title="Track Earnings"
                  description="Real-time earnings tracking and analytics"
                />
              </View>
            </View>
          </View>

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            <Button
              title="Get Started"
              onPress={handleRegister}
              variant="surface"
              size="large"
              style={styles.registerButton}
              textStyle={styles.registerButtonText}
            />
            
            <Button
              title="Sign In"
              onPress={handleLogin}
              variant="transparent"
              size="large"
              style={styles.loginButton}
              textStyle={styles.loginButtonText}
            />

            <Text style={styles.footerText}>
              By continuing, you agree to our{'\n'}
              <Text style={styles.linkText}>Terms of Service</Text> and{' '}
              <Text style={styles.linkText}>Privacy Policy</Text>
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const FeatureItem = ({ icon, title, description }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIconContainer}>
      <Ionicons name={icon} size={24} color="#FFFFFF" />
    </View>
    <View style={styles.featureTextContainer}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flex: 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: 32,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: typography.sizes.lg,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: typography.weights.medium,
  },
  content: {
    flex: 0.5,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  featuresContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.lg,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  featuresList: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  bottomActions: {
    flex: 0.2,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    justifyContent: 'flex-end',
  },
  registerButton: {
    backgroundColor: '#FFFFFF',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  registerButtonText: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  loginButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: spacing.lg,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: typography.weights.semibold,
  },
  footerText: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    textDecorationLine: 'underline',
    fontWeight: typography.weights.medium,
  },
});

export default WelcomeScreen;