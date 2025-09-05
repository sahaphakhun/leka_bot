// Recurring Tasks Management JavaScript

class RecurringTasksApp {
  constructor() {
    this.currentGroupId = this.getGroupIdFromURL();
    this.currentUserId = this.getUserIdFromURL();
    this.recurringTasks = [];
    this.currentRecurringId = null;
    
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

  init() {
    this.setupEventListeners();
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
          ${this.formatDate(task.nextRunAt)}
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
      activeTasks.reduce((earliest, task) => 
        new Date(task.nextRunAt) < new Date(earliest.nextRunAt) ? task : earliest
      ) : null;
    
    document.getElementById('totalRecurring').textContent = total;
    document.getElementById('activeRecurring').textContent = active;
    document.getElementById('totalInstances').textContent = totalInstances;
    document.getElementById('nextTask').textContent = nextTask ? 
      this.formatDate(nextTask.nextRunAt) : '-';
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
        this.showRecurringDetail(detail.data, history.data || {}, stats.data || {});
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

  showRecurringDetail(task, history, stats) {
    // Update modal title
    document.getElementById('recurringDetailTitle').textContent = `📊 ${task.title}`;
    
    // Update basic info
    document.getElementById('recurringDescription').textContent = task.description || '-';
    document.getElementById('recurringAssignees').textContent = task.assigneeLineUserIds.join(', ') || '-';
    document.getElementById('recurringReviewer').textContent = task.reviewerLineUserId || '(ไม่ระบุ)';
    document.getElementById('recurringSchedule').textContent = this.getFullScheduleText(task);
    document.getElementById('recurringNextRun').textContent = this.formatDate(task.nextRunAt);
    document.getElementById('recurringDuration').textContent = `${task.durationDays || 7} วัน`;
    
    // Update statistics
    this.renderRecurringStats(stats);
    
    // Update history
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
      
      return `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div class="flex items-center space-x-3">
            <span class="text-lg">${statusIcon}</span>
            <div>
              <div class="font-medium text-gray-900">#${task.recurringInstance} | ${this.formatDate(task.createdAt)}</div>
              <div class="text-sm text-gray-500">${statusText} ${timeInfo}</div>
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
    return `${schedule} (ให้ทำ ${task.durationDays || 7} วัน)`;
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