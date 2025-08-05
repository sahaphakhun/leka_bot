# 🔌 API Documentation - เอกสาร REST API

เอกสารครบถ้วนสำหรับ REST API ของเลขาบอท รองรับการเชื่อมต่อกับ Dashboard และแอปพลิเคชันภายนอก

## 📖 ภาพรวม

### Base URL
```
Development: http://localhost:3000/api
Production:  https://your-domain.com/api
```

### Authentication
API ใช้ **JWT (JSON Web Token)** สำหรับการยืนยันตัวตน

```http
Authorization: Bearer <your_jwt_token>
```

### Response Format
API ส่งคืนข้อมูลในรูปแบบ JSON เสมอ

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "pagination": { ... } // เฉพาะ paginated endpoints
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": ["Validation error 1", "Validation error 2"] // เเฉพาะ validation errors
}
```

## 🔐 Authentication

### JWT Token Structure
```json
{
  "lineUserId": "U1234567890abcdef",
  "iat": 1640995200,
  "exp": 1641081600
}
```

### Authorization Levels
1. **Public** - ไม่ต้องใช้ token
2. **Authenticated** - ต้องมี valid JWT token
3. **Group Member** - ต้องเป็นสมาชิกของกลุ่ม
4. **Group Admin** - ต้องเป็น admin ของกลุ่ม

## 📊 Groups API

### GET /groups/:groupId
ดึงข้อมูลกลุ่ม

**Authorization:** Group Member

**Parameters:**
- `groupId` (string, required) - UUID ของกลุ่ม

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "lineGroupId": "C1234567890abcdef",
    "name": "ชื่อกลุ่ม",
    "timezone": "Asia/Bangkok",
    "settings": {
      "reminderIntervals": ["P7D", "P1D", "PT3H"],
      "enableLeaderboard": true,
      "googleCalendarId": "calendar@group.calendar.google.com",
      "defaultReminders": ["P1D"],
      "workingHours": {
        "start": "09:00",
        "end": "18:00"
      }
    },
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### GET /groups/:groupId/members
ดึงรายการสมาชิกกลุ่ม

**Authorization:** Group Member

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "groupId": "uuid", 
      "role": "admin",
      "joinedAt": "2023-01-01T00:00:00.000Z",
      "user": {
        "id": "uuid",
        "lineUserId": "U1234567890abcdef",
        "displayName": "John Doe",
        "realName": "จอห์น โด",
        "email": "john@example.com",
        "isVerified": true
      }
    }
  ]
}
```

### GET /groups/:groupId/stats
ดึงสถิติกลุ่ม

**Authorization:** Group Member

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": {
      "total": 150,
      "pending": 25,
      "in_progress": 30,
      "completed": 90,
      "overdue": 5
    },
    "members": {
      "total": 8,
      "active": 6
    },
    "files": {
      "total": 45,
      "totalSize": 1048576
    },
    "kpi": {
      "averageScore": 8.5,
      "completionRate": 85.5
    }
  }
}
```

## 📋 Tasks API

### GET /groups/:groupId/tasks
ดึงรายการงานในกลุ่ม

**Authorization:** Group Member

**Query Parameters:**
- `status` (string, optional) - `pending|in_progress|completed|cancelled|overdue`
- `assignee` (string, optional) - UUID ของผู้รับผิดชอบ
- `tags` (string, optional) - รายการแท็ก คั่นด้วย comma
- `startDate` (string, optional) - วันที่เริ่มต้น (ISO 8601)
- `endDate` (string, optional) - วันที่สิ้นสุด (ISO 8601)
- `page` (number, optional) - หน้าที่ต้องการ (default: 1)
- `limit` (number, optional) - จำนวนรายการต่อหน้า (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "ชื่องาน",
      "description": "รายละเอียดงาน",
      "status": "pending",
      "priority": "high",
      "tags": ["urgent", "meeting"],
      "startTime": "2023-01-01T09:00:00.000Z",
      "dueTime": "2023-01-02T18:00:00.000Z",
      "completedAt": null,
      "createdBy": "uuid",
      "googleEventId": "google_event_id",
      "assignedUsers": [
        {
          "id": "uuid",
          "displayName": "John Doe",
          "lineUserId": "U1234567890abcdef"
        }
      ],
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### POST /groups/:groupId/tasks
สร้างงานใหม่

**Authorization:** Group Member

**Request Body:**
```json
{
  "title": "ชื่องาน",
  "description": "รายละเอียดงาน",
  "priority": "high",
  "tags": ["urgent", "meeting"],
  "startTime": "2023-01-01T09:00:00.000Z",
  "dueTime": "2023-01-02T18:00:00.000Z",
  "assigneeIds": ["uuid1", "uuid2"],
  "customReminders": ["P1D", "PT3H"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "ชื่องาน",
    "status": "pending",
    // ... ข้อมูลงานที่สร้างแล้ว
  }
}
```

### PUT /tasks/:taskId
อัปเดตงาน

**Authorization:** Group Member

**Parameters:**
- `taskId` (string, required) - UUID ของงาน

**Request Body:**
```json
{
  "title": "ชื่องานใหม่",
  "description": "รายละเอียดใหม่",
  "status": "in_progress",
  "priority": "medium",
  "tags": ["updated"],
  "dueTime": "2023-01-03T18:00:00.000Z",
  "assigneeIds": ["uuid1"]
}
```

### POST /tasks/:taskId/complete
ทำเครื่องหมายงานเสร็จ

**Authorization:** Group Member (เฉพาะผู้รับผิดชอบหรือ admin)

**Parameters:**
- `taskId` (string, required) - UUID ของงาน

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "completedAt": "2023-01-01T15:30:00.000Z",
    // ... ข้อมูลงานที่อัปเดตแล้ว
  }
}
```

## 📁 Files API

### GET /groups/:groupId/files
ดึงรายการไฟล์ในกลุ่ม

**Authorization:** Group Member

**Query Parameters:**
- `search` (string, optional) - ค้นหาในชื่อไฟล์
- `tags` (string, optional) - รายการแท็ก คั่นด้วย comma
- `mimeType` (string, optional) - ประเภทไฟล์
- `page` (number, optional) - หน้าที่ต้องการ (default: 1)
- `limit` (number, optional) - จำนวนรายการต่อหน้า (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "originalName": "document.pdf",
      "fileName": "uuid_document.pdf",
      "mimeType": "application/pdf",
      "size": 1048576,
      "path": "/uploads/uuid_document.pdf",
      "tags": ["document", "important"],
      "isPublic": false,
      "uploadedAt": "2023-01-01T10:00:00.000Z",
      "uploadedByUser": {
        "id": "uuid",
        "displayName": "John Doe"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### GET /files/:fileId/download
ดาวน์โหลดไฟล์

**Authorization:** Group Member

**Parameters:**
- `fileId` (string, required) - UUID ของไฟล์

**Response:**
- Content-Type: ตามประเภทไฟล์
- Content-Disposition: attachment; filename="original_name.ext"
- Binary file data

### GET /files/:fileId/preview
พรีวิวไฟล์ (สำหรับรูปภาพ)

**Authorization:** Group Member

**Parameters:**
- `fileId` (string, required) - UUID ของไฟล์

**Response:**
- Content-Type: image/*
- Binary image data

### POST /files/:fileId/tags
เพิ่มแท็กให้ไฟล์

**Authorization:** Group Member

**Parameters:**
- `fileId` (string, required) - UUID ของไฟล์

**Request Body:**
```json
{
  "tags": ["new-tag", "category"]
}
```

## 📅 Calendar API

### GET /groups/:groupId/calendar
ดึงข้อมูลปฏิทินกลุ่ม

**Authorization:** Group Member

**Query Parameters:**
- `start` (string, required) - วันที่เริ่มต้น (ISO 8601)
- `end` (string, required) - วันที่สิ้นสุด (ISO 8601)
- `view` (string, optional) - `month|week|day` (default: month)

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "uuid",
        "title": "ชื่องาน",
        "start": "2023-01-01T09:00:00.000Z",
        "end": "2023-01-01T10:00:00.000Z",
        "allDay": false,
        "status": "pending",
        "priority": "high",
        "assignees": ["John Doe", "Jane Smith"],
        "googleEventId": "google_event_id"
      }
    ],
    "summary": {
      "totalEvents": 25,
      "byStatus": {
        "pending": 10,
        "in_progress": 8,
        "completed": 7
      }
    }
  }
}
```

## 🏆 Leaderboard API

### GET /groups/:groupId/leaderboard
ดึงอันดับผลงานกลุ่ม

**Authorization:** Group Member

**Query Parameters:**
- `period` (string, optional) - `week|month|year` (default: month)
- `year` (number, optional) - ปี (default: ปีปัจจุบัน)
- `month` (number, optional) - เดือน 1-12 (ใช้กับ period=month)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "year": 2023,
    "month": 1,
    "rankings": [
      {
        "rank": 1,
        "user": {
          "id": "uuid",
          "displayName": "John Doe",
          "lineUserId": "U1234567890abcdef"
        },
        "score": 95,
        "tasksCompleted": 12,
        "averageResponseTime": "02:30:00",
        "onTimeRate": 0.92,
        "improvement": "+5"
      }
    ],
    "summary": {
      "totalParticipants": 8,
      "averageScore": 78.5,
      "totalTasksCompleted": 87
    }
  }
}
```

## 👤 Users API

### GET /users/:userId/stats
ดึงสถิติผู้ใช้

**Authorization:** Authenticated

**Parameters:**
- `userId` (string, required) - UUID ของผู้ใช้

**Query Parameters:**
- `period` (string, optional) - `week|month|year` (default: month)

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "displayName": "John Doe",
      "email": "john@example.com"
    },
    "stats": {
      "score": 85,
      "tasksCompleted": 12,
      "tasksAssigned": 15,
      "averageResponseTime": "02:30:00",
      "onTimeRate": 0.80,
      "groups": 3
    },
    "trends": [
      {
        "date": "2023-01-01",
        "score": 82,
        "tasksCompleted": 3
      }
    ]
  }
}
```

## 📊 Export API

### GET /export/kpi/:groupId
ส่งออกข้อมูล KPI

**Authorization:** Group Admin

**Parameters:**
- `groupId` (string, required) - UUID ของกلุ่ม

**Query Parameters:**
- `startDate` (string, required) - วันที่เริ่มต้น (ISO 8601)
- `endDate` (string, required) - วันที่สิ้นสุด (ISO 8601)
- `format` (string, optional) - `json|csv` (default: json)

**Response (JSON):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTasks": 150,
      "completedTasks": 120,
      "averageScore": 82.5
    },
    "members": [
      {
        "userId": "uuid",
        "displayName": "John Doe",
        "score": 95,
        "tasksCompleted": 12
      }
    ],
    "tasks": [
      {
        "id": "uuid",
        "title": "ชื่องาน",
        "completedAt": "2023-01-01T15:30:00.000Z",
        "score": 2
      }
    ]
  }
}
```

**Response (CSV):**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="kpi-{groupId}.csv"

# CSV data
```

## ❌ Error Codes

### HTTP Status Codes
- `200` - OK
- `201` - Created
- `400` - Bad Request (Validation Error)
- `401` - Unauthorized (Authentication Required)
- `403` - Forbidden (Insufficient Permissions)
- `404` - Not Found
- `429` - Too Many Requests (Rate Limited)
- `500` - Internal Server Error

### Common Error Messages

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Access token required"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "error": "Group membership required"
}
```

#### 400 Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    "Body: \"title\" is required",
    "Query: \"page\" must be a positive number"
  ]
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Task not found"
}
```

## 🔗 Legacy Routes (Backward Compatibility)

เพื่อรองรับ backward compatibility API ยังคงมี legacy routes:

```
GET /api/tasks/:groupId        → /api/groups/:groupId/tasks
POST /api/tasks/:groupId       → /api/groups/:groupId/tasks
GET /api/calendar/:groupId     → /api/groups/:groupId/calendar
GET /api/files/:groupId        → /api/groups/:groupId/files
GET /api/leaderboard/:groupId  → /api/groups/:groupId/leaderboard
```

## 🚀 Rate Limiting

API มี rate limiting:
- **100 requests/minute** ต่อ IP address
- **1000 requests/hour** ต่อ authenticated user

## 🧪 Testing API

### Using cURL

```bash
# Get group info
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://your-domain.com/api/groups/group-uuid

# Create task
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Test Task",
       "dueTime": "2023-12-31T18:00:00.000Z",
       "assigneeIds": ["user-uuid"]
     }' \
     https://your-domain.com/api/groups/group-uuid/tasks
```

### Using Postman

1. Import collection: `docs/postman/leka-bot-api.json`
2. Set environment variables:
   - `baseUrl`: `https://your-domain.com/api`
   - `authToken`: `your_jwt_token`

## 📞 Support

หากพบปัญหาในการใช้งาน API:

1. ตรวจสอบ [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. ดู error logs ในหน้า Dashboard
3. สร้าง [GitHub Issue](https://github.com/yourusername/leka-bot/issues)

---

**API Version: 1.0.0**  
**Last Updated: January 2024**