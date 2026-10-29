// API layer: real (Google Apps Script) or mock (localStorage)
(function () {
  const PANGS = [
    { id: 'fire', name: 'ปางทรัพย์อนันต์', element: 'ไฟ' },
    { id: 'water', name: 'ปางเมตตามหาเสน่ห์', element: 'น้ำ' },
    { id: 'wind', name: 'ปางเปิดโชค', element: 'ลม' },
    { id: 'earth', name: 'ปางมั่นคง', element: 'ดิน' },
    { id: 'thunder', name: 'ปางคุ้มภัย', element: 'ฟ้า' }
  ];
  const qs = new URLSearchParams(location.search);
  const url = (window.APP_CONFIG || {}).API_URL;
  const MOCK = !url || qs.get('mock') === '1';

  // ---------- real ----------
  const real = {
    async get(params) {
      const r = await fetch(url + '?' + new URLSearchParams(params), { cache: 'no-store' });
      return r.json();
    },
    async post(body) {
      // text/plain avoids CORS preflight with Apps Script
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
      return r.json();
    }
  };

  // ---------- mock (same rules as Code.gs) ----------
  const KEY = 'elephant_mock_db_v2';
  const ST = { PENDING: 'รอชำระมัดจำ', DEPOSIT: 'ชำระมัดจำแล้ว', PAID: 'ชำระครบแล้ว', CANCELLED: 'ยกเลิก' };
  const SETTINGS = { numberMin: 1, numberMax: 50, priceSingle: 2490, depositSingle: 1200, priceSetNormal: 12450, priceSet: 11490, depositSet: 5500,
    earlyBirdLimit: 20, open: true, facebookUrl: 'https://www.facebook.com/share/1EqgTK2uxN/',
    paymentText: 'ชำระมัดจำผ่าน พร้อมเพย์ ธนาคารกรุงไทย ชื่อบัญชี นาย กฤษปกรณ์ จันทร์ปรุง — สแกน QR โอนยอดมัดจำ แล้วส่งสลิปพร้อมเลขที่คำสั่งจองทาง Facebook Inbox เพจ LaZieQ', paymentQr: 'img/promptpay.jpg', adminPin: '0000' };
  function seed() {
    const orders = [], res = [];
    const mk = (mode, items) => { const s = SETTINGS, id = 'SEED-' + (orders.length + 1);
      const total = mode === 'set' ? s.priceSet : s.priceSingle * items.length, deposit = mode === 'set' ? s.depositSet : s.depositSingle * items.length;
      orders.push({ orderId: id, createdAt: new Date(Date.now() - 864e5).toISOString(), mode, items, name: 'ลูกค้าตัวอย่าง ' + (orders.length + 1), ownerName: 'ผู้ครอบครองตัวอย่าง', phone: '0800000000', address: '-', total, deposit, remaining: total - deposit, earlyBird: true, status: ST.PENDING });
      items.forEach(i => res.push({ ...i, orderId: id, status: 'active' })); };
    // ข้อมูลตัวอย่าง: 2 ชุด + 5 ออเดอร์เดี่ยว (= ใช้ Early Bird ไป 7 สิทธิ์)
    [1, 9].forEach(n => mk('set', PANGS.map(p => ({ pang: p.id, number: n }))));
    Object.entries({ fire: [8, 18, 28], water: [2, 14, 39], wind: [5, 15], earth: [4, 44], thunder: [3, 13, 33] })
      .forEach(([p, ns]) => mk('single', ns.map(n => ({ pang: p, number: n }))));
    return { orders, res, settings: SETTINGS };
  }
  const db = () => { try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch (e) { return seed(); } };
  const save = d => localStorage.setItem(KEY, JSON.stringify(d));
  const taken = d => { const t = {}; PANGS.forEach(p => t[p.id] = []); d.res.filter(r => r.status === 'active').forEach(r => t[r.pang].push(r.number)); Object.values(t).forEach(a => a.sort((x, y) => x - y)); return t; };
  const ebUsed = d => d.orders.filter(o => o.status !== ST.CANCELLED && o.earlyBird).length;
  const avail = d => { const s = d.settings, t = taken(d), tot = s.numberMax - s.numberMin + 1, remaining = {}; let setLeft = 0;
    PANGS.forEach(p => remaining[p.id] = tot - t[p.id].length);
    for (let n = s.numberMin; n <= s.numberMax; n++) if (PANGS.every(p => !t[p.id].includes(n))) setLeft++;
    return { taken: t, open: s.open, remaining, setLeft, earlyBirdLeft: Math.max(0, s.earlyBirdLimit - ebUsed(d)), ts: Date.now() }; };
  const delay = v => new Promise(r => setTimeout(() => r(JSON.parse(JSON.stringify(v))), 150));
  const np = p => String(p || '').replace(/\D/g, '');
  const pub = o => ({ orderId: o.orderId, createdAt: o.createdAt, mode: o.mode, items: o.items, name: o.name, ownerName: o.ownerName, total: o.total, deposit: o.deposit, remaining: o.remaining, earlyBird: o.earlyBird, status: o.status });
  const mock = {
    async get(p) {
      const d = db(); save(d);
      if (p.action === 'config') { const { adminPin, ...c } = d.settings; return delay({ ok: true, config: { ...c, pangs: PANGS }, availability: avail(d) }); }
      if (p.action === 'availability') return delay({ ok: true, availability: avail(d) });
      if (p.action === 'lookup') {
        const o = d.orders.find(o => o.orderId.toUpperCase() === String(p.orderId || '').trim().toUpperCase() && np(o.phone) === np(p.phone));
        return delay(o ? { ok: true, order: pub(o), paymentText: d.settings.paymentText, facebookUrl: d.settings.facebookUrl } : { ok: false, error: 'not_found', message: 'ไม่พบคำสั่งจอง กรุณาตรวจสอบข้อมูลอีกครั้ง' });
      }
      return delay({ ok: false });
    },
    async post(b) {
      const d = db(), s = d.settings;
      if (b.action === 'order') {
        if (!s.open) return delay({ ok: false, error: 'closed', message: 'ขณะนี้ปิดรับจองชั่วคราว' });
        const phone = np(b.phone);
        if (!String(b.ownerName || '').trim()) return delay({ ok: false, error: 'invalid', message: 'กรุณากรอกชื่อสำหรับลงทะเบียนผู้ครอบครอง' });
        if (!String(b.name || '').trim() || phone.length < 9 || phone.length > 10 || !String(b.address || '').trim()) return delay({ ok: false, error: 'invalid', message: 'กรุณากรอกชื่อ เบอร์โทร (9–10 หลัก) และที่อยู่ให้ครบ' });
        const items = b.mode === 'set' ? PANGS.map(p => ({ pang: p.id, number: Number(b.number) })) : (b.items || []).map(i => ({ pang: i.pang, number: Number(i.number) }));
        if (!items.length || items.some(i => !(i.number >= s.numberMin && i.number <= s.numberMax))) return delay({ ok: false, error: 'invalid', message: 'กรุณาเลือกเลขให้ถูกต้อง' });
        const t = taken(d), conflicts = items.filter(i => t[i.pang].includes(i.number));
        if (conflicts.length) return delay({ ok: false, error: 'taken', conflicts, availability: avail(d),
          message: 'ขออภัย เลขที่เลือกถูกจองไปแล้ว (' + conflicts.map(c => PANGS.find(p => p.id === c.pang).name + ' #' + c.number).join(', ') + ') กรุณาเลือกเลขใหม่' });
        const dt = new Date(), pad = x => String(x).padStart(2, '0');
        const orderId = 'CS' + String(dt.getFullYear()).slice(-2) + pad(dt.getMonth() + 1) + pad(dt.getDate()) + '-' + Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
        const total = b.mode === 'set' ? s.priceSet : s.priceSingle * items.length, deposit = b.mode === 'set' ? s.depositSet : s.depositSingle * items.length;
        const o = { orderId, createdAt: dt.toISOString(), mode: b.mode, items, name: b.name, ownerName: b.ownerName, phone, lineId: b.lineId, address: b.address, note: b.note,
          total, deposit, remaining: total - deposit, earlyBird: ebUsed(d) < s.earlyBirdLimit, status: ST.PENDING };
        d.orders.push(o); items.forEach(i => d.res.push({ ...i, orderId, status: 'active' })); save(d);
        return delay({ ok: true, order: pub(o), paymentText: s.paymentText, facebookUrl: s.facebookUrl });
      }
      if (b.action === 'adminList' || b.action === 'adminUpdate') {
        if (String(b.pin) !== s.adminPin) return delay({ ok: false, error: 'auth', message: 'PIN ไม่ถูกต้อง' });
        if (b.action === 'adminList') return delay({ ok: true, orders: d.orders.slice().reverse() });
        if (!Object.values(ST).includes(b.status)) return delay({ ok: false, error: 'invalid', message: 'สถานะไม่ถูกต้อง' });
        const o = d.orders.find(o => o.orderId === b.orderId);
        if (!o) return delay({ ok: false, error: 'not_found', message: 'ไม่พบออเดอร์' });
        if (o.status === ST.CANCELLED && b.status !== ST.CANCELLED) return delay({ ok: false, error: 'invalid', message: 'ออเดอร์ที่ยกเลิกแล้วเปิดใหม่ไม่ได้' });
        o.status = b.status;
        if (b.status === ST.CANCELLED) d.res.forEach(r => { if (r.orderId === o.orderId) r.status = 'cancelled'; });
        save(d); return delay({ ok: true, orderId: o.orderId, status: o.status });
      }
      return delay({ ok: false, error: 'unknown_action' });
    },
    // helpers for previews/tests: simulate another customer booking
    _take(pang, number) { const d = db(); d.res.push({ pang, number, orderId: 'OTHER', status: 'active' }); save(d); },
    _reset() { localStorage.removeItem(KEY); }
  };
  window.API = MOCK ? mock : real;
  window.API.isMock = MOCK;
  window.PANGS_META = PANGS;
})();
