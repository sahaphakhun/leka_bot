# 🐛 Debug Guide - เลขาบอท

คู่มือการ debug และตรวจสอบการทำงานของเลขาบอทใน Railway

---

## 🔍 **การเปิดใช้ Debug Logs**

### **วิธีที่ 1: Environment Variable**
เพิ่มในค่า Environment Variables ของ Railway:
```bash
ENABLE_DEBUG_LOGS=true
```

### **วิธีที่ 2: Development Mode**
```bash
NODE_ENV=development
```

### **ผลลัพธ์:**
- ✅ Log ทุก HTTP requests และ responses
- ✅ Log การประมวลผล LINE webhook events
- ✅ Log การ parse และประมวลผลคำสั่ง
- ✅ Log การส่งข้อความตอบกลับ
- ✅ Log error details และ stack traces

---

## 📊 **Log Categories**

### **🌐 [REQUEST] - HTTP Requests**
```
🌐 [REQUEST] POST /webhook
📍 [REQUEST] From: 147.92.150.192
🕐 [REQUEST] Time: 2024-01-15T10:30:45.123Z
📋 [REQUEST] Headers: {
  "user-agent": "LineBotWebhook/2.0",
  "content-type": "application/json",
  "x-line-signature": "abc123...",
  "content-length": "543"
}
📦 [REQUEST] Webhook body structure: {
  "destination": "Uabc123...",
  "eventsCount": 1,
  "eventTypes": ["message"]
}
```

### **🔔 [WEBHOOK] - LINE Webhook Processing**
```
🔔 [WEBHOOK] Received webhook request
📊 [WEBHOOK] Processing 1 event(s)
🔄 [WEBHOOK] Processing event 1/1: message
✅ [WEBHOOK] All events processed successfully
```

### **🎯 [EVENT] - Individual Event Processing**
```
🎯 [EVENT] Processing event type: message
📍 [EVENT] Source: group | ID: Cabc123...
💬 [EVENT] Message type: text
📝 [EVENT] Text content: "@เลขา /task list"
✅ [EVENT] Successfully processed message event
```

### **💬 [MESSAGE] - Message Handling**
```
💬 [MESSAGE] Handling message event
👤 [MESSAGE] User ID: Uabc123...
👥 [MESSAGE] Group ID: Cabc123...
🎫 [MESSAGE] Reply Token: replyabc123...
```

### **📝 [TEXT] - Text Message Processing**
```
📝 [TEXT] Analyzing text: "@เลขา /task list today"
🎯 [TEXT] Bot mentioned! Processing command...
⚙️ [TEXT] Extracted command: "/task list today"
🔄 [TEXT] Processing command through CommandService...
📤 [TEXT] Command response: "📋 รายการงานวันนี้:\n1. ประชุมทีม - 10:00..."
📨 [TEXT] Sending reply message
✅ [TEXT] Reply sent successfully
```

### **⚙️ [COMMAND] - Command Processing**
```
⚙️ [COMMAND] Processing command: "/task list today"
👤 [COMMAND] User: Uabc123..., Group: Cabc123...
🎯 [COMMAND] Parsed command type: task
📊 [COMMAND] Command data: {
  "type": "task",
  "action": "list",
  "filter": "today",
  "userId": "Uabc123...",
  "groupId": "Cabc123..."
}
📝 [COMMAND] Handling task command: list
✅ [COMMAND] Command processed successfully
📤 [COMMAND] Response: "📋 รายการงานวันนี้:..."
```

### **🔍 [PARSE] - Command Parsing**
```
🔍 [PARSE] Parsing command: "/task list today"
🎯 [PARSE] Main command: "/task"
📝 [PARSE] Command parts: ["/task", "list", "today"]
📝 [PARSE] Parsing task command
```

### **📨 [LINE] - LINE API Communication**
```
📨 [LINE] Sending reply message
🎫 [LINE] Reply token: replyabc123...
💬 [LINE] Message type: text
📝 [LINE] Text content: "📋 รายการงานวันนี้: 1. ประชุมทีม..."
✅ [LINE] Reply message sent successfully
```

### **❌ [ERROR] - Error Handling**
```
❌ [TEXT] Error handling text message: TypeError: Cannot read property 'id' of undefined
🔍 [TEXT] Error details: {
  "text": "@เลขา /task invalid",
  "userId": "Uabc123...",
  "groupId": "Cabc123...",
  "replyToken": "replyabc123...",
  "error": "Cannot read property 'id' of undefined",
  "stack": "TypeError: Cannot read property 'id' of undefined\n    at ..."
}
🆘 [TEXT] Error message sent to user
```

---

## 🔧 **การดู Logs ใน Railway**

### **1. Railway Dashboard**
```
1. เข้า Railway dashboard
2. เลือก project เลขาบอท
3. คลิก "Deployments"
4. คลิก deployment ล่าสุด
5. คลิก "View Logs"
```

### **2. Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login และ deploy
railway login
railway link
railway logs --follow
```

### **3. Real-time Monitoring**
```bash
# ดู logs แบบ real-time
railway logs --tail 100 --follow

# กรอง logs เฉพาะ errors
railway logs | grep "❌\|💥"

# กรอง logs เฉพาะ webhook events
railway logs | grep "WEBHOOK\|EVENT"
```

---

## 🚨 **Common Debug Scenarios**

### **📞 บอทไม่ตอบข้อความ**

**ตรวจสอบ:**
```bash
# 1. ดู webhook events
grep "WEBHOOK" logs
# คาดหวัง: 🔔 [WEBHOOK] Received webhook request

# 2. ตรวจสอบ event processing
grep "EVENT" logs
# คาดหวัง: 🎯 [EVENT] Processing event type: message

# 3. ตรวจสอบ text processing
grep "TEXT" logs
# คาดหวัง: 📝 [TEXT] Bot mentioned! Processing command...
```

**สาเหตุที่เป็นไปได้:**
- ❌ Webhook URL ไม่ถูกต้อง
- ❌ LINE signature verification failed
- ❌ ข้อความไม่มี @เลขา mention
- ❌ Database connection error

### **💬 บอทรับข้อความแต่ไม่เข้าใจคำสั่ง**

**ตรวจสอบ:**
```bash
# ดู command parsing
grep "PARSE\|COMMAND" logs

# คาดหวัง:
# 🔍 [PARSE] Parsing command: "/task list"
# 🎯 [PARSE] Main command: "/task"
# ⚙️ [COMMAND] Processing command: "/task list"
```

**สาเหตุที่เป็นไปได้:**
- ❌ คำสั่งผิด syntax
- ❌ Command parser ไม่รู้จักคำสั่ง
- ❌ Missing required parameters

### **📨 บอทประมวลผลแล้วแต่ไม่ส่งข้อความตอบกลับ**

**ตรวจสอบ:**
```bash
# ดู LINE API communication
grep "LINE" logs

# คาดหวัง:
# 📨 [LINE] Sending reply message
# ✅ [LINE] Reply message sent successfully
```

**สาเหตุที่เป็นไปได้:**
- ❌ Reply token expired (> 30 วินาที)
- ❌ LINE API credentials ผิด
- ❌ Message format ไม่ถูกต้อง

### **💥 Application Crash**

**ตรวจสอบ:**
```bash
# ดู critical errors
grep "CRITICAL\|💥" logs

# ตัวอย่าง:
# 💥 [CRITICAL] Unhandled Promise Rejection: Database connection failed
# 💥 [CRITICAL] Uncaught Exception: TypeError: Cannot read property...
```

---

## 📈 **Performance Monitoring**

### **⏱️ Response Time Tracking**
```bash
# ดู response times
grep "Duration:" logs

# ตัวอย่าง output:
# ⏱️ [RESPONSE] Duration: 245ms
# ⏱️ [RESPONSE] Duration: 1840ms (ช้าเกินไป!)
```

### **💾 Memory Usage**
```bash
# ดู memory usage
grep "Memory:" logs

# หรือ health check
curl https://your-app.railway.app/health
```

### **📊 Request Volume**
```bash
# นับจำนวน webhook requests
grep "WEBHOOK.*Received" logs | wc -l

# นับจำนวน commands processed
grep "COMMAND.*processed successfully" logs | wc -l
```

---

## 🛠️ **Debug Tools & Tips**

### **1. Quick Health Check**
```bash
# ตรวจสอบ basic functionality
curl https://your-app.railway.app/health

# คาดหวัง response:
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "service": "เลขาบอท",
  "version": "1.0.0",
  "uptime": 3600,
  "memory": {
    "used": 85,
    "total": 128
  }
}
```

### **2. Test Webhook Locally**
```bash
# ใช้ ngrok สำหรับ local testing
npm install -g ngrok
ngrok http 3000

# ใช้ URL จาก ngrok ตั้งเป็น webhook URL ใน LINE console
```

### **3. Database Connection Test**
```bash
# ดู database logs
grep "Database\|DATABASE" logs

# คาดหวัง:
# ✅ [STARTUP] Database connected successfully
```

### **4. Environment Variables Check**
```bash
# ดู system info
grep "SYSTEM" logs

# คาดหวัง:
# ⚙️ [SYSTEM] Environment check: {
#   "HAS_LINE_TOKEN": true,
#   "HAS_LINE_SECRET": true,
#   ...
# }
```

---

## 🎯 **Debug Best Practices**

### **✅ DO**
- เปิด debug logs เมื่อมีปัญหา
- ใช้ log categories เพื่อกรองข้อมูล
- เก็บ logs สำคัญไว้ในรูปแบบที่อ่านง่าย
- Monitor response times และ memory usage

### **❌ DON'T**
- เปิด debug logs ใน production ตลอดเวลา (จะทำให้ logs เยอะมาก)
- Log sensitive data (tokens, passwords, personal info)
- Ignore error logs
- ลืม disable debug เมื่อแก้ปัญหาเสร็จแล้ว

---

## 🆘 **Emergency Debug Checklist**

เมื่อเลขาบอทไม่ทำงาน:

### **1. ✅ Basic Checks**
- [ ] Railway app กำลังทำงานอยู่หรือไม่?
- [ ] Health endpoint ตอบกลับหรือไม่?
- [ ] Environment variables ครบหรือไม่?

### **2. ✅ LINE Integration**
- [ ] Webhook URL ตั้งค่าถูกต้องหรือไม่?
- [ ] LINE credentials ถูกต้องหรือไม่?
- [ ] ข้อความมี @เลขา mention หรือไม่?

### **3. ✅ Database**
- [ ] Database connection สำเร็จหรือไม่?
- [ ] Tables ถูกสร้างแล้วหรือไม่?
- [ ] Migration สำเร็จหรือไม่?

### **4. ✅ Logs Analysis**
- [ ] มี error logs หรือไม่?
- [ ] Webhook events มาถึงหรือไม่?
- [ ] Commands ถูก parse หรือไม่?
- [ ] Responses ถูกส่งหรือไม่?

**หากยังมีปัญหา ให้ส่ง logs มาเพื่อ debug เพิ่มเติม!** 🔧✨