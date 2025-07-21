import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography } from '../../shared/theme';
import { Button, Card } from '../../shared/components/ui';
import { useAuth } from '../../contexts/AuthContext';

const DocumentVerificationScreen = ({ navigation }) => {
  const [uploadingDocument, setUploadingDocument] = useState(null);
  const { driverProfile, uploadDocument, updateDriverProfile, getVerificationProgress } = useAuth();

  const requiredDocuments = [
    {
      type: 'license',
      title: "Driver's License",
      description: 'Front and back of your valid driver\'s license',
      icon: 'card-outline',
    },
    {
      type: 'insurance',
      title: 'Vehicle Insurance',
      description: 'Current proof of vehicle insurance',
      icon: 'shield-outline',
    },
    {
      type: 'vehicleRegistration',
      title: 'Vehicle Registration',
      description: 'Current vehicle registration document',
      icon: 'document-outline',
    },
    {
      type: 'profilePhoto',
      title: 'Profile Photo',
      description: 'Clear photo of yourself for identification',
      icon: 'person-outline',
    },
  ];

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need camera roll permissions to upload documents.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleDocumentUpload = async (documentType) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: documentType === 'profilePhoto' ? [1, 1] : [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingDocument(documentType);
        
        // Mock upload - in real app, this would upload to Firebase Storage
        await uploadDocument(documentType, result.assets[0].uri);
        
        Alert.alert(
          'Success',
          'Document uploaded successfully! It will be reviewed within 24 hours.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload document. Please try again.');
      console.error('Document upload error:', error);
    } finally {
      setUploadingDocument(null);
    }
  };

  const handleSkipForNow = () => {
    Alert.alert(
      'Skip Verification',
      'You can upload documents later from your profile. However, you won\'t be able to receive ride requests until verification is complete.',
      [
        { text: 'Upload Later', style: 'cancel', onPress: () => navigation.replace('MainApp') },
        { text: 'Continue Uploading', style: 'default' }
      ]
    );
  };

  const handleContinue = async () => {
    const progress = getVerificationProgress();
    
    if (progress === 100) {
      // All documents uploaded
      await updateDriverProfile(driverProfile.uid, { 
        documentsSubmittedAt: new Date().toISOString() 
      });
      
      Alert.alert(
        'Documents Submitted',
        'All documents have been submitted for review. You\'ll receive an email once verification is complete.',
        [{ text: 'OK', onPress: () => navigation.replace('MainApp') }]
      );
    } else {
      Alert.alert(
        'Incomplete',
        `You've uploaded ${Math.round(progress)}% of required documents. Please upload all documents to complete verification.`,
        [{ text: 'OK' }]
      );
    }
  };

  const getDocumentStatus = (documentType) => {
    const doc = driverProfile?.documents?.[documentType];
    if (doc?.url) {
      return doc.verified ? 'verified' : 'uploaded';
    }
    return 'pending';
  };

  const renderDocumentCard = (document) => {
    const status = getDocumentStatus(document.type);
    const isUploading = uploadingDocument === document.type;

    return (
      <Card key={document.type} style={styles.documentCard}>
        <View style={styles.documentHeader}>
          <View style={styles.documentIconContainer}>
            <Ionicons 
              name={document.icon} 
              size={24} 
              color={status === 'verified' ? colors.success : colors.primary}
            />
          </View>
          <View style={styles.documentInfo}>
            <Text style={styles.documentTitle}>{document.title}</Text>
            <Text style={styles.documentDescription}>{document.description}</Text>
          </View>
          <View style={styles.documentStatus}>
            {status === 'verified' && (
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            )}
            {status === 'uploaded' && (
              <Ionicons name="time-outline" size={24} color={colors.warning} />
            )}
            {status === 'pending' && (
              <Ionicons name="cloud-upload-outline" size={24} color={colors.text.tertiary} />
            )}
          </View>
        </View>

        <View style={styles.documentFooter}>
          <Text style={[styles.statusText, styles[`status_${status}`]]}>
            {status === 'verified' && 'Verified'}
            {status === 'uploaded' && 'Under Review'}
            {status === 'pending' && 'Not Uploaded'}
          </Text>

          <TouchableOpacity
            style={[
              styles.uploadButton,
              status === 'verified' && styles.uploadButtonVerified
            ]}
            onPress={() => handleDocumentUpload(document.type)}
            disabled={isUploading}
          >
            {isUploading ? (
              <Text style={styles.uploadButtonText}>Uploading...</Text>
            ) : (
              <Text style={styles.uploadButtonText}>
                {status === 'pending' ? 'Upload' : 'Replace'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const progress = getVerificationProgress();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Document Verification</Text>
        <Text style={styles.headerSubtitle}>
          Upload required documents to start driving
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[styles.progressFill, { width: `${progress}%` }]} 
          />
        </View>
        <Text style={styles.progressText}>{progress}% Complete</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>What You Need</Text>
          <Text style={styles.instructionsText}>
            Please upload clear, high-quality photos of the following documents. 
            All documents must be current and valid.
          </Text>
        </View>

        {/* Document Cards */}
        <View style={styles.documentsContainer}>
          {requiredDocuments.map(renderDocumentCard)}
        </View>

        {/* Important Notes */}
        <View style={styles.notesContainer}>
          <Text style={styles.notesTitle}>Important Notes</Text>
          <View style={styles.notesList}>
            <View style={styles.noteItem}>
              <Ionicons name="checkmark-outline" size={16} color={colors.success} />
              <Text style={styles.noteText}>Documents are reviewed within 24 hours</Text>
            </View>
            <View style={styles.noteItem}>
              <Ionicons name="checkmark-outline" size={16} color={colors.success} />
              <Text style={styles.noteText}>All personal information is kept secure</Text>
            </View>
            <View style={styles.noteItem}>
              <Ionicons name="checkmark-outline" size={16} color={colors.success} />
              <Text style={styles.noteText}>You'll receive email updates on verification status</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {progress === 100 ? (
          <Button
            title="Submit for Review"
            onPress={handleContinue}
            size="large"
            style={styles.actionButton}
          />
        ) : (
          <>
            <Button
              title="Continue"
              onPress={handleContinue}
              size="large"
              variant={progress === 100 ? 'primary' : 'secondary'}
              style={styles.actionButton}
            />
          </>
        )}
        
        <TouchableOpacity onPress={handleSkipForNow} style={styles.skipButton}>
          <Text style={styles.skipButtonText}>Upload Documents Later</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
  },
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.divider,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  instructions: {
    marginVertical: spacing.lg,
  },
  instructionsTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  instructionsText: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  documentsContainer: {
    marginBottom: spacing.xl,
  },
  documentCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  documentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  documentDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  documentStatus: {
    marginLeft: spacing.sm,
  },
  documentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  status_verified: {
    color: colors.success,
  },
  status_uploaded: {
    color: colors.warning,
  },
  status_pending: {
    color: colors.text.tertiary,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  uploadButtonVerified: {
    backgroundColor: colors.text.tertiary,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  notesContainer: {
    marginBottom: spacing.xl,
  },
  notesTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  notesList: {
    marginLeft: spacing.sm,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  noteText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  bottomActions: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  actionButton: {
    marginBottom: spacing.sm,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  skipButtonText: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
});

export default DocumentVerificationScreen;