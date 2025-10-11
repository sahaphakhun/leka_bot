# 🚀 Quick Start - Deploy to Railway in 5 Minutes

## ⚡ Super Fast Deployment

### Step 1: Extract ZIP (30 seconds)

```bash
unzip leka-bot-bordio-ui-railway.zip
cd leka-bot-bordio-ui
```

### Step 2: Push to GitHub (2 minutes)

```bash
# Initialize git
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/leka-bot-ui.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Railway (2 minutes)

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository
5. Railway auto-detects and deploys!

### Step 4: Set Environment Variable (30 seconds)

In Railway dashboard:
1. Click **Variables** tab
2. Add: `VITE_API_URL` = `https://your-backend.railway.app/api`
3. Click **Add**

### Step 5: Done! 🎉

Your app is live at: `https://your-app.up.railway.app`

Access with: `https://your-app.up.railway.app/?userId=U123&groupId=C456`

---

## 🔧 Alternative: Railway CLI (Even Faster!)

```bash
# Install CLI
curl -fsSL https://railway.app/install.sh | sh

# Login
railway login

# Deploy
cd leka-bot-bordio-ui
railway init
railway variables set VITE_API_URL=https://your-backend.railway.app/api
railway up

# Open app
railway open
```

**Total time: 3 minutes!** ⚡

---

## 📋 Checklist

- [ ] Extract ZIP file
- [ ] Push to GitHub (or use Railway CLI)
- [ ] Connect to Railway
- [ ] Set `VITE_API_URL` variable
- [ ] Wait for deployment (~2 minutes)
- [ ] Test your app
- [ ] Share with team! 🎊

---

## 🆘 Need Help?

See full guide: [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)

---

**Deployment Time**: 5 minutes  
**Difficulty**: ⭐ Super Easy  
**Cost**: Free tier available

