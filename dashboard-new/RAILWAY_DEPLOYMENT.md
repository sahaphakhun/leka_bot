# 🚂 Railway Deployment Guide - Leka Bot Bordio UI

## 📋 Overview

This guide will help you deploy the Leka Bot Bordio UI to Railway.app in just a few minutes.

## 🎯 Prerequisites

- Railway account (free tier available)
- Git repository (optional but recommended)
- Leka Bot backend URL

## 🚀 Method 1: Deploy from ZIP (Recommended)

### Step 1: Extract ZIP File

```bash
unzip leka-bot-bordio-ui-railway.zip
cd leka-bot-bordio-ui
```

### Step 2: Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit - Leka Bot Bordio UI v2.0"
```

### Step 3: Push to GitHub/GitLab

```bash
# Create a new repository on GitHub/GitLab first
git remote add origin https://github.com/your-username/leka-bot-ui.git
git branch -M main
git push -u origin main
```

### Step 4: Deploy on Railway

1. Go to [Railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository
5. Railway will auto-detect the configuration

### Step 5: Configure Environment Variables

In Railway dashboard, go to **Variables** tab and add:

```env
VITE_API_URL=https://your-backend.railway.app/api
VITE_APP_NAME=Leka Bot
VITE_APP_VERSION=2.0.0
PORT=3000
```

### Step 6: Deploy!

Railway will automatically:
1. Install dependencies with pnpm
2. Build the production bundle
3. Start the preview server
4. Assign a public URL

## 🚀 Method 2: Deploy via Railway CLI

### Step 1: Install Railway CLI

```bash
# macOS/Linux
curl -fsSL https://railway.app/install.sh | sh

# Windows (PowerShell)
iwr https://railway.app/install.ps1 | iex
```

### Step 2: Login

```bash
railway login
```

### Step 3: Initialize Project

```bash
cd leka-bot-bordio-ui
railway init
```

### Step 4: Set Environment Variables

```bash
railway variables set VITE_API_URL=https://your-backend.railway.app/api
railway variables set VITE_APP_NAME="Leka Bot"
railway variables set VITE_APP_VERSION=2.0.0
```

### Step 5: Deploy

```bash
railway up
```

### Step 6: Open Your App

```bash
railway open
```

## 🚀 Method 3: One-Click Deploy

### Step 1: Create railway.json

Already included in the ZIP file!

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm preview --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Step 2: Deploy

Just push to GitHub and connect to Railway!

## ⚙️ Configuration Files

### 1. railway.json

Configures Railway deployment settings:
- Build command
- Start command
- Restart policy

### 2. nixpacks.toml

Configures Nixpacks builder:
- Node.js version
- pnpm package manager
- Build phases

### 3. package.json

Already configured with:
- `preview` script for production serving
- All dependencies
- Build scripts

## 🔧 Environment Variables

### Required Variables

```env
VITE_API_URL=https://your-backend.railway.app/api
```

### Optional Variables

```env
VITE_APP_NAME=Leka Bot
VITE_APP_VERSION=2.0.0
VITE_USE_MOCK=false
PORT=3000
```

### How to Set in Railway

**Via Dashboard:**
1. Go to your project
2. Click **Variables** tab
3. Click **New Variable**
4. Add key and value
5. Click **Add**

**Via CLI:**
```bash
railway variables set KEY=VALUE
```

## 🌐 Custom Domain

### Step 1: Add Domain in Railway

1. Go to **Settings** tab
2. Scroll to **Domains**
3. Click **Generate Domain** (Railway subdomain)
4. Or click **Custom Domain** to add your own

### Step 2: Configure DNS (for custom domain)

Add a CNAME record:
```
Type: CNAME
Name: app (or subdomain you want)
Value: your-app.up.railway.app
```

### Step 3: Wait for SSL

Railway automatically provisions SSL certificates (takes 1-5 minutes).

## 📊 Monitoring

### View Logs

**Via Dashboard:**
1. Go to **Deployments** tab
2. Click on a deployment
3. View real-time logs

**Via CLI:**
```bash
railway logs
```

### View Metrics

Railway dashboard shows:
- CPU usage
- Memory usage
- Network traffic
- Response times

## 🔄 Updates and Redeployment

### Automatic Deployment

Railway automatically redeploys when you push to your connected Git branch.

```bash
git add .
git commit -m "Update UI"
git push origin main
```

### Manual Deployment

**Via CLI:**
```bash
railway up
```

**Via Dashboard:**
1. Go to **Deployments** tab
2. Click **Deploy**

## 🐛 Troubleshooting

### Issue: Build Failed

**Check:**
1. Build logs in Railway dashboard
2. Ensure all dependencies in package.json
3. Check Node.js version compatibility

**Solution:**
```bash
# Test build locally first
pnpm install
pnpm build
```

### Issue: App Not Starting

**Check:**
1. Start command in railway.json
2. PORT environment variable
3. Application logs

**Solution:**
```bash
# Test preview locally
pnpm preview --host 0.0.0.0 --port 3000
```

### Issue: Environment Variables Not Working

**Check:**
1. Variables tab in Railway
2. Variable names (must start with VITE_)
3. Redeploy after adding variables

**Solution:**
```bash
railway variables
railway up --detach
```

### Issue: CORS Error

**Check:**
1. Backend CORS configuration
2. VITE_API_URL is correct
3. Backend is accessible

**Solution:**
```javascript
// In your backend
app.use(cors({
  origin: 'https://your-railway-app.up.railway.app',
  credentials: true
}));
```

## 💰 Pricing

### Free Tier
- $5 credit per month
- Enough for small projects
- No credit card required

### Pro Plan ($20/month)
- $20 credit per month
- Better performance
- Priority support

### Estimated Costs

For this app:
- **Hobby usage**: ~$2-3/month
- **Production usage**: ~$5-10/month

## 🔒 Security

### Best Practices

1. **Environment Variables**
   - Never commit .env files
   - Use Railway variables for secrets

2. **API Keys**
   - Store in Railway variables
   - Prefix with VITE_ for Vite apps

3. **HTTPS**
   - Railway provides automatic HTTPS
   - Always use HTTPS in production

4. **CORS**
   - Configure backend CORS properly
   - Only allow your Railway domain

## 📈 Performance Optimization

### 1. Enable Compression

Already configured in Vite build.

### 2. Use CDN

Railway automatically uses CDN for static assets.

### 3. Optimize Build

```bash
# Already optimized in package.json
pnpm build
```

### 4. Monitor Performance

Use Railway metrics dashboard.

## 🔗 Connecting to Backend

### If Backend is on Railway

```env
VITE_API_URL=https://your-backend.up.railway.app/api
```

### If Backend is Elsewhere

```env
VITE_API_URL=https://your-backend.com/api
```

### Backend CORS Configuration

```javascript
// Backend must allow your Railway domain
app.use(cors({
  origin: [
    'https://your-app.up.railway.app',
    'https://your-custom-domain.com'
  ],
  credentials: true
}));
```

## 📝 Checklist

Before deploying:

- [ ] Extract ZIP file
- [ ] Review environment variables
- [ ] Test build locally (`pnpm build`)
- [ ] Create Railway account
- [ ] Set up Git repository (optional)
- [ ] Configure backend CORS
- [ ] Set VITE_API_URL
- [ ] Deploy to Railway
- [ ] Test with real data
- [ ] Configure custom domain (optional)

## 🎉 Success!

Your app should now be live at:
```
https://your-app.up.railway.app
```

Access it with:
```
https://your-app.up.railway.app/?userId=U123&groupId=C456
```

## 📞 Support

### Railway Support
- [Railway Docs](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://status.railway.app)

### App Support
- Check README.md
- Check API_INTEGRATION_GUIDE.md
- Check DOCUMENTATION.md

## 🚀 Quick Commands Reference

```bash
# Install Railway CLI
curl -fsSL https://railway.app/install.sh | sh

# Login
railway login

# Initialize project
railway init

# Set variables
railway variables set VITE_API_URL=https://api.example.com

# Deploy
railway up

# View logs
railway logs

# Open app
railway open

# View status
railway status
```

## 🎯 Next Steps

After successful deployment:

1. ✅ Test all features
2. ✅ Configure custom domain
3. ✅ Set up monitoring
4. ✅ Share with team
5. ✅ Enjoy! 🎊

---

**Deployment Platform**: Railway.app  
**Deployment Time**: ~3-5 minutes  
**Status**: ✅ Ready to Deploy  
**Difficulty**: ⭐ Easy

