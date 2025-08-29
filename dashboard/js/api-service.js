/**
 * API Service for Dashboard
 * =========================
 */

class ApiService {
  constructor(apiBase = window.location.origin) {
    this.apiBase = apiBase;
  }

  /**
   * ส่ง API request
   */
  async apiRequest(endpoint, options = {}) {
    try {
      // ตรวจสอบว่า endpoint เริ่มต้นด้วย /api หรือไม่
      const fullEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
      const url = `${this.apiBase}${fullEndpoint}`;
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
        
        // Extract error message with better fallback
        let errorMessage = errorData.error || errorData.details || errorData.message;
        
        // If no specific error message, provide HTTP status-based message
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
   * โหลดข้อมูลผู้ใช้
   */
  async getUserInfo(userId) {
    try {
      const response = await this.apiRequest(`/api/users/${userId}`);
      return response.data || response;
    } catch (error) {
      console.error('Failed to load user info:', error);
      throw error;
    }
  }

  /**
   * โหลดข้อมูลกลุ่ม
   */
  async getGroupInfo(groupId) {
    try {
      const response = await this.apiRequest(`/api/groups/${groupId}`);
      return response.data || response;
    } catch (error) {
      console.error('Failed to load group info:', error);
      throw error;
    }
  }

  /**
   * โหลดสถิติ (alias สำหรับ loadStats)
   */
  async getStats(groupId, period = 'this_week') {
    return this.loadStats(groupId, period);
  }

  /**
   * โหลดสถิติ
   */
  async loadStats(groupId, period = 'this_week') {
    try {
      const response = await this.apiRequest(`/api/groups/${groupId}/stats?period=${period}`);
      return response.data || response;
    } catch (error) {
      console.error('Failed to load stats:', error);
      throw error;
    }
  }

  /**
   * โหลดงาน
   */
  async loadTasks(groupId, filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await this.apiRequest(`/api/groups/${groupId}/tasks?${queryParams}`);
      return {
        data: response.data || [],
        pagination: response.pagination
      };
    } catch (error) {
      console.error('Failed to load tasks:', error);
      throw error;
    }
  }

  /**
   * โหลดงานที่ใกล้ครบกำหนด
   */
  async loadUpcomingTasks(groupId, limit = 10) {
    try {
      const response = await this.apiRequest(`/api/groups/${groupId}/tasks?limit=${limit}`);
      const allTasks = response.data || [];
      
      // กรองเฉพาะงานที่ยังไม่เสร็จและเรียงตามวันที่ครบกำหนด
      const incompleteTasks = allTasks.filter(task => 
        ['pending', 'overdue', 'in_progress'].includes(task.status)
      );
      const sortedTasks = incompleteTasks.sort((a, b) => new Date(a.dueTime) - new Date(b.dueTime)).slice(0, limit);
      
      return sortedTasks;
    } catch (error) {
      console.error('Failed to load upcoming tasks:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลงานเฉพาะ
   */
  async getTask(taskId) {
    try {
      // Primary: matches backend route `/api/task/:taskId`
      try {
        const response = await this.apiRequest(`/api/task/${taskId}`);
        return response.data || response;
      } catch (primaryErr) {
        // Fallback for legacy/pluralized route if available
        try {
          const resp2 = await this.apiRequest(`/api/tasks/${taskId}`);
          return resp2.data || resp2;
        } catch (secondaryErr) {
          throw primaryErr;
        }
      }
    } catch (error) {
      console.error('Failed to get task:', error);
      throw error;
    }
  }

  /**
   * โหลดข้อมูลปฏิทิน
   */
  async loadCalendarEvents(groupId, month, year) {
    try {
      const response = await this.apiRequest(`/api/groups/${groupId}/calendar?month=${month}&year=${year}`);
      return response.data || [];
    } catch (error) {
      console.error('Failed to load calendar events:', error);
      throw error;
    }
  }

  /**
   * โหลดรายงานสรุปสำหรับกลุ่ม (แปลงให้อยู่ในรูปแบบที่ UI ใช้ได้ทันที)
   */
  async loadReports(groupId, period = 'weekly') {
    try {
      const resp = await this.apiRequest(`/api/groups/${groupId}/reports/summary?period=${period}`);
      const s = resp && resp.data ? resp.data : null;
      if (!s || !s.totals) return [];

      const totals = s.totals;
      const completionRate = typeof totals.completionRate === 'number' ? totals.completionRate : 0;
      const inferredTotal = completionRate > 0 ? Math.round((totals.completed * 100) / completionRate) : (totals.completed + (totals.overdue || 0));
      const nowIso = new Date().toISOString();
      return [
        {
          id: `summary-${period}`,
          title: period === 'monthly' ? 'สรุปรายงาน (รายเดือน)' : 'สรุปรายงาน (รายสัปดาห์)',
          generatedAt: nowIso,
          totalTasks: inferredTotal,
          completedTasks: totals.completed || 0,
          completionRate: Math.round((completionRate + Number.EPSILON) * 10) / 10
        }
      ];
    } catch (error) {
      console.error('Failed to load reports:', error);
      throw error;
    }
  }

  /**
   * โหลดไฟล์
   */
  async loadFiles(groupId, search = '') {
    try {
      const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await this.apiRequest(`/api/groups/${groupId}/files${queryParams}`);
      return response.data || [];
    } catch (error) {
      console.error('Failed to load files:', error);
      throw error;
    }
  }

  /**
   * โหลดข้อมูลอันดับ
   */
  async loadLeaderboard(groupId, period = 'weekly', limit = null) {
    try {
      console.log(`🔄 กำลังโหลด Leaderboard (${period})...`);
      let endpoint = `/api/groups/${groupId}/leaderboard?period=${period}`;
      if (limit) {
        endpoint += `&limit=${limit}`;
      }
      
      const response = await this.apiRequest(endpoint);
      console.log('📊 Leaderboard data received:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else {
        console.warn('⚠️ Leaderboard data is not an array:', response.data);
        return [];
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      throw error;
    }
  }

  /**
   * โหลดข้อมูลสมาชิกกลุ่ม
   */
  async loadGroupMembers(groupId) {
    try {
      console.log('🔄 เริ่มดึงข้อมูลสมาชิกกลุ่ม...');
      
      // ใช้ฟังก์ชัน hybrid ที่ใช้ทั้ง LINE API และฐานข้อมูล
      try {
        const lineResponse = await this.apiRequest(`/api/line/members/${groupId}`);
        if (lineResponse && lineResponse.data && lineResponse.data.length > 0) {
          console.log(`✅ ดึงข้อมูลจาก LINE API สำเร็จ: ${lineResponse.data.length} คน`);
          
          // แปลงข้อมูลจาก LINE API ให้เข้ากับ format เดิม
          const formattedMembers = lineResponse.data.map(member => ({
            id: member.userId,
            lineUserId: member.userId,
            displayName: member.displayName,
            pictureUrl: member.pictureUrl,
            source: member.source || 'line_api',
            lastUpdated: member.lastUpdated
          }));
          
          return formattedMembers;
        }
      } catch (lineError) {
        console.warn('⚠️ LINE API ไม่ทำงาน เปลี่ยนไปใช้ฐานข้อมูลแทน:', lineError);
      }

      // Fallback: ดึงจากฐานข้อมูล
      console.log('📊 ดึงข้อมูลสมาชิกจากฐานข้อมูล...');
      const response = await this.apiRequest(`/api/groups/${groupId}/members`);
      
      if (response && response.data) {
        // เพิ่ม source เป็น 'database'
        const formattedMembers = response.data.map(member => ({
          ...member,
          source: 'database',
          lastUpdated: new Date()
        }));
        
        return formattedMembers;
      } else {
        console.warn('⚠️ ไม่ได้รับข้อมูลสมาชิกจากฐานข้อมูล');
        return [];
      }
      
    } catch (error) {
      console.error('❌ Failed to load group members:', error);
      throw error;
    }
  }

  /**
   * สร้างงานใหม่
   */
  async createTask(groupId, taskData) {
    try {
      console.log('📝 Sending task data to API:', taskData);
      
      const response = await this.apiRequest(`/groups/${groupId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(taskData)
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  }

  /**
   * อัปเดตงาน
   */
  async updateTask(groupId, taskId, updateData) {
    try {
      const response = await this.apiRequest(`/api/groups/${groupId}/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  }

  /**
   * ส่งงาน
   */
  async submitTask(groupId, taskId, submitData) {
    try {
      const formData = new FormData();
      formData.append('userId', submitData.userId);
      formData.append('comment', submitData.comment || '');
      
      if (submitData.files && submitData.files.length > 0) {
        for (let i = 0; i < submitData.files.length; i++) {
          formData.append('attachments', submitData.files[i]);
        }
      }

      const response = await fetch(`${this.apiBase}/api/groups/${groupId}/tasks/${taskId}/submit`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to submit task:', error);
      throw error;
    }
  }

  /**
   * อนุมัติงาน
   */
  async approveTask(taskId, userId) {
    try {
      const response = await this.apiRequest(`/tasks/${taskId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ userId: userId || 'unknown' })
      });
      
      return response;
    } catch (error) {
      console.error('Failed to approve task:', error);
      throw error;
    }
  }

  /**
   * ตีกลับงาน
   */
  async rejectTask(taskId, rejectData) {
    try {
      const response = await this.apiRequest(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({
          dueTime: rejectData.newDueDate,
          reviewAction: 'revise',
          reviewerUserId: rejectData.reviewerUserId || 'unknown',
          reviewerComment: rejectData.comment || ''
        })
      });
      
      return response;
    } catch (error) {
      console.error('Failed to reject task:', error);
      throw error;
    }
  }

  /**
   * อัปโหลดไฟล์
   */
  async uploadFile(groupId, fileData) {
    try {
      const formData = new FormData();
      formData.append('userId', fileData.userId);
      
      if (fileData.files && fileData.files.length > 0) {
        for (let i = 0; i < fileData.files.length; i++) {
          formData.append('attachments', fileData.files[i]);
        }
      }

      const response = await fetch(`${this.apiBase}/api/groups/${groupId}/files/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }

      const result = await response.json();
      return result.data || result.files || [];
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  }

  /**
   * ดาวน์โหลดไฟล์
   */
  async downloadFile(groupId, fileId) {
    try {
      const response = await fetch(`${this.apiBase}/api/groups/${groupId}/files/${fileId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        return blob;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
  }

  /**
   * ดูไฟล์
   */
  async getFileInfo(groupId, fileId) {
    try {
      const response = await this.apiRequest(`/api/groups/${groupId}/files/${fileId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get file info:', error);
      throw error;
    }
  }

  /**
   * โหลดข้อมูลกลุ่ม
   */
  async loadGroupInfo(groupId) {
    try {
      const response = await this.apiRequest(`/api/groups/${groupId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to load group info:', error);
      throw error;
    }
  }

  /**
   * สร้างงานประจำ
   */
  async createRecurringTask(groupId, recurringData) {
    try {
      const response = await this.apiRequest(`/groups/${groupId}/recurring`, {
        method: 'POST',
        body: JSON.stringify(recurringData)
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to create recurring task:', error);
      throw error;
    }
  }

  /**
   * ดึงรายการงานประจำของกลุ่ม
   */
  async listRecurringTasks(groupId) {
    try {
      const response = await this.apiRequest(`/groups/${groupId}/recurring`);
      return response.data || [];
    } catch (error) {
      console.error('Failed to list recurring tasks:', error);
      throw error;
    }
  }

  /** อัปเดตงานประจำ */
  async updateRecurringTask(id, updates) {
    try {
      const response = await this.apiRequest(`/recurring/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return response.data;
    } catch (error) {
      console.error('Failed to update recurring task:', error);
      throw error;
    }
  }

  /** ลบงานประจำ */
  async deleteRecurringTask(id) {
    try {
      const response = await this.apiRequest(`/recurring/${id}`, { method: 'DELETE' });
      return response.success;
    } catch (error) {
      console.error('Failed to delete recurring task:', error);
      throw error;
    }
  }

  /** เพิ่มแท็กให้ไฟล์ */
  async addFileTags(fileId, tags) {
    try {
      const response = await this.apiRequest(`/files/${fileId}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tags })
      });
      return response.data;
    } catch (error) {
      console.error('Failed to add file tags:', error);
      throw error;
    }
  }

  /**
   * อนุมัติการเลื่อนเวลา
   */
  async approveExtension(groupId, taskId, extensionData) {
    try {
      const response = await this.apiRequest(`/api/groups/${groupId}/tasks/${taskId}/approve-extension`, {
        method: 'POST',
        body: JSON.stringify({
          newDueDate: extensionData.newDueDate,
          newDueTime: extensionData.newDueTime || '23:59'
        })
      });
      
      return response;
    } catch (error) {
      console.error('Failed to approve extension:', error);
      throw error;
    }
  }
}

// Export สำหรับใช้ในไฟล์อื่น
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = ApiService;
} else {
  // Browser environment - เพิ่มเข้าไปใน global scope
  window.ApiService = ApiService;
}
