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
    const priority = task.priority || 'normal';
    const status = task.status || 'pending';
    
    // สร้าง priority badge
    const priorityBadge = priority === 'high' ? '<span class="priority-badge high">สูง</span>' : 
                         priority === 'medium' ? '<span class="priority-badge medium">ปานกลาง</span>' : 
                         '<span class="priority-badge low">ต่ำ</span>';
    
    // สร้าง status badge
    const statusBadge = status === 'completed' ? '<span class="status-badge completed">เสร็จแล้ว</span>' :
                       status === 'in_progress' ? '<span class="status-badge in-progress">กำลังดำเนินการ</span>' :
                       '<span class="status-badge pending">รอดำเนินการ</span>';
    
    return `
    <div class="task-item clickable" data-task-id="${task.id}" onclick="showTaskDetails('${task.id}')">
      <div class="task-info">
        <div class="task-header">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-priority-text">${getTaskPriorityText(priority)}</div>
        </div>
        <div class="task-meta-compact">
          <div class="task-meta-row">
            <span class="task-assignee">
              <i class="fas fa-user"></i>
              ${escapeHtml(assigneeName)}
            </span>
            <span class="task-due-date">
              <i class="fas fa-calendar"></i>
              ${formatDate(due)}
            </span>
            <span class="task-status">
              <i class="fas fa-circle"></i>
              ${getTaskStatusText(status)}
            </span>
          </div>
          ${task.description ? `
            <div class="task-description">${escapeHtml(task.description.substring(0, 80))}${task.description.length > 80 ? '...' : ''}</div>
          ` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); showTaskDetails('${task.id}')">
          <i class="fas fa-eye"></i>
          <span>ดูรายละเอียด</span>
        </button>
        ${status === 'pending' ? `
          <button class="btn btn-sm btn-warning" onclick="event.stopPropagation(); window.dashboardInstance.submitTask('${task.id}')">
            <i class="fas fa-paper-plane"></i>
            <span>ส่งงาน</span>
          </button>
        ` : ''}
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

  const leaderboardHtml = leaderboard.slice(0, 5).map((member, index) => {
    // ดึงข้อมูลคะแนนตามที่ใช้จริงในระบบ
    const score = Number(member.weeklyPoints || member.monthlyPoints || member.totalPoints || member.score || 0);
    const tasks = Number(member.tasksCompleted || member.weeklyTasksCompleted || member.completedTasks || 0);
    
    // กำหนดอันดับ
    let rankIcon, rankClass;
    if (index === 0) {
      rankIcon = '🥇';
      rankClass = 'gold';
    } else if (index === 1) {
      rankIcon = '🥈';
      rankClass = 'silver';
    } else if (index === 2) {
      rankIcon = '🥉';
      rankClass = 'bronze';
    } else {
      rankIcon = String(index + 1);
      rankClass = '';
    }
    
    return `
      <div class="leaderboard-item mini">
        <div class="rank ${rankClass}">${rankIcon}</div>
        <div class="member-info">
          <div class="member-name">${escapeHtml(member.displayName || member.name || member.realName || 'ไม่ทราบชื่อ')}</div>
          <div class="member-score">${score.toFixed(1)} คะแนน</div>
        </div>
        <div class="user-stats">
          <div class="user-score">${tasks} งาน</div>
        </div>
      </div>
    `;
  }).join('');

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
    <div class="calendar-container">
      <div class="calendar-header">
        <button class="btn btn-icon" id="prevMonthBtn" onclick="window.dashboardInstance.navigateCalendar(-1)">
          <i class="fas fa-chevron-left"></i>
        </button>
        <h3>${new Date(year, month).toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })}</h3>
        <button class="btn btn-icon" id="nextMonthBtn" onclick="window.dashboardInstance.navigateCalendar(1)">
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
      <div class="calendar-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${isToday ? 'today' : ''}" 
           data-date="${dateStr}" 
           data-year="${date.getFullYear()}" 
           data-month="${date.getMonth() + 1}" 
           data-day="${date.getDate()}">
        <div class="day-number">${date.getDate()}</div>
        <div class="calendar-events">
          ${dayEvents.slice(0, 3).map(event => `
            <div class="calendar-event ${event.priority || 'medium'}" 
                 data-task-id="${event.id}" 
                 title="${escapeHtml(event.title)}"
                 onclick="showTaskDetails('${event.id}')">
              ${escapeHtml(event.title)}
            </div>
          `).join('')}
          ${dayEvents.length > 3 ? `
            <div class="calendar-event-more" 
                 onclick="showDayEvents('${dateStr}', ${JSON.stringify(dayEvents).replace(/"/g, '&quot;')})">
              +${dayEvents.length - 3} อีก
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  calendarHtml += `
        </div>
      </div>
      <div class="calendar-navigation">
        <button class="btn btn-secondary" onclick="window.dashboardInstance.navigateCalendar(-1)">
          <i class="fas fa-chevron-left"></i>
          เดือนก่อน
        </button>
        <button class="btn btn-primary" onclick="window.dashboardInstance.goToToday()">
          <i class="fas fa-calendar-day"></i>
          วันนี้
        </button>
        <button class="btn btn-secondary" onclick="window.dashboardInstance.navigateCalendar(1)">
          เดือนถัดไป
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  `;

  calendarContainer.innerHTML = calendarHtml;
  
  // เพิ่ม event listeners สำหรับการคลิกวัน
  const calendarDays = calendarContainer.querySelectorAll('.calendar-day');
  calendarDays.forEach(day => {
    day.addEventListener('click', (e) => {
      if (!e.target.closest('.calendar-event') && !e.target.closest('.calendar-event-more')) {
        const year = parseInt(day.dataset.year);
        const month = parseInt(day.dataset.month);
        const dayNum = parseInt(day.dataset.day);
        if (window.dashboardInstance && window.dashboardInstance.selectCalendarDate) {
          window.dashboardInstance.selectCalendarDate(new Date(year, month - 1, dayNum));
        }
      }
    });
  });
}

/**
 * แสดงรายการงานทั้งหมดในวันนั้น
 */
function showDayEvents(dateStr, events) {
  if (!events || events.length === 0) {
    alert('ไม่มีงานในวันนี้');
    return;
  }

  const eventsList = events.map(event => `
    <div class="day-event-item">
      <div class="event-priority ${event.priority || 'medium'}"></div>
      <div class="event-content">
        <div class="event-title">${escapeHtml(event.title)}</div>
        <div class="event-time">${event.start || event.dueTime || 'ไม่มีเวลากำหนด'}</div>
      </div>
      <button class="btn btn-sm btn-primary" onclick="showTaskDetails('${event.id}')">
        <i class="fas fa-eye"></i>
      </button>
    </div>
  `).join('');

  const modalHtml = `
    <div id="dayEventsModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>งานในวันที่ ${new Date(dateStr).toLocaleDateString('th-TH')}</h3>
          <button class="modal-close" onclick="closeDayEventsModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="day-events-list">
            ${eventsList}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeDayEventsModal()">
            <i class="fas fa-times"></i>
            ปิด
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * ปิด modal รายการงานรายวัน
 */
function closeDayEventsModal() {
  const modal = document.getElementById('dayEventsModal');
  if (modal) {
    modal.remove();
  }
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
        <button class="btn btn-primary" onclick="window.dashboardInstance.openAddTaskModal()">
          <i class="fas fa-plus"></i>
          เพิ่มงานใหม่
        </button>
      </div>
    `;
    return;
  }

  const tasksHtml = tasks.map(task => {
    const statusClass = getTaskStatusClass(task.status);
    const priorityClass = getTaskPriorityClass(task.priority);
    const due = task.dueTime || task.dueDate || task.end || task.start;
    const assigneeName = task.assigneeName || (task.assignedUsers && task.assignedUsers[0] ? task.assignedUsers[0].displayName : 'ไม่ระบุ');
    const isOverdue = due && new Date(due) < new Date() && task.status !== 'completed';
    
    return `
      <div class="task-card ${statusClass} ${isOverdue ? 'status-overdue' : ''}" data-task-id="${task.id}">
        <div class="task-header">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-priority-text">${getTaskPriorityText(task.priority)}</div>
        </div>
        ${task.description ? `
          <div class="task-description">${escapeHtml(task.description)}</div>
        ` : ''}
        <div class="task-meta-compact">
          <div class="task-meta-row">
            <span class="task-assignee">
              <i class="fas fa-user"></i>
              ${escapeHtml(assigneeName)}
            </span>
            <span class="task-due-date ${isOverdue ? 'overdue' : ''}">
              <i class="fas fa-calendar"></i>
              ${formatDate(due)}
              ${isOverdue ? ' <i class="fas fa-exclamation-triangle" style="color: var(--color-danger);"></i>' : ''}
            </span>
            <span class="task-status">
              <i class="fas fa-circle"></i>
              ${getTaskStatusText(task.status)}
            </span>
          </div>
          ${(task.projectName || (task.tags && task.tags.length > 0) || task.attachments?.length > 0 || task.comments?.length > 0) ? `
            <div class="task-meta-row">
              ${task.projectName ? `
                <span class="task-project">
                  <i class="fas fa-folder"></i>
                  ${escapeHtml(task.projectName)}
                </span>
              ` : ''}
              ${task.tags && task.tags.length > 0 ? `
                <span class="task-tags">
                  ${task.tags.slice(0, 2).map(tag => `
                    <span class="task-tag">${escapeHtml(tag)}</span>
                  `).join('')}
                  ${task.tags.length > 2 ? `<span class="task-tag-more">+${task.tags.length - 2}</span>` : ''}
                </span>
              ` : ''}
              ${task.attachments && task.attachments.length > 0 ? `
                <span class="task-attachments">
                  <i class="fas fa-paperclip"></i>
                  ${task.attachments.length}
                </span>
              ` : ''}
              ${task.comments && task.comments.length > 0 ? `
                <span class="task-comments">
                  <i class="fas fa-comment"></i>
                  ${task.comments.length}
                </span>
              ` : ''}
            </div>
          ` : ''}
        </div>
        <div class="task-actions">
          <button class="btn btn-sm btn-outline" onclick="window.dashboardInstance.openTaskModal('${task.id}')" title="ดูรายละเอียด">
            <i class="fas fa-eye"></i>
            <span class="btn-text">ดู</span>
          </button>
          ${task.status === 'pending' ? `
            <button class="btn btn-sm btn-primary" onclick="window.dashboardInstance.openEditTaskModal('${task.id}')" title="แก้ไขงาน">
              <i class="fas fa-edit"></i>
              <span class="btn-text">แก้ไข</span>
            </button>
          ` : ''}
          ${task.status === 'pending' ? `
            <button class="btn btn-sm btn-success" onclick="window.dashboardInstance.completeTask('${task.id}')" title="ทำเสร็จแล้ว">
              <i class="fas fa-check"></i>
              <span class="btn-text">เสร็จ</span>
            </button>
          ` : ''}
          ${task.status === 'pending' ? `
            <button class="btn btn-sm btn-warning" onclick="window.dashboardInstance.submitTask('${task.id}')" title="ส่งงาน">
              <i class="fas fa-paper-plane"></i>
              <span class="btn-text">ส่งงาน</span>
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
// Task Details Modal
// ==================== 

/**
 * Show task details modal
 */
function showTaskDetails(taskId) {
  // เรียก API เพื่อดึงข้อมูลงาน
  if (window.dashboardInstance && window.dashboardInstance.apiService) {
    const groupId = window.dashboardInstance.currentGroupId;
    if (!groupId) {
      console.error('No groupId available');
      showToast('ไม่พบข้อมูลกลุ่ม', 'error');
      return;
    }
    
    window.dashboardInstance.apiService.getTask(groupId, taskId)
      .then(task => {
        renderTaskDetailsModal(task);
      })
      .catch(error => {
        console.error('Error fetching task details:', error);
        showToast('เกิดข้อผิดพลาดในการดึงข้อมูลงาน', 'error');
      });
  } else {
    // Fallback: ใช้ข้อมูลจาก upcoming tasks
    const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskItem) {
      const taskData = {
        id: taskId,
        title: taskItem.querySelector('.task-title').textContent,
        description: taskItem.querySelector('.task-description')?.textContent || 'ไม่มีคำอธิบาย',
        dueDate: taskItem.querySelector('.task-due-date').textContent.replace('📅', '').trim(),
        assignee: taskItem.querySelector('.task-assignee').textContent.replace('👤', '').trim()
      };
      renderTaskDetailsModal(taskData);
    }
  }
}

/**
 * Render task details modal
 */
function renderTaskDetailsModal(task) {
  const modalHtml = `
    <div class="modal active" id="taskDetailsModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>รายละเอียดงาน</h3>
          <button class="btn-icon" onclick="closeTaskDetailsModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="task-details">
            <div class="task-detail-section">
              <h4>ชื่องาน</h4>
              <p class="task-title-detail">${escapeHtml(task.title)}</p>
            </div>
            
            ${task.description ? `
            <div class="task-detail-section">
              <h4>คำอธิบาย</h4>
              <p class="task-description-detail">${escapeHtml(task.description)}</p>
            </div>
            ` : ''}
            
            <div class="task-detail-section">
              <h4>สถานะ</h4>
              <div class="task-status-detail">
                <span class="status-badge ${getTaskStatusClass(task.status)}">${getTaskStatusText(task.status)}</span>
              </div>
            </div>
            
            <div class="task-detail-section">
              <h4>ความสำคัญ</h4>
              <div class="task-priority-detail">
                <span class="priority-badge ${getTaskPriorityClass(task.priority)}">${getTaskPriorityText(task.priority)}</span>
              </div>
            </div>
            
            <div class="task-detail-section">
              <h4>กำหนดส่ง</h4>
              <p class="task-due-detail">
                <i class="fas fa-calendar"></i>
                ${formatDate(task.dueTime || task.dueDate || task.end || task.start)}
              </p>
            </div>
            
            <div class="task-detail-section">
              <h4>ผู้รับผิดชอบ</h4>
              <p class="task-assignee-detail">
                <i class="fas fa-user"></i>
                ${escapeHtml(task.assigneeName || (task.assignedUsers && task.assignedUsers[0] ? task.assignedUsers[0].displayName : 'ไม่ระบุ'))}
              </p>
            </div>
            
            ${task.createdAt ? `
            <div class="task-detail-section">
              <h4>วันที่สร้าง</h4>
              <p class="task-created-detail">
                <i class="fas fa-clock"></i>
                ${formatDate(task.createdAt)}
              </p>
            </div>
            ` : ''}
            
            ${task.updatedAt ? `
            <div class="task-detail-section">
              <h4>อัปเดตล่าสุด</h4>
              <p class="task-updated-detail">
                <i class="fas fa-edit"></i>
                ${formatDate(task.updatedAt)}
              </p>
            </div>
            ` : ''}
          </div>
        </div>
        <div class="modal-footer">
          <div class="modal-actions">
            ${task.status === 'pending' ? `
              <button class="btn btn-warning" onclick="submitTaskFromModal('${task.id}')">
                <i class="fas fa-paper-plane"></i>
                ส่งงาน
              </button>
            ` : ''}
            ${task.status === 'pending' ? `
              <button class="btn btn-primary" onclick="editTaskFromModal('${task.id}')">
                <i class="fas fa-edit"></i>
                แก้ไข
              </button>
            ` : ''}
            <button class="btn btn-outline" onclick="closeTaskDetailsModal()">
              <i class="fas fa-times"></i>
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // เพิ่ม modal ลงใน body
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // เพิ่ม event listener สำหรับปิด modal เมื่อคลิกพื้นหลัง
  const modal = document.getElementById('taskDetailsModal');
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeTaskDetailsModal();
    }
  });
}

/**
 * Close task details modal
 */
function closeTaskDetailsModal() {
  const modal = document.getElementById('taskDetailsModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * ส่งงานจาก modal
 */
function submitTaskFromModal(taskId) {
  if (window.dashboardInstance) {
    window.dashboardInstance.submitTask(taskId);
    closeTaskDetailsModal();
  } else {
    showToast('ไม่สามารถส่งงานได้: ไม่พบข้อมูลแดชบอร์ด', 'error');
  }
}

/**
 * แก้ไขงานจาก modal
 */
function editTaskFromModal(taskId) {
  if (window.dashboardInstance) {
    window.dashboardInstance.openEditTaskModal(taskId);
    closeTaskDetailsModal();
  } else {
    showToast('ไม่สามารถแก้ไขงานได้: ไม่พบข้อมูลแดชบอร์ด', 'error');
  }
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
    case 'low': return 'priority-low';
    case 'normal': return 'priority-normal';
    default: return 'priority-normal';
  }
}

/**
 * Get task priority text
 */
function getTaskPriorityText(priority) {
  switch (priority) {
    case 'high': return 'สูง';
    case 'medium': return 'ปานกลาง';
    case 'low': return 'ต่ำ';
    case 'normal': return 'ปกติ';
    default: return 'ปกติ';
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
