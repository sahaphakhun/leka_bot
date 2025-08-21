# 🔧 การแก้ไขปัญหา Dashboard เลขาบอท

## 📋 สรุปปัญหาที่พบ

### 1. ไฟล์แนบดูไม่ได้
- **ปัญหา**: เมื่อกดงานใด ๆ แล้วจะมีรายการไฟล์แนบ แต่ดูไฟล์ไม่ได้จริง
- **สาเหตุ**: ฟังก์ชัน `viewFile` ใน JavaScript เรียกใช้ API endpoint ที่ไม่ถูกต้อง
- **ผลกระทบ**: ผู้ใช้ไม่สามารถดูไฟล์แนบในงานได้

### 2. ปุ่มส่งงานกดไม่ได้
- **ปัญหา**: ปุ่มส่งงานกดไม่ได้จริง
- **สาเหตุ**: ฟังก์ชัน `handleSubmitTask` มีปัญหาในการส่งข้อมูลและจัดการ error
- **ผลกระทบ**: ผู้ใช้ไม่สามารถส่งงานได้

## 🛠️ การแก้ไขที่ทำ

### 1. แก้ไขฟังก์ชัน viewFile (การดูไฟล์แนบ)

**ไฟล์**: `dashboard/script.js`

**การแก้ไข**:
- ปรับปรุงการเรียกใช้ API endpoint ให้ถูกต้อง
- เพิ่มการจัดการ error ที่ดีขึ้น
- ปรับปรุงการแสดงผลไฟล์ตามประเภท MIME

**โค้ดที่แก้ไข**:
```javascript
async viewFile(fileId) {
  try {
    // แสดง loading
    const modal = document.getElementById('fileViewerModal');
    const loading = document.getElementById('fileViewerLoading');
    const content = document.getElementById('fileViewerContent');
    const title = document.getElementById('fileViewerTitle');
    
    modal.classList.add('active');
    loading.style.display = 'flex';
    content.innerHTML = '';
    
    // ดึงข้อมูลไฟล์
    const fileResponse = await fetch(`${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}`);
    if (!fileResponse.ok) throw new Error('ไม่สามารถดึงข้อมูลไฟล์ได้');
    
    const fileData = await fileResponse.json();
    title.textContent = fileData.originalName;
    
    // สร้างเนื้อหาตามประเภทไฟล์
    const mimeType = fileData.mimeType;
    let fileContent = '';
    
    if (mimeType.startsWith('image/')) {
      // แสดงรูปภาพ
      const imageUrl = `${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}/download`;
      fileContent = `<img src="${imageUrl}" alt="${fileData.originalName}" style="max-width: 100%; max-height: 70vh; object-fit: contain;">`;
    } else if (mimeType === 'application/pdf') {
      // แสดง PDF
      const pdfUrl = `${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}/download`;
      fileContent = `<iframe src="${pdfUrl}" style="width: 100%; height: 70vh; border: none;"></iframe>`;
    }
    // ... รองรับไฟล์ประเภทอื่น ๆ
    
    content.innerHTML = fileContent;
    loading.style.display = 'none';
    
  } catch (error) {
    console.error('Failed to view file:', error);
    this.showToast('ไม่สามารถแสดงไฟล์ได้', 'error');
    document.getElementById('fileViewerModal').classList.remove('active');
  }
}
```

### 2. แก้ไขฟังก์ชัน handleSubmitTask (การส่งงาน)

**ไฟล์**: `dashboard/script.js`

**การแก้ไข**:
- ปรับปรุงการจัดการ error และ response
- เพิ่ม logging เพื่อ debug
- รีเซ็ตฟอร์มหลังจากส่งงานสำเร็จ
- แสดงข้อความ error ที่ชัดเจนขึ้น

**โค้ดที่แก้ไข**:
```javascript
async handleSubmitTask() {
  try {
    const select = document.getElementById('submitTaskId');
    const taskId = select.value;
    const comment = document.getElementById('submitComment').value;
    const filesInput = document.getElementById('submitFiles');
    const files = filesInput.files;
    
    if (!taskId) { 
      this.showToast('กรุณาเลือกงาน', 'error'); 
      return; 
    }

    const formData = new FormData();
    formData.append('userId', this.currentUserId || this.currentUser?.lineUserId || 'unknown');
    formData.append('comment', comment || '');
    
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        formData.append('attachments', files[i]);
      }
    }

    console.log('Submitting task:', { taskId, userId: this.currentUserId, filesCount: files?.length || 0 });

    const response = await fetch(`${this.apiBase}/api/groups/${this.currentGroupId}/tasks/${taskId}/submit`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.success) {
      this.showToast('ส่งงานสำเร็จ', 'success');
      this.closeModal('submitTaskModal');
      this.refreshCurrentView();
      
      // รีเซ็ตฟอร์ม
      document.getElementById('submitComment').value = '';
      document.getElementById('submitFiles').value = '';
    } else {
      this.showToast(data.error || 'ส่งงานไม่สำเร็จ', 'error');
    }
  } catch (error) {
    console.error('submitTask error:', error);
    this.showToast(`ส่งงานไม่สำเร็จ: ${error.message}`, 'error');
  }
}
```

### 3. เพิ่ม API Endpoint สำหรับข้อมูลไฟล์

**ไฟล์**: `src/controllers/apiController.ts`

**การเพิ่ม**:
- เพิ่ม endpoint `GET /api/groups/:groupId/files/:fileId` สำหรับดึงข้อมูลไฟล์
- เพิ่มฟังก์ชัน `getFileInfo` ใน ApiController

**โค้ดที่เพิ่ม**:
```typescript
/**
 * GET /api/groups/:groupId/files/:fileId - ดึงข้อมูลไฟล์โดยตรง
 */
public async getFileInfo(req: Request, res: Response): Promise<void> {
  try {
    const { fileId, groupId } = req.params;

    // ตรวจสอบว่าไฟล์อยู่ในกลุ่มที่ระบุหรือไม่
    if (groupId) {
      const isAuthorized = await this.fileService.isFileInGroup(fileId, groupId);
      if (!isAuthorized) {
        res.status(403).json({ 
          success: false, 
          error: 'Access denied to file' 
        });
        return;
      }
    }

    const fileInfo = await this.fileService.getFileInfo(fileId);
    res.json({ success: true, data: fileInfo });

  } catch (error) {
    logger.error('❌ Error getting file info:', error);
    res.status(404).json({ 
      success: false, 
      error: 'File not found' 
    });
  }
}
```

**Routing ที่เพิ่ม**:
```typescript
apiRouter.get('/groups/:groupId/files/:fileId', apiController.getFileInfo.bind(apiController));
```

## 🧪 การทดสอบ

### ไฟล์ทดสอบ
สร้างไฟล์ `dashboard/test-fixes.html` เพื่อทดสอบการทำงานของ API endpoints ที่แก้ไข

**ฟีเจอร์การทดสอบ**:
1. ทดสอบ API ข้อมูลไฟล์
2. ทดสอบ API ส่งงาน
3. ทดสอบ API ดาวน์โหลดไฟล์
4. ตรวจสอบการเชื่อมต่อ API

### วิธีการทดสอบ
1. เปิดไฟล์ `dashboard/test-fixes.html` ในเบราว์เซอร์
2. ใส่ข้อมูล Group ID, File ID, และ Task ID ที่ต้องการทดสอบ
3. กดปุ่มทดสอบแต่ละฟีเจอร์
4. ตรวจสอบผลลัพธ์ที่แสดง

## 📁 ไฟล์ที่แก้ไข

1. **`dashboard/script.js`**
   - แก้ไขฟังก์ชัน `viewFile`
   - แก้ไขฟังก์ชัน `handleSubmitTask`

2. **`src/controllers/apiController.ts`**
   - เพิ่มฟังก์ชัน `getFileInfo`
   - เพิ่ม routing สำหรับข้อมูลไฟล์

3. **`dashboard/test-fixes.html`** (ใหม่)
   - ไฟล์ทดสอบการทำงาน

4. **`DASHBOARD_FIXES.md`** (ใหม่)
   - เอกสารอธิบายการแก้ไข

## ✅ ผลลัพธ์ที่คาดหวัง

### หลังการแก้ไข
1. **ไฟล์แนบ**: ผู้ใช้สามารถดูไฟล์แนบในงานได้ตามปกติ
2. **ปุ่มส่งงาน**: ผู้ใช้สามารถส่งงานได้ตามปกติ
3. **การจัดการ Error**: แสดงข้อความ error ที่ชัดเจนและเข้าใจง่าย
4. **User Experience**: การใช้งาน Dashboard มีความเสถียรและน่าเชื่อถือมากขึ้น

### การตรวจสอบ
- ทดสอบการดูไฟล์แนบในงานต่างๆ
- ทดสอบการส่งงานพร้อมไฟล์แนบ
- ทดสอบการส่งงานโดยไม่มีไฟล์แนบ
- ตรวจสอบ error handling ในกรณีต่างๆ

## 🔍 หมายเหตุเพิ่มเติม

- การแก้ไขนี้ใช้ API endpoints ที่มีอยู่แล้วในระบบ
- ไม่มีการเปลี่ยนแปลงโครงสร้างฐานข้อมูล
- รองรับการทำงานแบบ backward compatibility
- เพิ่ม logging เพื่อช่วยในการ debug ในอนาคต

## 📞 การสนับสนุน

หากพบปัญหาหรือต้องการความช่วยเหลือเพิ่มเติม กรุณาติดต่อทีมพัฒนาเลขาบอท
