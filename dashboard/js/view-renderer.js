/**
 * View Renderer for Dashboard
 * ===========================
 */

// ==================== 
// Dashboard View Renderer
// ==================== 

/**
 * Render dashboard stats
 */
function renderDashboardStats(stats) {
  const statsGrid = document.getElementById('statsGrid');
  if (!statsGrid) return;

  // รองรับทั้งรูปแบบเดิม (ค่าตัวเลขตรง) และรูปแบบ { stats, members, files }
  const s = (stats && stats.stats) ? stats.stats : stats || {};
  const members = stats && stats.members ? stats.members : null;
  const files = stats && stats.files ? stats.files : null;

  const statsHtml = `
    <div class="stat-card">
      <div class="stat-icon">
        <i class="fas fa-tasks"></i>
      </div>
      <div class="stat-content">
        <div class="stat-value">${s.totalTasks || 0}</div>
        <div class="stat-label">งานทั้งหมด</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">
        <i class="fas fa-check-circle"></i>
      </div>
      <div class="stat-content">
        <div class="stat-value">${s.completedTasks || 0}</div>
        <div class="stat-label">งานเสร็จแล้ว</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">
        <i class="fas fa-clock"></i>
      </div>
      <div class="stat-content">
        <div class="stat-value">${s.pendingTasks || 0}</div>
        <div class="stat-label">งานรอดำเนินการ</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <div class="stat-content">
        <div class="stat-value">${s.overdueTasks || 0}</div>
        <div class="stat-label">งานเกินกำหนด</div>
      </div>
    </div>
    ${members ? `
    <div class="stat-card">
      <div class="stat-icon"><i class="fas fa-users"></i></div>
      <div class="stat-content">
        <div class="stat-value">${members.totalMembers || 0}</div>
        <div class="stat-label">สมาชิกทั้งหมด</div>
      </div>
    </div>` : ''}
    ${files ? `
    <div class="stat-card">
      <div class="stat-icon"><i class="fas fa-folder"></i></div>
      <div class="stat-content">
        <div class="stat-value">${files.totalFiles || 0}</div>
        <div class="stat-label">ไฟล์ทั้งหมด</div>
      </div>
    </div>` : ''}
  `;

  statsGrid.innerHTML = statsHtml;
}

/**
 * Render upcoming tasks
 */
function renderUpcomingTasks(tasks) {
  const upcomingTasksContainer = document.getElementById('upcomingTasks');
  if (!upcomingTasksContainer) return;

  if (!tasks || tasks.length === 0) {
    upcomingTasksContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-check"></i>
        <p>ไม่มีงานที่กำลังจะถึงกำหนด</p>
      </div>
    `;
    return;
  }

  const tasksHtml = tasks.map(task => {
    const due = task.dueTime || task.dueDate || task.end || task.start;
    const assigneeName = task.assigneeName || (task.assignedUsers && task.assignedUsers[0] ? task.assignedUsers[0].displayName : 'ไม่ระบุ');
    return `
    <div class="task-item" data-task-id="${task.id}">
      <div class="task-info">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-meta">
          <span class="task-due-date">
            <i class="fas fa-calendar"></i>
            ${formatDate(due)}
          </span>
          <span class="task-assignee">
            <i class="fas fa-user"></i>
            ${escapeHtml(assigneeName)}
          </span>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn btn-sm btn-outline" onclick="window.dashboardInstance.openTaskModal('${task.id}')">
          <i class="fas fa-eye"></i>
        </button>
      </div>
    </div>
  `}).join('');

  upcomingTasksContainer.innerHTML = tasksHtml;
}

/**
 * Render mini leaderboard
 */
function renderMiniLeaderboard(leaderboard) {
  const leaderboardContainer = document.getElementById('miniLeaderboard');
  if (!leaderboardContainer) return;

  if (!leaderboard || leaderboard.length === 0) {
    leaderboardContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-trophy"></i>
        <p>ยังไม่มีข้อมูลอันดับ</p>
      </div>
    `;
    return;
  }

  const leaderboardHtml = leaderboard.slice(0, 5).map((member, index) => `
    <div class="leaderboard-item">
      <div class="rank">${index + 1}</div>
      <div class="member-info">
        <div class="member-name">${escapeHtml(member.displayName)}</div>
        <div class="member-score">${member.score || 0} คะแนน</div>
      </div>
    </div>
  `).join('');

  leaderboardContainer.innerHTML = leaderboardHtml;
}

// ==================== 
// Calendar View Renderer
// ==================== 

/**
 * Render calendar
 */
function renderCalendar(events, currentDate = new Date()) {
  const calendarContainer = document.getElementById('calendarContainer') || document.getElementById('calendarGrid');
  if (!calendarContainer) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  let calendarHtml = `
    <div class="calendar-header">
      <button class="btn btn-icon" id="prevMonthBtn">
        <i class="fas fa-chevron-left"></i>
      </button>
      <h3>${new Date(year, month).toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })}</h3>
      <button class="btn btn-icon" id="nextMonthBtn">
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
    <div class="calendar-grid">
      <div class="calendar-weekdays">
        <div class="weekday">อา</div>
        <div class="weekday">จ</div>
        <div class="weekday">อ</div>
        <div class="weekday">พ</div>
        <div class="weekday">พฤ</div>
        <div class="weekday">ศ</div>
        <div class="weekday">ส</div>
      </div>
      <div class="calendar-days">
  `;

  const today = new Date();
  const currentDateStr = today.toDateString();

  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    const isCurrentMonth = date.getMonth() === month;
    const isToday = date.toDateString() === currentDateStr;
    const dateStr = date.toISOString().split('T')[0];
    
    const dayEvents = events.filter(event => {
      const when = event.start || event.dueTime || event.dueDate;
      const eventDate = new Date(when);
      return eventDate.toDateString() === date.toDateString();
    });

    calendarHtml += `
      <div class="calendar-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${isToday ? 'today' : ''}" data-date="${dateStr}">
        <div class="day-number">${date.getDate()}</div>
        ${dayEvents.map(event => `
          <div class="calendar-event" data-task-id="${event.id}" title="${escapeHtml(event.title)}">
            ${escapeHtml(event.title)}
          </div>
        `).join('')}
      </div>
    `;
  }

  calendarHtml += `
      </div>
    </div>
  `;

  calendarContainer.innerHTML = calendarHtml;
}

// ==================== 
// Tasks View Renderer
// ==================== 

/**
 * Render tasks list
 */
function renderTasksList(tasks, filters = {}) {
  const tasksList = document.getElementById('tasksList');
  if (!tasksList) return;

  if (!tasks || tasks.length === 0) {
    tasksList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-tasks"></i>
        <p>ไม่มีงานที่ตรงกับเงื่อนไข</p>
      </div>
    `;
    return;
  }

  const tasksHtml = tasks.map(task => {
    const statusClass = getTaskStatusClass(task.status);
    const priorityClass = getTaskPriorityClass(task.priority);
    const due = task.dueTime || task.dueDate || task.end || task.start;
    const assigneeName = task.assigneeName || (task.assignedUsers && task.assignedUsers[0] ? task.assignedUsers[0].displayName : 'ไม่ระบุ');
    
    return `
      <div class="task-card ${statusClass}" data-task-id="${task.id}">
        <div class="task-header">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-priority ${priorityClass}">
            <i class="fas fa-flag"></i>
            ${getTaskPriorityText(task.priority)}
          </div>
        </div>
        <div class="task-description">${escapeHtml(task.description || '')}</div>
        <div class="task-meta">
          <div class="task-assignee">
            <i class="fas fa-user"></i>
            ${escapeHtml(assigneeName)}
          </div>
          <div class="task-due-date">
            <i class="fas fa-calendar"></i>
            ${formatDate(due)}
          </div>
          <div class="task-status">
            <i class="fas fa-circle"></i>
            ${getTaskStatusText(task.status)}
          </div>
        </div>
        <div class="task-actions">
          <button class="btn btn-sm btn-outline" onclick="window.dashboardInstance.openTaskModal('${task.id}')">
            <i class="fas fa-eye"></i>
            ดู
          </button>
          ${task.status === 'pending' ? `
            <button class="btn btn-sm btn-primary" onclick="window.dashboardInstance.openEditTaskModal('${task.id}')">
              <i class="fas fa-edit"></i>
              แก้ไข
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  tasksList.innerHTML = tasksHtml;
}

// ==================== 
// Files View Renderer
// ==================== 

/**
 * Render files grid
 */
function renderFilesGrid(files) {
  const filesGrid = document.getElementById('filesGrid');
  if (!filesGrid) return;

  if (!files || files.length === 0) {
    filesGrid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-folder"></i>
        <p>ไม่มีไฟล์ในระบบ</p>
      </div>
    `;
    return;
  }

  const filesHtml = files.map(file => {
    const fileIcon = getFileIcon(file.mimeType);
    const fileColor = getFileColor(file.mimeType);
    const uploaderName = (file.uploadedByUser && file.uploadedByUser.displayName) || file.uploaderName || 'ไม่ระบุ';
    
    return `
      <div class="file-card" data-file-id="${file.id}">
        <div class="file-icon" style="color: ${fileColor}">
          <i class="${fileIcon}"></i>
        </div>
        <div class="file-info">
          <div class="file-name">${escapeHtml(file.originalName)}</div>
          <div class="file-meta">
            <span class="file-size">${formatFileSize(file.size)}</span>
            <span class="file-uploader">${escapeHtml(uploaderName)}</span>
          </div>
          <div class="file-date">${formatDate(file.uploadedAt)}</div>
        </div>
        <div class="file-actions">
          <button class="btn btn-sm btn-outline" onclick="window.dashboardInstance.downloadFile('${file.id}')">
            <i class="fas fa-download"></i>
          </button>
          <button class="btn btn-sm btn-outline" onclick="window.dashboardInstance.viewFile('${file.id}')">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-outline" title="เพิ่มแท็ก" onclick="window.dashboardInstance.addTagsToFile('${file.id}')">
            <i class="fas fa-tags"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  filesGrid.innerHTML = filesHtml;
}

// ==================== 
// Leaderboard View Renderer
// ==================== 

/**
 * Render leaderboard
 */
function renderLeaderboard(leaderboard) {
  const leaderboardList = document.getElementById('leaderboardList');
  if (!leaderboardList) return;

  if (!leaderboard || leaderboard.length === 0) {
    leaderboardList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-trophy"></i>
        <p>ยังไม่มีข้อมูลอันดับ</p>
      </div>
    `;
    return;
  }

  const leaderboardHtml = leaderboard.map((member, index) => {
    const rankClass = index < 3 ? `rank-${index + 1}` : '';
    
    return `
      <div class="leaderboard-item ${rankClass}">
        <div class="rank">${index + 1}</div>
        <div class="member-avatar">
          <i class="fas fa-user"></i>
        </div>
        <div class="member-info">
          <div class="member-name">${escapeHtml(member.displayName)}</div>
          <div class="member-role">${escapeHtml(member.role || 'สมาชิก')}</div>
        </div>
        <div class="member-stats">
          <div class="stat">
            <span class="stat-label">งานเสร็จ</span>
            <span class="stat-value">${member.completedTasks || 0}</span>
          </div>
          <div class="stat">
            <span class="stat-label">คะแนน</span>
            <span class="stat-value">${member.score || 0}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  leaderboardList.innerHTML = leaderboardHtml;
}

// ==================== 
// Reports View Renderer
// ==================== 

/**
 * Render reports
 */
function renderReports(reports) {
  const reportsContent = document.getElementById('reportsContent');
  if (!reportsContent) return;

  if (!reports || reports.length === 0) {
    reportsContent.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-chart-bar"></i>
        <p>ยังไม่มีรายงาน</p>
      </div>
    `;
    return;
  }

  const reportsHtml = reports.map(report => `
    <div class="report-card">
      <div class="report-header">
        <h3>${escapeHtml(report.title)}</h3>
        <div class="report-date">${formatDate(report.generatedAt)}</div>
      </div>
      <div class="report-content">
        <div class="report-summary">
          <div class="summary-item">
            <span class="label">งานทั้งหมด:</span>
            <span class="value">${report.totalTasks}</span>
          </div>
          <div class="summary-item">
            <span class="label">งานเสร็จ:</span>
            <span class="value">${report.completedTasks}</span>
          </div>
          <div class="summary-item">
            <span class="label">อัตราการเสร็จ:</span>
            <span class="value">${report.completionRate}%</span>
          </div>
        </div>
      </div>
      <div class="report-actions">
        <button class="btn btn-sm btn-primary" onclick="window.dashboardInstance.downloadReport('${report.id}')">
          <i class="fas fa-download"></i>
          ดาวน์โหลด
        </button>
      </div>
    </div>
  `).join('');

  reportsContent.innerHTML = reportsHtml;
}

// ====================
// Recurring View Renderer
// ====================

function renderRecurringList(items) {
  const container = document.getElementById('recurringList');
  if (!container) return;
  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-rotate"></i>
        <p>ยังไม่มีงานประจำ</p>
      </div>`;
    return;
  }
  const html = items.map(it => `
    <div class="task-card">
      <div class="task-header">
        <div class="task-title">${escapeHtml(it.title || 'งานประจำ')}</div>
        <div class="task-priority ${getTaskPriorityClass(it.priority || 'medium')}">
          <i class="fas fa-flag"></i>
          ${getTaskPriorityText(it.priority || 'medium')}
        </div>
      </div>
      <div class="task-meta">
        <div><i class="fas fa-rotate"></i> ${escapeHtml(it.recurrence)}</div>
        <div><i class="fas fa-clock"></i> ${escapeHtml(it.timeOfDay || '09:00')}</div>
      </div>
      <div class="task-actions">
        <button class="btn btn-sm btn-outline" onclick="window.dashboardInstance.deleteRecurring('${it.id}')">
          <i class="fas fa-trash"></i>
          ลบ
        </button>
      </div>
    </div>
  `).join('');
  container.innerHTML = html;
}

// ==================== 
// Utility Functions
// ==================== 

/**
 * Get task status class
 */
function getTaskStatusClass(status) {
  switch (status) {
    case 'completed': return 'status-completed';
    case 'in_progress': return 'status-in-progress';
    case 'overdue': return 'status-overdue';
    default: return 'status-pending';
  }
}

/**
 * Get task status text
 */
function getTaskStatusText(status) {
  switch (status) {
    case 'completed': return 'เสร็จแล้ว';
    case 'in_progress': return 'กำลังดำเนินการ';
    case 'overdue': return 'เกินกำหนด';
    default: return 'รอดำเนินการ';
  }
}

/**
 * Get task priority class
 */
function getTaskPriorityClass(priority) {
  switch (priority) {
    case 'high': return 'priority-high';
    case 'medium': return 'priority-medium';
    default: return 'priority-low';
  }
}

/**
 * Get task priority text
 */
function getTaskPriorityText(priority) {
  switch (priority) {
    case 'high': return 'สูง';
    case 'medium': return 'ปานกลาง';
    default: return 'ต่ำ';
  }
}

// ==================== 
// Export
// ==================== 

// Export สำหรับใช้ในไฟล์อื่น
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
      renderDashboardStats,
      renderUpcomingTasks,
      renderMiniLeaderboard,
      renderCalendar,
      renderTasksList,
      renderFilesGrid,
      renderLeaderboard,
      renderReports,
      renderRecurringList,
      getTaskStatusClass,
      getTaskStatusText,
      getTaskPriorityClass,
      getTaskPriorityText
    };
  } else {
    // Browser environment - เพิ่มเข้าไปใน global scope
    window.DashboardViewRenderer = {
      renderDashboardStats,
      renderUpcomingTasks,
      renderMiniLeaderboard,
      renderCalendar,
      renderTasksList,
      renderFilesGrid,
      renderLeaderboard,
      renderReports,
      renderRecurringList,
      getTaskStatusClass,
      getTaskStatusText,
      getTaskPriorityClass,
      getTaskPriorityText
    };
  }
