# Leka Bot Mobile App

React Native mobile application for the Leka Bot Task Management System built with Expo.

## 🚀 Features

### Core Features
- ✅ **Authentication** - LINE Login integration (test mode with manual credentials)
- 📊 **Dashboard** - Real-time stats, recent tasks, and quick actions
- 📋 **Task Management** - Create, view, submit, and approve tasks
- 👥 **Member Management** - View group members and their stats
- 🏆 **Leaderboard** - Rankings by score with podium display
- 📁 **File Management** - Upload, view, and delete files
- 📱 **Activity Logs** - Track all group activities
- 👤 **User Profile** - View stats and manage settings
- 🔔 **Push Notifications** - Real-time task notifications
- 🌐 **Offline Support** - Local data caching (coming soon)

### User Interface
- Modern, clean Material Design
- Smooth animations and transitions
- Pull-to-refresh on all list views
- Floating Action Buttons (FAB)
- Bottom tab navigation
- Status badges with color coding
- Empty states with helpful messages

## 📱 Screenshots

*(Screenshots will be added here)*

## 🛠️ Technology Stack

- **Framework**: React Native (Expo)
- **Navigation**: React Navigation v6
- **State Management**: React Context API
- **Storage**: AsyncStorage
- **Notifications**: Expo Notifications
- **Icons**: Ionicons
- **Date Handling**: date-fns
- **HTTP Client**: Fetch API

## 📋 Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Emulator
- Expo Go app (for physical device testing)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   cd /path/to/leka_bot/mobile-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API endpoint**
   
   Edit `src/services/api.js` and update the API_BASE_URL:
   ```javascript
   const API_BASE_URL = __DEV__ 
     ? 'http://YOUR_LOCAL_IP:3000/api'  // Replace with your local IP
     : 'https://your-production-url.com/api';
   ```

   **Important**: Use your computer's IP address (not localhost) for physical device testing.

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on device/simulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app for physical device

## 📱 Running on Physical Device

1. Install **Expo Go** from App Store (iOS) or Play Store (Android)
2. Make sure your device is on the same WiFi network as your computer
3. Scan the QR code from the terminal
4. Update API_BASE_URL to use your computer's IP address

## 🔑 Testing Credentials

For development/testing, you can use direct login:

- **User ID**: Any valid LINE User ID from your database
- **Group ID**: Any valid LINE Group ID from your database

Example:
```
User ID: U1234567890abcdef
Group ID: C1234567890abcdef
```

## 📂 Project Structure

```
mobile-app/
├── App.js                      # Main app entry point
├── app.json                    # Expo configuration
├── package.json                # Dependencies
├── src/
│   ├── contexts/
│   │   └── AuthContext.js      # Authentication context
│   ├── screens/
│   │   ├── LoginScreen.js      # Login screen
│   │   ├── DashboardScreen.js  # Dashboard
│   │   ├── TasksScreen.js      # Tasks list
│   │   ├── TaskDetailScreen.js # Task details
│   │   ├── MembersScreen.js    # Members list
│   │   ├── LeaderboardScreen.js # Leaderboard
│   │   ├── FilesScreen.js      # Files management
│   │   ├── ActivityScreen.js   # Activity logs
│   │   └── ProfileScreen.js    # User profile
│   ├── services/
│   │   ├── api.js              # API service
│   │   └── notifications.js    # Push notifications
│   └── utils/
│       └── colors.js           # Color palette
└── assets/                     # Images and icons
```

## 🎨 Design System

### Colors
- **Primary**: `#3b82f6` (Blue)
- **Success**: `#10b981` (Green)
- **Warning**: `#f59e0b` (Orange)
- **Error**: `#ef4444` (Red)
- **Info**: `#3b82f6` (Blue)

### Typography
- **Headers**: Bold, 24-32px
- **Body**: Regular, 14-16px
- **Captions**: Regular, 12px

## 🔔 Push Notifications

The app supports local and push notifications:

- Task reminders
- Task deadline alerts
- Task approval notifications
- New task assignments

Notifications are automatically registered when the app starts.

## 🌐 API Integration

All API calls are handled through `src/services/api.js` with:
- Automatic retry logic (3 attempts)
- Exponential backoff
- Request timeout (30s)
- Error handling
- Thai error messages

## 📊 State Management

Uses React Context API for global state:
- **AuthContext**: User authentication and session management

## 🔒 Security

- AsyncStorage for local data persistence
- No sensitive data in code
- API token management
- Secure file uploads

## 🧪 Testing

```bash
# Run linter
npm run lint

# Run tests (when available)
npm test
```

## 📦 Building

### Development Build
```bash
# iOS
expo build:ios

# Android
expo build:android
```

### Production Build with EAS
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## 🚀 Deployment

### Expo Publish
```bash
expo publish
```

### App Stores
1. Build production binaries with EAS
2. Submit to App Store / Play Store
3. Follow platform-specific guidelines

## 🐛 Troubleshooting

### Common Issues

**1. Cannot connect to API**
- Ensure API server is running
- Check API_BASE_URL is correct
- Use computer's IP address (not localhost) for physical devices
- Verify firewall settings

**2. Push notifications not working**
- Must use physical device (not simulator/emulator)
- Check notification permissions
- Ensure Expo push token is generated

**3. App crashes on startup**
- Clear cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check for console errors

**4. Images/icons not loading**
- Ensure assets are in correct directory
- Check file paths in code
- Rebuild app

## 📝 Development Notes

### Adding New Screens
1. Create screen component in `src/screens/`
2. Add to navigation in `App.js`
3. Import necessary dependencies
4. Follow existing screen patterns

### Adding New API Calls
1. Add function to `src/services/api.js`
2. Follow existing patterns (error handling, retry logic)
3. Use async/await
4. Handle loading states in components

### Styling Guidelines
- Use colors from `src/utils/colors.js`
- Follow Material Design principles
- Maintain consistent spacing (8px grid)
- Use StyleSheet.create() for performance

## 🔄 Future Enhancements

- [ ] Offline data synchronization
- [ ] Dark mode support
- [ ] Multi-language support (EN/TH)
- [ ] Advanced search and filters
- [ ] Rich text editor for task descriptions
- [ ] Image preview and gallery
- [ ] Calendar view for tasks
- [ ] Team chat/comments
- [ ] Biometric authentication
- [ ] Export data (PDF, CSV)

## 📄 License

Copyright © 2024 Leka Bot Team

## 👥 Contributors

- Development Team

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Contact the development team

## 🙏 Acknowledgments

- React Native team
- Expo team
- React Navigation team
- All open-source contributors
