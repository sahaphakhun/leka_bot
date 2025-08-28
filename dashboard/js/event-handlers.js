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
        // Close mobile sidebar after navigation
        if (window.innerWidth <= 768) {
          window.dashboardInstance.closeMobileSidebar();
        }
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
    menuToggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      sidebar.classList.toggle('open');
      this.classList.toggle('active');
      if (sidebarOverlay) {
        sidebarOverlay.classList.toggle('active');
      }
      
      // Prevent body scroll when sidebar is open
      if (sidebar.classList.contains('open')) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
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

  // Close sidebar on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (window.dashboardInstance) {
        window.dashboardInstance.closeMobileSidebar();
      }
    }
  });

  // Handle window resize
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      if (window.dashboardInstance) {
        window.dashboardInstance.closeMobileSidebar();
      }
    }
  });
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
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  
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

  // Calendar day clicks
  document.addEventListener('click', function(e) {
    if (e.target.closest('.calendar-day')) {
      const dayElement = e.target.closest('.calendar-day');
      const date = dayElement.getAttribute('data-date');
      if (date && window.dashboardInstance) {
        window.dashboardInstance.selectCalendarDate(date);
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
  // Add task button
  const addTaskBtn2 = document.getElementById('addTaskBtn2');
  if (addTaskBtn2) {
    addTaskBtn2.addEventListener('click', function() {
      if (window.dashboardInstance) {
        window.dashboardInstance.openAddTaskModal();
      }
    });
  }

  // Task item clicks
  document.addEventListener('click', function(e) {
    if (e.target.closest('.task-item')) {
      const taskElement = e.target.closest('.task-item');
      const taskId = taskElement.getAttribute('data-task-id');
      if (taskId && window.dashboardInstance) {
        window.dashboardInstance.openTaskDetails(taskId);
      }
    }
  });
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

  // File item clicks
  document.addEventListener('click', function(e) {
    if (e.target.closest('.file-item')) {
      const fileElement = e.target.closest('.file-item');
      const fileId = fileElement.getAttribute('data-file-id');
      if (fileId && window.dashboardInstance) {
        window.dashboardInstance.openFileDetails(fileId);
      }
    }
  });
}

// ==================== 
// Leaderboard View Events
// ==================== 

/**
 * Bind leaderboard view events
 */
function bindLeaderboardViewEvents() {
  // Period filter buttons
  const periodButtons = document.querySelectorAll('[data-period]');
  periodButtons.forEach(button => {
    button.addEventListener('click', function() {
      const period = this.getAttribute('data-period');
      if (period && window.dashboardInstance) {
        // Remove active class from all buttons
        periodButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        this.classList.add('active');
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
}

// ==================== 
// Recurring View Events
// ==================== 

/**
 * Bind recurring view events
 */
function bindRecurringViewEvents() {
  // Add recurring task button
  const addRecurringBtn = document.getElementById('addRecurringBtn');
  if (addRecurringBtn) {
    addRecurringBtn.addEventListener('click', function() {
      if (window.dashboardInstance) {
        window.dashboardInstance.openAddRecurringModal();
      }
    });
  }
}

// ==================== 
// Modal Events
// ==================== 

/**
 * Bind modal events
 */
function bindModalEvents() {
  // Modal close buttons
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-close') || 
        e.target.closest('.modal-close')) {
      const modal = e.target.closest('.modal');
      if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    }
  });

  // Modal overlay click
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  // Close modal on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.modal.active');
      if (activeModal) {
        activeModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    }
  });
}

// ==================== 
// Form Events
// ==================== 

/**
 * Bind form events
 */
function bindFormEvents() {
  // Form submissions
  document.addEventListener('submit', function(e) {
    if (e.target.classList.contains('dashboard-form')) {
      e.preventDefault();
      if (window.dashboardInstance) {
        window.dashboardInstance.handleFormSubmit(e.target);
      }
    }
  });

  // Form validation
  document.addEventListener('input', function(e) {
    if (e.target.classList.contains('form-input')) {
      if (window.dashboardInstance) {
        window.dashboardInstance.validateField(e.target);
      }
    }
  });
}

// ==================== 
// Utility Events
// ==================== 

/**
 * Bind utility events
 */
function bindUtilityEvents() {
  // Notifications button
  const notificationsBtn = document.getElementById('notificationsBtn');
  if (notificationsBtn) {
    notificationsBtn.addEventListener('click', function() {
      if (window.dashboardInstance) {
        window.dashboardInstance.toggleNotifications();
      }
    });
  }

  // Group selector
  const groupSelector = document.getElementById('groupSelector');
  if (groupSelector) {
    groupSelector.addEventListener('click', function() {
      if (window.dashboardInstance) {
        window.dashboardInstance.openGroupSelector();
      }
    });
  }

  // User menu
  const userMenu = document.getElementById('userMenu');
  if (userMenu) {
    userMenu.addEventListener('click', function() {
      if (window.dashboardInstance) {
        window.dashboardInstance.toggleUserMenu();
      }
    });
  }

  // Toast notifications
  document.addEventListener('click', function(e) {
    if (e.target.closest('.toast')) {
      const toast = e.target.closest('.toast');
      toast.remove();
    }
  });
}

// ==================== 
// Touch Events for Mobile
// ==================== 

/**
 * Bind touch events for mobile
 */
function bindTouchEvents() {
  let startX = 0;
  let startY = 0;
  let endX = 0;
  let endY = 0;

  // Touch start
  document.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  // Touch end
  document.addEventListener('touchend', function(e) {
    endX = e.changedTouches[0].clientX;
    endY = e.changedTouches[0].clientY;
    
    const diffX = startX - endX;
    const diffY = startY - endY;
    
    // Swipe left to right (open sidebar)
    if (diffX < -50 && Math.abs(diffY) < 50 && startX < 50) {
      if (window.innerWidth <= 768 && window.dashboardInstance) {
        window.dashboardInstance.openMobileSidebar();
      }
    }
    
    // Swipe right to left (close sidebar)
    if (diffX > 50 && Math.abs(diffY) < 50) {
      if (window.innerWidth <= 768 && window.dashboardInstance) {
        window.dashboardInstance.closeMobileSidebar();
      }
    }
  }, { passive: true });

  // Prevent zoom on double tap
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(e) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
}

// ==================== 
// Initialize All Events
// ==================== 

/**
 * Initialize all event handlers
 */
function initializeEventHandlers() {
  bindNavigationEvents();
  bindDashboardViewEvents();
  bindCalendarViewEvents();
  bindTasksViewEvents();
  bindFilesViewEvents();
  bindLeaderboardViewEvents();
  bindReportsViewEvents();
  bindRecurringViewEvents();
  bindModalEvents();
  bindFormEvents();
  bindUtilityEvents();
  bindTouchEvents();
  
  console.log('✅ Event handlers initialized');
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeEventHandlers,
    bindNavigationEvents,
    bindDashboardViewEvents,
    bindCalendarViewEvents,
    bindTasksViewEvents,
    bindFilesViewEvents,
    bindLeaderboardViewEvents,
    bindReportsViewEvents,
    bindRecurringViewEvents,
    bindModalEvents,
    bindFormEvents,
    bindUtilityEvents,
    bindTouchEvents
  };
}
