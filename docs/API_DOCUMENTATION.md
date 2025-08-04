# API Documentation - เลขาบอท

## Overview

เลขาบอท API รองรับการจัดการงาน ไฟล์ และระบบ KPI สำหรับกลุ่ม LINE

**Base URL:** `https://your-app.railway.app/api`

## Authentication

API ใช้ JWT Token authentication:

```http
Authorization: Bearer <jwt_token>
```

## Endpoints

### Tasks

#### GET /api/tasks/:groupId
ดึงรายการงานในกลุ่ม

**Parameters:**
- `groupId` (path): UUID ของกลุ่ม

**Query Parameters:**
- `status`: pending, in_progress, completed, cancelled, overdue
- `assignee`: UUID ของผู้รับผิดชอบ
- `tags`: แท็กคั่นด้วย comma
- `startDate`: วันที่เริ่มต้น (ISO 8601)
- `endDate`: วันที่สิ้นสุด (ISO 8601)
- `page`: หน้า (default: 1)
- `limit`: จำนวนต่อหน้า (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "ชื่องาน",
      "description": "รายละเอียด",
      "status": "pending",
      "priority": "medium",
      "dueTime": "2024-01-01T10:00:00Z",
      "assignedUsers": [
        {
          "id": "uuid",
          "displayName": "ชื่อผู้ใช้"
        }
      ],
      "tags": ["tag1", "tag2"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### POST /api/tasks/:groupId
สร้างงานใหม่

**Request Body:**
```json
{
  "title": "ชื่องาน",
  "description": "รายละเอียด",
  "assigneeIds": ["uuid1", "uuid2"],
  "createdBy": "uuid",
  "dueTime": "2024-01-01T10:00:00Z",
  "startTime": "2024-01-01T09:00:00Z",
  "priority": "high",
  "tags": ["tag1"],
  "customReminders": ["P7D", "P1D", "PT3H"]
}
```

#### PUT /api/tasks/:taskId
อัปเดตงาน

#### POST /api/tasks/:taskId/complete
ปิดงาน

**Request Body:**
```json
{
  "userId": "uuid"
}
```

### Calendar

#### GET /api/calendar/:groupId
ดึงข้อมูลปฏิทิน

**Query Parameters:**
- `startDate`: วันที่เริ่มต้น (required)
- `endDate`: วันที่สิ้นสุด (required)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "ชื่องาน",
      "start": "2024-01-01T09:00:00Z",
      "end": "2024-01-01T10:00:00Z",
      "allDay": false,
      "assignees": [
        {
          "id": "uuid",
          "name": "ชื่อ"
        }
      ],
      "status": "pending",
      "priority": "medium",
      "tags": ["tag1"]
    }
  ]
}
```

### Files

#### GET /api/files/:groupId
ดึงรายการไฟล์

**Query Parameters:**
- `tags`: แท็กคั่นด้วย comma
- `mimeType`: ประเภทไฟล์
- `search`: คำค้นหา
- `page`, `limit`: pagination

#### GET /api/files/:fileId/download
ดาวน์โหลดไฟล์

#### GET /api/files/:fileId/preview
ดูตัวอย่างไฟล์ (รองรับ image, pdf, text)

#### POST /api/files/:fileId/tags
เพิ่มแท็กไฟล์

**Request Body:**
```json
{
  "tags": ["tag1", "tag2"]
}
```

### Groups & Users

#### GET /api/groups/:groupId/members
ดึงรายการสมาชิกกลุ่ม

#### GET /api/groups/:groupId/stats
ดึงสถิติกลุ่ม

**Response:**
```json
{
  "success": true,
  "data": {
    "members": {
      "totalMembers": 10,
      "verifiedMembers": 8,
      "adminCount": 2,
      "joinedThisMonth": 1
    },
    "weekly": {
      "totalTasks": 25,
      "completedTasks": 20,
      "pendingTasks": 3,
      "overdueTasks": 2,
      "avgCompletionTime": 2.5,
      "topPerformer": "ชื่อผู้ใช้"
    },
    "files": {
      "totalFiles": 50,
      "totalSize": 1048576,
      "fileTypes": {
        "image": 20,
        "document": 15,
        "video": 10
      },
      "recentFiles": 5
    }
  }
}
```

### KPI & Leaderboard

#### GET /api/leaderboard/:groupId
ดึง Leaderboard

**Query Parameters:**
- `period`: weekly, monthly, all (default: weekly)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "userId": "uuid",
      "displayName": "ชื่อผู้ใช้",
      "weeklyPoints": 10,
      "monthlyPoints": 45,
      "totalPoints": 200,
      "tasksCompleted": 15,
      "tasksEarly": 8,
      "tasksOnTime": 5,
      "tasksLate": 2,
      "tasksOvertime": 0,
      "rank": 1,
      "trend": "up"
    }
  ]
}
```

#### GET /api/users/:userId/stats
ดึงสถิติผู้ใช้

**Query Parameters:**
- `groupId`: UUID ของกลุ่ม (required)
- `period`: weekly, monthly, all (default: all)

#### GET /api/export/kpi/:groupId
ส่งออกข้อมูล KPI

**Query Parameters:**
- `startDate`: วันที่เริ่มต้น (required)
- `endDate`: วันที่สิ้นสุด (required)
- `format`: json, csv (default: json)

## Error Responses

```json
{
  "success": false,
  "error": "Error message",
  "details": ["Validation error details"]
}
```

**HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

- **API Calls**: 1000 requests per hour per user
- **File Upload**: 100 MB per day per group
- **Webhook**: 10,000 events per day per bot

## Webhooks

### LINE Webhook Endpoint

**URL:** `https://your-app.railway.app/webhook`

**Supported Events:**
- Message events (text, image, file, etc.)
- Postback events (จากปุ่มต่างๆ)
- Join/Leave events
- Member join/leave events

## LIFF Endpoints

### Setup LIFF
**URL:** `https://your-app.railway.app/dashboard/liff/setup?groupId=<GROUP_ID>`

### Profile LIFF  
**URL:** `https://your-app.railway.app/dashboard/liff/profile?userId=<USER_ID>`

## SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://your-app.railway.app/api',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// ดึงรายการงาน
const tasks = await api.get(`/tasks/${groupId}`, {
  params: {
    status: 'pending',
    page: 1,
    limit: 10
  }
});

// สร้างงานใหม่
const newTask = await api.post(`/tasks/${groupId}`, {
  title: 'งานใหม่',
  assigneeIds: ['user1-uuid'],
  createdBy: 'creator-uuid',
  dueTime: '2024-01-01T10:00:00Z'
});
```

### Python

```python
import requests

class LekaBot:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def get_tasks(self, group_id, **params):
        response = requests.get(
            f'{self.base_url}/tasks/{group_id}',
            headers=self.headers,
            params=params
        )
        return response.json()
    
    def create_task(self, group_id, task_data):
        response = requests.post(
            f'{self.base_url}/tasks/{group_id}',
            headers=self.headers,
            json=task_data
        )
        return response.json()

# การใช้งาน
bot = LekaBot('https://your-app.railway.app/api', 'your-jwt-token')
tasks = bot.get_tasks('group-uuid', status='pending')
```