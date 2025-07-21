// Firebase Services Export
export { default as authService } from './authService.js';
export { default as driverService } from './driverService.js';
export { default as rideRequestService } from './rideRequestService.js';
export { default as activeTripService } from './activeTripService.js';
export { default as earningsService } from './earningsService.js';
export { default as notificationService } from './notificationService.js';
export { default as locationService } from './locationService.js';
export { default as locationSimulator } from './locationSimulator.js';

// Re-export Firebase configuration for convenience
export { db, auth, app, analytics } from '../../firebase.js';