# 09) Mobile App (`mobile-app/`) – Review

## สรุป

`mobile-app/` เป็น Expo/React Native app มี `package.json` และ `package-lock.json` แต่ไม่มี node_modules (ปกติ) และยังไม่เห็นเครื่องมือ lint/test ภายในโฟลเดอร์นี้

## Findings

### INFO – ไม่มี lint/test scripts

- `mobile-app/package.json` มีแค่ scripts สำหรับ `expo start` (start/android/ios/web)
- แนะนำ:
  - เพิ่ม lint (eslint สำหรับ React Native) และ formatter (prettier) เพื่อคุณภาพโค้ด
  - เพิ่ม typecheck ถ้าต้องการ (แนะนำ TypeScript ในระยะยาว)

### LOW – การจัดการ secrets

- `mobile-app/.gitignore` ignore `.env` อยู่แล้ว (ดี)
- แนะนำ:
  - ตรวจให้แน่ใจว่า endpoint/token ไม่ hardcode ใน source

