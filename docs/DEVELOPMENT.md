# 🛠️ Development Guide - คู่มือนักพัฒนา

คู่มือสำหรับนักพัฒนาที่ต้องการทำงานกับเลขาบอท รวมถึงโครงสร้างโปรเจ็ก coding standards และวิธีการพัฒนา

## 🏗️ Project Architecture

### Overview
เลขาบอทใช้ **Layered Architecture** ที่แบ่งหน้าที่ความรับผิดชอบอย่างชัดเจน

```
┌─────────────────────────────────────┐
│           Presentation Layer        │
│    (Controllers + Middleware)       │
├─────────────────────────────────────┤
│            Business Layer           │
│             (Services)              │
├─────────────────────────────────────┤
│             Data Layer              │
│        (Models + Database)          │
└─────────────────────────────────────┘
```

### Technology Stack
- **Runtime:** Node.js 18+
- **Language:** TypeScript 5.0+
- **Framework:** Express.js
- **Database:** PostgreSQL + TypeORM
- **LINE SDK:** @line/bot-sdk
- **External APIs:** Google Calendar, Gmail
- **Build Tool:** TypeScript Compiler (tsc)
- **Process Manager:** PM2 (production)

## 📁 Project Structure

### Root Directory
```
leka_bot/
├── 📄 package.json              # Dependencies และ scripts
├── 📄 tsconfig.json             # TypeScript configuration
├── 📄 build.js                  # Build script
├── 📄 register-paths.js         # Path aliases resolver
├── 📄 railway.json              # Railway deployment config
├── 📄 Procfile                  # Process configuration
├── 📁 src/                      # Source code
├── 📁 dashboard/                # Frontend dashboard
├── 📁 docs/                     # Documentation
├── 📁 uploads/                  # File storage
└── 📁 dist/                     # Compiled JavaScript (generated)
```

### Source Code Structure (`src/`)
```
src/
├── 📄 index.ts                  # Application entry point
├── 📁 controllers/              # HTTP request handlers
│   ├── apiController.ts         # REST API endpoints
│   ├── dashboardController.ts   # Dashboard & LIFF pages
│   └── webhookController.ts     # LINE webhook handler
├── 📁 services/                 # Business logic layer
│   ├── CommandService.ts        # Bot command processing
│   ├── LineService.ts           # LINE Bot SDK wrapper
│   ├── TaskService.ts           # Task management
│   ├── UserService.ts           # User management
│   ├── FileService.ts           # File management
│   ├── NotificationService.ts   # Notifications (LINE + Email)
│   ├── EmailService.ts          # Email sending
│   ├── KPIService.ts            # KPI calculation
│   ├── GoogleService.ts         # Google OAuth
│   ├── GoogleCalendarService.ts # Calendar integration
│   ├── CronService.ts           # Scheduled jobs
│   └── index.ts                 # Service exports
├── 📁 models/                   # Database entities
│   └── index.ts                 # TypeORM models
├── 📁 middleware/               # Express middleware
│   ├── auth.ts                  # Authentication
│   ├── validation.ts            # Request validation
│   └── debugMiddleware.ts       # Debug logging
├── 📁 types/                    # TypeScript types
│   ├── index.ts                 # Common interfaces
│   └── adapters.ts              # Type adapters
├── 📁 utils/                    # Utility functions
│   ├── config.ts                # Configuration management
│   ├── database.ts              # Database connection
│   └── logger.ts                # Logging utilities
├── 📁 scripts/                  # Database & utility scripts
│   ├── initDatabase.ts          # Database initialization
│   ├── testDatabase.ts          # Database testing
│   └── updateAllMembersToAdmin.ts # Migration script
└── 📁 jobs/                     # Background jobs (empty)
```

## 🔧 Development Setup

### Prerequisites
```bash
# ติดตั้ง Node.js 18+
node --version

# ติดตั้ง PostgreSQL
psql --version

# ติดตั้ง Git
git --version
```

### Clone และ Setup
```bash
# Clone repository
git clone https://github.com/yourusername/leka-bot.git
cd leka-bot

# ติดตั้ง dependencies
npm install

# Setup environment variables
cp .env.example .env
# แก้ไข .env ตามต้องการ

# Initialize database
npm run db:init

# Start development server
npm run dev
```

### Development Scripts
```bash
# Development
npm run dev              # Start dev server with watch mode
npm run build            # Build TypeScript to JavaScript
npm run start            # Start production server

# Database
npm run db:init          # Initialize database tables
npm run db:sync          # Sync database (production)
npm run db:test          # Test database connection
npm run db:migrate-admin # Update members to admin

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm test                 # Run tests (if available)
```

## 🎯 Coding Standards

### TypeScript Guidelines

#### 1. Type Safety
```typescript
// ✅ Good - Explicit types
interface TaskCreateInput {
  title: string;
  dueTime: Date;
  assigneeIds: string[];
  priority?: 'low' | 'medium' | 'high';
}

// ❌ Bad - Any types
function createTask(data: any): any {
  // ...
}
```

#### 2. Naming Conventions
```typescript
// ✅ Good
class TaskService {
  private userService: UserService;
  
  public async createTask(input: TaskCreateInput): Promise<Task> {
    const assignedUsers = await this.resolveAssignees(input.assigneeIds);
    // ...
  }
}

// ❌ Bad
class taskservice {
  private us: any;
  
  public async create(i: any): Promise<any> {
    const au = await this.resolve(i.aids);
    // ...
  }
}
```

#### 3. Path Aliases
```typescript
// ✅ Good - Use path aliases
import { TaskService } from '@/services/TaskService';
import { Task } from '@/models';
import { config } from '@/utils/config';

// ❌ Bad - Relative paths
import { TaskService } from '../../../services/TaskService';
import { Task } from '../../models/index';
```

### Code Organization

#### 1. Service Layer Pattern
```typescript
// services/TaskService.ts
export class TaskService {
  private taskRepository: Repository<Task>;
  
  constructor() {
    this.taskRepository = AppDataSource.getRepository(Task);
  }
  
  public async createTask(input: TaskCreateInput): Promise<Task> {
    // Business logic here
    const task = this.taskRepository.create(input);
    return await this.taskRepository.save(task);
  }
}
```

#### 2. Controller Pattern
```typescript
// controllers/apiController.ts
class ApiController {
  private taskService: TaskService;
  
  constructor() {
    this.taskService = new TaskService();
  }
  
  public async createTask(req: Request, res: Response): Promise<void> {
    try {
      const task = await this.taskService.createTask(req.body);
      res.status(201).json({ success: true, data: task });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
```

#### 3. Error Handling
```typescript
// ✅ Good - Consistent error handling
try {
  const result = await this.someService.performAction();
  return result;
} catch (error) {
  console.error('❌ Error in performAction:', error);
  throw new Error(`Failed to perform action: ${error.message}`);
}

// ✅ Good - HTTP error responses
res.status(400).json({
  success: false,
  error: 'Validation failed',
  details: validationErrors
});
```

### Database Guidelines

#### 1. TypeORM Entity Design
```typescript
@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  title: string;
  
  @Column({
    type: 'enum',
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  })
  status: TaskStatus;
  
  @ManyToOne(() => User, user => user.createdTasks)
  @JoinColumn({ name: 'createdBy' })
  createdByUser: User;
}
```

#### 2. Repository Usage
```typescript
// ✅ Good - Use repository pattern
const taskRepository = AppDataSource.getRepository(Task);
const tasks = await taskRepository.find({
  where: { groupId },
  relations: ['assignedUsers', 'createdByUser']
});

// ❌ Bad - Direct SQL queries (ยกเว้นกรณีซับซ้อน)
const tasks = await AppDataSource.query('SELECT * FROM tasks WHERE group_id = $1', [groupId]);
```

## 🧪 Testing Guidelines

### Unit Testing
```typescript
// tests/services/TaskService.test.ts
import { TaskService } from '@/services/TaskService';

describe('TaskService', () => {
  let taskService: TaskService;
  
  beforeEach(() => {
    taskService = new TaskService();
  });
  
  describe('createTask', () => {
    it('should create task with valid input', async () => {
      const input = {
        title: 'Test Task',
        dueTime: new Date(),
        assigneeIds: ['user-id']
      };
      
      const result = await taskService.createTask(input);
      
      expect(result.id).toBeDefined();
      expect(result.title).toBe(input.title);
    });
  });
});
```

### Integration Testing
```typescript
// tests/controllers/apiController.test.ts
import request from 'supertest';
import { app } from '@/index';

describe('API Controller', () => {
  describe('POST /api/tasks', () => {
    it('should create new task', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test Task',
          dueTime: new Date().toISOString()
        })
        .expect(201);
        
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
    });
  });
});
```

## 🐛 Debugging

### Development Debugging

#### 1. Console Logging
```typescript
// ✅ Good - Structured logging
console.log('🔍 Processing command:', { 
  command: command.command, 
  args: command.args,
  userId: command.userId 
});

console.error('❌ Database error:', error);
console.log('✅ Task created:', task.id);
```

#### 2. Environment-based Logging
```typescript
if (config.nodeEnv === 'development') {
  console.log('🛠️ Debug info:', debugData);
}
```

### VS Code Debugging
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Leka Bot",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/index.ts",
      "runtimeArgs": ["-r", "tsx"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Database Debugging
```typescript
// Enable TypeORM logging
export const AppDataSource = new DataSource({
  type: 'postgres',
  logging: process.env.NODE_ENV === 'development',
  // ... other config
});
```

## 🔄 Development Workflow

### Git Workflow
```bash
# 1. Create feature branch
git checkout -b feature/add-calendar-sync

# 2. Make changes and commit
git add .
git commit -m "feat: add Google Calendar sync functionality"

# 3. Push และสร้าง Pull Request
git push origin feature/add-calendar-sync
```

### Commit Message Format
```bash
# Format: type(scope): description
feat(calendar): add Google Calendar sync
fix(auth): resolve JWT token validation
docs(api): update endpoint documentation
refactor(services): improve error handling
test(task): add unit tests for TaskService
```

### Branch Naming
- `feature/description` - ฟีเจอร์ใหม่
- `fix/description` - แก้ไข bug
- `refactor/description` - ปรับปรุง code
- `docs/description` - อัปเดตเอกสาร

## 📦 Adding New Features

### 1. Creating New Service
```typescript
// 1. Create service file
// src/services/NewService.ts
export class NewService {
  private repository: Repository<Entity>;
  
  constructor() {
    this.repository = AppDataSource.getRepository(Entity);
  }
  
  public async performAction(): Promise<Result> {
    // Implementation
  }
}

// 2. Export from index
// src/services/index.ts
export { NewService } from './NewService';

// 3. Use in controller
// src/controllers/apiController.ts
private newService: NewService;

constructor() {
  this.newService = new NewService();
}
```

### 2. Adding New API Endpoint
```typescript
// 1. Add controller method
public async newEndpoint(req: Request, res: Response): Promise<void> {
  try {
    const result = await this.newService.performAction();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error in newEndpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// 2. Add route
apiRouter.get('/new-endpoint', apiController.newEndpoint.bind(apiController));

// 3. Add validation (if needed)
apiRouter.get('/new-endpoint', 
  validateRequest(schemas.newEndpoint),
  apiController.newEndpoint.bind(apiController)
);
```

### 3. Adding New Database Entity
```typescript
// 1. Create entity
@Entity('new_table')
export class NewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  name: string;
  
  @CreateDateColumn()
  createdAt: Date;
}

// 2. Add to AppDataSource entities
entities: [Group, User, Task, File, KPIRecord, NewEntity]

// 3. Run database sync
npm run db:sync
```

## 🌐 Environment Management

### Environment Files
```bash
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/leka_bot_dev
LINE_CHANNEL_ACCESS_TOKEN=dev_token

# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://prod_host:5432/leka_bot
LINE_CHANNEL_ACCESS_TOKEN=prod_token
```

### Feature Flags
```typescript
// src/utils/config.ts
export const features = {
  googleCalendar: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  emailNotifications: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
  liff: !!process.env.LINE_LIFF_ID,
};

// Usage in services
if (features.googleCalendar) {
  await this.googleCalendarService.syncTask(task);
}
```

## ⚡ Performance Considerations

### Database Optimization
```typescript
// ✅ Good - Use relations and select specific fields
const tasks = await this.taskRepository.find({
  where: { groupId },
  relations: ['assignedUsers'],
  select: ['id', 'title', 'status', 'dueTime']
});

// ❌ Bad - N+1 query problem
for (const task of tasks) {
  const assignees = await this.userRepository.find({
    where: { id: In(task.assigneeIds) }
  });
}
```

### Caching Strategy
```typescript
// Simple in-memory cache
class CacheService {
  private cache = new Map<string, any>();
  
  get(key: string): any {
    return this.cache.get(key);
  }
  
  set(key: string, value: any, ttl: number = 300000): void {
    this.cache.set(key, value);
    setTimeout(() => this.cache.delete(key), ttl);
  }
}
```

### Async/Await Best Practices
```typescript
// ✅ Good - Parallel execution
const [tasks, users, files] = await Promise.all([
  this.taskService.getGroupTasks(groupId),
  this.userService.getGroupMembers(groupId),
  this.fileService.getGroupFiles(groupId)
]);

// ❌ Bad - Sequential execution
const tasks = await this.taskService.getGroupTasks(groupId);
const users = await this.userService.getGroupMembers(groupId);
const files = await this.fileService.getGroupFiles(groupId);
```

## 📚 Documentation

### Code Documentation
```typescript
/**
 * Creates a new task with specified assignees
 * 
 * @param input Task creation input data
 * @returns Promise<Task> The created task
 * @throws Error if assignees are not found
 * 
 * @example
 * ```typescript
 * const task = await taskService.createTask({
 *   title: 'Review PR',
 *   dueTime: new Date('2023-12-31'),
 *   assigneeIds: ['user-1', 'user-2']
 * });
 * ```
 */
public async createTask(input: TaskCreateInput): Promise<Task> {
  // Implementation
}
```

### API Documentation
```typescript
/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create new task
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskCreateInput'
 *     responses:
 *       201:
 *         description: Task created successfully
 */
```

## 🚀 Deployment

### Build Process
```bash
# 1. Install dependencies
npm ci --only=production

# 2. Build TypeScript
npm run build

# 3. Start production server
npm start
```

### Health Checks
```typescript
// src/index.ts
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    environment: config.nodeEnv
  });
});
```

## 🤝 Contributing

### Pull Request Process
1. **Fork repository** และ clone
2. **Create feature branch** จาก main
3. **Make changes** ตาม coding standards
4. **Add tests** สำหรับ new features
5. **Update documentation** ถ้าจำเป็น
6. **Submit pull request** พร้อม description

### Code Review Checklist
- [ ] Code follows TypeScript best practices
- [ ] All functions have proper error handling
- [ ] Database queries are optimized
- [ ] Tests pass (if available)
- [ ] Documentation updated
- [ ] No hardcoded values
- [ ] Environment variables used properly

## 📞 Getting Help

### Debug Resources
1. **Logs:** `npm run dev` สำหรับ development logs
2. **Database:** `npm run db:test` เพื่อทดสอบการเชื่อมต่อ
3. **Health Check:** `http://localhost:3000/health`

### Community Support
- **GitHub Issues:** [Report bugs](https://github.com/yourusername/leka-bot/issues)
- **Discussions:** [Ask questions](https://github.com/yourusername/leka-bot/discussions)
- **Email:** dev@example.com

---

**Happy Coding! 🎉**

**Last Updated:** January 2024  
**Project Version:** 1.0.0