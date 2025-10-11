// Recurring Tasks Management JavaScript

class RecurringTasksApp {
  constructor() {
    this.currentGroupId = this.getGroupIdFromURL();
    this.currentUserId = this.getUserIdFromURL();
    this.recurringTasks = [];
    this.currentRecurringId = null;
    this.groupInfo = null;
    this.groupMembers = [];
    this.memberNameCache = new Map();
    this.memberDataByLineId = new Map();
    this.pendingMemberRequests = new Map();
    this.currentUserProfile = null;

    this.init();
  }

  getGroupIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('groupId') || 'default-group';
  }

  getUserIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('userId') || 'default-user';
  }

  async init() {
    this.setupEventListeners();
    await this.loadContextData();
    this.loadRecurringTasks();
  }

  setupEventListeners() {
    // Main buttons
    document.getElementById('addRecurringBtn')?.addEventListener('click', () => this.openAddRecurringModal());
    document.getElementById('refreshBtn')?.addEventListener('click', () => this.loadRecurringTasks());
    
    // Filters
    document.getElementById('statusFilter')?.addEventListener('change', () => this.filterTasks());
    document.getElementById('recurrenceFilter')?.addEventListener('change', () => this.filterTasks());
    document.getElementById('searchInput')?.addEventListener('input', () => this.filterTasks());
    
    // Modal events
    document.getElementById('recurringDetailModalClose')?.addEventListener('click', () => this.closeModal('recurringDetailModal'));
    document.getElementById('editRecurringBtn')?.addEventListener('click', () => this.editRecurring());
    document.getElementById('toggleRecurringBtn')?.addEventListener('click', () => this.toggleRecurring());
    document.getElementById('deleteRecurringBtn')?.addEventListener('click', () => this.deleteRecurring());
    document.getElementById('viewAllHistoryBtn')?.addEventListener('click', () => this.viewAllHistory());
  }

  async loadContextData() {
    try {
      await Promise.all([
        this.loadGroupInfo(),
        this.loadGroupMembers()
      ]);
    } catch (error) {
      console.warn('⚠️ Failed to preload context data:', error);
    }

    await this.loadCurrentUser();
  }

  async loadRecurringTasks() {
    try {
      this.showLoading(true);

      const response = await fetch(`/api/groups/${this.currentGroupId}/recurring`);
      const result = await response.json();
      
      if (result.success) {
        this.recurringTasks = result.data || [];
        this.renderTasks();
        this.updateStatistics();
      } else {
        throw new Error(result.error || 'Failed to load recurring tasks');
      }
      
    } catch (error) {
      console.error('❌ Error loading recurring tasks:', error);
      this.showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async loadGroupInfo() {
    if (!this.currentGroupId || this.currentGroupId === 'default-group') {
      this.updateGroupDisplay({ name: 'ไม่ทราบชื่อกลุ่ม', lineGroupId: this.currentGroupId });
      return null;
    }

    try {
      const response = await fetch(`/api/groups/${this.currentGroupId}`);
      const result = await response.json();

      if (result.success && result.data) {
        this.groupInfo = result.data;
        this.updateGroupDisplay(result.data);
        return result.data;
      }

      throw new Error(result.error || 'Failed to load group information');
    } catch (error) {
      console.error('❌ Error loading group info:', error);
      this.updateGroupDisplay({ name: 'ไม่ทราบชื่อกลุ่ม', lineGroupId: this.currentGroupId });
      return null;
    }
  }

  async loadGroupMembers() {
    if (!this.currentGroupId || this.currentGroupId === 'default-group') {
      this.groupMembers = [];
      return [];
    }

    try {
      const response = await fetch(`/api/groups/${this.currentGroupId}/members`);
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        this.groupMembers = result.data;
        this.cacheMemberNames(result.data);
        return result.data;
      }

      throw new Error(result.error || 'Failed to load group members');
    } catch (error) {
      console.error('❌ Error loading group members:', error);
      this.groupMembers = [];
      return [];
    }
  }

  async loadCurrentUser() {
    if (!this.currentUserId || this.currentUserId === 'default-user') {
      this.updateUserDisplay(null);
      return null;
    }

    const normalizedId = this.normalizeLineId(this.currentUserId);
    const memberFromGroup = this.memberDataByLineId.get(normalizedId);
    if (memberFromGroup) {
      this.currentUserProfile = memberFromGroup;
      this.memberNameCache.set(normalizedId, this.extractDisplayName(memberFromGroup));
      this.updateUserDisplay(memberFromGroup);
      return memberFromGroup;
    }

    try {
      const response = await fetch(`/api/users/${this.currentUserId}`);
      const result = await response.json();

      if (result.success && result.data) {
        const userData = result.data;
        const normalizedUserId = this.normalizeLineId(userData.lineUserId || this.currentUserId);
        if (normalizedUserId) {
          this.memberDataByLineId.set(normalizedUserId, userData);
          this.memberNameCache.set(normalizedUserId, this.extractDisplayName(userData));
        }
        this.currentUserProfile = userData;
        this.updateUserDisplay(userData);
        return userData;
      }

      throw new Error(result.error || 'Failed to load user information');
    } catch (error) {
      console.error('❌ Error loading current user info:', error);
      this.updateUserDisplay({ displayName: 'ไม่ทราบชื่อผู้ใช้', lineUserId: this.currentUserId });
      return null;
    }
  }

  renderTasks() {
    const tbody = document.getElementById('recurringTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (!tbody) return;
    
    // Apply filters
    const filteredTasks = this.getFilteredTasks();
    
    if (filteredTasks.length === 0) {
      tbody.innerHTML = '';
      emptyState?.classList.remove('hidden');
      return;
    }
    
    emptyState?.classList.add('hidden');
    
    tbody.innerHTML = filteredTasks.map(task => `
      <tr class="table-row">
        <td class="px-6 py-4">
          <div>
            <div class="font-medium text-gray-900">${this.escapeHtml(task.title)}</div>
            <div class="text-sm text-gray-500">${this.escapeHtml(task.description || '')}</div>
          </div>
        </td>
        <td class="px-6 py-4">
          <span class="recurrence-badge recurrence-${task.recurrence}">
            ${this.getRecurrenceText(task.recurrence)}
          </span>
          <div class="text-xs text-gray-500 mt-1">
            ${this.getScheduleText(task)}
          </div>
        </td>
        <td class="px-6 py-4">
          <span class="font-medium ${task.active ? 'status-active' : 'status-inactive'}">
            ${task.active ? '🟢 ใช้งาน' : '🔴 หยุด'}
          </span>
        </td>
        <td class="px-6 py-4 text-sm text-gray-900">
          ${task.lastRunAt ? this.formatDate(task.lastRunAt) : '-'}
        </td>
        <td class="px-6 py-4 text-sm text-gray-900">
          ${this.formatDate(this.computeNextDueTime(task))}
        </td>
        <td class="px-6 py-4 text-sm text-gray-900">
          ${task.totalInstances || 0} ครั้ง
        </td>
        <td class="px-6 py-4 text-right">
          <div class="flex justify-end space-x-2">
            <button class="action-btn view" onclick="recurringApp.viewRecurring('${task.id}')" title="ดูรายละเอียด">
              <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn edit" onclick="recurringApp.editRecurring('${task.id}')" title="แก้ไข">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn toggle" onclick="recurringApp.toggleRecurring('${task.id}')" title="${task.active ? 'หยุด' : 'เปิด'}การทำงาน">
              <i class="fas fa-${task.active ? 'pause' : 'play'}"></i>
            </button>
            <button class="action-btn delete" onclick="recurringApp.deleteRecurring('${task.id}')" title="ลบ">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  getFilteredTasks() {
    let filtered = [...this.recurringTasks];
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter')?.value;
    if (statusFilter) {
      filtered = filtered.filter(task => {
        if (statusFilter === 'active') return task.active;
        if (statusFilter === 'inactive') return !task.active;
        return true;
      });
    }
    
    // Recurrence filter
    const recurrenceFilter = document.getElementById('recurrenceFilter')?.value;
    if (recurrenceFilter) {
      filtered = filtered.filter(task => task.recurrence === recurrenceFilter);
    }
    
    // Search filter
    const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchTerm) ||
        (task.description && task.description.toLowerCase().includes(searchTerm))
      );
    }
    
    return filtered;
  }

  filterTasks() {
    this.renderTasks();
  }

  updateStatistics() {
    const total = this.recurringTasks.length;
    const active = this.recurringTasks.filter(t => t.active).length;
    const totalInstances = this.recurringTasks.reduce((sum, t) => sum + (t.totalInstances || 0), 0);
    
    // Find next task
    const activeTasks = this.recurringTasks.filter(t => t.active);
    const nextTask = activeTasks.length > 0 ? 
      activeTasks.reduce((earliest, task) => {
        const a = this.computeNextDueTime(task);
        const b = this.computeNextDueTime(earliest);
        if (!a) return earliest;
        if (!b) return task;
        return a < b ? task : earliest;
      }) : null;
    
    document.getElementById('totalRecurring').textContent = total;
    document.getElementById('activeRecurring').textContent = active;
    document.getElementById('totalInstances').textContent = totalInstances;
    document.getElementById('nextTask').textContent = nextTask ? 
      this.formatDate(this.computeNextDueTime(nextTask)) : '-';
  }

  async viewRecurring(id) {
    try {
      this.currentRecurringId = id;
      this.showLoading(true);
      
      const [detailResponse, historyResponse, statsResponse] = await Promise.all([
        fetch(`/api/recurring/${id}`),
        fetch(`/api/recurring/${id}/history?limit=5`),
        fetch(`/api/recurring/${id}/stats`)
      ]);
      
      const detail = await detailResponse.json();
      const history = await historyResponse.json();
      const stats = await statsResponse.json();
      
      if (detail.success) {
        await this.showRecurringDetail(detail.data, history.data || {}, stats.data || {});
        this.openModal('recurringDetailModal');
      } else {
        throw new Error(detail.error || 'Failed to load recurring task details');
      }
      
    } catch (error) {
      console.error('❌ Error viewing recurring task:', error);
      this.showAlert('เกิดข้อผิดพลาดในการโหลดรายละเอียด: ' + error.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async showRecurringDetail(task, history, stats) {
    const titleEl = document.getElementById('recurringDetailTitle');
    if (titleEl) {
      titleEl.textContent = `📊 ${task.title}`;
    }

    const descriptionEl = document.getElementById('recurringDescription');
    if (descriptionEl) {
      descriptionEl.textContent = task.description || '-';
    }

    const assigneesEl = document.getElementById('recurringAssignees');
    if (assigneesEl) {
      const assigneeNames = await this.resolveMemberNames(task.assigneeLineUserIds || []);
      assigneesEl.textContent = assigneeNames.length ? assigneeNames.join(', ') : '-';
      if (Array.isArray(task.assigneeLineUserIds) && task.assigneeLineUserIds.length > 0) {
        assigneesEl.title = task.assigneeLineUserIds.join(', ');
      } else {
        assigneesEl.removeAttribute('title');
      }
    }

    const reviewerEl = document.getElementById('recurringReviewer');
    if (reviewerEl) {
      const reviewerName = await this.resolveMemberName(task.reviewerLineUserId);
      reviewerEl.textContent = reviewerName || '(ไม่ระบุ)';
      if (task.reviewerLineUserId) {
        reviewerEl.title = task.reviewerLineUserId;
      } else {
        reviewerEl.removeAttribute('title');
      }
    }

    const scheduleEl = document.getElementById('recurringSchedule');
    if (scheduleEl) {
      scheduleEl.textContent = this.getFullScheduleText(task);
    }

    const nextRunEl = document.getElementById('recurringNextRun');
    if (nextRunEl) {
      nextRunEl.textContent = this.formatDate(this.computeNextDueTime(task));
    }

    this.renderRecurringStats(stats);
    this.renderRecurringHistory(history.tasks || []);
  }

  renderRecurringStats(stats) {
    const statsContainer = document.getElementById('recurringStats');
    if (!statsContainer) return;
    
    const statsData = [
      { label: 'ทั้งหมด', value: stats.totalInstances || 0, color: 'text-gray-600' },
      { label: 'เสร็จแล้ว', value: stats.completed || 0, color: 'text-green-600' },
      { label: 'กำลังทำ', value: stats.pending || 0, color: 'text-blue-600' },
      { label: 'เกินกำหนด', value: stats.overdue || 0, color: 'text-red-600' },
      { label: 'ตรงเวลา', value: stats.onTime || 0, color: 'text-green-500' }
    ];
    
    statsContainer.innerHTML = statsData.map(stat => `
      <div class="text-center">
        <div class="text-2xl font-bold ${stat.color}">${stat.value}</div>
        <div class="text-xs text-gray-500">${stat.label}</div>
      </div>
    `).join('');
  }

  renderRecurringHistory(tasks) {
    const historyContainer = document.getElementById('recurringHistory');
    if (!historyContainer) return;

    if (tasks.length === 0) {
      historyContainer.innerHTML = '<p class="text-gray-500 text-center py-4">ยังไม่มีประวัติการทำงาน</p>';
      return;
    }
    
    historyContainer.innerHTML = tasks.map(task => {
      const statusIcon = this.getTaskStatusIcon(task.status);
      const statusText = this.getTaskStatusText(task.status);
      const timeInfo = this.getTaskTimeInfo(task);
      const assigneeNames = this.formatAssignedUsers(task.assignedUsers, task.assigneeLineUserIds);
      const infoLines = [
        this.escapeHtml(`${statusText}${timeInfo ? ` ${timeInfo}` : ''}`)
      ];

      if (assigneeNames) {
        infoLines.push(this.escapeHtml(`ผู้รับผิดชอบ: ${assigneeNames}`));
      }

      const infoHtml = infoLines
        .filter(Boolean)
        .map(line => `<div class="text-sm text-gray-500">${line}</div>`)
        .join('');

      return `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div class="flex items-center space-x-3">
            <span class="text-lg">${statusIcon}</span>
            <div>
              <div class="font-medium text-gray-900">#${task.recurringInstance} | ${this.formatDate(task.createdAt)}</div>
              ${infoHtml}
            </div>
          </div>
          <button onclick="window.open('/dashboard/index.html?groupId=${this.currentGroupId}&taskId=${task.id}', '_blank')"
                  class="text-blue-600 hover:text-blue-800 text-sm">
            ดูรายละเอียด
          </button>
        </div>
      `;
    }).join('');
  }

  formatAssignedUsers(users = [], fallbackIds = []) {
    const names = [];

    if (Array.isArray(users) && users.length > 0) {
      for (const user of users) {
        const name = this.extractDisplayName(user);
        if (name && !names.includes(name)) {
          names.push(name);
        }
      }
    }

    if (names.length === 0 && Array.isArray(fallbackIds) && fallbackIds.length > 0) {
      for (const rawId of fallbackIds) {
        if (!rawId) continue;
        if (typeof rawId === 'string' && rawId.toLowerCase() === 'team') {
          if (!names.includes('ทีมทั้งหมด')) {
            names.push('ทีมทั้งหมด');
          }
          continue;
        }

        const normalized = this.normalizeLineId(rawId);
        const cached = this.memberNameCache.get(normalized);
        if (cached && !names.includes(cached)) {
          names.push(cached);
        }
      }
    }

    return names.join(', ');
  }

  cacheMemberNames(members = []) {
    members.forEach(member => {
      if (!member) return;
      const lineUserId = member.lineUserId || member.userId || member.id;
      const normalized = this.normalizeLineId(lineUserId);
      if (!normalized) return;

      this.memberDataByLineId.set(normalized, member);
      const displayName = this.extractDisplayName(member);
      if (displayName) {
        this.memberNameCache.set(normalized, displayName);
      }
    });
  }

  normalizeLineId(id) {
    if (!id || typeof id !== 'string') return '';
    return id.trim().toUpperCase();
  }

  extractDisplayName(entity) {
    if (!entity) return '';
    if (typeof entity === 'string') return entity;

    return (
      entity.displayName ||
      entity.realName ||
      entity.fullName ||
      entity.name ||
      entity.title ||
      entity.lineUserId ||
      ''
    ).toString().trim();
  }

  async resolveMemberNames(ids = []) {
    const names = [];
    if (!Array.isArray(ids)) return names;

    for (const id of ids) {
      const name = await this.resolveMemberName(id);
      if (name) {
        names.push(name);
      }
    }

    // Remove duplicates while preserving order
    return names.filter((name, index) => names.indexOf(name) === index);
  }

  async resolveMemberName(lineUserId) {
    if (!lineUserId) return '';
    if (typeof lineUserId === 'string' && lineUserId.toLowerCase() === 'team') return 'ทีมทั้งหมด';

    const normalized = this.normalizeLineId(lineUserId);
    if (!normalized) return '';

    if (this.memberNameCache.has(normalized)) {
      return this.memberNameCache.get(normalized);
    }

    if (this.pendingMemberRequests.has(normalized)) {
      return await this.pendingMemberRequests.get(normalized);
    }

    const fetchPromise = this.fetchAndCacheMemberName(lineUserId);
    this.pendingMemberRequests.set(normalized, fetchPromise);
    const name = await fetchPromise;
    this.pendingMemberRequests.delete(normalized);
    return name;
  }

  async fetchAndCacheMemberName(lineUserId) {
    try {
      const response = await fetch(`/api/users/${lineUserId}`);
      const result = await response.json();

      if (result.success && result.data) {
        const userData = result.data;
        const normalized = this.normalizeLineId(userData.lineUserId || lineUserId);
        const displayName = this.extractDisplayName(userData) || 'ไม่ทราบชื่อ';
        if (normalized) {
          this.memberDataByLineId.set(normalized, userData);
          this.memberNameCache.set(normalized, displayName);
        }
        return displayName;
      }
    } catch (error) {
      console.error(`❌ Error fetching user profile for ${lineUserId}:`, error);
    }

    const fallbackName = 'ไม่ทราบชื่อ';
    const normalizedFallback = this.normalizeLineId(lineUserId);
    if (normalizedFallback && !this.memberNameCache.has(normalizedFallback)) {
      this.memberNameCache.set(normalizedFallback, fallbackName);
    }
    return fallbackName;
  }

  updateGroupDisplay(group) {
    const groupNameEl = document.getElementById('currentGroupName');
    if (!groupNameEl) return;

    const displayName = (group?.name && group.name.trim()) ? group.name.trim() : 'ไม่ทราบชื่อกลุ่ม';
    groupNameEl.textContent = displayName;

    if (group?.lineGroupId && !['default-group', 'default', 'undefined'].includes(group.lineGroupId)) {
      groupNameEl.setAttribute('title', group.lineGroupId);
    } else {
      groupNameEl.removeAttribute('title');
    }
  }

  updateUserDisplay(user) {
    const userNameEl = document.getElementById('currentUserName');
    const avatarEl = document.getElementById('currentUserAvatar');

    const displayName = user ? this.extractDisplayName(user) : '-';
    const currentLineId = this.currentUserId && this.currentUserId !== 'default-user'
      ? this.currentUserId
      : '';
    const lineUserId = user?.lineUserId || currentLineId;

    if (userNameEl) {
      userNameEl.textContent = displayName || '-';
      if (lineUserId) {
        userNameEl.setAttribute('title', lineUserId);
      } else {
        userNameEl.removeAttribute('title');
      }
    }

    if (avatarEl) {
      let initial = '👤';
      if (displayName && displayName.trim()) {
        initial = displayName.trim().charAt(0).toUpperCase();
      }
      avatarEl.textContent = initial;
      if (lineUserId) {
        avatarEl.setAttribute('title', lineUserId);
      } else {
        avatarEl.removeAttribute('title');
      }
    }
  }

  getTaskStatusIcon(status) {
    const icons = {
      'completed': '✅',
      'pending': '⏳', 
      'in_progress': '🔄',
      'overdue': '❌',
      'cancelled': '⚪'
    };
    return icons[status] || '📋';
  }

  getTaskStatusText(status) {
    const texts = {
      'completed': 'ส่งแล้ว',
      'pending': 'รอดำเนินการ',
      'in_progress': 'กำลังทำ',
      'overdue': 'เกินกำหนด',
      'cancelled': 'ยกเลิก'
    };
    return texts[status] || status;
  }

  getTaskTimeInfo(task) {
    if (task.status === 'completed' && task.completedAt) {
      const dueTime = new Date(task.dueTime);
      const completedTime = new Date(task.completedAt);
      const diffHours = (completedTime - dueTime) / (1000 * 60 * 60);
      
      if (diffHours <= 0) {
        return `(เร็ว ${Math.abs(Math.round(diffHours / 24))} วัน)`;
      } else if (diffHours <= 24) {
        return '(ตรงเวลา)';
      } else {
        return `(ช้า ${Math.round(diffHours / 24)} วัน)`;
      }
    }
    return '';
  }

  getRecurrenceText(recurrence) {
    const texts = {
      'weekly': 'รายสัปดาห์',
      'monthly': 'รายเดือน', 
      'quarterly': 'รายไตรมาส'
    };
    return texts[recurrence] || recurrence;
  }

  getScheduleText(task) {
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    
    switch (task.recurrence) {
      case 'weekly':
        return `ทุกวัน${dayNames[task.weekDay]} ${task.timeOfDay}`;
      case 'monthly':
        return `วันที่ ${task.dayOfMonth} ของเดือน ${task.timeOfDay}`;
      case 'quarterly':
        return `วันที่ ${task.dayOfMonth} ของไตรมาส ${task.timeOfDay}`;
      default:
        return task.timeOfDay;
    }
  }

  getFullScheduleText(task) {
    const schedule = this.getScheduleText(task);
    return `${schedule}`;
  }

  // คำนวณกำหนดส่งครั้งถัดไปจากค่าปัจจุบันใน template
  computeNextDueTime(task) {
    try {
      if (!task || !task.nextRunAt) return null;
      const prev = new Date(task.nextRunAt);
      if (isNaN(prev)) return null;
      const next = new Date(prev.getTime());
      if (task.recurrence === 'weekly') {
        next.setDate(prev.getDate() + 7);
      } else if (task.recurrence === 'monthly') {
        const d = prev.getDate();
        const candMonth = prev.getMonth() + 1;
        const year = prev.getFullYear() + Math.floor(candMonth / 12);
        const month = candMonth % 12;
        const daysInTarget = new Date(year, month + 1, 0).getDate();
        next.setFullYear(year, month, Math.min(d, daysInTarget));
      } else {
        // quarterly = +3 months
        const d = prev.getDate();
        const candMonth = prev.getMonth() + 3;
        const year = prev.getFullYear() + Math.floor(candMonth / 12);
        const month = candMonth % 12;
        const daysInTarget = new Date(year, month + 1, 0).getDate();
        next.setFullYear(year, month, Math.min(d, daysInTarget));
      }
      return next;
    } catch (e) {
      console.warn('computeNextDueTime error', e);
      return null;
    }
  }

  openAddRecurringModal() {
    // Redirect to main dashboard with recurring tab
    window.location.href = `/dashboard/index.html?groupId=${this.currentGroupId}&userId=${this.currentUserId}&action=new-recurring-task`;
  }

  async editRecurring(id) {
    // For now, redirect to edit page or show edit modal
    this.showAlert('ฟีเจอร์แก้ไขจะเปิดใช้งานในเร็วๆ นี้', 'info');
  }

  async toggleRecurring(id) {
    try {
      const task = this.recurringTasks.find(t => t.id === id);
      if (!task) return;
      
      const newStatus = !task.active;
      const response = await fetch(`/api/recurring/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newStatus })
      });
      
      const result = await response.json();
      if (result.success) {
        this.showAlert(`${newStatus ? 'เปิด' : 'หยุด'}การทำงานของงานประจำแล้ว`, 'success');
        this.loadRecurringTasks();
      } else {
        throw new Error(result.error || 'Failed to toggle recurring task');
      }
      
    } catch (error) {
      console.error('❌ Error toggling recurring task:', error);
      this.showAlert('เกิดข้อผิดพลาด: ' + error.message, 'error');
    }
  }

  async deleteRecurring(id) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบงานประจำนี้? การกระทำนี้ไม่สามารถยกเลิกได้')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/recurring/${id}`, { method: 'DELETE' });
      const result = await response.json();
      
      if (result.success) {
        this.showAlert('ลบงานประจำแล้ว', 'success');
        this.closeModal('recurringDetailModal');
        this.loadRecurringTasks();
      } else {
        throw new Error(result.error || 'Failed to delete recurring task');
      }
      
    } catch (error) {
      console.error('❌ Error deleting recurring task:', error);
      this.showAlert('เกิดข้อผิดพลาดในการลบ: ' + error.message, 'error');
    }
  }

  viewAllHistory() {
    if (this.currentRecurringId) {
      window.open(`/dashboard/recurring-history.html?id=${this.currentRecurringId}&groupId=${this.currentGroupId}`, '_blank');
    }
  }

  // Utility functions
  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.toggle('hidden', !show);
    }
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  showAlert(message, type = 'info') {
    // Simple alert for now - can be enhanced with better UI
    const alertClass = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    alert(`${alertClass} ${message}`);
  }
}

// Initialize the app
let recurringApp;
document.addEventListener('DOMContentLoaded', () => {
  recurringApp = new RecurringTasksApp();
});

// Global functions for inline event handlers
function openAddRecurringModal() {
  recurringApp.openAddRecurringModal();
}
