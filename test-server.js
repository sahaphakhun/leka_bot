const express = require('express');
const path = require('path');

const app = express();
const port = 8080;

// Serve static files from dashboard directory
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

// Mock data endpoint for testing
app.get('/api/groups/:groupId/members', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        lineUserId: 'U1234567890abcdef',
        displayName: 'Alice Johnson',
        name: 'Alice',
        email: 'alice@example.com',
        role: 'admin'
      },
      {
        id: '2', 
        lineUserId: 'U2345678901bcdefg',
        displayName: 'Bob Smith',
        name: 'Bob',
        email: 'bob@example.com',
        role: 'member'
      },
      {
        id: '3',
        lineUserId: 'U3456789012cdefgh',
        displayName: 'Carol Williams',
        name: 'Carol',
        email: 'carol@example.com',
        role: 'member'
      }
    ]
  });
});

// Mock tasks endpoint
app.get('/api/groups/:groupId/tasks', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'task1',
        title: 'Design Website Homepage',
        description: 'Create a modern and responsive homepage design',
        status: 'in_progress',
        priority: 'high',
        dueTime: '2024-01-15T23:59:00.000Z',
        createdAt: '2024-01-01T10:00:00.000Z',
        createdBy: 'U1234567890abcdef',
        assigneeIds: ['U1234567890abcdef', 'U2345678901bcdefg'],
        assignedUsers: [
          {
            id: '1',
            lineUserId: 'U1234567890abcdef',
            displayName: 'Alice Johnson',
            name: 'Alice',
            email: 'alice@example.com'
          },
          {
            id: '2',
            lineUserId: 'U2345678901bcdefg', 
            displayName: 'Bob Smith',
            name: 'Bob',
            email: 'bob@example.com'
          }
        ],
        tags: ['design', 'web'],
        group: {
          name: 'Design Team'
        }
      },
      {
        id: 'task2',
        title: 'Database Optimization',
        description: 'Optimize database queries for better performance',
        status: 'pending',
        priority: 'medium',
        dueTime: '2024-01-20T23:59:00.000Z',
        createdAt: '2024-01-02T14:30:00.000Z',
        createdBy: 'U3456789012cdefgh',
        assigneeIds: ['U3456789012cdefgh'],
        assignedUsers: [
          {
            id: '3',
            lineUserId: 'U3456789012cdefgh',
            displayName: 'Carol Williams', 
            name: 'Carol',
            email: 'carol@example.com'
          }
        ],
        tags: ['database', 'performance'],
        group: {
          name: 'Development Team'
        }
      }
    ]
  });
});

// Mock individual task endpoint
app.get('/api/groups/:groupId/tasks/:taskId', (req, res) => {
  const taskId = req.params.taskId;
  const tasks = {
    'task1': {
      id: 'task1',
      title: 'Design Website Homepage',
      description: 'Create a modern and responsive homepage design',
      status: 'in_progress',
      priority: 'high',
      dueTime: '2024-01-15T23:59:00.000Z',
      createdAt: '2024-01-01T10:00:00.000Z',
      createdBy: 'U1234567890abcdef',
      assigneeIds: ['U1234567890abcdef', 'U2345678901bcdefg'],
      assignedUsers: [
        {
          id: '1',
          lineUserId: 'U1234567890abcdef',
          displayName: 'Alice Johnson',
          name: 'Alice',
          email: 'alice@example.com'
        },
        {
          id: '2',
          lineUserId: 'U2345678901bcdefg',
          displayName: 'Bob Smith',
          name: 'Bob', 
          email: 'bob@example.com'
        }
      ],
      tags: ['design', 'web'],
      group: {
        name: 'Design Team'
      }
    }
  };
  
  if (tasks[taskId]) {
    res.json({
      success: true,
      data: tasks[taskId]
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }
});

// Serve the main dashboard page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'index.html'));
});

app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
  console.log(`Dashboard available at http://localhost:${port}/dashboard/index.html`);
});