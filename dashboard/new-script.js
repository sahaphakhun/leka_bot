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
        
        // Auto-sync leaderboard scores when dashboard loads
        await autoSyncLeaderboard();
        
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
 * Auto-sync leaderboard scores when dashboard loads
 * อัพเดทคะแนนอัตโนมัติเมื่อเปิดแดชบอร์ด
 */
async function autoSyncLeaderboard() {
    try {
        console.log('🔄 Auto-syncing leaderboard scores...');
        
        // ตรวจสอบว่าควรซิงค์หรือไม่ (ซิงค์ทุก 5 นาที)
        const now = Date.now();
        const syncInterval = 5 * 60 * 1000; // 5 นาที
        
        if (lastLeaderboardSync && (now - lastLeaderboardSync) < syncInterval) {
            console.log('⏰ Leaderboard recently synced, skipping auto-sync');
            return;
        }
        
        // แสดงสถานะการซิงค์
        const syncBtn = document.getElementById('syncLeaderboardBtn');
        if (syncBtn) {
            const originalText = syncBtn.textContent;
            syncBtn.textContent = '🔄 ซิงค์...';
            syncBtn.disabled = true;
            
            try {
                // เรียก API sync-leaderboard
                const response = await apiRequest(`/api/groups/${currentGroupId}/sync-leaderboard`, {
                    method: 'POST',
                    body: { period: 'weekly' }
                });
                
                if (response.success) {
                    console.log('✅ Auto-sync leaderboard successful:', response.data);
                    lastLeaderboardSync = now;
                    
                    // อัพเดท mini leaderboard ทันที
                    await loadMiniLeaderboard();
                    
                    showToast('อัพเดทคะแนนเรียบร้อยแล้ว', 'success');
                } else {
                    console.warn('⚠️ Auto-sync leaderboard failed:', response.error);
                }
            } finally {
                // คืนค่าปุ่มเดิม
                syncBtn.textContent = originalText;
                syncBtn.disabled = false;
            }
        }
        
    } catch (error) {
        console.error('❌ Error auto-syncing leaderboard:', error);
        // ไม่แสดง error toast เพื่อไม่ให้รบกวนผู้ใช้
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
        // Auto-sync leaderboard scores before loading data
        await autoSyncLeaderboard();
        
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
        // Fallback: แสดงข้อมูลเป็น 0
        updateStats({
            total: 0,
            pending: 0,
            completed: 0,
            overdue: 0
        });
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
        // Fallback: แสดงข้อความว่าไม่มีข้อมูล
        updateUpcomingTasks([]);
    }
}

/**
 * Load mini leaderboard
 */
async function loadMiniLeaderboard() {
    try {
        console.log('🔄 Loading mini leaderboard...');
        
        // แสดงสถานะการโหลด
        const miniLeaderboardContainer = document.getElementById('miniLeaderboard');
        if (miniLeaderboardContainer) {
            miniLeaderboardContainer.innerHTML = '<div class="text-center text-gray-500">🔄 กำลังโหลด...</div>';
        }
        
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/api/groups/${currentGroupId}/leaderboard?period=weekly&limit=3`);
        if (!response.success) throw new Error('ไม่สามารถโหลดอันดับได้');
        
        console.log('✅ Mini leaderboard loaded:', response.data);
        
        // Update UI
        updateMiniLeaderboard(response.data);
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดอันดับ:', error);
        
        // แสดงข้อความ error ที่เป็นประโยชน์
        const miniLeaderboardContainer = document.getElementById('miniLeaderboard');
        if (miniLeaderboardContainer) {
            miniLeaderboardContainer.innerHTML = `
                <div class="text-center text-red-500">
                    <div>❌ ไม่สามารถโหลดอันดับได้</div>
                    <button onclick="loadMiniLeaderboard()" class="btn btn-sm mt-2">ลองใหม่</button>
                </div>
            `;
        }
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
    
    // Close view task modal button
    const closeViewTaskBtn = document.getElementById('closeViewTask');
    if (closeViewTaskBtn) {
        closeViewTaskBtn.addEventListener('click', function() {
            const modal = document.getElementById('viewTaskModal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    }
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
    
    const tasksHTML = tasks.map(task => {
        // แสดงชื่อผู้รับผิดชอบจาก assignedUsers หรือ assignees
        let assigneeNames = 'ไม่ระบุ';
        if (task.assignedUsers && task.assignedUsers.length > 0) {
            assigneeNames = task.assignedUsers.map(user => user.displayName || user.name || 'ไม่ทราบชื่อ').join(', ');
        } else if (task.assignees && task.assignees.length > 0) {
            assigneeNames = task.assignees.map(user => user.displayName || user.name || 'ไม่ทราบชื่อ').join(', ');
        } else if (task.assignee) {
            assigneeNames = task.assignee;
        }
        
        return `
            <div class="task-item" onclick="showTaskDetail('${task.id}')">
                <div class="task-header">
                    <h4 class="task-title">${task.title}</h4>
                    <span class="task-status ${task.status}">${getStatusText(task.status)}</span>
                </div>
                <div class="task-meta">
                    <span><i class="fas fa-user"></i> ${assigneeNames}</span>
                    <span><i class="fas fa-clock"></i> ${formatDate(task.dueDate)}</span>
                </div>
            </div>
        `;
    }).join('');
    
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
    
    const leaderboardHTML = leaderboardData.slice(0, 3).map((entry, index) => {
        // ใช้คะแนนที่ถูกต้องตาม API response
        const score = entry.weeklyPoints || entry.monthlyPoints || entry.totalPoints || 0;
        const tasksCompleted = entry.tasksCompleted || 0;
        
        return `
            <div class="leaderboard-item">
                <div class="leaderboard-rank rank-${index + 1}">${index + 1}</div>
                <div class="leaderboard-user">
                    <div class="leaderboard-name">${entry.displayName}</div>
                    <div class="leaderboard-role">${entry.role || 'สมาชิก'}</div>
                </div>
                <div class="leaderboard-score">
                    <div class="score-points">${score} คะแนน</div>
                    <div class="score-tasks">${tasksCompleted} งาน</div>
                </div>
            </div>
        `;
    }).join('');
    
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
 * Sync leaderboard manually
 */
async function syncLeaderboard() {
    try {
        console.log('🔄 Manual leaderboard sync started...');
        showToast('กำลังซิงค์คะแนน...', 'info');
        
        // อัพเดทสถานะปุ่ม
        const syncBtn = document.getElementById('syncLeaderboardBtn');
        if (syncBtn) {
            const originalText = syncBtn.textContent;
            syncBtn.textContent = '🔄 ซิงค์...';
            syncBtn.disabled = true;
            
            try {
                // ใช้ API ที่มีอยู่จริง
                const response = await apiRequest(`/api/groups/${currentGroupId}/sync-leaderboard`, {
                    method: 'POST',
                    body: { period: 'weekly' }
                });
                
                if (!response.success) throw new Error('ไม่สามารถซิงค์คะแนนได้');
                
                console.log('✅ Manual sync successful:', response.data);
                showToast('ซิงค์คะแนนสำเร็จ', 'success');
                
                // อัพเดทเวลาที่ซิงค์ล่าสุด
                lastLeaderboardSync = Date.now();
                
                // Reload leaderboard data
                if (currentView === 'leaderboard') {
                    await loadLeaderboardData();
                } else {
                    await loadMiniLeaderboard();
                }
                
            } finally {
                // คืนค่าปุ่มเดิม
                syncBtn.textContent = originalText;
                syncBtn.disabled = false;
            }
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
 * Show task detail modal
 */
async function showTaskDetail(taskId) {
    try {
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/api/groups/${currentGroupId}/tasks/${taskId}`);
        if (!response.success) throw new Error('ไม่สามารถโหลดรายละเอียดงานได้');
        
        const task = response.data;
        
        // Update modal content
        const modalContent = document.getElementById('viewTaskContent');
        
        if (modalContent) {
            // แสดงชื่อผู้รับผิดชอบจาก assignedUsers หรือ assignees
            let assigneeNames = 'ไม่ระบุ';
            if (task.assignedUsers && task.assignedUsers.length > 0) {
                assigneeNames = task.assignedUsers.map(user => user.displayName || user.name || 'ไม่ทราบชื่อ').join(', ');
            } else if (task.assignees && task.assignees.length > 0) {
                assigneeNames = task.assignees.map(user => user.displayName || user.name || 'ไม่ทราบชื่อ').join(', ');
            } else if (task.assignee) {
                assigneeNames = task.assignee;
            }

            modalContent.innerHTML = `
                <div class="task-detail">
                    <div class="task-header">
                        <h4 class="task-title">${task.title}</h4>
                        <span class="task-status ${task.status}">${getStatusText(task.status)}</span>
                    </div>
                    <div class="task-info">
                        <p><strong>รายละเอียด:</strong> ${task.description || 'ไม่มีรายละเอียด'}</p>
                        <p><strong>สถานะ:</strong> <span class="task-status ${task.status}">${getStatusText(task.status)}</span></p>
                        <p><strong>ระดับความสำคัญ:</strong> ${getPriorityText(task.priority)}</p>
                        <p><strong>กำหนดส่ง:</strong> ${formatDate(task.dueDate)}</p>
                        <p><strong>ผู้รับผิดชอบ:</strong> ${assigneeNames}</p>
                    </div>
                    <div class="task-note">
                        <p><em>หมายเหตุ: การอนุมัติงานต้องทำผ่านแชทส่วนตัวกับบอทเท่านั้น</em></p>
                    </div>
                </div>
            `;
        }
        
        // Show modal
        const modal = document.getElementById('viewTaskModal');
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
        
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/api/groups/${currentGroupId}/calendar?month=${month}&year=${year}`);
        if (response.success) {
            // Update calendar display
            updateCalendarDisplay(response.data);
        } else {
            // Fallback: โหลดงานทั้งหมดแล้วกรองตามเดือน
            const tasksResponse = await apiRequest(`/api/groups/${currentGroupId}/tasks`);
            if (tasksResponse.success) {
                const tasks = tasksResponse.data;
                const monthTasks = tasks.filter(task => {
                    if (!task.dueDate) return false;
                    const taskDate = new Date(task.dueDate);
                    return taskDate.getMonth() + 1 === month && taskDate.getFullYear() === year;
                });
                
                updateCalendarDisplay({ tasks: monthTasks });
            }
        }
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดข้อมูลปฏิทิน:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลปฏิทิน', 'error');
    }
}

async function loadTasksData() {
    try {
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/api/groups/${currentGroupId}/tasks`);
        if (response.success) {
            // Update tasks list
            updateTasksList(response.data);
        } else {
            // Fallback: แสดงข้อความว่าไม่มีข้อมูล
            updateTasksList([]);
        }
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดข้อมูลงาน:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลงาน', 'error');
        updateTasksList([]);
    }
}

async function loadFilesData() {
    try {
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/api/groups/${currentGroupId}/files`);
        if (response.success) {
            // Update files grid
            updateFilesGrid(response.data);
        } else {
            // Fallback: แสดงข้อความว่าไม่มีข้อมูล
            updateFilesGrid([]);
        }
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดข้อมูลไฟล์:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลไฟล์', 'error');
        updateFilesGrid([]);
    }
}

async function loadLeaderboardData() {
    try {
        console.log('🔄 Loading full leaderboard data...');
        
        // แสดงสถานะการโหลด
        const leaderboardList = document.getElementById('leaderboardList');
        if (leaderboardList) {
            leaderboardList.innerHTML = '<div class="text-center text-gray-500">🔄 กำลังโหลดข้อมูลอันดับ...</div>';
        }
        
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/api/groups/${currentGroupId}/leaderboard?period=weekly`);
        if (response.success) {
            console.log('✅ Full leaderboard loaded:', response.data);
            // Update leaderboard list
            updateLeaderboardList(response.data);
        } else {
            console.warn('⚠️ Leaderboard API returned error:', response.error);
            // Fallback: แสดงข้อความว่าไม่มีข้อมูล
            updateLeaderboardList([]);
        }
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดข้อมูลอันดับ:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลอันดับ', 'error');
        
        // แสดงข้อความ error ที่เป็นประโยชน์
        const leaderboardList = document.getElementById('leaderboardList');
        if (leaderboardList) {
            leaderboardList.innerHTML = `
                <div class="text-center text-red-500">
                    <div>❌ ไม่สามารถโหลดข้อมูลอันดับได้</div>
                    <button onclick="loadLeaderboardData()" class="btn btn-sm mt-2">ลองใหม่</button>
                </div>
            `;
        }
    }
}

async function loadReportsData() {
    try {
        const period = document.getElementById('reportPeriodSelect')?.value || 'weekly';
        const userId = document.getElementById('reportUserSelect')?.value || '';
        
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/api/groups/${currentGroupId}/reports/summary?period=${period}${userId ? `&userId=${userId}` : ''}`);
        if (!response.success) throw new Error('ไม่สามารถโหลดข้อมูลรายงานได้');
        
        // Update reports display
        updateReportsDisplay(response.data);
        
        // Load user-specific reports if user is selected
        if (userId) {
            const userResponse = await apiRequest(`/api/groups/${currentGroupId}/reports/by-users?userId=${userId}&period=${period}`);
            if (userResponse.success) {
                updateUserReportsTable(userResponse.data);
            }
        }
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดข้อมูลรายงาน:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลรายงาน', 'error');
    }
}

/**
 * Update reports display
 */
function updateReportsDisplay(reportsData) {
    // Update summary stats
    const repCompleted = document.getElementById('repCompleted');
    const repEarly = document.getElementById('repEarly');
    const repOntime = document.getElementById('repOntime');
    const repOverdue = document.getElementById('repOverdue');
    
    if (repCompleted) repCompleted.textContent = reportsData.completed || 0;
    if (repEarly) repEarly.textContent = reportsData.early || 0;
    if (repOntime) repOntime.textContent = reportsData.onTime || 0;
    if (repOverdue) repOverdue.textContent = reportsData.overdue || 0;
    
    // Update charts if available
    updateReportsCharts(reportsData);
}

/**
 * Update user reports table
 */
function updateUserReportsTable(userReportsData) {
    const repUsersTable = document.getElementById('repUsersTable');
    
    if (!repUsersTable) return;
    
    if (!userReportsData || userReportsData.length === 0) {
        repUsersTable.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500">ไม่มีข้อมูล</td></tr>';
        return;
    }
    
    const tableRows = userReportsData.map(user => {
        // แสดงชื่อผู้รับผิดชอบจาก assignedUsers หรือ assignees
        let assigneeNames = 'ไม่ระบุ';
        if (user.assignedUsers && user.assignedUsers.length > 0) {
            assigneeNames = user.assignedUsers.map(u => u.displayName || u.name || 'ไม่ทราบชื่อ').join(', ');
        } else if (user.assignees && user.assignees.length > 0) {
            assigneeNames = user.assignees.map(u => u.displayName || u.name || 'ไม่ทราบชื่อ').join(', ');
        } else if (user.assignee) {
            assigneeNames = user.assignee;
        }
        
        return `
            <tr>
                <td>${user.displayName || user.name || 'ไม่ทราบชื่อ'}</td>
                <td>${user.completedTasks || 0}</td>
                <td>${user.earlyTasks || 0}</td>
                <td>${user.onTimeTasks || 0}</td>
                <td>${user.lateTasks || 0}</td>
                <td>${user.overdueTasks || 0}</td>
            </tr>
        `;
    }).join('');
    
    repUsersTable.innerHTML = tableRows;
}

/**
 * Update reports charts
 */
function updateReportsCharts(reportsData) {
    // Implementation for charts (Chart.js or similar)
    console.log('Updating reports charts:', reportsData);
}

// Helper functions for updating UI
function updateCalendarDisplay(calendarData) {
    const calendarGrid = document.getElementById('calendarGrid');
    
    if (!calendarGrid) return;
    
    if (!calendarData || !calendarData.tasks || calendarData.tasks.length === 0) {
        calendarGrid.innerHTML = '<p class="text-center text-gray-500">ไม่มีงานในเดือนนี้</p>';
        return;
    }
    
    // สร้างปฏิทินแบบตาราง
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    let calendarHTML = '<div class="calendar-header">';
    ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].forEach(day => {
        calendarHTML += `<div class="calendar-day-header">${day}</div>`;
    });
    calendarHTML += '</div>';
    
    calendarHTML += '<div class="calendar-body">';
    
    for (let week = 0; week < 6; week++) {
        calendarHTML += '<div class="calendar-week">';
        for (let day = 0; day < 7; day++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + week * 7 + day);
            
            const isCurrentMonth = currentDate.getMonth() === month;
            const dateString = currentDate.toISOString().split('T')[0];
            const dayTasks = calendarData.tasks.filter(task => {
                const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
                return taskDate === dateString;
            });
            
            calendarHTML += `
                <div class="calendar-day ${isCurrentMonth ? 'current-month' : 'other-month'}">
                    <div class="calendar-date">${currentDate.getDate()}</div>
                    ${dayTasks.map(task => {
                        // แสดงชื่อผู้รับผิดชอบจาก assignedUsers หรือ assignees
                        let assigneeNames = 'ไม่ระบุ';
                        if (task.assignedUsers && task.assignedUsers.length > 0) {
                            assigneeNames = task.assignedUsers.map(user => user.displayName || user.name || 'ไม่ทราบชื่อ').join(', ');
                        } else if (task.assignees && task.assignees.length > 0) {
                            assigneeNames = task.assignees.map(user => user.displayName || user.name || 'ไม่ทราบชื่อ').join(', ');
                        } else if (task.assignee) {
                            assigneeNames = task.assignee;
                        }
                        
                        return `
                            <div class="calendar-task" onclick="showTaskDetail('${task.id}')" title="${task.title} - ${assigneeNames}">
                                <div class="task-title">${task.title}</div>
                                <div class="task-assignee">${assigneeNames}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        calendarHTML += '</div>';
    }
    
    calendarHTML += '</div>';
    calendarGrid.innerHTML = calendarHTML;
}

function updateTasksList(tasksData) {
    const tasksListContainer = document.getElementById('tasksList');
    
    if (!tasksListContainer) return;
    
    if (!tasksData || tasksData.length === 0) {
        tasksListContainer.innerHTML = '<p class="text-center text-gray-500">ไม่มีงานในระบบ</p>';
        return;
    }
    
    const tasksHTML = tasksData.map(task => {
        // แสดงชื่อผู้รับผิดชอบจาก assignedUsers หรือ assignees
        let assigneeNames = 'ไม่ระบุ';
        if (task.assignedUsers && task.assignedUsers.length > 0) {
            assigneeNames = task.assignedUsers.map(user => user.displayName || user.name || 'ไม่ทราบชื่อ').join(', ');
        } else if (task.assignees && task.assignees.length > 0) {
            assigneeNames = task.assignees.map(user => user.displayName || user.name || 'ไม่ทราบชื่อ').join(', ');
        } else if (task.assignee) {
            assigneeNames = task.assignee;
        }
        
        return `
            <div class="task-item" onclick="showTaskDetail('${task.id}')">
                <div class="task-header">
                    <h4 class="task-title">${task.title}</h4>
                    <span class="task-status ${task.status}">${getStatusText(task.status)}</span>
                </div>
                <div class="task-meta">
                    <span><i class="fas fa-user"></i> ${assigneeNames}</span>
                    <span><i class="fas fa-clock"></i> ${formatDate(task.dueDate)}</span>
                    <span><i class="fas fa-flag"></i> ${getPriorityText(task.priority)}</span>
                </div>
                <div class="task-description">
                    ${task.description ? task.description.substring(0, 100) + (task.description.length > 100 ? '...' : '') : 'ไม่มีรายละเอียด'}
                </div>
            </div>
        `;
    }).join('');
    
    tasksListContainer.innerHTML = tasksHTML;
}

function updateFilesGrid(filesData) {
    const filesGridContainer = document.getElementById('filesGrid');
    
    if (!filesGridContainer) return;
    
    if (!filesData || filesData.length === 0) {
        filesGridContainer.innerHTML = '<p class="text-center text-gray-500">ไม่มีไฟล์ในระบบ</p>';
        return;
    }
    
    const filesHTML = filesData.map(file => {
        // แสดงชื่อผู้รับผิดชอบจาก assignedUsers หรือ assignees ของงานที่เกี่ยวข้อง
        let assigneeNames = 'ไม่ระบุ';
        if (file.task && file.task.assignedUsers && file.task.assignedUsers.length > 0) {
            assigneeNames = file.task.assignedUsers.map(user => user.displayName || user.name || 'ไม่ทราบชื่อ').join(', ');
        } else if (file.task && file.task.assignees && file.task.assignees.length > 0) {
            assigneeNames = file.task.assignees.map(user => user.displayName || user.name || 'ไม่ทราบชื่อ').join(', ');
        } else if (file.task && file.task.assignee) {
            assigneeNames = file.task.assignee;
        }
        
        return `
            <div class="file-item" onclick="showFileDetail('${file.id}')">
                <div class="file-icon">
                    <i class="fas ${getFileIcon(file.mimeType)}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${file.originalName}</div>
                    <div class="file-meta">
                        <span><i class="fas fa-user"></i> ${file.uploadedBy || 'ไม่ระบุ'}</span>
                        <span><i class="fas fa-clock"></i> ${formatDate(file.uploadedAt)}</span>
                    </div>
                    ${file.task ? `<div class="file-task">งาน: ${file.task.title} (${assigneeNames})</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    filesGridContainer.innerHTML = filesHTML;
}

/**
 * Get file icon based on MIME type
 */
function getFileIcon(mimeType) {
    if (!mimeType) return 'fa-file';
    
    if (mimeType.startsWith('image/')) return 'fa-image';
    if (mimeType.startsWith('video/')) return 'fa-video';
    if (mimeType.startsWith('audio/')) return 'fa-music';
    if (mimeType.includes('pdf')) return 'fa-file-pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'fa-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-file-excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fa-file-powerpoint';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'fa-file-archive';
    
    return 'fa-file';
}

function updateLeaderboardList(leaderboardData) {
    const leaderboardListContainer = document.getElementById('leaderboardList');
    
    if (!leaderboardListContainer) return;
    
    if (!leaderboardData || leaderboardData.length === 0) {
        leaderboardListContainer.innerHTML = '<p class="text-center text-gray-500">ไม่มีข้อมูลอันดับ</p>';
        return;
    }
    
    const leaderboardHTML = leaderboardData.map((entry, index) => {
        // ใช้คะแนนที่ถูกต้องตาม API response
        const weeklyPoints = entry.weeklyPoints || 0;
        const monthlyPoints = entry.monthlyPoints || 0;
        const totalPoints = entry.totalPoints || 0;
        const tasksCompleted = entry.tasksCompleted || 0;
        const tasksEarly = entry.tasksEarly || 0;
        const tasksOnTime = entry.tasksOnTime || 0;
        const tasksLate = entry.tasksLate || 0;
        const tasksOvertime = entry.tasksOvertime || 0;
        const tasksOverdue = entry.tasksOverdue || 0;
        
        return `
            <div class="leaderboard-item">
                <div class="leaderboard-rank rank-${index + 1}">${index + 1}</div>
                <div class="leaderboard-user">
                    <div class="leaderboard-name">${entry.displayName || entry.name || 'ไม่ทราบชื่อ'}</div>
                    <div class="leaderboard-role">${entry.role || 'สมาชิก'}</div>
                    <div class="leaderboard-stats">
                        <span><i class="fas fa-check"></i> เสร็จแล้ว: ${tasksCompleted}</span>
                        <span><i class="fas fa-clock"></i> ตรงเวลา: ${tasksOnTime}</span>
                        <span><i class="fas fa-exclamation-triangle"></i> เกินกำหนด: ${tasksOverdue}</span>
                        <span><i class="fas fa-star"></i> เร็ว: ${tasksEarly}</span>
                        <span><i class="fas fa-hourglass-half"></i> ช้า: ${tasksLate}</span>
                        <span><i class="fas fa-clock"></i> เกินเวลา: ${tasksOvertime}</span>
                    </div>
                </div>
                <div class="leaderboard-score">
                    <div class="score-number">${weeklyPoints}</div>
                    <div class="score-label">คะแนนสัปดาห์</div>
                    <div class="score-details">
                        <small>เดือน: ${monthlyPoints} | รวม: ${totalPoints}</small>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    leaderboardListContainer.innerHTML = leaderboardHTML;
}

// Handle browser back/forward buttons
window.addEventListener('popstate', function() {
    const hash = window.location.hash.slice(1);
    if (hash) {
        switchView(hash);
    }
});

/**
 * Show file detail modal
 */
async function showFileDetail(fileId) {
    try {
        // ใช้ API ที่มีอยู่จริง
        const response = await apiRequest(`/api/groups/${currentGroupId}/files/${fileId}`);
        if (!response.success) throw new Error('ไม่สามารถโหลดรายละเอียดไฟล์ได้');
        
        const file = response.data;
        
        // Update modal content
        const modalTitle = document.getElementById('fileViewerTitle');
        const modalContent = document.getElementById('fileViewerContent');
        
        if (modalTitle) modalTitle.textContent = file.originalName;
        
        if (modalContent) {
            // แสดงชื่อผู้รับผิดชอบจาก assignedUsers หรือ assignees ของงานที่เกี่ยวข้อง
            let assigneeNames = 'ไม่ระบุ';
            if (file.task && file.task.assignedUsers && file.task.assignedUsers.length > 0) {
                assigneeNames = file.task.assignedUsers.map(user => user.displayName || user.name || 'ไม่ทราบชื่อ').join(', ');
            } else if (file.task && file.task.assignees && file.task.assignees.length > 0) {
                assigneeNames = file.task.assignees.map(user => user.displayName || user.name || 'ไม่ทราบชื่อ').join(', ');
            } else if (file.task && file.task.assignee) {
                assigneeNames = file.task.assignee;
            }
            
            modalContent.innerHTML = `
                <div class="file-detail">
                    <div class="file-info">
                        <p><strong>ชื่อไฟล์:</strong> ${file.originalName}</p>
                        <p><strong>ขนาด:</strong> ${formatFileSize(file.size)}</p>
                        <p><strong>ประเภท:</strong> ${file.mimeType || 'ไม่ระบุ'}</p>
                        <p><strong>อัปโหลดโดย:</strong> ${file.uploadedBy || 'ไม่ระบุ'}</p>
                        <p><strong>วันที่อัปโหลด:</strong> ${formatDate(file.uploadedAt)}</p>
                        ${file.task ? `<p><strong>งานที่เกี่ยวข้อง:</strong> ${file.task.title}</p>` : ''}
                        ${file.task ? `<p><strong>ผู้รับผิดชอบ:</strong> ${assigneeNames}</p>` : ''}
                    </div>
                    <div class="file-preview">
                        ${getFilePreview(file)}
                    </div>
                </div>
            `;
        }
        
        // Show modal
        const modal = document.getElementById('fileViewerModal');
        if (modal) {
            modal.classList.add('active');
        }
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลดรายละเอียดไฟล์:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดรายละเอียดไฟล์', 'error');
    }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (!bytes) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file preview content
 */
function getFilePreview(file) {
    if (!file.mimeType) return '<p>ไม่สามารถแสดงตัวอย่างได้</p>';
    
    if (file.mimeType.startsWith('image/')) {
        return `<img src="/api/files/${file.id}/preview" alt="${file.originalName}" style="max-width: 100%; height: auto;">`;
    } else if (file.mimeType.startsWith('video/')) {
        return `<video controls style="max-width: 100%; height: auto;">
            <source src="/api/files/${file.id}/preview" type="${file.mimeType}">
            เบราว์เซอร์ของคุณไม่รองรับการเล่นวิดีโอ
        </video>`;
    } else if (file.mimeType.startsWith('audio/')) {
        return `<audio controls style="width: 100%;">
            <source src="/api/files/${file.id}/preview" type="${file.mimeType}">
            เบราว์เซอร์ของคุณไม่รองรับการเล่นเสียง
        </audio>`;
    } else if (file.mimeType.includes('pdf')) {
        return `<iframe src="/api/files/${file.id}/preview" width="100%" height="500" style="border: none;"></iframe>`;
    } else {
        return `<p>ไม่สามารถแสดงตัวอย่างไฟล์ประเภทนี้ได้</p>`;
    }
}

// Handle initial hash
if (window.location.hash) {
    const hash = window.location.hash.slice(1);
    setTimeout(() => switchView(hash), 100);
}
