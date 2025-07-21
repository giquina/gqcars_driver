import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, typography } from '../../shared/theme';
import { Button } from '../../shared/components/ui';
import { useAuth } from '../../contexts/AuthContext';

const RegisterScreen = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    
    // Step 2: Personal Info
    phone: '',
    dateOfBirth: new Date(),
    licenseNumber: '',
    
    // Step 3: Vehicle Info
    vehicleInfo: {
      make: '',
      model: '',
      year: '',
      color: '',
      licensePlate: ''
    }
  });
  
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    registerDriver, 
    isLoading, 
    error, 
    clearError,
    isPhoneNumberRegistered,
    isLicenseNumberRegistered
  } = useAuth();

  const totalSteps = 3;

  // Clear error when component unmounts or when user starts typing
  useEffect(() => {
    return () => {
      clearError();
    };
  }, []);

  useEffect(() => {
    if (Object.values(formData).some(value => 
      typeof value === 'string' ? value.length > 0 : false
    )) {
      clearError();
    }
  }, [formData]);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const validateStep2 = async () => {
    const newErrors = {};

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
      const cleanPhone = formData.phone.replace(/\D/g, '');
      if (!phoneRegex.test(formData.phone) || cleanPhone.length < 10) {
        newErrors.phone = 'Please enter a valid phone number';
      } else {
        // Check if phone is already registered
        try {
          const isRegistered = await isPhoneNumberRegistered(formData.phone);
          if (isRegistered) {
            newErrors.phone = 'This phone number is already registered';
          }
        } catch (error) {
          console.warn('Phone validation error:', error);
        }
      }
    }

    // Date of birth validation
    const today = new Date();
    const age = today.getFullYear() - formData.dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - formData.dateOfBirth.getMonth();
    const dayDiff = today.getDate() - formData.dateOfBirth.getDate();
    
    const actualAge = age - (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? 1 : 0);
    
    if (actualAge < 18) {
      newErrors.dateOfBirth = 'You must be at least 18 years old';
    }

    // License number validation
    if (!formData.licenseNumber.trim()) {
      newErrors.licenseNumber = 'License number is required';
    } else if (formData.licenseNumber.trim().length < 5) {
      newErrors.licenseNumber = 'Please enter a valid license number';
    } else {
      // Check if license is already registered
      try {
        const isRegistered = await isLicenseNumberRegistered(formData.licenseNumber);
        if (isRegistered) {
          newErrors.licenseNumber = 'This license number is already registered';
        }
      } catch (error) {
        console.warn('License validation error:', error);
      }
    }

    return newErrors;
  };

  const validateStep3 = () => {
    const newErrors = {};
    const vehicle = formData.vehicleInfo;

    if (!vehicle.make.trim()) {
      newErrors['vehicleInfo.make'] = 'Vehicle make is required';
    }

    if (!vehicle.model.trim()) {
      newErrors['vehicleInfo.model'] = 'Vehicle model is required';
    }

    if (!vehicle.year.trim()) {
      newErrors['vehicleInfo.year'] = 'Vehicle year is required';
    } else {
      const year = parseInt(vehicle.year);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 2010 || year > currentYear + 1) {
        newErrors['vehicleInfo.year'] = `Year must be between 2010 and ${currentYear + 1}`;
      }
    }

    if (!vehicle.color.trim()) {
      newErrors['vehicleInfo.color'] = 'Vehicle color is required';
    }

    if (!vehicle.licensePlate.trim()) {
      newErrors['vehicleInfo.licensePlate'] = 'License plate is required';
    }

    return newErrors;
  };

  const handleNext = async () => {
    let stepErrors = {};
    
    try {
      setIsSubmitting(true);
      
      switch (currentStep) {
        case 1:
          stepErrors = validateStep1();
          break;
        case 2:
          stepErrors = await validateStep2();
          break;
        case 3:
          stepErrors = validateStep3();
          break;
      }

      setErrors(stepErrors);

      if (Object.keys(stepErrors).length === 0) {
        if (currentStep < totalSteps) {
          setCurrentStep(currentStep + 1);
        } else {
          await handleRegister();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleRegister = async () => {
    try {
      setIsSubmitting(true);
      
      const registrationData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim(),
        dateOfBirth: formData.dateOfBirth.toISOString(),
        licenseNumber: formData.licenseNumber.trim(),
        vehicleInfo: formData.vehicleInfo
      };

      await registerDriver(registrationData);
      // Navigation will be handled by App.js based on auth state
    } catch (error) {
      console.error('Registration error:', error);
      // Error is already handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        {[1, 2, 3].map((step) => (
          <View
            key={step}
            style={[
              styles.progressStep,
              step <= currentStep && styles.progressStepActive
            ]}
          />
        ))}
      </View>
      <Text style={styles.progressText}>Step {currentStep} of {totalSteps}</Text>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Create Your Account</Text>
      <Text style={styles.stepSubtitle}>Let's get started with your basic information</Text>

      {/* First Name */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>First Name</Text>
        <View style={[styles.inputWrapper, errors.firstName && styles.inputError]}>
          <TextInput
            style={styles.input}
            placeholder="Enter your first name"
            placeholderTextColor={colors.text.tertiary}
            value={formData.firstName}
            onChangeText={(value) => handleInputChange('firstName', value)}
            autoCapitalize="words"
          />
        </View>
        {errors.firstName ? (
          <Text style={styles.fieldError}>{errors.firstName}</Text>
        ) : null}
      </View>

      {/* Last Name */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Last Name</Text>
        <View style={[styles.inputWrapper, errors.lastName && styles.inputError]}>
          <TextInput
            style={styles.input}
            placeholder="Enter your last name"
            placeholderTextColor={colors.text.tertiary}
            value={formData.lastName}
            onChangeText={(value) => handleInputChange('lastName', value)}
            autoCapitalize="words"
          />
        </View>
        {errors.lastName ? (
          <Text style={styles.fieldError}>{errors.lastName}</Text>
        ) : null}
      </View>

      {/* Email */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email Address</Text>
        <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={colors.text.tertiary}
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {errors.email ? (
          <Text style={styles.fieldError}>{errors.email}</Text>
        ) : null}
      </View>

      {/* Password */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
          <TextInput
            style={styles.input}
            placeholder="Create a password"
            placeholderTextColor={colors.text.tertiary}
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.text.tertiary}
            />
          </TouchableOpacity>
        </View>
        {errors.password ? (
          <Text style={styles.fieldError}>{errors.password}</Text>
        ) : null}
      </View>

      {/* Confirm Password */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirm Password</Text>
        <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
          <TextInput
            style={styles.input}
            placeholder="Confirm your password"
            placeholderTextColor={colors.text.tertiary}
            value={formData.confirmPassword}
            onChangeText={(value) => handleInputChange('confirmPassword', value)}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.text.tertiary}
            />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword ? (
          <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
        ) : null}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Personal Information</Text>
      <Text style={styles.stepSubtitle}>We need some additional details to verify your identity</Text>

      {/* Phone Number */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number</Text>
        <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
          <TextInput
            style={styles.input}
            placeholder="+1 (555) 123-4567"
            placeholderTextColor={colors.text.tertiary}
            value={formData.phone}
            onChangeText={(value) => handleInputChange('phone', value)}
            keyboardType="phone-pad"
          />
        </View>
        {errors.phone ? (
          <Text style={styles.fieldError}>{errors.phone}</Text>
        ) : null}
      </View>

      {/* Date of Birth */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Date of Birth</Text>
        <TouchableOpacity 
          style={[styles.inputWrapper, errors.dateOfBirth && styles.inputError]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateText}>
            {formData.dateOfBirth.toLocaleDateString()}
          </Text>
          <Ionicons name="calendar-outline" size={20} color={colors.text.tertiary} />
        </TouchableOpacity>
        {errors.dateOfBirth ? (
          <Text style={styles.fieldError}>{errors.dateOfBirth}</Text>
        ) : null}
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.dateOfBirth}
          mode="date"
          display="default"
          maximumDate={new Date()}
          minimumDate={new Date(1950, 0, 1)}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              handleInputChange('dateOfBirth', selectedDate);
            }
          }}
        />
      )}

      {/* License Number */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Driver's License Number</Text>
        <View style={[styles.inputWrapper, errors.licenseNumber && styles.inputError]}>
          <TextInput
            style={styles.input}
            placeholder="Enter your license number"
            placeholderTextColor={colors.text.tertiary}
            value={formData.licenseNumber}
            onChangeText={(value) => handleInputChange('licenseNumber', value)}
            autoCapitalize="characters"
          />
        </View>
        {errors.licenseNumber ? (
          <Text style={styles.fieldError}>{errors.licenseNumber}</Text>
        ) : null}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Vehicle Information</Text>
      <Text style={styles.stepSubtitle}>Tell us about the vehicle you'll be driving</Text>

      {/* Vehicle Make */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Vehicle Make</Text>
        <View style={[styles.inputWrapper, errors['vehicleInfo.make'] && styles.inputError]}>
          <TextInput
            style={styles.input}
            placeholder="e.g., Toyota, Honda, Ford"
            placeholderTextColor={colors.text.tertiary}
            value={formData.vehicleInfo.make}
            onChangeText={(value) => handleInputChange('vehicleInfo.make', value)}
            autoCapitalize="words"
          />
        </View>
        {errors['vehicleInfo.make'] ? (
          <Text style={styles.fieldError}>{errors['vehicleInfo.make']}</Text>
        ) : null}
      </View>

      {/* Vehicle Model */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Vehicle Model</Text>
        <View style={[styles.inputWrapper, errors['vehicleInfo.model'] && styles.inputError]}>
          <TextInput
            style={styles.input}
            placeholder="e.g., Camry, Accord, Explorer"
            placeholderTextColor={colors.text.tertiary}
            value={formData.vehicleInfo.model}
            onChangeText={(value) => handleInputChange('vehicleInfo.model', value)}
            autoCapitalize="words"
          />
        </View>
        {errors['vehicleInfo.model'] ? (
          <Text style={styles.fieldError}>{errors['vehicleInfo.model']}</Text>
        ) : null}
      </View>

      {/* Year and Color Row */}
      <View style={styles.rowContainer}>
        <View style={[styles.inputContainer, { flex: 1, marginRight: spacing.sm }]}>
          <Text style={styles.label}>Year</Text>
          <View style={[styles.inputWrapper, errors['vehicleInfo.year'] && styles.inputError]}>
            <TextInput
              style={styles.input}
              placeholder="2020"
              placeholderTextColor={colors.text.tertiary}
              value={formData.vehicleInfo.year}
              onChangeText={(value) => handleInputChange('vehicleInfo.year', value)}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
          {errors['vehicleInfo.year'] ? (
            <Text style={styles.fieldError}>{errors['vehicleInfo.year']}</Text>
          ) : null}
        </View>

        <View style={[styles.inputContainer, { flex: 1, marginLeft: spacing.sm }]}>
          <Text style={styles.label}>Color</Text>
          <View style={[styles.inputWrapper, errors['vehicleInfo.color'] && styles.inputError]}>
            <TextInput
              style={styles.input}
              placeholder="White, Black, Silver"
              placeholderTextColor={colors.text.tertiary}
              value={formData.vehicleInfo.color}
              onChangeText={(value) => handleInputChange('vehicleInfo.color', value)}
              autoCapitalize="words"
            />
          </View>
          {errors['vehicleInfo.color'] ? (
            <Text style={styles.fieldError}>{errors['vehicleInfo.color']}</Text>
          ) : null}
        </View>
      </View>

      {/* License Plate */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>License Plate Number</Text>
        <View style={[styles.inputWrapper, errors['vehicleInfo.licensePlate'] && styles.inputError]}>
          <TextInput
            style={styles.input}
            placeholder="ABC-1234"
            placeholderTextColor={colors.text.tertiary}
            value={formData.vehicleInfo.licensePlate}
            onChangeText={(value) => handleInputChange('vehicleInfo.licensePlate', value)}
            autoCapitalize="characters"
          />
        </View>
        {errors['vehicleInfo.licensePlate'] ? (
          <Text style={styles.fieldError}>{errors['vehicleInfo.licensePlate']}</Text>
        ) : null}
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return renderStep1();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Driver Registration</Text>
          <View style={styles.placeholder} />
        </View>

        {renderProgressBar()}

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Global Error */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {renderCurrentStep()}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <Button
            title={currentStep === totalSteps ? 'Create Account' : 'Continue'}
            onPress={handleNext}
            disabled={isLoading || isSubmitting}
            size="large"
          />
          
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  progressBar: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: colors.divider,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
    marginLeft: spacing.sm,
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  inputError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  eyeIcon: {
    padding: spacing.sm,
  },
  fieldError: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  dateText: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    paddingVertical: spacing.md,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bottomActions: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  loginText: {
    color: colors.text.secondary,
    fontSize: typography.sizes.md,
  },
  loginLink: {
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
});

export default RegisterScreen;