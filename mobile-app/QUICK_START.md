# 🚀 Quick Start Guide - Leka Bot Mobile App

Get the mobile app running in 5 minutes!

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ npm or yarn installed
- ✅ iOS Simulator (Mac) or Android Emulator
- ✅ OR Expo Go app on physical device

## Installation Steps

### 1. Install Dependencies

```bash
cd mobile-app
npm install
```

### 2. Configure API URL

Edit `src/services/api.js` line 10:

```javascript
const API_BASE_URL = __DEV__ 
  ? 'http://YOUR_COMPUTER_IP:3000/api'  // ← Change this!
  : 'https://your-production-url.com/api';
```

**Find your IP:**
- Mac: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- Windows: `ipconfig`
- Example: `http://192.168.1.100:3000/api`

### 3. Start Development Server

```bash
npm start
```

### 4. Run on Device

**Option A: iOS Simulator (Mac only)**
- Press `i` in terminal

**Option B: Android Emulator**
- Press `a` in terminal

**Option C: Physical Device**
1. Install Expo Go from App Store / Play Store
2. Scan QR code from terminal
3. Make sure device is on same WiFi

## Test Login

Use any valid credentials from your database:

```
User ID: U1234567890abcdef
Group ID: C1234567890abcdef
```

## Troubleshooting

### Cannot connect to API
1. Check API server is running: `http://localhost:3000/health`
2. Use computer IP, not localhost
3. Check firewall allows port 3000

### Metro bundler errors
```bash
npx expo start -c  # Clear cache
```

### Dependencies issues
```bash
rm -rf node_modules
npm install
```

## Next Steps

- ✅ Explore all screens
- ✅ Test task management
- ✅ Upload files
- ✅ Check notifications
- ✅ Read full README.md

## Support

Issues? Check:
- README.md - Full documentation
- Console logs for errors
- Expo documentation: https://docs.expo.dev

---

**Happy Coding! 🎉**
