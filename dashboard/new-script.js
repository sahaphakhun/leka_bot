/**
 * เลขาบอท Dashboard JavaScript - New Mobile-First Frontend
 * ใช้ API ที่มีอยู่จริงในระบบ
 */

// Global variables
let currentUser = null;
let currentGroup = null;
let currentView = 'dashboard';
let currentGroupId = null;
let currentUserId = null;
let apiBase = window.location.origin;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 เริ่มต้น Dashboard ใหม่...');
    
    // Hide loading screen and show app
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        
        // Initialize app
        initApp();
    }, 1000);
});

/**
 * Initialize the application
 */
async function initApp() {
    try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        const groupId = urlParams.get('groupId');
        
        if (!userId || !groupId) {
            showToast('กรุณาเข้าผ่านลิงก์จากบอท', 'warning');
            return;
        }
        
        currentUserId = userId;
        currentGroupId = groupId;
        
        // Load user and group data
        await loadGroupData(groupId);
        await loadUserData(userId);
        
        // Setup navigation
        setupNavigation();
        
        // Load initial data
        await loadDashboardData();
        
        // Setup event listeners
        setupEventListeners();
        
        console.log('✅ Dashboard เริ่มต้นสำเร็จ');
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการเริ่มต้น:', error);
        showToast('เกิดข้อผิดพลาดในการเริ่มต้น', 'error');
    }
}

/**
 * API Request helper function
 */
async function apiRequest(endpoint, options = {}) {
    try {
        // ตรวจสอบว่า endpoint เริ่มต้นด้วย /api หรือไม่
        const fullEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
        const url = `${apiBase}${fullEndpoint}`;
        console.log('API Request:', url);
        
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
            ...options
        });

        console.log('API Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText };
            }
            
            let errorMessage = errorData.error || errorData.details || errorData.message;
            
            if (!errorMessage) {
                switch (response.status) {
                    case 400:
                        errorMessage = 'Bad Request - ข้อมูลที่ส่งไม่ถูกต้อง';
                        break;
                    case 401:
                        errorMessage = 'Unauthorized - ไม่มีสิทธิ์เข้าถึง';
                        break;
                    case 403:
                        errorMessage = 'Forbidden - ถูกปฏิเสธการเข้าถึง';
                        break;
                    case 404:
                        errorMessage = 'Not Found - ไม่พบข้อมูลที่ต้องการ';
                        break;
                    case 409:
                        errorMessage = 'Conflict - ข้อมูลขัดแย้ง';
                        break;
                    case 500:
                        errorMessage = 'Internal Server Error - เซิร์ฟเวอร์มีปัญหา';
                        break;
                    default:
                        errorMessage = `HTTP ${response.status} - เกิดข้อผิดพลาด`;
                }
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('API Response data:', data);
        
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

/**
 * Load user data from API
 */
async function loadUserData(userId) {
    try {
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/api/groups/${currentGroupId}/members`);
        if (!response.success) throw new Error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
        
        const members = response.data || [];
        const userData = members.find(member => member.id === userId);
        
        if (userData) {
            currentUser = userData;
        } else {
            // Fallback to basic user info
            currentUser = {
                id: userId,
                displayName: 'ผู้ใช้ไม่ทราบชื่อ',
                role: 'สมาชิก'
            };
        }
        
        // Update UI
        updateUserInfo(currentUser);
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้:', error);
        // Fallback to basic user info
        currentUser = {
            id: userId,
            displayName: 'ผู้ใช้ไม่ทราบชื่อ',
            role: 'สมาชิก'
        };
        updateUserInfo(currentUser);
    }
}

/**
 * Load group data from API
 */
async function loadGroupData(groupId) {
    try {
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/api/groups/${groupId}`);
        if (!response.success) throw new Error('ไม่สามารถโหลดข้อมูลกลุ่มได้');
        
        const groupData = response.data;
        currentGroup = groupData;
        
        // Update UI
        updateGroupInfo(groupData);
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดข้อมูลกลุ่ม:', error);
        // Fallback to basic group info
        currentGroup = {
            id: groupId,
            name: 'กลุ่มทดสอบ'
        };
        updateGroupInfo(currentGroup);
    }
}

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    try {
        await Promise.all([
            loadStats(),
            loadUpcomingTasks(),
            loadMiniLeaderboard()
        ]);
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดข้อมูล Dashboard:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
}

/**
 * Load statistics data
 */
async function loadStats() {
    try {
        const period = document.querySelector('.period-tab.active')?.dataset.period || 'this_week';
        
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/api/groups/${currentGroupId}/stats?period=${period}`);
        if (!response.success) throw new Error('ไม่สามารถโหลดสถิติได้');
        
        // Update UI
        updateStats(response.data);
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดสถิติ:', error);
    }
}

/**
 * Load upcoming tasks
 */
async function loadUpcomingTasks() {
    try {
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/api/groups/${currentGroupId}/tasks?limit=5&status=pending`);
        if (!response.success) throw new Error('ไม่สามารถโหลดงานที่ใกล้ครบกำหนดได้');
        
        // Update UI
        updateUpcomingTasks(response.data);
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดงานที่ใกล้ครบกำหนด:', error);
    }
}

/**
 * Load mini leaderboard
 */
async function loadMiniLeaderboard() {
    try {
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/api/groups/${currentGroupId}/leaderboard?period=weekly&limit=3`);
        if (!response.success) throw new Error('ไม่สามารถโหลดอันดับได้');
        
        // Update UI
        updateMiniLeaderboard(response.data);
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดอันดับ:', error);
    }
}

/**
 * Setup navigation
 */
function setupNavigation() {
    // Bottom navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const view = this.dataset.view;
            if (view) {
                switchView(view);
            }
        });
    });
    
    // Period tabs
    const periodTabs = document.querySelectorAll('.period-tab');
    periodTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            periodTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            this.classList.add('active');
            // Reload stats
            loadStats();
        });
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadDashboardData();
            showToast('รีเฟรชข้อมูลแล้ว', 'success');
        });
    }
    
    // Quick action buttons
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => showAddTaskModal());
    }
    
    const submitTaskBtn = document.getElementById('submitTaskBtn');
    if (submitTaskBtn) {
        submitTaskBtn.addEventListener('click', () => showSubmitTaskModal());
    }
    
    const reviewTaskBtn = document.getElementById('reviewTaskBtn');
    if (reviewTaskBtn) {
        reviewTaskBtn.addEventListener('click', () => showReviewTaskModal());
    }
    
    // Sync leaderboard button
    const syncLeaderboardBtn = document.getElementById('syncLeaderboardBtn');
    if (syncLeaderboardBtn) {
        syncLeaderboardBtn.addEventListener('click', () => syncLeaderboard());
    }
    
    // Modal close buttons
    setupModalCloseListeners();
    
    // Form submissions
    const addTaskForm = document.getElementById('addTaskForm');
    if (addTaskForm) {
        addTaskForm.addEventListener('submit', handleAddTask);
    }
    
    const submitTaskForm = document.getElementById('submitTaskForm');
    if (submitTaskForm) {
        submitTaskForm.addEventListener('submit', handleSubmitTask);
    }
    
    const reviewTaskForm = document.getElementById('reviewTaskForm');
    if (reviewTaskForm) {
        reviewTaskForm.addEventListener('submit', handleReviewTask);
    }
}

/**
 * Setup modal close listeners
 */
function setupModalCloseListeners() {
    const modalCloseButtons = document.querySelectorAll('.modal-close');
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Close modal when clicking outside
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
}

/**
 * Switch between views
 */
function switchView(viewName) {
    // Hide all views
    const views = document.querySelectorAll('.view');
    views.forEach(view => view.classList.remove('active'));
    
    // Show selected view
    const selectedView = document.getElementById(viewName + 'View');
    if (selectedView) {
        selectedView.classList.add('active');
    }
    
    // Update navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    const activeNavItem = document.querySelector(`[data-view="${viewName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Update current view
    currentView = viewName;
    
    // Load view-specific data
    loadViewData(viewName);
    
    // Update URL hash
    window.location.hash = viewName;
}

/**
 * Load data for specific view
 */
async function loadViewData(viewName) {
    try {
        switch (viewName) {
            case 'calendar':
                await loadCalendarData();
                break;
            case 'tasks':
                await loadTasksData();
                break;
            case 'files':
                await loadFilesData();
                break;
            case 'leaderboard':
                await loadLeaderboardData();
                break;
            case 'reports':
                await loadReportsData();
                break;
        }
    } catch (error) {
        console.error(`❌ เกิดข้อผิดพลาดในการโหลดข้อมูล ${viewName}:`, error);
    }
}

/**
 * Update user information in UI
 */
function updateUserInfo(user) {
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    
    if (userAvatar) {
        userAvatar.textContent = user.displayName ? user.displayName.charAt(0) : '👤';
    }
    
    if (userName) {
        userName.textContent = user.displayName || 'ผู้ใช้ไม่ทราบชื่อ';
    }
    
    if (userRole) {
        userRole.textContent = user.role || 'สมาชิก';
    }
}

/**
 * Update group information in UI
 */
function updateGroupInfo(group) {
    const groupName = document.getElementById('currentGroupName');
    
    if (groupName) {
        groupName.textContent = group.name || 'กลุ่มทดสอบ';
    }
}

/**
 * Update statistics in UI
 */
function updateStats(stats) {
    const totalTasks = document.getElementById('totalTasks');
    const pendingTasks = document.getElementById('pendingTasks');
    const completedTasks = document.getElementById('completedTasks');
    const overdueTasks = document.getElementById('overdueTasks');
    
    if (totalTasks) totalTasks.textContent = stats.total || 0;
    if (pendingTasks) pendingTasks.textContent = stats.pending || 0;
    if (completedTasks) completedTasks.textContent = stats.completed || 0;
    if (overdueTasks) overdueTasks.textContent = stats.overdue || 0;
}

/**
 * Update upcoming tasks in UI
 */
function updateUpcomingTasks(tasks) {
    const upcomingTasksContainer = document.getElementById('upcomingTasks');
    
    if (!upcomingTasksContainer) return;
    
    if (tasks.length === 0) {
        upcomingTasksContainer.innerHTML = '<p class="text-center text-gray-500">ไม่มีงานที่ใกล้ครบกำหนด</p>';
        return;
    }
    
    const tasksHTML = tasks.map(task => `
        <div class="task-item" onclick="showTaskDetail('${task.id}')">
            <div class="task-header">
                <h4 class="task-title">${task.title}</h4>
                <span class="task-status ${task.status}">${getStatusText(task.status)}</span>
            </div>
            <div class="task-meta">
                <span><i class="fas fa-user"></i> ${task.assignee || 'ไม่ระบุ'}</span>
                <span><i class="fas fa-clock"></i> ${formatDate(task.dueDate)}</span>
            </div>
        </div>
    `).join('');
    
    upcomingTasksContainer.innerHTML = tasksHTML;
}

/**
 * Update mini leaderboard in UI
 */
function updateMiniLeaderboard(leaderboardData) {
    const miniLeaderboardContainer = document.getElementById('miniLeaderboard');
    
    if (!miniLeaderboardContainer) return;
    
    if (leaderboardData.length === 0) {
        miniLeaderboardContainer.innerHTML = '<p class="text-center text-gray-500">ไม่มีข้อมูลอันดับ</p>';
        return;
    }
    
    const leaderboardHTML = leaderboardData.slice(0, 3).map((entry, index) => `
        <div class="leaderboard-item">
            <div class="leaderboard-rank rank-${index + 1}">${index + 1}</div>
            <div class="leaderboard-user">
                <div class="leaderboard-name">${entry.displayName}</div>
                <div class="leaderboard-role">${entry.role || 'สมาชิก'}</div>
            </div>
            <div class="leaderboard-score">${entry.score}</div>
        </div>
    `).join('');
    
    miniLeaderboardContainer.innerHTML = leaderboardHTML;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <span class="toast-title">${getToastTitle(type)}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="toast-message">${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

/**
 * Get toast title based on type
 */
function getToastTitle(type) {
    switch (type) {
        case 'success': return 'สำเร็จ';
        case 'error': return 'เกิดข้อผิดพลาด';
        case 'warning': return 'คำเตือน';
        default: return 'ข้อมูล';
    }
}

/**
 * Get status text in Thai
 */
function getStatusText(status) {
    const statusMap = {
        'pending': 'รอดำเนินการ',
        'in_progress': 'กำลังดำเนินการ',
        'completed': 'เสร็จแล้ว',
        'overdue': 'เกินกำหนด'
    };
    return statusMap[status] || status;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'ไม่ระบุ';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

/**
 * Sync leaderboard
 */
async function syncLeaderboard() {
    try {
        showToast('กำลังซิงค์คะแนน...', 'info');
        
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/api/groups/${currentGroupId}/sync-leaderboard`, {
            method: 'POST'
        });
        
        if (!response.success) throw new Error('ไม่สามารถซิงค์คะแนนได้');
        
        showToast('ซิงค์คะแนนสำเร็จ', 'success');
        
        // Reload leaderboard data
        if (currentView === 'leaderboard') {
            await loadLeaderboardData();
        } else {
            await loadMiniLeaderboard();
        }
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการซิงค์คะแนน:', error);
        showToast('เกิดข้อผิดพลาดในการซิงค์คะแนน', 'error');
    }
}

/**
 * Sync leaderboard
 */
async function syncLeaderboard() {
    try {
        showToast('กำลังซิงค์คะแนน...', 'info');
        
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/api/groups/${currentGroupId}/sync-leaderboard`, {
            method: 'POST'
        });
        
        if (!response.success) throw new Error('ไม่สามารถซิงค์คะแนนได้');
        
        showToast('ซิงค์คะแนนสำเร็จ', 'success');
        
        // Reload leaderboard data
        if (currentView === 'leaderboard') {
            await loadLeaderboardData();
        } else {
            await loadMiniLeaderboard();
        }
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการซิงค์คะแนน:', error);
        showToast('เกิดข้อผิดพลาดในการซิงค์คะแนน', 'error');
    }
}

/**
 * Show add task modal
 */
function showAddTaskModal() {
    const modal = document.getElementById('addTaskModal');
    if (modal) {
        modal.classList.add('active');
        loadTaskAssignees();
    }
}

/**
 * Show submit task modal
 */
function showSubmitTaskModal() {
    const modal = document.getElementById('submitTaskModal');
    if (modal) {
        modal.classList.add('active');
        loadSubmitableTasks();
    }
}

/**
 * Show review task modal
 */
function showReviewTaskModal() {
    const modal = document.getElementById('reviewTaskModal');
    if (modal) {
        modal.classList.add('active');
        loadReviewableTasks();
    }
}

/**
 * Load task assignees for add task form
 */
async function loadTaskAssignees() {
    try {
        const response = await apiRequest(`/api/groups/${currentGroupId}/members`);
        if (!response.success) return;
        
        const members = response.data || [];
        const assigneesContainer = document.getElementById('taskAssignees');
        
        if (!assigneesContainer || !members.length) return;
        
        const assigneesHTML = members.map(member => `
            <label class="assignee-item">
                <input type="checkbox" value="${member.id}" name="assignees">
                <span class="assignee-name">${member.displayName}</span>
            </label>
        `).join('');
        
        assigneesContainer.innerHTML = assigneesHTML;
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดข้อมูลสมาชิก:', error);
    }
}

/**
 * Load submitable tasks
 */
async function loadSubmitableTasks() {
    try {
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/groups/${currentGroupId}/tasks?status=pending`);
        if (!response.success) throw new Error('ไม่สามารถโหลดงานที่ส่งได้');
        
        const submitableTasks = response.data || [];
        
        const submitTaskSelect = document.getElementById('submitTaskId');
        if (submitTaskSelect) {
            submitTaskSelect.innerHTML = '<option value="">เลือกงาน</option>' +
                submitableTasks.map(task => `<option value="${task.id}">${task.title}</option>`).join('');
        }
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดงานที่ส่งได้:', error);
    }
}

/**
 * Load reviewable tasks
 */
async function loadReviewableTasks() {
    try {
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/groups/${currentGroupId}/tasks?status=pending`);
        if (!response.success) throw new Error('ไม่สามารถโหลดงานที่ตรวจได้');
        
        const reviewableTasks = response.data || [];
        
        const reviewTaskSelect = document.getElementById('reviewTaskId');
        if (reviewTaskSelect) {
            reviewTaskSelect.innerHTML = '<option value="">เลือกงาน</option>' +
                reviewableTasks.map(task => `<option value="${task.id}">${task.title}</option>`).join('');
        }
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดงานที่ตรวจได้:', error);
    }
}

/**
 * Handle add task form submission
 */
async function handleAddTask(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            priority: formData.get('priority'),
            dueDate: formData.get('dueDate'),
            assignees: Array.from(formData.getAll('assignees')),
            groupId: currentGroupId
        };
        
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/groups/${currentGroupId}/tasks`, {
            method: 'POST',
            body: taskData
        });
        
        if (!response.success) throw new Error('ไม่สามารถเพิ่มงานได้');
        
        showToast('เพิ่มงานสำเร็จ', 'success');
        
        // Close modal
        const modal = document.getElementById('addTaskModal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        // Reset form
        e.target.reset();
        
        // Reload dashboard data
        await loadDashboardData();
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการเพิ่มงาน:', error);
        showToast('เกิดข้อผิดพลาดในการเพิ่มงาน', 'error');
    }
}

/**
 * Handle submit task form submission
 */
async function handleSubmitTask(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const submitData = {
            taskId: formData.get('taskId'),
            comment: formData.get('comment'),
            files: formData.getAll('files')
        };
        
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/api/groups/${currentGroupId}/tasks/${submitData.taskId}/submit`, {
            method: 'POST',
            body: submitData
        });
        
        if (!response.success) throw new Error('ไม่สามารถส่งงานได้');
        
        showToast('ส่งงานสำเร็จ', 'success');
        
        // Close modal
        const modal = document.getElementById('submitTaskModal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        // Reset form
        e.target.reset();
        
        // Reload dashboard data
        await loadDashboardData();
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการส่งงาน:', error);
        showToast('เกิดข้อผิดพลาดในการส่งงาน', 'error');
    }
}

/**
 * Handle review task form submission
 */
async function handleReviewTask(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const reviewData = {
            taskId: formData.get('taskId'),
            comment: formData.get('comment'),
            newDueDate: formData.get('newDueDate')
        };
        
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/api/groups/${currentGroupId}/tasks/${reviewData.taskId}`, {
            method: 'PUT',
            body: reviewData
        });
        
        if (!response.success) throw new Error('ไม่สามารถตรวจงานได้');
        
        showToast('ตรวจงานสำเร็จ', 'success');
        
        // Close modal
        const modal = document.getElementById('reviewTaskModal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        // Reset form
        e.target.reset();
        
        // Reload dashboard data
        await loadDashboardData();
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการตรวจงาน:', error);
        showToast('เกิดข้อผิดพลาดในการตรวจงาน', 'error');
    }
}

/**
 * Show task detail modal
 */
async function showTaskDetail(taskId) {
    try {
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/api/groups/${currentGroupId}/tasks/${taskId}`);
        if (!response.success) throw new Error('ไม่สามารถโหลดรายละเอียดงานได้');
        
        const task = response.data;
        
        // Update modal content
        const modalTitle = document.getElementById('taskModalTitle');
        const modalBody = document.getElementById('taskModalBody');
        
        if (modalTitle) modalTitle.textContent = task.title;
        
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="task-detail">
                    <div class="task-info">
                        <p><strong>รายละเอียด:</strong> ${task.description || 'ไม่มีรายละเอียด'}</p>
                        <p><strong>สถานะ:</strong> <span class="task-status ${task.status}">${getStatusText(task.status)}</span></p>
                        <p><strong>ระดับความสำคัญ:</strong> ${getPriorityText(task.priority)}</p>
                        <p><strong>กำหนดส่ง:</strong> ${formatDate(task.dueDate)}</p>
                        <p><strong>ผู้รับผิดชอบ:</strong> ${task.assignees?.map(a => a.displayName).join(', ') || 'ไม่ระบุ'}</p>
                    </div>
                </div>
            `;
        }
        
        // Show modal
        const modal = document.getElementById('taskModal');
        if (modal) {
            modal.classList.add('active');
        }
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดรายละเอียดงาน:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดรายละเอียดงาน', 'error');
    }
}

/**
 * Get priority text in Thai
 */
function getPriorityText(priority) {
    const priorityMap = {
        'low': 'ต่ำ',
        'medium': 'ปานกลาง',
        'high': 'สูง'
    };
    return priorityMap[priority] || priority;
}

// Placeholder functions for view-specific data loading
async function loadCalendarData() {
    try {
        const currentDate = new Date();
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        
        const response = await apiRequest(`/api/groups/${currentGroupId}/calendar?month=${month}&year=${year}`);
        if (response.success) {
            // Update calendar display
            updateCalendarDisplay(response.data);
        }
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดข้อมูลปฏิทิน:', error);
    }
}

async function loadTasksData() {
    try {
        const response = await apiRequest(`/api/groups/${currentGroupId}/tasks`);
        if (response.success) {
            // Update tasks list
            updateTasksList(response.data);
        }
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดข้อมูลงาน:', error);
    }
}

async function loadFilesData() {
    try {
        const response = await apiRequest(`/api/groups/${currentGroupId}/files`);
        if (response.success) {
            // Update files grid
            updateFilesGrid(response.data);
        }
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดข้อมูลไฟล์:', error);
    }
}

async function loadLeaderboardData() {
    try {
        const response = await apiRequest(`/api/groups/${currentGroupId}/leaderboard?period=weekly`);
        if (response.success) {
            // Update leaderboard list
            updateLeaderboardList(response.data);
        }
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดข้อมูลอันดับ:', error);
    }
}

async function loadReportsData() {
    try {
        // Load reports data
        console.log('Loading reports data...');
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดข้อมูลรายงาน:', error);
    }
}

// Helper functions for updating UI
function updateCalendarDisplay(calendarData) {
    // Implementation for calendar display
    console.log('Updating calendar display:', calendarData);
}

function updateTasksList(tasksData) {
    // Implementation for tasks list
    console.log('Updating tasks list:', tasksData);
}

function updateFilesGrid(filesData) {
    // Implementation for files grid
    console.log('Updating files grid:', filesData);
}

function updateLeaderboardList(leaderboardData) {
    // Implementation for leaderboard list
    console.log('Updating leaderboard list:', leaderboardData);
}

// Handle browser back/forward buttons
window.addEventListener('popstate', function() {
    const hash = window.location.hash.slice(1);
    if (hash) {
        switchView(hash);
    }
});

// Handle initial hash
if (window.location.hash) {
    const hash = window.location.hash.slice(1);
    setTimeout(() => switchView(hash), 100);
}
