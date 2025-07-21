import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AuthService from '../services/authService';

// Initial state
const initialState = {
  user: null,
  driverProfile: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  authListenerSetup: false
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  SET_DRIVER_PROFILE: 'SET_DRIVER_PROFILE',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SIGN_OUT: 'SIGN_OUT',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  SET_AUTH_LISTENER: 'SET_AUTH_LISTENER'
};

// Reducer function
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
        error: action.payload ? null : state.error // Clear error when loading starts
      };

    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
        error: null
      };

    case AUTH_ACTIONS.SET_DRIVER_PROFILE:
      return {
        ...state,
        driverProfile: action.payload,
        isLoading: false
      };

    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case AUTH_ACTIONS.SIGN_OUT:
      return {
        ...initialState,
        isLoading: false,
        authListenerSetup: state.authListenerSetup
      };

    case AUTH_ACTIONS.UPDATE_PROFILE:
      return {
        ...state,
        driverProfile: {
          ...state.driverProfile,
          ...action.payload
        }
      };

    case AUTH_ACTIONS.SET_AUTH_LISTENER:
      return {
        ...state,
        authListenerSetup: action.payload
      };

    default:
      return state;
  }
}

// Create context
const AuthContext = createContext();

// Auth provider component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Set up auth state listener
  useEffect(() => {
    if (state.authListenerSetup) return;

    const unsubscribe = AuthService.onAuthStateChange(async (user) => {
      try {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

        if (user) {
          dispatch({ type: AUTH_ACTIONS.SET_USER, payload: user });
          
          // Fetch driver profile
          try {
            const profile = await AuthService.getDriverProfile(user.uid);
            if (profile) {
              dispatch({ type: AUTH_ACTIONS.SET_DRIVER_PROFILE, payload: profile });
            } else {
              console.warn('No driver profile found for user:', user.uid);
            }
          } catch (profileError) {
            console.error('Error fetching driver profile:', profileError);
            dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: 'Failed to load driver profile' });
          }
        } else {
          dispatch({ type: AUTH_ACTIONS.SET_USER, payload: null });
          dispatch({ type: AUTH_ACTIONS.SET_DRIVER_PROFILE, payload: null });
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
      } finally {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    });

    dispatch({ type: AUTH_ACTIONS.SET_AUTH_LISTENER, payload: true });

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [state.authListenerSetup]);

  // Auth functions
  const authFunctions = {
    // Sign in function
    signIn: async (email, password) => {
      try {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
        dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

        const result = await AuthService.signIn(email, password);
        
        if (result.success) {
          // Auth state listener will handle setting user and profile
          return { success: true };
        }
      } catch (error) {
        console.error('Sign in error:', error);
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        throw error;
      }
    },

    // Register function
    registerDriver: async (userData) => {
      try {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
        dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

        // Validate data
        const validation = AuthService.validateDriverData(userData);
        if (!validation.isValid) {
          const errorMessage = Object.values(validation.errors)[0];
          throw new Error(errorMessage);
        }

        const result = await AuthService.registerDriver(
          userData.email,
          userData.password,
          userData
        );

        if (result.success) {
          // Auth state listener will handle setting user and profile
          return { success: true };
        }
      } catch (error) {
        console.error('Registration error:', error);
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        throw error;
      }
    },

    // Sign out function
    signOut: async () => {
      try {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
        await AuthService.signOut();
        dispatch({ type: AUTH_ACTIONS.SIGN_OUT });
      } catch (error) {
        console.error('Sign out error:', error);
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        throw error;
      }
    },

    // Update driver profile
    updateDriverProfile: async (updates) => {
      try {
        if (!state.user) {
          throw new Error('No authenticated user');
        }

        await AuthService.updateDriverProfile(state.user.uid, updates);
        dispatch({ type: AUTH_ACTIONS.UPDATE_PROFILE, payload: updates });
        
        return { success: true };
      } catch (error) {
        console.error('Profile update error:', error);
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      }
    },

    // Update driver status (online/offline)
    updateDriverStatus: async (isOnline) => {
      try {
        await AuthService.updateDriverStatus(isOnline);
        dispatch({ 
          type: AUTH_ACTIONS.UPDATE_PROFILE, 
          payload: { isOnline } 
        });
        
        return { success: true };
      } catch (error) {
        console.error('Status update error:', error);
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      }
    },

    // Send password reset email
    sendPasswordResetEmail: async (email) => {
      try {
        dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
        await AuthService.sendPasswordResetEmail(email);
        return { success: true };
      } catch (error) {
        console.error('Password reset error:', error);
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      }
    },

    // Update password
    updatePassword: async (currentPassword, newPassword) => {
      try {
        await AuthService.updatePassword(currentPassword, newPassword);
        return { success: true };
      } catch (error) {
        console.error('Password update error:', error);
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      }
    },

    // Upload document
    uploadDocument: async (documentType, fileUri) => {
      try {
        const result = await AuthService.uploadDocument(documentType, fileUri);
        
        // Update local profile with document info
        const documentUpdate = {
          [`documents.${documentType}`]: {
            ...state.driverProfile.documents[documentType],
            url: result.url,
            uploaded: true
          }
        };
        
        dispatch({ type: AUTH_ACTIONS.UPDATE_PROFILE, payload: documentUpdate });
        
        return result;
      } catch (error) {
        console.error('Document upload error:', error);
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      }
    },

    // Clear error
    clearError: () => {
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
    },

    // Check if phone number is already registered
    isPhoneNumberRegistered: async (phone) => {
      return await AuthService.isPhoneNumberRegistered(phone);
    },

    // Check if license number is already registered
    isLicenseNumberRegistered: async (licenseNumber) => {
      return await AuthService.isLicenseNumberRegistered(licenseNumber);
    },

    // Refresh driver profile
    refreshDriverProfile: async () => {
      try {
        if (!state.user) return;
        
        const profile = await AuthService.getDriverProfile(state.user.uid);
        if (profile) {
          dispatch({ type: AUTH_ACTIONS.SET_DRIVER_PROFILE, payload: profile });
        }
      } catch (error) {
        console.error('Error refreshing profile:', error);
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
      }
    }
  };

  // Helper functions
  const helpers = {
    // Check if user is verified driver
    isVerifiedDriver: () => {
      return state.driverProfile?.status === 'verified';
    },

    // Check if user has pending verification
    hasPendingVerification: () => {
      return state.driverProfile?.status === 'pending_verification';
    },

    // Check if user is suspended
    isSuspended: () => {
      return state.driverProfile?.status === 'suspended';
    },

    // Check if driver is online
    isDriverOnline: () => {
      return state.driverProfile?.isOnline === true;
    },

    // Get driver's full name
    getDriverName: () => {
      if (!state.driverProfile) return '';
      return `${state.driverProfile.firstName} ${state.driverProfile.lastName}`.trim();
    },

    // Check if required documents are uploaded
    hasRequiredDocuments: () => {
      if (!state.driverProfile?.documents) return false;
      
      const requiredDocs = ['license', 'insurance', 'vehicleRegistration', 'profilePhoto'];
      return requiredDocs.every(doc => 
        state.driverProfile.documents[doc]?.url
      );
    },

    // Get verification progress percentage
    getVerificationProgress: () => {
      if (!state.driverProfile?.documents) return 0;
      
      const requiredDocs = ['license', 'insurance', 'vehicleRegistration', 'profilePhoto'];
      const uploadedDocs = requiredDocs.filter(doc => 
        state.driverProfile.documents[doc]?.url
      );
      
      return Math.round((uploadedDocs.length / requiredDocs.length) * 100);
    }
  };

  const contextValue = {
    // State
    ...state,
    
    // Auth functions
    ...authFunctions,
    
    // Helper functions
    ...helpers
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Higher-order component for protected routes
export function withAuth(WrappedComponent) {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
      // Return loading component - you can customize this
      return null;
    }
    
    if (!isAuthenticated) {
      // Return login prompt or redirect - you can customize this
      return null;
    }
    
    return <WrappedComponent {...props} />;
  };
}

export default AuthContext;