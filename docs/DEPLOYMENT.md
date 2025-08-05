# 🚀 Deployment Guide - คู่มือ Deploy Production

คู่มือการ deploy เลขาบอทสู่ Production environment โดยมุ่งเน้นที่ Railway Platform

## 🌐 ภาพรวมการ Deploy

### Supported Platforms
- **Railway** (Primary, แนะนำ)
- **Heroku** (Alternative)
- **DigitalOcean App Platform**
- **AWS Elastic Beanstalk**
- **Google Cloud Run**
- **VPS/Self-hosted**

### Prerequisites
- Git repository
- Production database (PostgreSQL)
- LINE Bot Channel (Production)
- Domain name (Optional)
- SSL Certificate (จำเป็นสำหรับ LINE Webhook)

## 🚂 Railway Deployment (แนะนำ)

Railway เป็น Platform ที่รองรับ Node.js อย่างดีและมี PostgreSQL built-in

### 1. เตรียมโปรเจ็ก

#### ตรวจสอบไฟล์ Deployment
```bash
# ตรวจสอบไฟล์ที่จำเป็น
ls -la railway.json Procfile package.json

# Build โปรเจ็กเพื่อทดสอบ
npm run build
```

#### railway.json Configuration
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### Procfile
```
web: npm start
```

### 2. สร้าง Railway Project

#### Via Railway CLI
```bash
# ติดตั้ง Railway CLI
npm install -g @railway/cli

# Login เข้า Railway
railway login

# สร้างโปรเจ็กใหม่
railway init

# หรือเชื่อมต่อกับ existing project
railway link [project-id]
```

#### Via Railway Dashboard
1. เข้า [railway.app](https://railway.app)
2. คลิก **"New Project"**
3. เลือก **"Deploy from GitHub repo"**
4. เลือก repository ของ leka-bot
5. Railway จะ auto-detect และเริ่ม build

### 3. ตั้งค่า Database

#### Option A: Railway PostgreSQL (แนะนำ)
```bash
# เพิ่ม PostgreSQL service
railway add postgresql

# ดู connection string
railway variables
```

#### Option B: External Database
- Supabase, PlanetScale, หรือ cloud database อื่นๆ
- ก็อปปี้ DATABASE_URL มาใส่ใน Railway variables

### 4. ตั้งค่า Environment Variables

#### ผ่าน Railway CLI
```bash
# ตั้งค่าตัวแปรจำเป็น
railway variables set NODE_ENV=production
railway variables set BASE_URL=https://your-app.railway.app
railway variables set LINE_CHANNEL_ACCESS_TOKEN=your_token
railway variables set LINE_CHANNEL_SECRET=your_secret

# ตั้งค่าตัวแปรเสริม (ถ้ามี)
railway variables set GOOGLE_CLIENT_ID=your_client_id
railway variables set GOOGLE_CLIENT_SECRET=your_secret
railway variables set SMTP_USER=your_email
railway variables set SMTP_PASS=your_password
```

#### ผ่าน Railway Dashboard
1. เข้า Project Dashboard
2. ไปที่ **Variables** tab
3. เพิ่ม environment variables:

```env
# Required Variables
NODE_ENV=production
PORT=3000
BASE_URL=https://your-app.railway.app
DATABASE_URL=postgresql://username:password@host:port/database

# LINE Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_BOT_USER_ID=your_bot_user_id

# Optional: Google Services
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-app.railway.app/auth/google/callback

# Optional: Email Services
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Security
JWT_SECRET=your_very_secure_jwt_secret_key_here
```

### 5. Deploy Application

#### ผ่าน Railway CLI
```bash
# Deploy โปรเจ็ก
railway up

# ดู deployment status
railway status

# ดู logs
railway logs
```

#### ผ่าน GitHub Integration
1. Push โค้ดไป GitHub
2. Railway จะ auto-deploy เมื่อมี push ใหม่
3. ตรวจสอบใน Railway Dashboard

### 6. Initialize Database

#### รัน Database Migration
```bash
# เข้าไปใน Railway shell
railway shell

# หรือรันคำสั่งตรง
railway run npm run db:init
```

#### ตรวจสอบ Database
```bash
# ทดสอบ database connection
railway run npm run db:test

# ดู database tables
railway connect postgresql
\dt
```

### 7. ตั้งค่า Custom Domain (Optional)

#### เพิ่ม Custom Domain
1. ไปที่ Railway Dashboard > Settings
2. เพิ่ม **Custom Domain**
3. ชี้ DNS ของ domain ไป Railway
4. รอ SSL certificate provision

#### DNS Configuration
```
Type: CNAME
Name: your-subdomain (หรือ @)
Value: your-app.railway.app
```

### 8. ตั้งค่า LINE Webhook

#### อัปเดต Webhook URL
1. เข้า [LINE Developers Console](https://developers.line.biz/console/)
2. เลือก Bot Channel
3. ไปที่ **Messaging API**
4. อัปเดต **Webhook URL**:
   ```
   https://your-app.railway.app/webhook
   ```
5. คลิก **Verify** เพื่อทดสอบ

### 9. ทดสอบ Production

#### Health Check
```bash
curl https://your-app.railway.app/health
```

Expected Response:
```json
{
  "status": "OK",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

#### ทดสอบ LINE Bot
1. เพิ่มบอทเข้ากลุ่ม LINE
2. ส่งคำสั่ง: `@เลขา /help`
3. ตรวจสอบการตอบกลับ

## 🐋 Alternative Deployment Options

### Heroku Deployment

#### 1. เตรียม Heroku
```bash
# ติดตั้ง Heroku CLI
# ดาวน์โหลดจาก https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# สร้าง app
heroku create your-app-name
```

#### 2. เพิ่ม PostgreSQL
```bash
heroku addons:create heroku-postgresql:hobby-dev
```

#### 3. ตั้งค่า Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set BASE_URL=https://your-app.herokuapp.com
heroku config:set LINE_CHANNEL_ACCESS_TOKEN=your_token
# ... เพิ่มตัวแปรอื่นๆ
```

#### 4. Deploy
```bash
git push heroku main
```

### DigitalOcean App Platform

#### 1. สร้าง App
1. เข้า [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. คลิก **Create App**
3. เชื่อมต่อ GitHub repository

#### 2. ตั้งค่า Environment Variables
```yaml
# .do/app.yaml
name: leka-bot
services:
- name: web
  source_dir: /
  github:
    repo: your-username/leka-bot
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: BASE_URL
    value: ${APP_URL}
  # ... other environment variables
```

### Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "start"]
```

#### docker-compose.yml
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/leka_bot
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=leka_bot
      - POSTGRES_USER=leka_user
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

## 🔒 Security Considerations

### Environment Variables Security
```bash
# ใช้ strong JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# ใช้ strong database password
DB_PASSWORD=$(openssl rand -base64 16)
```

### HTTPS/SSL Configuration
- Railway จัดการ SSL อัตโนมัติ
- สำหรับ self-hosted: ใช้ Let's Encrypt
- LINE Webhook ต้องใช้ HTTPS

### Webhook Security
```typescript
// ตรวจสอบ signature validation
app.use('/webhook', express.raw({ type: 'application/json' }));
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-line-signature'];
  if (!lineService.validateSignature(req.body, signature)) {
    return res.status(401).send('Unauthorized');
  }
  // ... handle webhook
});
```

## 📊 Monitoring และ Logging

### Railway Logs
```bash
# ดู real-time logs
railway logs --tail

# ดู logs ตามเวลา
railway logs --since 1h
```

### Health Monitoring
```bash
# ตั้งค่า monitoring script
#!/bin/bash
HEALTH_URL="https://your-app.railway.app/health"
if ! curl -f $HEALTH_URL > /dev/null 2>&1; then
  echo "Health check failed at $(date)"
  # ส่งแจ้งเตือน
fi
```

### Application Metrics
```typescript
// เพิ่มใน src/index.ts
app.get('/metrics', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  });
});
```

## 🔄 CI/CD Pipeline

### Railway + GitHub Actions

#### .github/workflows/deploy.yml
```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build application
      run: npm run build
    
    - name: Deploy to Railway
      uses: railwayapp/railway-deploy@v1.0.0
      with:
        railway-token: ${{ secrets.RAILWAY_TOKEN }}
        service-name: leka-bot
```

## 🗃️ Database Backup

### Railway PostgreSQL Backup
```bash
# สำรองข้อมูล
railway db dump --output backup.sql

# คืนค่าข้อมูล
railway db restore backup.sql
```

### Automated Backup Script
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

# Export database
railway db dump --output $BACKUP_FILE

# อัปโหลดไป cloud storage (optional)
# aws s3 cp $BACKUP_FILE s3://your-backup-bucket/

echo "Backup completed: $BACKUP_FILE"
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# ตรวจสอบ build logs
railway logs --deployment

# ทดสอบ build ใน local
npm run build
```

#### 2. Database Connection Issues
```bash
# ทดสอบ database connection
railway run npm run db:test

# ตรวจสอบ DATABASE_URL
railway variables
```

#### 3. LINE Webhook Issues
- ตรวจสอบ webhook URL ถูกต้อง
- ตรวจสอบ SSL certificate
- ตรวจสอบ signature validation

#### 4. Environment Variables
```bash
# ดู environment variables
railway variables

# ตั้งค่าใหม่
railway variables set KEY=value
```

### Debug Commands
```bash
# เข้าไปใน Railway shell
railway shell

# รัน database migration
railway run npm run db:init

# ดู process status
railway ps

# Restart application
railway restart
```

## 📈 Scaling

### Railway Scaling
- Railway จัดการ auto-scaling
- สามารถอัปเกรด plan ได้ตามต้องการ

### Performance Optimization
1. **Database Connection Pooling**
2. **Caching (Redis)**
3. **CDN for Static Files**
4. **Load Balancing**

## 💰 Cost Optimization

### Railway Pricing
- **Starter Plan:** $5/month
- **Pro Plan:** $20/month
- **Team Plan:** $50/month

### Cost Saving Tips
1. ใช้ sleep mode สำหรับ development
2. Monitor resource usage
3. Optimize database queries
4. ใช้ environment-specific configurations

## ✅ Deployment Checklist

### Pre-deployment
- [ ] Code tested locally
- [ ] Build successful
- [ ] Environment variables prepared
- [ ] Database migration ready
- [ ] LINE Channel configured

### Deployment
- [ ] Application deployed
- [ ] Database initialized
- [ ] Environment variables set
- [ ] Health check passing
- [ ] SSL certificate valid

### Post-deployment
- [ ] LINE Webhook updated
- [ ] Bot responding to commands
- [ ] Dashboard accessible
- [ ] Email notifications working (if configured)
- [ ] Google Calendar sync working (if configured)
- [ ] Monitoring set up
- [ ] Backup configured

## 📞 Support

หากมีปัญหาในการ deploy:

1. ตรวจสอบ [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. ดู Railway logs: `railway logs`
3. สร้าง [GitHub Issue](https://github.com/yourusername/leka-bot/issues)

---

**Happy Deploying! 🚀**