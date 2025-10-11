# 🚀 Leka Dashboard - Deployment Guide

## Railway Deployment

### วิธีการ Deploy

1. **Push โปรเจ็กต์ไปยัง GitHub**
```bash
git init
git add .
git commit -m "Initial commit - Leka Dashboard v2.0.3"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. **เชื่อมต่อกับ Railway**
- ไปที่ https://railway.app
- เข้าสู่ระบบด้วย GitHub
- คลิก "New Project"
- เลือก "Deploy from GitHub repo"
- เลือกโปรเจ็กต์ของคุณ

3. **ตั้งค่า Environment Variables**
ใน Railway Dashboard → Settings → Environment Variables:
```
VITE_API_BASE_URL=https://your-backend-api.com
PORT=3000
```

4. **Deploy**
Railway จะ build และ deploy อัตโนมัติ

### Build Configuration

Railway จะใช้ `railway.json` ที่มีอยู่แล้ว:
- Builder: NIXPACKS
- Build Command: `npm install && npm run build`
- Start Command: `npm run preview`

### หลังจาก Deploy

URL ของแดชบอร์ด:
```
https://your-app-name.up.railway.app
```

เข้าใช้งานด้วย:
```
https://your-app-name.up.railway.app?groupId=xxx
https://your-app-name.up.railway.app?userId=xxx&groupId=yyy
```

---

## Alternative: Vercel Deployment

### วิธีการ Deploy บน Vercel

1. **Push ไปยัง GitHub** (เหมือนข้างบน)

2. **Import โปรเจ็กต์ใน Vercel**
- ไปที่ https://vercel.com
- คลิก "New Project"
- Import จาก GitHub
- เลือกโปรเจ็กต์

3. **ตั้งค่า**
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

4. **Environment Variables**
```
VITE_API_BASE_URL=https://your-backend-api.com
```

5. **Deploy**
คลิก Deploy และรอสักครู่

---

## Environment Variables

### Required
- `VITE_API_BASE_URL` - URL ของ Backend API

### Optional
- `PORT` - Port สำหรับ Railway (default: 3000)

---

## Local Development

```bash
# ติดตั้ง dependencies
npm install

# รัน development server
npm run dev

# Build สำหรับ production
npm run build

# Preview production build
npm run preview
```

---

## Troubleshooting

### Build Failed
- ตรวจสอบว่า Node.js version >= 18
- ลบ `node_modules` และ `package-lock.json` แล้ว `npm install` ใหม่

### API Connection Error
- ตรวจสอบ `VITE_API_BASE_URL` ใน Environment Variables
- ตรวจสอบว่า Backend API รองรับ CORS

### 404 Not Found
- ตรวจสอบว่า deploy ไฟล์ใน `dist/` folder
- ตรวจสอบ routing configuration

---

## Production Checklist

- [ ] ตั้งค่า Environment Variables
- [ ] ทดสอบการเชื่อมต่อ API
- [ ] ทดสอบบนมือถือ
- [ ] ตรวจสอบ HTTPS
- [ ] ตั้งค่า Custom Domain (ถ้าต้องการ)
- [ ] เปิดใช้งาน Analytics (ถ้าต้องการ)

---

## Support

หากมีปัญหา:
1. ตรวจสอบ Railway/Vercel Logs
2. ตรวจสอบ Browser Console
3. ตรวจสอบ Network Tab ใน DevTools
