# 🚀 Railway Deployment Guide - Complete Project

## โปรเจ็กต์รวม Backend + 2 Frontends

- Backend API (Node.js + TypeScript)
- Frontend เก่า (Vanilla JS) → `/dashboard/`
- Frontend ใหม่ (React) → `/dashboard-new/`

---

## 🎯 URL Structure

```
https://your-app.railway.app
├── /api/*              → Backend API
├── /webhook            → LINE Bot Webhook
├── /dashboard/         → Frontend เก่า
└── /dashboard-new/     → Frontend ใหม่
```

---

## 📋 Deploy Steps

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/leka-bot.git
git push -u origin main
```

### 2. Deploy on Railway

1. Go to https://railway.app
2. New Project → Deploy from GitHub repo
3. Select your repository

### 3. Set Environment Variables

```env
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
DATABASE_URL=postgresql://...
PORT=3000
NODE_ENV=production
```

### 4. Railway Auto Build

Railway will run: `npm install && npm run build`

---

## 🌐 Access URLs

- Frontend เก่า: `https://your-app.railway.app/dashboard/?groupId=xxx`
- Frontend ใหม่: `https://your-app.railway.app/dashboard-new/?groupId=xxx`
- Backend API: `https://your-app.railway.app/api/...`

---

## ✅ Build Process

1. Build Backend (TypeScript)
2. Build Frontend เก่า (Tailwind CSS)
3. Build Frontend ใหม่ (React + Vite)
4. Copy files to dist/

---

**Version:** 2.0.3
