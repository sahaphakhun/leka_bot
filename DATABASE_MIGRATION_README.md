# 🗄️ Database Migration Guide - Fix Missing Columns

## 🚨 Issue Description

The dashboard is experiencing a **500 Internal Server Error** with the message:
```
column task.submittedAt does not exist
```

This error occurs because the database schema is out of sync with the TypeORM entity models. The `submittedAt` column and other workflow-related columns exist in the code but are missing from the actual database table.

## 🔍 Root Cause

1. **Schema Mismatch**: The `tasks` table is missing several columns that are defined in the TypeORM entity
2. **Missing Columns**:
   - `submittedAt` - เวลาส่งงาน
   - `reviewedAt` - เวลาตรวจสอบ  
   - `approvedAt` - เวลาอนุมัติ
   - `requireAttachment` - บังคับให้ต้องมีไฟล์แนบ
   - `workflow` - ข้อมูลเวิร์กโฟลว์ (JSONB)

3. **TypeORM Query Failure**: When TypeORM tries to query these missing columns, PostgreSQL throws an error

## 🛠️ Solution Steps

### Step 1: Check Current Database Schema

First, let's examine what columns currently exist in the database:

```bash
npm run db:check-schema
```

This will show you:
- All existing tables
- Current columns in the `tasks` table
- Missing columns that need to be added
- Foreign key relationships

### Step 2: Run the Migration

Add the missing columns to the database:

```bash
npm run db:migrate-add-columns
```

This migration will:
- Add all missing columns with proper data types
- Set appropriate default values
- Add column comments for documentation
- Initialize workflow data for existing tasks
- Use transactions for safety (rollback on failure)

### Step 3: Verify the Migration

Check that all columns were added successfully:

```bash
npm run db:check-schema
```

You should see all expected columns listed without any missing columns warnings.

## 📋 Migration Details

### Columns Being Added

| Column Name | Type | Nullable | Default | Description |
|-------------|------|----------|---------|-------------|
| `submittedAt` | TIMESTAMP | YES | NULL | เวลาส่งงาน |
| `reviewedAt` | TIMESTAMP | YES | NULL | เวลาตรวจสอบ |
| `approvedAt` | TIMESTAMP | YES | NULL | เวลาอนุมัติ |
| `requireAttachment` | BOOLEAN | NO | false | บังคับให้ต้องมีไฟล์แนบ |
| `workflow` | JSONB | NO | {} | ข้อมูลเวิร์กโฟลว์ |

### Workflow Data Initialization

For existing tasks, the migration will create initial workflow data:

```json
{
  "review": {
    "reviewerUserId": "creator_id",
    "status": "not_requested"
  },
  "approval": {
    "creatorUserId": "creator_id", 
    "status": "not_requested"
  },
  "history": [
    {
      "action": "create",
      "byUserId": "creator_id",
      "at": "created_at",
      "note": "งานถูกสร้าง"
    }
  ]
}
```

## 🧪 Testing the Fix

### 1. Test Dashboard Loading

After migration, the dashboard should load without errors:
- No more 500 errors for task API calls
- Tasks should load properly
- No console errors about missing columns

### 2. Test Task Creation

Try creating a new task:
- Should work without database errors
- New tasks will have proper workflow structure

### 3. Test API Endpoints

Verify these endpoints work:
```bash
# Get tasks
GET /api/groups/{groupId}/tasks

# Create task  
POST /api/groups/{groupId}/tasks

# Get task stats
GET /api/groups/{groupId}/stats
```

## 🔧 Alternative Solutions

### Option 1: Database Synchronization (Development Only)

If you're in development mode, you can force TypeORM to sync the schema:

```typescript
// In database.ts
synchronize: true, // ⚠️ DANGEROUS in production
```

**⚠️ Warning**: This will drop and recreate tables, losing all data!

### Option 2: Manual SQL

If the migration script fails, you can run SQL manually:

```sql
-- Add missing columns
ALTER TABLE tasks ADD COLUMN "submittedAt" TIMESTAMP;
ALTER TABLE tasks ADD COLUMN "reviewedAt" TIMESTAMP;  
ALTER TABLE tasks ADD COLUMN "approvedAt" TIMESTAMP;
ALTER TABLE tasks ADD COLUMN "requireAttachment" BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN "workflow" JSONB DEFAULT '{}';

-- Add comments
COMMENT ON COLUMN tasks."submittedAt" IS 'เวลาส่งงาน';
COMMENT ON COLUMN tasks."reviewedAt" IS 'เวลาตรวจสอบ';
COMMENT ON COLUMN tasks."approvedAt" IS 'เวลาอนุมัติ';
COMMENT ON COLUMN tasks."requireAttachment" IS 'บังคับให้ต้องมีไฟล์แนบเมื่อส่งงาน';
COMMENT ON COLUMN tasks."workflow" IS 'ข้อมูลเวิร์กโฟลว์การส่งงาน/ตรวจงาน/อนุมัติ';
```

## 🚨 Troubleshooting

### Migration Fails

If the migration script fails:

1. **Check Database Connection**: Ensure the database is accessible
2. **Check Permissions**: The database user needs ALTER TABLE permissions
3. **Check Logs**: Look for specific error messages in the migration output
4. **Manual Rollback**: If needed, manually drop added columns

### Still Getting Errors

If you still get column errors after migration:

1. **Restart the Application**: Sometimes TypeORM needs a restart to recognize new columns
2. **Check Column Names**: Ensure column names match exactly (case-sensitive)
3. **Verify Migration**: Run `npm run db:check-schema` again
4. **Check Entity Models**: Ensure entity models match the database schema

### Data Loss Prevention

The migration script:
- ✅ Uses transactions (rollback on failure)
- ✅ Only adds missing columns
- ✅ Preserves existing data
- ✅ Sets safe default values

## 📊 Expected Results

### Before Migration:
- ❌ 500 Server Error: `column task.submittedAt does not exist`
- ❌ Dashboard fails to load tasks
- ❌ Task creation fails
- ❌ API endpoints return errors

### After Migration:
- ✅ Dashboard loads successfully
- ✅ Tasks load without errors
- ✅ Task creation works properly
- ✅ All API endpoints function normally
- ✅ Proper workflow support for tasks

## 🔄 Rollback Plan

If you need to rollback the migration:

```sql
-- Remove added columns (⚠️ This will lose data in those columns)
ALTER TABLE tasks DROP COLUMN "submittedAt";
ALTER TABLE tasks DROP COLUMN "reviewedAt";
ALTER TABLE tasks DROP COLUMN "approvedAt";
ALTER TABLE tasks DROP COLUMN "requireAttachment";
ALTER TABLE tasks DROP COLUMN "workflow";
```

## 📝 Notes

- **Safe Migration**: The script only adds missing columns, doesn't modify existing data
- **Transaction Safety**: Uses database transactions for rollback capability
- **Data Preservation**: All existing task data is preserved
- **Backward Compatibility**: No breaking changes to existing functionality

---

**Status**: ✅ Ready for Migration  
**Risk Level**: 🟢 Low (Additive changes only)  
**Estimated Time**: 2-5 minutes  
**Data Impact**: None (existing data preserved)
