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

  // ---------- mock (same rules as Code.gs, incl. editions) ----------
  const KEY = 'elephant_mock_db_v3';
  const ST = { PENDING: 'รอชำระมัดจำ', DEPOSIT: 'ชำระมัดจำแล้ว', PAID: 'ชำระครบแล้ว', CANCELLED: 'ยกเลิก' };
  const ED_NAMES = { original: 'สีต้นฉบับ (Original Edition)', blackgold: 'สีดำทอง (Black Gold Edition)' };
  const EDS = {
    original:  { id: 'original', name: ED_NAMES.original, numberMin: 1, numberMax: 50, priceSingle: 2490, depositSingle: 1200, priceSetNormal: 12450, priceSet: 11490, depositSet: 5500, earlyBirdLimit: 20, open: true },
    blackgold: { id: 'blackgold', name: ED_NAMES.blackgold, numberMin: 1, numberMax: 30, priceSingle: 2890, depositSingle: 1400, priceSetNormal: 14450, priceSet: 12990, depositSet: 6000, earlyBirdLimit: 0, open: true }
  };
  const SETTINGS = { editions: EDS, facebookUrl: 'https://www.facebook.com/share/1EqgTK2uxN/',
    paymentText: 'ชำระมัดจำผ่าน พร้อมเพย์ ธนาคารกรุงไทย ชื่อบัญชี นาย กฤษปกรณ์ จันทร์ปรุง — สแกน QR โอนยอดมัดจำ แล้วส่งสลิปพร้อมเลขที่คำสั่งจองทาง Facebook Inbox เพจ LaZieQ', paymentQr: 'img/promptpay.jpg', adminPin: '0000' };
  const edOf = v => EDS[v] ? v : 'original';
  function seed() {
    const orders = [], res = [];
    const mk = (ed, mode, items) => { const s = EDS[ed], id = 'SEED-' + (orders.length + 1);
      const total = mode === 'set' ? s.priceSet : s.priceSingle * items.length, deposit = mode === 'set' ? s.depositSet : s.depositSingle * items.length;
      const o = { orderId: id, createdAt: new Date(Date.now() - 864e5).toISOString(), mode, items, name: 'ลูกค้าตัวอย่าง ' + (orders.length + 1), ownerName: 'ผู้ครอบครองตัวอย่าง', phone: '0800000000', address: '-', total, deposit, remaining: total - deposit, earlyBird: ed === 'original', status: ST.PENDING };
      if (ed !== 'original') o.edition = ed; // legacy-style: original rows have no edition
      orders.push(o); items.forEach(i => { const r = { ...i, orderId: id, status: 'active' }; if (ed !== 'original') r.edition = ed; res.push(r); }); };
    // สีต้นฉบับ: 2 ชุด + 5 ออเดอร์เดี่ยว (= ใช้ Early Bird ไป 7 สิทธิ์)
    [1, 9].forEach(n => mk('original', 'set', PANGS.map(p => ({ pang: p.id, number: n }))));
    Object.entries({ fire: [8, 18, 28], water: [2, 14, 39], wind: [5, 15], earth: [4, 44], thunder: [3, 13, 33] })
      .forEach(([p, ns]) => mk('original', 'single', ns.map(n => ({ pang: p, number: n }))));
    // สีดำทอง: 3 ชุด + เดี่ยวบางเลข
    [1, 7, 30].forEach(n => mk('blackgold', 'set', PANGS.map(p => ({ pang: p.id, number: n }))));
    Object.entries({ fire: [9, 19], water: [8], earth: [3, 21], thunder: [12] })
      .forEach(([p, ns]) => mk('blackgold', 'single', ns.map(n => ({ pang: p, number: n }))));
    return { orders, res, settings: SETTINGS };
  }
  const db = () => { try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch (e) { return seed(); } };
  const save = d => localStorage.setItem(KEY, JSON.stringify(d));
  const taken = (d, ed) => { const t = {}; PANGS.forEach(p => t[p.id] = []); d.res.filter(r => r.status === 'active' && edOf(r.edition) === ed).forEach(r => t[r.pang].push(r.number)); Object.values(t).forEach(a => a.sort((x, y) => x - y)); return t; };
  const ebUsed = (d, ed) => d.orders.filter(o => edOf(o.edition) === ed && o.status !== ST.CANCELLED && o.earlyBird).length;
  const availEd = (d, ed) => { const s = d.settings.editions[ed], t = taken(d, ed), tot = s.numberMax - s.numberMin + 1, remaining = {}; let setLeft = 0;
    PANGS.forEach(p => remaining[p.id] = tot - t[p.id].length);
    for (let n = s.numberMin; n <= s.numberMax; n++) if (PANGS.every(p => !t[p.id].includes(n))) setLeft++;
    return { taken: t, open: s.open, remaining, setLeft, total: tot, earlyBirdLimit: s.earlyBirdLimit, earlyBirdLeft: Math.max(0, s.earlyBirdLimit - ebUsed(d, ed)) }; };
  const avail = d => { const editions = { original: availEd(d, 'original'), blackgold: availEd(d, 'blackgold') }, o = editions.original;
    return { editions, taken: o.taken, open: o.open, remaining: o.remaining, setLeft: o.setLeft, earlyBirdLeft: o.earlyBirdLeft, ts: Date.now() }; };
  const delay = v => new Promise(r => setTimeout(() => r(JSON.parse(JSON.stringify(v))), 150));
  const np = p => String(p || '').replace(/\D/g, '');
  const full = o => ({ ...o, edition: edOf(o.edition), editionName: ED_NAMES[edOf(o.edition)] });
  const pub = o => { const f = full(o); return { orderId: f.orderId, createdAt: f.createdAt, edition: f.edition, editionName: f.editionName, mode: f.mode, items: f.items, name: f.name, ownerName: f.ownerName, total: f.total, deposit: f.deposit, remaining: f.remaining, earlyBird: f.earlyBird, status: f.status }; };
  const mock = {
    async get(p) {
      const d = db(); save(d);
      if (p.action === 'config') { const { adminPin, ...c } = d.settings; const o = c.editions.original;
        return delay({ ok: true, config: { ...o, ...c, pangs: PANGS, editionList: ['original', 'blackgold'] }, availability: avail(d) }); }
      if (p.action === 'availability') return delay({ ok: true, availability: avail(d) });
      if (p.action === 'lookup') {
        const o = d.orders.find(o => o.orderId.toUpperCase() === String(p.orderId || '').trim().toUpperCase() && np(o.phone) === np(p.phone));
        return delay(o ? { ok: true, order: pub(o), paymentText: d.settings.paymentText, facebookUrl: d.settings.facebookUrl } : { ok: false, error: 'not_found', message: 'ไม่พบคำสั่งจอง กรุณาตรวจสอบข้อมูลอีกครั้ง' });
      }
      return delay({ ok: false });
    },
    async post(b) {
      const d = db();
      if (b.action === 'order') {
        const ed = b.edition == null || b.edition === '' ? 'original' : b.edition;
        if (!EDS[ed]) return delay({ ok: false, error: 'invalid', message: 'รุ่นไม่ถูกต้อง' });
        const s = d.settings.editions[ed];
        if (!s.open) return delay({ ok: false, error: 'closed', message: 'ขณะนี้ปิดรับจอง' + ED_NAMES[ed] + 'ชั่วคราว' });
        const phone = np(b.phone);
        if (!String(b.ownerName || '').trim()) return delay({ ok: false, error: 'invalid', message: 'กรุณากรอกชื่อสำหรับลงทะเบียนผู้ครอบครอง' });
        if (!String(b.name || '').trim() || phone.length < 9 || phone.length > 10 || !String(b.address || '').trim()) return delay({ ok: false, error: 'invalid', message: 'กรุณากรอกชื่อ เบอร์โทร (9–10 หลัก) และที่อยู่ให้ครบ' });
        const items = b.mode === 'set' ? PANGS.map(p => ({ pang: p.id, number: Number(b.number) })) : (b.items || []).map(i => ({ pang: i.pang, number: Number(i.number) }));
        if (!items.length || items.some(i => !(i.number >= s.numberMin && i.number <= s.numberMax))) return delay({ ok: false, error: 'invalid', message: `กรุณาเลือกเลขให้ถูกต้อง (${s.numberMin}–${s.numberMax})` });
        const t = taken(d, ed), conflicts = items.filter(i => t[i.pang].includes(i.number));
        if (conflicts.length) return delay({ ok: false, error: 'taken', conflicts, edition: ed, availability: avail(d),
          message: 'ขออภัย เลขที่เลือกถูกจองไปแล้ว (' + ED_NAMES[ed] + ': ' + conflicts.map(c => PANGS.find(p => p.id === c.pang).name + ' #' + c.number).join(', ') + ') กรุณาเลือกเลขใหม่' });
        const dt = new Date(), pad = x => String(x).padStart(2, '0');
        const orderId = 'CS' + String(dt.getFullYear()).slice(-2) + pad(dt.getMonth() + 1) + pad(dt.getDate()) + '-' + Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
        const total = b.mode === 'set' ? s.priceSet : s.priceSingle * items.length, deposit = b.mode === 'set' ? s.depositSet : s.depositSingle * items.length;
        const o = { orderId, createdAt: dt.toISOString(), edition: ed, mode: b.mode, items, name: b.name, ownerName: b.ownerName, phone, lineId: b.lineId, address: b.address, note: b.note,
          total, deposit, remaining: total - deposit, earlyBird: s.earlyBirdLimit > 0 && ebUsed(d, ed) < s.earlyBirdLimit, status: ST.PENDING };
        d.orders.push(o); items.forEach(i => d.res.push({ ...i, orderId, status: 'active', edition: ed })); save(d);
        return delay({ ok: true, order: pub(o), paymentText: d.settings.paymentText, facebookUrl: d.settings.facebookUrl });
      }
      if (b.action === 'adminList' || b.action === 'adminUpdate') {
        if (String(b.pin) !== d.settings.adminPin) return delay({ ok: false, error: 'auth', message: 'PIN ไม่ถูกต้อง' });
        if (b.action === 'adminList') return delay({ ok: true, orders: d.orders.slice().reverse().map(full) });
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
    _take(pang, number, edition) { const d = db(); d.res.push({ pang, number, orderId: 'OTHER', status: 'active', edition: edition || 'original' }); save(d); },
    _reset() { localStorage.removeItem(KEY); }
  };
  window.API = MOCK ? mock : real;
  window.API.isMock = MOCK;
  window.PANGS_META = PANGS;
})();
