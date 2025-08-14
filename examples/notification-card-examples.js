// ตัวอย่างการใช้งาน API การ์ดแจ้งเตือน
// ไฟล์นี้แสดงวิธีการเรียกใช้ API ต่างๆ

const API_BASE_URL = 'http://localhost:3000/api';

// ฟังก์ชันช่วยสำหรับเรียก API
async function callAPI(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json();
    
    console.log(`📡 ${method} ${endpoint}:`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error calling ${method} ${endpoint}:`, error);
    throw error;
  }
}

// ตัวอย่าง 1: ส่งการแจ้งเตือนแบบรวดเร็วไปยังกลุ่ม
async function sendQuickNotificationToGroup() {
  console.log('🚀 ตัวอย่าง 1: ส่งการแจ้งเตือนแบบรวดเร็วไปยังกลุ่ม');
  
  const notificationData = {
    title: '🎉 ยินดีต้อนรับสมาชิกใหม่!',
    description: 'ขอต้อนรับคุณสมชาย เข้าสู่ทีมพัฒนาซอฟต์แวร์ หวังว่าจะได้ทำงานร่วมกันอย่างมีความสุข',
    groupIds: ['C1234567890abcdef'], // แทนที่ด้วย Group ID จริง
    priority: 'medium'
  };

  return await callAPI('/notifications/cards/quick', 'POST', notificationData);
}

// ตัวอย่าง 2: ส่งการแจ้งเตือนแบบกำหนดเองพร้อมปุ่ม
async function sendCustomNotificationWithButtons() {
  console.log('🚀 ตัวอย่าง 2: ส่งการแจ้งเตือนแบบกำหนดเองพร้อมปุ่ม');
  
  const notificationData = {
    title: '📢 ประชุมทีมประจำสัปดาห์',
    description: 'ประชุมทีมประจำสัปดาห์จะเริ่มในอีก 30 นาที กรุณาเตรียมข้อมูลที่เกี่ยวข้องและเข้าร่วมประชุมตรงเวลา',
    targetType: 'group',
    groupIds: ['C1234567890abcdef'], // แทนที่ด้วย Group ID จริง
    priority: 'high',
    buttons: [
      {
        id: 'join_meeting',
        label: 'เข้าร่วมประชุม',
        action: 'custom',
        style: 'primary',
        data: { 
          meetingUrl: 'https://meet.google.com/abc-defg-hij',
          meetingId: 'abc-defg-hij'
        }
      },
      {
        id: 'view_agenda',
        label: 'ดูวาระการประชุม',
        action: 'view_details',
        style: 'secondary',
        data: { 
          agendaUrl: 'https://docs.google.com/document/d/agenda-id'
        }
      },
      {
        id: 'request_excuse',
        label: 'ขออนุญาตไม่เข้าร่วม',
        action: 'custom',
        style: 'secondary',
        data: { 
          reason: 'request_excuse'
        }
      }
    ]
  };

  return await callAPI('/notifications/cards', 'POST', notificationData);
}

// ตัวอย่าง 3: ส่งการแจ้งเตือนไปยังผู้ใช้หลายคน
async function sendNotificationToMultipleUsers() {
  console.log('🚀 ตัวอย่าง 3: ส่งการแจ้งเตือนไปยังผู้ใช้หลายคน');
  
  const notificationData = {
    title: '⏰ งานใกล้ถึงกำหนดส่ง',
    description: 'งาน "พัฒนาระบบรายงาน" จะถึงกำหนดส่งในอีก 2 ชั่วโมง กรุณาตรวจสอบและส่งงานให้ทันเวลา',
    targetType: 'user',
    userIds: ['user1', 'user2', 'user3'], // แทนที่ด้วย User ID จริง
    priority: 'high',
    buttons: [
      {
        id: 'submit_work',
        label: 'ส่งงาน',
        action: 'add_task',
        style: 'primary',
        data: { 
          taskId: 'task-123',
          action: 'submit'
        }
      },
      {
        id: 'request_extension',
        label: 'ขอเลื่อนเวลา',
        action: 'request_extension',
        style: 'secondary',
        data: { 
          taskId: 'task-123',
          reason: 'need_more_time'
        }
      },
      {
        id: 'view_task',
        label: 'ดูรายละเอียดงาน',
        action: 'view_details',
        style: 'secondary',
        data: { 
          taskId: 'task-123'
        }
      }
    ]
  };

  return await callAPI('/notifications/cards', 'POST', notificationData);
}

// ตัวอย่าง 4: ส่งการแจ้งเตือนการอนุมัติ
async function sendApprovalNotification() {
  console.log('🚀 ตัวอย่าง 4: ส่งการแจ้งเตือนการอนุมัติ');
  
  const notificationData = {
    title: '📋 รอการอนุมัติ: ขอเบิกค่าใช้จ่าย',
    description: 'คุณสมชาย ขอเบิกค่าใช้จ่ายในการเดินทางไปประชุม จำนวน 5,000 บาท กรุณาตรวจสอบและอนุมัติ',
    targetType: 'user',
    userIds: ['manager1'], // แทนที่ด้วย Manager User ID จริง
    priority: 'medium',
    buttons: [
      {
        id: 'approve',
        label: '✅ อนุมัติ',
        action: 'approve',
        style: 'primary',
        data: { 
          requestId: 'req-123',
          requestType: 'expense',
          amount: 5000
        }
      },
      {
        id: 'reject',
        label: '❌ ไม่อนุมัติ',
        action: 'reject',
        style: 'danger',
        data: { 
          requestId: 'req-123',
          requestType: 'expense'
        }
      },
      {
        id: 'view_details',
        label: '👁️ ดูรายละเอียด',
        action: 'view_details',
        style: 'secondary',
        data: { 
          requestId: 'req-123',
          requestType: 'expense'
        }
      }
    ]
  };

  return await callAPI('/notifications/cards', 'POST', notificationData);
}

// ตัวอย่าง 5: ส่งการแจ้งเตือนพร้อมรูปภาพ
async function sendNotificationWithImage() {
  console.log('🚀 ตัวอย่าง 5: ส่งการแจ้งเตือนพร้อมรูปภาพ');
  
  const notificationData = {
    title: '🎊 ฉลองครบรอบ 1 ปี',
    description: 'วันนี้เป็นวันครบรอบ 1 ปีที่ทีมเราได้ทำงานร่วมกัน ขอบคุณทุกคนที่ทุ่มเทและทำงานอย่างหนัก',
    imageUrl: 'https://example.com/anniversary-image.jpg', // แทนที่ด้วย URL รูปภาพจริง
    targetType: 'group',
    groupIds: ['C1234567890abcdef'], // แทนที่ด้วย Group ID จริง
    priority: 'low',
    buttons: [
      {
        id: 'join_celebration',
        label: 'เข้าร่วมงานฉลอง',
        action: 'custom',
        style: 'primary',
        data: { 
          eventUrl: 'https://meet.google.com/celebration'
        }
      },
      {
        id: 'share_memory',
        label: 'แชร์ความทรงจำ',
        action: 'custom',
        style: 'secondary',
        data: { 
          action: 'share_memory'
        }
      }
    ]
  };

  return await callAPI('/notifications/cards', 'POST', notificationData);
}

// ตัวอย่าง 6: ดึงเทมเพลตปุ่มมาตรฐาน
async function getNotificationTemplates() {
  console.log('🚀 ตัวอย่าง 6: ดึงเทมเพลตปุ่มมาตรฐาน');
  
  return await callAPI('/notifications/cards/templates');
}

// ฟังก์ชันหลักสำหรับรันตัวอย่างทั้งหมด
async function runAllExamples() {
  console.log('🎯 เริ่มทดสอบ API การ์ดแจ้งเตือน\n');

  try {
    // ดึงเทมเพลตปุ่มมาตรฐาน
    await getNotificationTemplates();
    console.log('');

    // ส่งการแจ้งเตือนแบบรวดเร็ว
    await sendQuickNotificationToGroup();
    console.log('');

    // ส่งการแจ้งเตือนแบบกำหนดเอง
    await sendCustomNotificationWithButtons();
    console.log('');

    // ส่งการแจ้งเตือนไปยังผู้ใช้หลายคน
    await sendNotificationToMultipleUsers();
    console.log('');

    // ส่งการแจ้งเตือนการอนุมัติ
    await sendApprovalNotification();
    console.log('');

    // ส่งการแจ้งเตือนพร้อมรูปภาพ
    await sendNotificationWithImage();
    console.log('');

    console.log('✅ ทดสอบ API การ์ดแจ้งเตือนเสร็จสิ้น');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
  }
}

// ฟังก์ชันสำหรับทดสอบเฉพาะตัวอย่าง
async function runSpecificExample(exampleNumber) {
  console.log(`🎯 ทดสอบตัวอย่างที่ ${exampleNumber}\n`);

  try {
    switch (exampleNumber) {
      case 1:
        await sendQuickNotificationToGroup();
        break;
      case 2:
        await sendCustomNotificationWithButtons();
        break;
      case 3:
        await sendNotificationToMultipleUsers();
        break;
      case 4:
        await sendApprovalNotification();
        break;
      case 5:
        await sendNotificationWithImage();
        break;
      case 6:
        await getNotificationTemplates();
        break;
      default:
        console.log('❌ ไม่พบตัวอย่างที่ระบุ กรุณาระบุหมายเลข 1-6');
    }
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

// Export ฟังก์ชันสำหรับใช้งาน
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllExamples,
    runSpecificExample,
    sendQuickNotificationToGroup,
    sendCustomNotificationWithButtons,
    sendNotificationToMultipleUsers,
    sendApprovalNotification,
    sendNotificationWithImage,
    getNotificationTemplates
  };
}

// ถ้าเป็น browser environment
if (typeof window !== 'undefined') {
  window.NotificationCardExamples = {
    runAllExamples,
    runSpecificExample,
    sendQuickNotificationToGroup,
    sendCustomNotificationWithButtons,
    sendNotificationToMultipleUsers,
    sendApprovalNotification,
    sendNotificationWithImage,
    getNotificationTemplates
  };
}

// รันตัวอย่างทั้งหมดถ้าเรียกไฟล์นี้โดยตรง
if (typeof require !== 'undefined' && require.main === module) {
  runAllExamples();
}
