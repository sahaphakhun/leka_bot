/**
 * Profile Page Logic
 * ==================
 */

// Profile page logic
(function() {
  const app = document.getElementById('app');
  if (!app) return;

  const userId = app.getAttribute('data-user-id') || '';
  const displayName = app.getAttribute('data-display-name') || '';
  const realName = app.getAttribute('data-real-name') || '';
  const email = app.getAttribute('data-email') || '';
  const timezone = app.getAttribute('data-timezone') || 'Asia/Bangkok';
  const postUrl = app.getAttribute('data-post-url') || '/dashboard/profile';

  // อัปเดตข้อมูลในหน้า
  const displayNameEl = document.getElementById('displayName');
  const realNameEl = document.getElementById('realName');
  const emailEl = document.getElementById('email');
  const timezoneEl = document.getElementById('timezone');
  const emailStatusEl = document.getElementById('emailStatus');

  if (displayNameEl) displayNameEl.textContent = displayName || '-';
  if (realNameEl) realNameEl.value = realName || '';
  if (emailEl) emailEl.value = email || '';
  if (timezoneEl) timezoneEl.value = timezone || 'Asia/Bangkok';
  if (emailStatusEl) {
    emailStatusEl.innerHTML = email ? `อีเมล: ${email} ✅` : 'อีเมล: ยังไม่ได้ลิงก์ ❌';
  }

  const successEl = document.getElementById('success');
  const errorEl = document.getElementById('error');

  // เพิ่ม event listener สำหรับฟอร์ม
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      if (successEl) successEl.style.display = 'none';
      if (errorEl) errorEl.style.display = 'none';

      const saveButton = document.getElementById('saveButton');
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = 'กำลังบันทึก...';
      }

      const payload = {
        userId: userId,
        realName: realNameEl ? realNameEl.value : '',
        email: emailEl ? emailEl.value : '',
        timezone: timezoneEl ? timezoneEl.value : 'Asia/Bangkok'
      };

      fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(r => r.json())
      .then(data => {
        if (data && data.success) {
          if (successEl) successEl.style.display = 'block';
          if (emailStatusEl) {
            emailStatusEl.innerHTML = payload.email ? `อีเมล: ${payload.email} ✅` : 'อีเมล: ยังไม่ได้ลิงก์ ❌';
          }
        } else {
          if (errorEl) {
            errorEl.textContent = 'เกิดข้อผิดพลาด: ' + (data && data.error ? data.error : 'ไม่ทราบสาเหตุ');
            errorEl.style.display = 'block';
          }
        }
      })
      .catch(err => {
        console.error(err);
        if (errorEl) {
          errorEl.textContent = 'เกิดข้อผิดพลาดในการบันทึก';
          errorEl.style.display = 'block';
        }
      })
      .finally(() => {
        if (saveButton) {
          saveButton.disabled = false;
          saveButton.textContent = 'บันทึกข้อมูล';
        }
      });
    });
  }

  // เพิ่ม validation สำหรับฟอร์ม
  if (realNameEl) {
    realNameEl.addEventListener('input', function(e) {
      const value = e.target.value.trim();
      if (value.length < 2) {
        this.setCustomValidity('ชื่อจริงต้องมีอย่างน้อย 2 ตัวอักษร');
      } else {
        this.setCustomValidity('');
      }
    });
  }

  if (emailEl) {
    emailEl.addEventListener('input', function(e) {
      const value = e.target.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (value && !emailRegex.test(value)) {
        this.setCustomValidity('กรุณากรอกอีเมลให้ถูกต้อง');
      } else {
        this.setCustomValidity('');
      }
    });
  }

  // เพิ่ม timezone selector
  if (timezoneEl) {
    const timezones = [
      { value: 'Asia/Bangkok', label: 'กรุงเทพฯ (UTC+7)' },
      { value: 'Asia/Tokyo', label: 'โตเกียว (UTC+9)' },
      { value: 'Asia/Seoul', label: 'โซล (UTC+9)' },
      { value: 'Asia/Shanghai', label: 'เซี่ยงไฮ้ (UTC+8)' },
      { value: 'Asia/Singapore', label: 'สิงคโปร์ (UTC+8)' },
      { value: 'Asia/Jakarta', label: 'จาการ์ตา (UTC+7)' },
      { value: 'Asia/Kolkata', label: 'มุมไบ (UTC+5:30)' },
      { value: 'Europe/London', label: 'ลอนดอน (UTC+0)' },
      { value: 'Europe/Paris', label: 'ปารีส (UTC+1)' },
      { value: 'America/New_York', label: 'นิวยอร์ก (UTC-5)' },
      { value: 'America/Los_Angeles', label: 'ลอสแองเจลิส (UTC-8)' }
    ];

    // สร้าง options สำหรับ timezone
    timezoneEl.innerHTML = timezones.map(tz => 
      `<option value="${tz.value}" ${tz.value === timezone ? 'selected' : ''}>${tz.label}</option>`
    ).join('');
  }

  // เพิ่ม real-time validation feedback
  const formGroups = document.querySelectorAll('.form-group');
  formGroups.forEach(group => {
    const input = group.querySelector('input, select, textarea');
    if (input) {
      input.addEventListener('blur', function() {
        if (this.checkValidity()) {
          group.classList.remove('error');
          group.classList.add('success');
        } else {
          group.classList.remove('success');
          group.classList.add('error');
        }
      });

      input.addEventListener('input', function() {
        if (this.checkValidity()) {
          group.classList.remove('error');
        }
      });
    }
  });

  // เพิ่ม password change functionality (ถ้ามี)
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', function() {
      // เปิด modal เปลี่ยนรหัสผ่าน
      const passwordModal = document.getElementById('passwordModal');
      if (passwordModal) {
        passwordModal.classList.add('active');
      }
    });
  }

  // เพิ่ม profile picture upload (ถ้ามี)
  const profilePictureInput = document.getElementById('profilePicture');
  if (profilePictureInput) {
    profilePictureInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        // แสดง preview รูปภาพ
        const reader = new FileReader();
        reader.onload = function(e) {
          const preview = document.getElementById('profilePicturePreview');
          if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // เพิ่ม export data functionality (ถ้ามี)
  const exportDataBtn = document.getElementById('exportDataBtn');
  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', function() {
      // ส่งคำขอ export ข้อมูล
      fetch('/dashboard/export-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId })
      })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `profile-data-${userId}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Export failed:', error);
        if (errorEl) {
          errorEl.textContent = 'ไม่สามารถ export ข้อมูลได้';
          errorEl.style.display = 'block';
        }
      });
    });
  }

  // เพิ่ม delete account functionality (ถ้ามี)
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', function() {
      if (confirm('คุณแน่ใจหรือไม่ที่จะลบบัญชี? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
        fetch('/dashboard/delete-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            alert('บัญชีถูกลบเรียบร้อยแล้ว');
            window.location.href = '/';
          } else {
            if (errorEl) {
              errorEl.textContent = 'ไม่สามารถลบบัญชีได้: ' + (data.error || 'ไม่ทราบสาเหตุ');
              errorEl.style.display = 'block';
            }
          }
        })
        .catch(error => {
          console.error('Delete account failed:', error);
          if (errorEl) {
            errorEl.textContent = 'ไม่สามารถลบบัญชีได้';
            errorEl.style.display = 'block';
          }
        });
      }
    });
  }

  console.log('Profile page initialized successfully');
})();
