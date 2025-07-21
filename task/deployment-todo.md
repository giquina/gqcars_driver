# Deploy GQCars Driver App to Expo Account

## Goal
Replace existing project at https://expo.dev/accounts/giquina/projects/gqcars/github with this new GQCars Driver App for 24/7 availability.

## Deployment Plan

### Phase 1: Authentication & Project Setup
- [ ] **Login to Expo account** (high priority)
- [ ] **Check current project status** (high priority)  
- [ ] **Configure project slug and settings** (high priority)

### Phase 2: Project Configuration
- [ ] **Update app.json with correct account info** (high priority)
- [ ] **Set proper project slug to match existing** (high priority)
- [ ] **Configure build settings** (medium priority)

### Phase 3: Publish to Expo
- [ ] **Publish app to replace existing project** (high priority)
- [ ] **Verify deployment on Expo web** (high priority)
- [ ] **Test access via QR code and web** (high priority)

### Phase 4: GitHub Integration (Optional)
- [ ] **Connect to your GitHub repository** (low priority)
- [ ] **Set up automatic deployments** (low priority)

## Commands Needed

```bash
# Login to Expo account
npx expo login

# Check account status
npx expo whoami

# Update project configuration
# Edit app.json with your account details

# Publish the app
npx expo publish

# Check published projects
npx expo projects:list
```

## Expected Configuration
```json
{
  "expo": {
    "name": "GQCars Driver",
    "slug": "gqcars", // Match existing project slug
    "owner": "giquina", // Your Expo username
    "version": "1.0.0",
    "sdkVersion": "53.0.0"
  }
}
```

---
*Deployment plan created following claude.md workflow - awaiting approval before implementation*