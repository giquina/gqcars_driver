# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GQCars Driver App is a React Native mobile application built with Expo SDK 53. It's a rideshare driver app that allows drivers to go online/offline, view ride requests, track active trips, monitor earnings, and manage their profile.

## Development Commands

### Running the App
```bash
# Start Expo development server
npx expo start

# Run on specific platforms
npm run android    # Start with Android simulator
npm run ios        # Start with iOS simulator  
npm run web        # Start web version
```

### Build and Deploy
```bash
# Login to Expo account
npx expo login

# Check current account
npx expo whoami

# Publish app to Expo
npx expo publish

# Build for app stores (requires EAS)
npx eas build --platform android
npx eas build --platform ios
```

### Cache and Troubleshooting
```bash
# Clear Metro cache
npx expo start --clear

# Clean install dependencies
rm -rf node_modules package-lock.json && npm install

# Clear Expo cache
rm -rf .expo
```

## Architecture

### Core Structure
- **App.js**: Root component with navigation setup
- **GQCarsDriverApp/**: Main application code
  - **navigation/TabNavigator.js**: Bottom tab navigation with 5 main screens
  - **screens/**: All screen components (Home, Requests, ActiveTrip, Earnings, Profile)
  - **shared/**: Reusable components and utilities
    - **components/ui/**: UI components (Button, Card, StatusBadge)
    - **theme/**: Design system (colors, spacing, typography)
    - **services/**: Business logic and API calls (empty currently)

### Navigation Flow
Tab-based navigation with 5 main screens:
1. **Home (Dashboard)**: Driver status toggle, earnings summary, stats
2. **Requests**: Incoming ride requests 
3. **Active Trip**: Current trip tracking and navigation
4. **Earnings**: Detailed earnings breakdown
5. **Profile**: Driver profile and settings

### Key Dependencies
- **Expo SDK 53**: Core platform and native APIs
- **React Navigation**: Tab and stack navigation
- **React Native Maps**: Map functionality for trips
- **Expo Location**: GPS tracking for rides
- **Expo Notifications**: Push notifications for requests
- **React Native Paper**: Additional UI components

### Theme System
Centralized design system in `shared/theme/`:
- **colors.js**: Color palette including driver-specific colors
- **spacing.js**: Consistent spacing values
- **typography.js**: Font sizes, weights, and line heights
- All components use theme values for consistency

### UI Component Library
Custom components in `shared/components/ui/`:
- **Button**: Variants (primary, secondary, success) and sizes
- **Card**: Container component with consistent styling
- **StatusBadge**: Driver status indicators (online/offline)

## Development Workflow

1. **Planning**: Create todos in `task/todo.md` before starting work
2. **Implementation**: Make simple, targeted changes impacting minimal code
3. **Testing**: Verify changes work before proceeding
4. **Documentation**: Update todos with progress and review summary

### Project Configuration
- **Expo SDK**: Version 53.0.0
- **React Native**: 0.79.5
- **React**: 19.0.0
- **Owner**: giquina
- **Slug**: gqcars
- **Platforms**: iOS, Android, Web

### Build Configuration (eas.json)
- **development**: Development client with internal distribution
- **preview**: Internal preview builds
- **production**: Production app store builds

## Common Patterns

### Screen Structure
All screens follow consistent patterns:
- Import theme and UI components from shared
- Use functional components with hooks
- StyleSheet with theme-based styling
- ScrollView for longer content

### State Management
Currently using local React state. No global state management implemented yet.

### Styling
- StyleSheet.create() with theme values
- Consistent spacing using theme.spacing
- Color references from theme.colors
- Typography from theme.typography

## File Naming Conventions
- **PascalCase**: Components and screens (HomeScreen.js, Button.js)
- **camelCase**: Utilities and services
- **kebab-case**: Configuration files (babel.config.js)
- **index.js**: Re-exports in component directories