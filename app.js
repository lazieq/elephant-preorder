(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const THEME = {
    fire:    { color: '#e0452b', glow: '#ffb347', emoji: '🔥', label: 'ธาตุไฟ', tag: 'สัญลักษณ์แห่งความกล้าหาญ ความรุ่งเรือง และความมั่งคั่งไม่สิ้นสุด' },
    water:   { color: '#2f8fe0', glow: '#8fd3ff', emoji: '🌊', label: 'ธาตุน้ำ', tag: 'สัญลักษณ์แห่งความเมตตา เสน่ห์ และความสมดุล' },
    wind:    { color: '#2fae6a', glow: '#a8f0c0', emoji: '🌪️', label: 'ธาตุลม', tag: 'สัญลักษณ์แห่งโอกาส ความก้าวหน้า และการเปิดรับสิ่งดี ๆ' },
    earth:   { color: '#9a3b2a', glow: '#e0a878', emoji: '🌍', label: 'ธาตุดิน', tag: 'สัญลักษณ์แห่งความมั่นคง ความหนักแน่น และความสำเร็จที่ยั่งยืน' },
    thunder: { color: '#8a4fe0', glow: '#d6b8ff', emoji: '⚡', label: 'ธาตุฟ้า', tag: 'สัญลักษณ์แห่งการปกป้อง ความเข้มแข็ง และการคุ้มครอง' }
  };
  const ED = {
    original:  { short: 'สีต้นฉบับ', name: 'สีต้นฉบับ (Original Edition)', prefix: '', accent: null },
    blackgold: { short: 'สีดำทอง', name: 'สีดำทอง (Black Gold Edition)', prefix: 'bg-', accent: '#d4a63a' }
  };
  const GOLD = '#d4a63a';
  const baht = n => '฿' + Number(n || 0).toLocaleString('th-TH');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const img = (id, ed) => { const f = (ED[ed || 'original'] || ED.original).prefix + id;
    return `<picture><source srcset="img/${f}.webp" type="image/webp"><img src="img/${f}.jpg" alt="" loading="lazy" width="900" height="1208"></picture>`; };
  const pc = (ed, id) => ed === 'blackgold' ? GOLD : THEME[id].color;
  const edName = (id, fallback) => fallback || (ED[id] || ED.original).name;

  const S = { cfg: null, av: {}, ed: 'original', mode: 'single', pang: 'fire', cart: [], setNum: null, busy: false, lastSync: 0 };
  const pangs = () => S.cfg.pangs;
  const pangName = id => (pangs().find(p => p.id === id) || {}).name || id;
  // backwards-compatible: older backend without editions → only original
  const E = (ed = S.ed) => (S.cfg.editions || {})[ed] || (ed === 'original' ? S.cfg : null);
  const A = (ed = S.ed) => (S.av.editions || {})[ed] || (ed === 'original' ? S.av : { taken: {}, remaining: {}, setLeft: 0, earlyBirdLeft: 0 });
  const hasBG = () => !!(S.cfg.editions && S.cfg.editions.blackgold);
  const isTaken = (pang, n, ed) => ((A(ed).taken || {})[pang] || []).includes(n);
  const setTaken = (n, ed) => pangs().some(p => isTaken(p.id, n, ed));

  function toast(msg, type) { const t = $('#toast'); t.textContent = msg; t.className = 'toast ' + (type || ''); t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => t.hidden = true, 4500); }

  function priceCards(ed) {
    const c = E(ed), bg = ed === 'blackgold';
    return `
      <div class="price-card"><p class="pc-k">${bg ? '🖤' : '🔥'} ราคาสั่งจองแยกองค์${bg ? ' · สีดำทอง' : ''}</p><p class="pc-big">${baht(c.priceSingle)} <small>/ องค์</small></p>
        <ul><li>🔹 มัดจำเพียง <b>${baht(c.depositSingle)}</b></li><li>🔹 ชำระส่วนที่เหลือ <b>${baht(c.priceSingle - c.depositSingle)}</b> ก่อนจัดส่ง</li></ul>
        <p class="muted">เลือกสะสมปางที่ชื่นชอบได้ตามต้องการ</p><a href="#booking" class="btn btn-ghost btn-block" data-goto="single" data-ed="${ed}">จองแยกองค์</a></div>
      <div class="price-card hot"><p class="pc-k">🎁 ${bg ? 'BLACK GOLD' : "SPECIAL COLLECTOR'S"} SET</p><p class="muted">ครบชุด 5 มหาธาตุ จำนวน 5 องค์ · หมายเลขเดียวกันทุกองค์</p>
        <p class="pc-old">${bg ? 'ซื้อแยกครบ 5 องค์' : 'ราคาปกติ'} ${baht(c.priceSetNormal)}</p><p class="pc-big">${baht(c.priceSet)} <small>/ ชุด</small></p><p class="save">🎉 ประหยัดทันที ${baht(c.priceSetNormal - c.priceSet)}</p>
        <ul><li>🔹 มัดจำยกชุดเพียง <b>${baht(c.depositSet)}</b></li><li>🔹 ชำระส่วนที่เหลือ <b>${baht(c.priceSet - c.depositSet)}</b> ก่อนจัดส่ง</li></ul>
        <a href="#booking" class="btn btn-gold btn-block" data-goto="set" data-ed="${ed}">จองครบชุด</a></div>`;
  }
  function galleryCards(ed) {
    const c = E(ed);
    return pangs().map(p => `
      <article class="card" style="--c:${pc(ed, p.id)};--g:${ed === 'blackgold' ? '#f3d27a' : THEME[p.id].glow}">
        <button class="card-img" data-zoom="${p.id}" data-zed="${ed}" aria-label="ขยายภาพ ${esc(p.name)}">${img(p.id, ed)}<span class="zoom-ico">⤢</span></button>
        <div class="card-body">
          <p class="el-badge">${THEME[p.id].emoji} ${THEME[p.id].label}</p>
          <h3>${esc(p.name)}</h3>
          <p class="tagline">${THEME[p.id].tag}</p>
          <div class="card-foot"><b>${baht(c.priceSingle)}</b><button class="btn btn-sm btn-gold" data-book="${p.id}" data-ed="${ed}">จองปางนี้</button></div>
        </div>
      </article>`).join('');
  }

  function renderStatic() {
    const c = E('original');
    $('#priceHint').textContent = `แยกองค์ ${baht(c.priceSingle)} · ครบชุด ${baht(c.priceSet)} (ปกติ ${baht(c.priceSetNormal)})`;
    const fb = S.cfg.facebookUrl || (window.APP_CONFIG || {}).FACEBOOK_URL || 'https://www.facebook.com/share/1EqgTK2uxN/';
    $('#fbBtn').href = fb; $('#fbFoot').href = fb;
    $('#priceGrid').innerHTML = priceCards('original');
    $('#payText').textContent = S.cfg.paymentText;
    if (S.cfg.paymentQr) $$('.pay-qr').forEach(i => i.src = S.cfg.paymentQr);
    $('#heroFigs').innerHTML = pangs().map((p, i) => `<div class="hf hf${i}" style="--c:${THEME[p.id].color};--g:${THEME[p.id].glow}">${img(p.id)}</div>`).join('');
    $('#gallery-list').innerHTML = galleryCards('original');
    $('#blackgold').hidden = !hasBG(); $('#edTabs').hidden = !hasBG();
    if (hasBG()) {
      const b = E('blackgold');
      $('#bgPriceGrid').innerHTML = priceCards('blackgold');
      $('#bgGallery').innerHTML = galleryCards('blackgold');
      $('#bgLimitTxt').textContent = `จำกัดการผลิตเพียง ${b.numberMax - b.numberMin + 1} ชุด · หมายเลข ${b.numberMin}–${b.numberMax} ต่อปาง (แยกจากรุ่นสีต้นฉบับ)`;
      $('#bgPriceHint').textContent = `แยกองค์ ${baht(b.priceSingle)} · ครบชุด ${baht(b.priceSet)} (ซื้อแยก ${baht(b.priceSetNormal)})`;
    }
    $('#mockBanner').hidden = !API.isMock;
  }

  function renderBooking() {
    const single = S.mode === 'single', c = E(), bg = S.ed === 'blackgold';
    $$('.ed-tab').forEach(b => b.classList.toggle('active', b.dataset.edtab === S.ed));
    $('#booking').classList.toggle('ed-bg', bg);
    $('#edNote').innerHTML = bg ? `🖤 <b>สีดำทอง (Black Gold Edition)</b> · LIMITED ${c.numberMax - c.numberMin + 1} SETS · หมายเลข ${c.numberMin}–${c.numberMax}`
      : `🎨 <b>สีต้นฉบับ (Original Edition)</b> · LIMITED ${c.numberMax - c.numberMin + 1} SETS · หมายเลข ${c.numberMin}–${c.numberMax}${(c.earlyBirdLimit || 0) > 0 ? ' · 🎁 มี Early Bird' : ''}`;
    $('#singlePriceLbl').textContent = baht(c.priceSingle) + ' / องค์';
    $('#setPriceLbl').textContent = baht(c.priceSet) + ' / ชุด';
    $('#pangPicker').innerHTML = pangs().map(p => `<button class="pp" data-pang="${p.id}" style="--c:${pc(S.ed, p.id)};--g:${bg ? '#f3d27a' : THEME[p.id].glow}">${img(p.id, S.ed)}<span>${esc(p.name.replace('ปาง', ''))}<small>${THEME[p.id].label}</small><em class="pp-left" data-left="${p.id}"></em></span></button>`).join('');
    $('#setStrip').innerHTML = pangs().map(p => `<div class="ss" style="--c:${pc(S.ed, p.id)}">${img(p.id, S.ed)}<small>${THEME[p.id].label}</small></div>`).join('');
    $$('.mode-tab').forEach(b => b.classList.toggle('active', b.dataset.mode === S.mode));
    $('#pangStep').hidden = !single; $('#setInfo').hidden = single;
    $('#modeStepNum').textContent = '2';
    $('#pangStepNum').textContent = '3';
    $('#gridStepNum').textContent = single ? '4' : '3'; $('#sumStepNum').textContent = single ? '5' : '4'; $('#formStepNum').textContent = single ? '6' : '5';
    $$('.pp').forEach(b => b.classList.toggle('active', b.dataset.pang === S.pang));
    $('#booking').style.setProperty('--accent', single && !bg ? THEME[S.pang].color : GOLD);
    $('#gridFor').textContent = (single ? '· ' + pangName(S.pang) : '· ทั้งชุด') + ' · ' + ED[S.ed].short;
    $('#closedNotice').hidden = !!c.open && A().open !== false;
    renderGrid(); renderCart();
  }
  function renderCounters() {
    if (!S.av || !(S.av.remaining || S.av.editions)) return;
    const o = A('original'), oc = E('original'), otot = oc.numberMax - oc.numberMin + 1;
    $('#heroRemain').textContent = `เหลือครบชุด ${o.setLeft}/${otot} ชุด`;
    $('#ebCount').textContent = o.earlyBirdLeft > 0 ? `เหลือ ${o.earlyBirdLeft} สิทธิ์` : 'สิทธิ์ Early Bird ครบแล้ว';
    $('#earlyBanner').classList.toggle('done', !o.earlyBirdLeft);
    if (hasBG()) { const b = A('blackgold'), bc = E('blackgold'); $('#bgRemain').textContent = `เหลือครบชุด ${b.setLeft}/${bc.numberMax - bc.numberMin + 1} ชุด`; }
    const a = A(), c = E(), tot = c.numberMax - c.numberMin + 1;
    $$('[data-left]').forEach(e => e.textContent = `เหลือ ${a.remaining[e.dataset.left]}`);
    $('#remainLine').innerHTML = S.mode === 'single'
      ? `${esc(ED[S.ed].short)} · ${esc(pangName(S.pang))} เหลือ <b>${a.remaining[S.pang]}</b> / ${tot} องค์`
      : `${esc(ED[S.ed].short)} · ครบชุดเหลือ <b>${a.setLeft}</b> / ${tot} ชุด`;
  }
  function renderGrid() {
    const { numberMin: a, numberMax: b } = E(); let h = '';
    for (let n = a; n <= b; n++) {
      const taken = S.mode === 'single' ? isTaken(S.pang, n) : setTaken(n);
      const sel = S.mode === 'single' ? S.cart.some(c => c.pang === S.pang && c.number === n) : S.setNum === n;
      h += `<button class="nb${taken ? ' taken' : ''}${sel ? ' sel' : ''}" data-n="${n}" ${taken ? 'disabled aria-disabled="true" title="จองแล้ว"' : ''}>${String(n).padStart(2, '0')}${taken ? '<i>จองแล้ว</i>' : ''}</button>`;
    }
    $('#numGrid').innerHTML = h; renderCounters();
    $('#syncLbl').textContent = S.lastSync ? '● อัปเดตล่าสุด ' + new Date(S.lastSync).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
  }
  function cartItems() { return S.mode === 'single' ? S.cart : (S.setNum ? pangs().map(p => ({ pang: p.id, number: S.setNum })) : []); }
  function total() { const c = E(); return S.mode === 'single' ? S.cart.length * c.priceSingle : (S.setNum ? c.priceSet : 0); }
  function deposit() { const c = E(); return S.mode === 'single' ? S.cart.length * c.depositSingle : (S.setNum ? c.depositSet : 0); }
  function moneyHtml(t, d) {
    return `<div class="total-row"><span>ยอดรวม</span><b class="m-total">${baht(t)}</b></div>
      <div class="mrow dep"><span>มัดจำที่ต้องชำระตอนนี้</span><b class="m-dep">${baht(d)}</b></div>
      <div class="mrow"><span>ชำระส่วนที่เหลือก่อนจัดส่ง</span><b class="m-rem">${baht(t - d)}</b></div>`;
  }
  function chips(items, removable, ed) {
    return items.map((c, i) => `<span class="chip" style="--c:${pc(ed || 'original', c.pang)}"><b>#${String(c.number).padStart(2, '0')}</b> ${esc(pangName(c.pang))}${removable ? `<button type="button" data-rm="${i}" aria-label="ลบ">×</button>` : ''}</span>`).join('');
  }
  const edBadge = (ed, name) => `<p class="ed-badge ed-${esc(ed || 'original')}">${ed === 'blackgold' ? '🖤' : '🎨'} รุ่น: <b>${esc(edName(ed, name))}</b></p>`;
  function renderCart() {
    const items = cartItems(), c = E();
    $('#cart').innerHTML = edBadge(S.ed) + (items.length ? (S.mode === 'set' ? `<p class="set-line">ครบชุด 5 องค์ · หมายเลข <b>#${String(S.setNum).padStart(2, '0')}</b> · <s>${baht(c.priceSetNormal)}</s> ประหยัด ${baht(c.priceSetNormal - c.priceSet)}</p>` : '') + chips(items, S.mode === 'single', S.ed)
      : '<p class="muted">ยังไม่ได้เลือกเลข</p>');
    $('#money').innerHTML = moneyHtml(total(), deposit());
    $('#submitBtn').disabled = !items.length || !c.open || A().open === false || S.busy;
  }

  async function refresh(silent) {
    try {
      const r = await API.get({ action: 'availability' });
      if (!r.ok) throw 0;
      applyAvail(r.availability, silent);
    } catch (e) { if (!silent) toast('เชื่อมต่อไม่สำเร็จ กำลังลองใหม่', 'err'); }
  }
  function applyAvail(a) {
    S.av = a; S.lastSync = Date.now();
    const lost = S.cart.filter(c => isTaken(c.pang, c.number));
    if (lost.length) { S.cart = S.cart.filter(c => !isTaken(c.pang, c.number)); toast('มีเลขที่คุณเลือกถูกจองไปแล้ว: ' + lost.map(c => pangName(c.pang) + ' #' + c.number).join(', '), 'err'); }
    if (S.setNum && setTaken(S.setNum)) { toast('เลข #' + S.setNum + ' ไม่ว่างครบทั้งชุดแล้ว กรุณาเลือกใหม่', 'err'); S.setNum = null; }
    $('#closedNotice').hidden = !!E().open && A().open !== false;
    renderGrid(); renderCart();
  }
  function setEdition(ed) {
    if (!E(ed) || ed === S.ed) return;
    if (S.cart.length || S.setNum) toast('เปลี่ยนรุ่นแล้ว — ล้างเลขที่เลือกไว้ (เลขของแต่ละรุ่นแยกกัน)');
    S.ed = ed; S.cart = []; S.setNum = null; renderBooking();
  }

  function bind() {
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-zoom-cover],[data-zoom],[data-book],[data-goto],[data-edtab],.pp,.mode-tab,.nb,[data-rm],.lb-close,#lightbox');
      if (!t) return;
      if (t.hasAttribute('data-zoom-cover')) { const lb = $('#lightbox'); lb.querySelector('img').src = 'img/bg-cover.jpg'; lb.querySelector('.lb-cap').textContent = 'ช้างศึก 5 มหาธาตุ · สีดำทอง (Black Gold Edition)'; lb.hidden = false; document.body.classList.add('noscroll'); return; }
      if (t.dataset.zoom) { const p = pangs().find(x => x.id === t.dataset.zoom), ed = t.dataset.zed || 'original'; const lb = $('#lightbox');
        lb.querySelector('img').src = `img/${ED[ed].prefix}${p.id}.jpg`; lb.querySelector('.lb-cap').textContent = `${p.name} · ${THEME[p.id].label} · ${ED[ed].short}`; lb.hidden = false; document.body.classList.add('noscroll'); return; }
      if (t.matches('.lb-close,#lightbox')) { $('#lightbox').hidden = true; document.body.classList.remove('noscroll'); return; }
      if (t.dataset.edtab) { setEdition(t.dataset.edtab); return; }
      if (t.dataset.ed && (t.dataset.book || t.dataset.goto)) setEdition(t.dataset.ed);
      if (t.dataset.book) { S.mode = 'single'; S.pang = t.dataset.book; renderBooking(); $('#booking').scrollIntoView({ behavior: 'smooth' }); return; }
      if (t.dataset.goto) { S.mode = t.dataset.goto; renderBooking(); return; }
      if (t.classList.contains('pp')) { S.pang = t.dataset.pang; renderBooking(); return; }
      if (t.classList.contains('mode-tab')) { S.mode = t.dataset.mode; renderBooking(); return; }
      if (t.dataset.rm !== undefined) { S.cart.splice(+t.dataset.rm, 1); renderGrid(); renderCart(); return; }
      if (t.classList.contains('nb') && !t.disabled) {
        const n = +t.dataset.n;
        if (S.mode === 'single') { const i = S.cart.findIndex(c => c.pang === S.pang && c.number === n); i >= 0 ? S.cart.splice(i, 1) : S.cart.push({ pang: S.pang, number: n }); }
        else S.setNum = S.setNum === n ? null : n;
        renderGrid(); renderCart();
      }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#lightbox').hidden = true; });
    $('#orderForm').addEventListener('submit', submit);
    $('#newOrderBtn').addEventListener('click', () => { $('#confirm').hidden = true; $('#booking').hidden = false; $('#booking').scrollIntoView(); });
    $('#lookupForm').addEventListener('submit', lookup);
  }

  async function submit(e) {
    e.preventDefault(); const f = e.target, err = $('#formErr'); err.textContent = '';
    const v = Object.fromEntries(new FormData(f));
    const phone = v.phone.replace(/\D/g, '');
    if (!v.name.trim()) return err.textContent = 'กรุณากรอกชื่อผู้สั่งจอง';
    if (!v.ownerName.trim()) return err.textContent = 'กรุณากรอกชื่อสำหรับลงทะเบียนผู้ครอบครอง';
    if (phone.length < 9 || phone.length > 10) return err.textContent = 'กรุณากรอกเบอร์โทรให้ถูกต้อง (9–10 หลัก)';
    if (!v.address.trim()) return err.textContent = 'กรุณากรอกที่อยู่จัดส่ง';
    if (!cartItems().length) return err.textContent = 'กรุณาเลือกเลขอย่างน้อย 1 เลข';
    S.busy = true; renderCart(); $('#submitBtn').textContent = 'กำลังตรวจสอบเลข…';
    try {
      await refresh(true); // re-check right before submit
      if (!cartItems().length) { err.textContent = 'เลขที่เลือกถูกจองไปแล้ว กรุณาเลือกใหม่'; return; }
      const body = { action: 'order', edition: S.ed, mode: S.mode, ...v };
      if (S.mode === 'set') body.number = S.setNum; else body.items = S.cart;
      $('#submitBtn').textContent = 'กำลังส่งคำสั่งจอง…';
      const r = await API.post(body);
      if (!r.ok) {
        err.textContent = r.message || 'จองไม่สำเร็จ';
        if (r.availability) applyAvail(r.availability); else refresh(true);
        return;
      }
      showConfirm(r.order, r.paymentText, r.facebookUrl); S.cart = []; S.setNum = null; f.reset(); refresh(true);
    } catch (x) { err.textContent = 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่'; }
    finally { S.busy = false; $('#submitBtn').textContent = 'ยืนยันการจอง'; renderCart(); }
  }
  function showConfirm(o, pay, fb) {
    const ed = o.edition || 'original';
    $('#cEdition').innerHTML = edBadge(ed, o.editionName);
    $('#confirm').classList.toggle('ed-bg', ed === 'blackgold');
    $('#cEarly').hidden = !o.earlyBird; $('#cOwner').textContent = o.ownerName || '';
    if (fb) $('#fbBtn').href = fb;
    $('#cMoney').innerHTML = moneyHtml(o.total, o.deposit);
    $('#cOrderId').textContent = o.orderId;
    $('#cItems').innerHTML = (o.mode === 'set' ? `<p class="set-line">ครบชุด 5 องค์ · หมายเลข <b>#${String(o.items[0].number).padStart(2, '0')}</b></p>` : '') + chips(o.items, false, ed);
    $('#cStatus').textContent = o.status; $('#cPay').textContent = pay || S.cfg.paymentText;
    $('#booking').hidden = true; $('#confirm').hidden = false; $('#confirm').scrollIntoView();
  }
  async function lookup(e) {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)), out = $('#lookupResult');
    out.innerHTML = '<p class="muted">กำลังค้นหา…</p>';
    try {
      const r = await API.get({ action: 'lookup', phone: v.phone, orderId: v.orderId });
      const o = r.order || {};
      out.innerHTML = r.ok ? `<div class="lookup-card"><p>เลขที่ <b>${esc(o.orderId)}</b> · ${esc(o.name)}</p>${edBadge(o.edition, o.editionName)}${o.earlyBird ? '<p class="eb-badge">🎁 EARLY BIRD</p>' : ''}<p class="muted">ผู้ครอบครอง: ${esc(o.ownerName)}</p>${chips(o.items, false, o.edition)}${moneyHtml(o.total, o.deposit)}<p class="status-chip st-${esc(o.status)}">สถานะ: <b>${esc(o.status)}</b></p></div>`
        : `<p class="form-err">${esc(r.message)}</p>`;
    } catch (x) { out.innerHTML = '<p class="form-err">เชื่อมต่อไม่สำเร็จ</p>'; }
  }

  async function init() {
    bind();
    try {
      const r = await API.get({ action: 'config' });
      S.cfg = r.config; S.av = r.availability; S.lastSync = Date.now();
      const q = new URLSearchParams(location.search).get('edition'); if (q && E(q)) S.ed = q;
      renderStatic(); renderBooking();
      document.body.classList.add('ready');
    } catch (e) { toast('โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้า', 'err'); return; }
    setInterval(() => { if (!document.hidden && !S.busy) refresh(true); }, (window.APP_CONFIG || {}).POLL_MS || 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(true); });
  }
  window.__app = { S, refresh, setEdition };
  init();
})();
