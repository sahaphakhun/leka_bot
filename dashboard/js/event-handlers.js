/**
 * Event Handlers for Dashboard
 * ============================
 */

// ==================== 
// Navigation Events
// ==================== 

/**
 * Bind navigation events
 */
function bindNavigationEvents() {
  // Sidebar navigation
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const view = this.getAttribute('data-view');
      if (view && window.dashboardInstance) {
        window.dashboardInstance.switchView(view);
      }
    });
  });

  // Mobile bottom navigation
  const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
  bottomNavItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const view = this.getAttribute('data-view');
      if (view && window.dashboardInstance) {
        window.dashboardInstance.switchView(view);
      }
    });
  });

  // Mobile menu toggle
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', function() {
      sidebar.classList.toggle('open');
      this.classList.toggle('active');
      if (sidebarOverlay) {
        sidebarOverlay.classList.toggle('active');
      }
    });
  }

  // Sidebar overlay click
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', function() {
      if (window.dashboardInstance) {
        window.dashboardInstance.closeMobileSidebar();
      }
    });
  }
}

// ==================== 
// Dashboard View Events
// ==================== 

/**
 * Bind dashboard view events
 */
function bindDashboardViewEvents() {
  // Add task button
  const addTaskBtn = document.getElementById('addTaskBtn');
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', function() {
      if (window.dashboardInstance) {
        window.dashboardInstance.openAddTaskModal();
      }
    });
  }

  // Refresh stats button
  const refreshStatsBtn = document.getElementById('refreshStatsBtn');
  if (refreshStatsBtn) {
    refreshStatsBtn.addEventListener('click', function() {
      if (window.dashboardInstance) {
        window.dashboardInstance.loadStats();
      }
    });
  }
}

// ==================== 
// Calendar View Events
// ==================== 

/**
 * Bind calendar view events
 */
function bindCalendarViewEvents() {
  // Calendar navigation
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  const todayBtn = document.getElementById('todayBtn');

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', function() {
      if (window.dashboardInstance) {
        window.dashboardInstance.previousMonth();
      }
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', function() {
      if (window.dashboardInstance) {
        window.dashboardInstance.nextMonth();
      }
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener('click', function() {
      if (window.dashboardInstance) {
        window.dashboardInstance.goToToday();
      }
    });
  }

  // Calendar event clicks
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('calendar-event')) {
      const taskId = e.target.getAttribute('data-task-id');
      if (taskId && window.dashboardInstance) {
        window.dashboardInstance.openTaskModal(taskId);
      }
    }
  });
}

// ==================== 
// Tasks View Events
// ==================== 

/**
 * Bind tasks view events
 */
function bindTasksViewEvents() {
  // Task filters
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const filter = this.getAttribute('data-filter');
      if (filter && window.dashboardInstance) {
        window.dashboardInstance.filterTasks(filter);
      }
    });
  });

  // Task search
  const taskSearch = document.getElementById('taskSearch');
  if (taskSearch) {
    taskSearch.addEventListener('input', function() {
      const query = this.value.trim();
      if (window.dashboardInstance) {
        window.dashboardInstance.searchTasks(query);
      }
    });
  }

  // Task sorting
  const sortSelect = document.getElementById('taskSort');
  if (sortSelect) {
    sortSelect.addEventListener('change', function() {
      const sortBy = this.value;
      if (sortBy && window.dashboardInstance) {
        window.dashboardInstance.sortTasks(sortBy);
      }
    });
  }
}

// ==================== 
// Files View Events
// ==================== 

/**
 * Bind files view events
 */
function bindFilesViewEvents() {
  // Upload file button
  const uploadFileBtn = document.getElementById('uploadFileBtn');
  if (uploadFileBtn) {
    uploadFileBtn.addEventListener('click', function() {
      if (window.dashboardInstance) {
        window.dashboardInstance.openUploadModal();
      }
    });
  }

  // File search
  const fileSearch = document.getElementById('fileSearch');
  if (fileSearch) {
    fileSearch.addEventListener('input', function() {
      const query = this.value.trim();
      if (window.dashboardInstance) {
        window.dashboardInstance.searchFiles(query);
      }
    });
  }

  // File sorting
  const fileSort = document.getElementById('fileSort');
  if (fileSort) {
    fileSort.addEventListener('change', function() {
      const sortBy = this.value;
      if (sortBy && window.dashboardInstance) {
        window.dashboardInstance.sortFiles(sortBy);
      }
    });
  }
}

// ==================== 
// Leaderboard View Events
// ==================== 

/**
 * Bind leaderboard view events
 */
function bindLeaderboardViewEvents() {
  // Period selection
  const periodButtons = document.querySelectorAll('[data-period]');
  periodButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const period = this.getAttribute('data-period');
      if (period && window.dashboardInstance) {
        window.dashboardInstance.loadLeaderboard(period);
      }
    });
  });
}

// ==================== 
// Reports View Events
// ==================== 

/**
 * Bind reports view events
 */
function bindReportsViewEvents() {
  // Generate report button
  const generateReportBtn = document.getElementById('generateReportBtn');
  if (generateReportBtn) {
    generateReportBtn.addEventListener('click', function() {
      if (window.dashboardInstance) {
        window.dashboardInstance.generateReport();
      }
    });
  }

  // Report period selection
  const reportPeriodSelect = document.getElementById('reportPeriod');
  if (reportPeriodSelect) {
    reportPeriodSelect.addEventListener('change', function() {
      const period = this.value;
      if (period && window.dashboardInstance) {
        window.dashboardInstance.updateReport(period);
      }
    });
  }
}

// ==================== 
// Global Events
// ==================== 

/**
 * Bind global events
 */
function bindGlobalEvents() {
  // Window resize
  window.addEventListener('resize', function() {
    if (window.dashboardInstance) {
      window.dashboardInstance.handleResize();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    // Escape key to close modals
    if (e.key === 'Escape') {
      if (window.dashboardInstance) {
        window.dashboardInstance.closeAllModals();
      }
    }

    // Ctrl/Cmd + N for new task
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      if (window.dashboardInstance) {
        window.dashboardInstance.openAddTaskModal();
      }
    }

    // Ctrl/Cmd + F for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const searchInput = document.querySelector('.search-input');
      if (searchInput) {
        searchInput.focus();
      }
    }
  });

  // Click outside to close dropdowns
  document.addEventListener('click', function(e) {
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });
  });
}

// ==================== 
// Main Event Binding
// ==================== 

/**
 * Bind all events
 */
function bindAllEvents() {
  console.log('🔗 Binding dashboard events...');
  
  bindNavigationEvents();
  bindDashboardViewEvents();
  bindCalendarViewEvents();
  bindTasksViewEvents();
  bindFilesViewEvents();
  bindLeaderboardViewEvents();
  bindReportsViewEvents();
  bindGlobalEvents();
  
  console.log('✅ All events bound successfully');
}

// ==================== 
// Export
// ==================== 

// Export สำหรับใช้ในไฟล์อื่น
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    bindAllEvents,
    bindNavigationEvents,
    bindDashboardViewEvents,
    bindCalendarViewEvents,
    bindTasksViewEvents,
    bindFilesViewEvents,
    bindLeaderboardViewEvents,
    bindReportsViewEvents,
    bindGlobalEvents
  };
} else {
  // Browser environment - เพิ่มเข้าไปใน global scope
  window.DashboardEventHandlers = {
    bindAllEvents,
    bindNavigationEvents,
    bindDashboardViewEvents,
    bindCalendarViewEvents,
    bindTasksViewEvents,
    bindFilesViewEvents,
    bindLeaderboardViewEvents,
    bindReportsViewEvents,
    bindGlobalEvents
  };
}
