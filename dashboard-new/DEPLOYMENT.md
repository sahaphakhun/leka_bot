# คู่มือการ Deploy Dashboard ใหม่บน Railway

## 🚀 ขั้นตอนการ Deploy

### วิธีที่ 1: Deploy ผ่าน Railway Dashboard (แนะนำ)

1. **เข้า Railway Dashboard**
   ```
   https://railway.app/
   ```

2. **เลือก Project ของคุณ**
   - คลิกที่ project `lekabot-production`

3. **เข้า Service**
   - คลิกที่ service ที่รัน backend

4. **อัปโหลดไฟล์**
   - ไปที่ tab "Settings"
   - เลื่อนลงหา "Volumes" หรือ "Files"
   - อัปโหลดไฟล์จาก `dashboard-new-fixed.zip`
   - แตกไฟล์ในโฟลเดอร์ `dashboard-new/`

### วิธีที่ 2: Deploy ผ่าน Git (สำหรับ Production)

1. **Clone repository**
   ```bash
   git clone <your-repo-url>
   cd leka_bot-main
   ```

2. **แทนที่ไฟล์เดิม**
   ```bash
   cd dashboard-new
   rm -rf *
   unzip /path/to/dashboard-new-fixed.zip
   ```

3. **Commit และ Push**
   ```bash
   git add .
   git commit -m "Fix dashboard-new: Add smart URL detection for personal/group modes"
   git push origin main
   ```

4. **Railway จะ auto-deploy**
   - ตรวจสอบ deployment logs
   - รอจนกว่า deployment จะเสร็จ

### วิธีที่ 3: Deploy ผ่าน Railway CLI

1. **ติดตั้ง Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Link project**
   ```bash
   railway link
   ```

4. **Deploy**
   ```bash
   cd /path/to/leka_bot-main
   railway up
   ```

---

## 🧪 ทดสอบหลัง Deploy

### 1. ทดสอบ Group Mode
```bash
curl "https://lekabot-production.up.railway.app/dashboard-new/?groupId=2f5b9113-b8cf-4196-8929-bff6b26cbd65"
```

**Expected**: 
- ไม่ติด Loading
- แสดง "👥 Group Mode" badge
- แสดงงานทั้งหมดของกลุ่ม

### 2. ทดสอบ Personal Mode
```bash
curl "https://lekabot-production.up.railway.app/dashboard-new/?userId=Uc92411a226e4d4c9866adef05068bdf1&groupId=2f5b9113-b8cf-4196-8929-bff6b26cbd65"
```

**Expected**:
- ไม่ติด Loading
- แสดง "👤 Personal Mode" badge
- แสดงเฉพาะงานของ user

### 3. ทดสอบจาก LINE Bot

#### ในกลุ่ม:
- กดปุ่ม "ดูงาน" หรือ "Dashboard"
- ควรเปิด Group Mode
- ทุกคนเห็นข้อมูลเหมือนกัน

#### ในแชทส่วนตัว:
- กดปุ่ม "งานของฉัน"
- ควรเปิด Personal Mode
- แสดงเฉพาะงานของ user คนนั้น

---

## 🔍 Troubleshooting

### ปัญหา: ยังติด Loading

**วิธีแก้**:
1. เปิด Browser Console (F12)
2. ดู logs:
   ```
   🔍 URL Parameters: { ... }
   📍 View Mode: ...
   ```
3. ตรวจสอบว่า:
   - มี `groupId` หรือไม่?
   - `viewMode` ถูกต้องหรือไม่?
   - API call สำเร็จหรือไม่?

### ปัญหา: แสดง Authentication Required

**วิธีแก้**:
1. ตรวจสอบ URL parameters
2. ต้องมี `groupId` อย่างน้อย
3. ถ้าเป็น Personal mode ต้องมี `userId` ด้วย

### ปัญหา: ไม่แสดงงาน

**วิธีแก้**:
1. เช็ค Console logs:
   ```
   📥 Fetching tasks...
   ✅ Tasks loaded: { ... }
   ```
2. ตรวจสอบว่า API endpoint ทำงานหรือไม่:
   ```bash
   curl "https://lekabot-production.up.railway.app/api/groups/<groupId>/tasks"
   ```

### ปัญหา: ไฟล์ไม่ update

**วิธีแก้**:
1. Clear browser cache (Ctrl+Shift+R)
2. ตรวจสอบว่าไฟล์ถูก deploy แล้ว:
   ```bash
   railway logs
   ```
3. ตรวจสอบ timestamp ของไฟล์:
   ```bash
   ls -la dashboard-new/
   ```

---

## 📊 Monitoring

### ตรวจสอบ Logs

```bash
railway logs --follow
```

### ตรวจสอบ Deployment Status

```bash
railway status
```

### ตรวจสอบ Environment Variables

```bash
railway variables
```

---

## 🔄 Rollback (ถ้าจำเป็น)

### ผ่าน Git

```bash
git revert HEAD
git push origin main
```

### ผ่าน Railway Dashboard

1. ไปที่ "Deployments"
2. เลือก deployment ก่อนหน้า
3. คลิก "Redeploy"

---

## ✅ Checklist หลัง Deploy

- [ ] ทดสอบ Group Mode URL
- [ ] ทดสอบ Personal Mode URL
- [ ] ทดสอบปุ่มจาก LINE Bot ในกลุ่ม
- [ ] ทดสอบปุ่มจาก LINE Bot ในแชทส่วนตัว
- [ ] ตรวจสอบ Console logs ไม่มี error
- [ ] ตรวจสอบ Railway logs ไม่มี error
- [ ] ทดสอบ filter งานใน Personal mode
- [ ] ทดสอบแสดงงานทั้งหมดใน Group mode

---

## 📞 Contact

หากมีปัญหาหรือคำถาม:
- ตรวจสอบ logs ใน Browser Console
- ตรวจสอบ Railway logs
- ดู README.md สำหรับข้อมูลเพิ่มเติม

