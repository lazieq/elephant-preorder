// ตั้งค่าฝั่งหน้าเว็บ
// API_URL: ใส่ URL /exec ของ Google Apps Script Web App ที่ deploy แล้ว
// ถ้าเว้นว่าง ('') หรือเปิดหน้าเว็บด้วย ?mock=1 จะใช้ "โหมดจำลอง" (เก็บข้อมูลใน localStorage ของเบราว์เซอร์)
window.APP_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwpYaVgbiMWJs9XPSqvzdBFpVLrqSHRzZTcOTR4FxXScyddZ6zCUXumJBVoMOg53C0E/exec',
  POLL_MS: 15000,
  // TODO: ลิงก์ Facebook Inbox ของเพจ LaZieQ (ค่าใน Settings ของชีต facebookUrl จะใช้ก่อน) เช่น https://m.me/<page-username>
  FACEBOOK_URL: 'https://www.facebook.com/share/1EqgTK2uxN/'
};
