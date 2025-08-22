#!/bin/bash

# สคริปต์สำหรับการอัพเดทชื่อกลุ่มทั้งหมดผ่าน curl
# ใช้งาน: ./update-group-names.sh [URL]

# ตั้งค่า URL เริ่มต้น
DEFAULT_URL="http://localhost:3000"
API_URL="${1:-$DEFAULT_URL}"
ENDPOINT="/api/groups/update-names"

echo "🔄 เริ่มต้นการอัพเดทชื่อกลุ่มทั้งหมด..."
echo "📡 API URL: ${API_URL}${ENDPOINT}"
echo ""

# ตรวจสอบการเชื่อมต่อ
echo "🔍 ตรวจสอบการเชื่อมต่อ..."
if curl -s --connect-timeout 5 "${API_URL}/health" > /dev/null; then
    echo "✅ การเชื่อมต่อสำเร็จ"
else
    echo "❌ ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบ URL และการทำงานของ server"
    exit 1
fi

echo ""
echo "🚀 เริ่มต้นการอัพเดทชื่อกลุ่ม..."

# เรียกใช้ API endpoint
RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "User-Agent: GroupNameUpdater/1.0" \
    --connect-timeout 30 \
    --max-time 300 \
    "${API_URL}${ENDPOINT}")

# ตรวจสอบ HTTP status code
HTTP_STATUS=$?
if [ $HTTP_STATUS -ne 0 ]; then
    echo "❌ เกิดข้อผิดพลาดในการเชื่อมต่อ (HTTP Status: $HTTP_STATUS)"
    exit 1
fi

# Parse และแสดงผลลัพธ์
echo ""
echo "📊 ผลลัพธ์การอัพเดท:"
echo ""

# ใช้ jq ถ้ามี
if command -v jq &> /dev/null; then
    echo "$RESPONSE" | jq -r '
        if .success then
            "✅ การอัพเดทสำเร็จ!\n" +
            "📊 สรุปผลการทำงาน:\n" +
            "• กลุ่มทั้งหมด: " + (.data.total | tostring) + "\n" +
            "• อัพเดทแล้ว: " + (.data.updated | tostring) + "\n" +
            "• ข้ามไป: " + (.data.skipped | tostring) + "\n" +
            "• เกิดข้อผิดพลาด: " + (.data.errors | tostring)
        else
            "❌ การอัพเดทล้มเหลว: " + (.error // "Unknown error")
        end
    '
    
    # แสดงรายละเอียดการอัพเดท
    echo ""
    echo "📋 รายละเอียดการอัพเดท:"
    echo "$RESPONSE" | jq -r '
        .data.details[]? | 
        (if .status == "updated" then "✅" elif .status == "skipped" then "⏭️" else "❌" end) + 
        " " + .groupId + ": " + .oldName + 
        (if .newName then " → " + .newName else "" end) +
        (if .error then "\n   ข้อผิดพลาด: " + .error else "" end)
    '
else
    # แสดงผลลัพธ์แบบพื้นฐานถ้าไม่มี jq
    echo "$RESPONSE"
fi

echo ""
echo "✨ ทำงานเสร็จสิ้น"

# ตรวจสอบผลลัพธ์และส่ง exit code ที่เหมาะสม
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "🎉 การอัพเดทเสร็จสิ้นด้วยความสำเร็จ"
    exit 0
else
    echo "⚠️ การอัพเดทเสร็จสิ้นแต่มีข้อผิดพลาด"
    exit 1
fi
