(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const THEME = {
    fire:    { color: '#e0452b', glow: '#ffb347', emoji: '🔥', label: 'ธาตุไฟ', tag: 'สัญลักษณ์แห่งความกล้าหาญ ความรุ่งเรือง และความมั่งคั่งไม่สิ้นสุด' },
    water:   { color: '#2f8fe0', glow: '#8fd3ff', emoji: '🌊', label: 'ธาตุน้ำ', tag: 'สัญลักษณ์แห่งความเมตตา เสน่ห์ และความสมดุล' },
    wind:    { color: '#2fae6a', glow: '#a8f0c0', emoji: '🌪️', label: 'ธาตุลม', tag: 'สัญลักษณ์แห่งโอกาส ความก้าวหน้า และการเปิดรับสิ่งดี ๆ' },
    earth:   { color: '#9a3b2a', glow: '#e0a878', emoji: '🌍', label: 'ธาตุดิน', tag: 'สัญลักษณ์แห่งความมั่นคง ความหนักแน่น และความสำเร็จที่ยั่งยืน' },
    thunder: { color: '#8a4fe0', glow: '#d6b8ff', emoji: '⚡', label: 'ธาตุฟ้า', tag: 'สัญลักษณ์แห่งการปกป้อง ความเข้มแข็ง และการคุ้มครอง' }
  };
  const THAI_NUM = n => String(n).replace(/\d/g, d => '๐๑๒๓๔๕๖๗๘๙'[d]);
  const baht = n => '฿' + Number(n || 0).toLocaleString('th-TH');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const img = id => `<picture><source srcset="img/${id}.webp" type="image/webp"><img src="img/${id}.jpg" alt="" loading="lazy" width="900" height="1208"></picture>`;

  const S = { cfg: null, taken: {}, av: {}, mode: 'single', pang: 'fire', cart: [], setNum: null, busy: false, lastSync: 0 };
  const pangs = () => S.cfg.pangs;
  const pangName = id => (pangs().find(p => p.id === id) || {}).name || id;
  const isTaken = (pang, n) => (S.taken[pang] || []).includes(n);
  const setTaken = n => pangs().some(p => isTaken(p.id, n));

  function toast(msg, type) { const t = $('#toast'); t.textContent = msg; t.className = 'toast ' + (type || ''); t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => t.hidden = true, 4500); }

  function renderStatic() {
    const c = S.cfg;
    $('#priceHint').textContent = `แยกองค์ ${baht(c.priceSingle)} · ครบชุด ${baht(c.priceSet)} (ปกติ ${baht(c.priceSetNormal)})`;
    $('#singlePriceLbl').textContent = baht(c.priceSingle) + ' / องค์';
    $('#setPriceLbl').textContent = baht(c.priceSet) + ' / ชุด';
    const fb = c.facebookUrl || (window.APP_CONFIG || {}).FACEBOOK_URL || 'https://www.facebook.com/share/1EqgTK2uxN/';
    $('#fbBtn').href = fb; $('#fbFoot').href = fb;
    $('#priceGrid').innerHTML = `
      <div class="price-card"><p class="pc-k">🔥 ราคาสั่งจองแยกองค์</p><p class="pc-big">${baht(c.priceSingle)} <small>/ องค์</small></p>
        <ul><li>🔹 มัดจำเพียง <b>${baht(c.depositSingle)}</b></li><li>🔹 ชำระส่วนที่เหลือ <b>${baht(c.priceSingle - c.depositSingle)}</b> ก่อนจัดส่ง</li></ul>
        <p class="muted">เลือกสะสมปางที่ชื่นชอบได้ตามต้องการ</p><a href="#booking" class="btn btn-ghost btn-block" data-goto="single">จองแยกองค์</a></div>
      <div class="price-card hot"><p class="pc-k">🎁 SPECIAL COLLECTOR'S SET</p><p class="muted">ครบชุด 5 มหาธาตุ จำนวน 5 องค์ · หมายเลขเดียวกันทุกองค์</p>
        <p class="pc-old">ราคาปกติ ${baht(c.priceSetNormal)}</p><p class="pc-big">${baht(c.priceSet)} <small>/ ชุด</small></p><p class="save">🎉 ประหยัดทันที ${baht(c.priceSetNormal - c.priceSet)}</p>
        <ul><li>🔹 มัดจำยกชุดเพียง <b>${baht(c.depositSet)}</b></li><li>🔹 ชำระส่วนที่เหลือ <b>${baht(c.priceSet - c.depositSet)}</b> ก่อนจัดส่ง</li></ul>
        <a href="#booking" class="btn btn-gold btn-block" data-goto="set">จองครบชุด</a></div>`;
    $('#payText').textContent = c.paymentText;
    if (c.paymentQr) $$('.pay-qr').forEach(i => i.src = c.paymentQr);
    $('#heroFigs').innerHTML = pangs().map((p, i) => `<div class="hf hf${i}" style="--c:${THEME[p.id].color};--g:${THEME[p.id].glow}">${img(p.id)}</div>`).join('');
    $('#gallery-list').innerHTML = pangs().map((p, i) => `
      <article class="card" style="--c:${THEME[p.id].color};--g:${THEME[p.id].glow}">
        <button class="card-img" data-zoom="${p.id}" aria-label="ขยายภาพ ${esc(p.name)}">${img(p.id)}<span class="zoom-ico">⤢</span></button>
        <div class="card-body">
          <p class="el-badge">${THEME[p.id].emoji} ${THEME[p.id].label}</p>
          <h3>${esc(p.name)}</h3>
          <p class="tagline">${THEME[p.id].tag}</p>
          <div class="card-foot"><b>${baht(c.priceSingle)}</b><button class="btn btn-sm btn-gold" data-book="${p.id}">จองปางนี้</button></div>
        </div>
      </article>`).join('');
    $('#pangPicker').innerHTML = pangs().map(p => `<button class="pp" data-pang="${p.id}" style="--c:${THEME[p.id].color};--g:${THEME[p.id].glow}">${img(p.id)}<span>${esc(p.name.replace('ปาง', ''))}<small>${THEME[p.id].label}</small><em class="pp-left" data-left="${p.id}"></em></span></button>`).join('');
    $('#setStrip').innerHTML = pangs().map(p => `<div class="ss" style="--c:${THEME[p.id].color}">${img(p.id)}<small>${THEME[p.id].label}</small></div>`).join('');
    $('#closedNotice').hidden = c.open;
    $('#mockBanner').hidden = !API.isMock;
  }

  function renderBooking() {
    const single = S.mode === 'single';
    $$('.mode-tab').forEach(b => b.classList.toggle('active', b.dataset.mode === S.mode));
    $('#pangStep').hidden = !single; $('#setInfo').hidden = single;
    $('#gridStepNum').textContent = single ? '2' : '1'; $('#sumStepNum').textContent = single ? '3' : '2'; $('#formStepNum').textContent = single ? '4' : '3';
    $$('.pp').forEach(b => b.classList.toggle('active', b.dataset.pang === S.pang));
    const th = THEME[single ? S.pang : 'fire'];
    $('#booking').style.setProperty('--accent', single ? th.color : '#d4a63a');
    $('#gridFor').textContent = single ? '· ' + pangName(S.pang) : '· ทั้งชุด';
    renderGrid(); renderCart();
  }
  function renderCounters() {
    const a = S.av, c = S.cfg, tot = c.numberMax - c.numberMin + 1;
    if (!a.remaining) return;
    $('#heroRemain').textContent = `เหลือครบชุด ${a.setLeft}/${tot} ชุด`;
    $('#ebCount').textContent = a.earlyBirdLeft > 0 ? `เหลือ ${a.earlyBirdLeft} สิทธิ์` : 'สิทธิ์ Early Bird ครบแล้ว';
    $('#earlyBanner').classList.toggle('done', !a.earlyBirdLeft);
    $$('[data-left]').forEach(e => e.textContent = `เหลือ ${a.remaining[e.dataset.left]}`);
    $('#remainLine').innerHTML = S.mode === 'single'
      ? `${esc(pangName(S.pang))} เหลือ <b>${a.remaining[S.pang]}</b> / ${tot} องค์`
      : `ครบชุดเหลือ <b>${a.setLeft}</b> / ${tot} ชุด`;
  }
  function renderGrid() {
    const { numberMin: a, numberMax: b } = S.cfg; let h = '';
    for (let n = a; n <= b; n++) {
      const taken = S.mode === 'single' ? isTaken(S.pang, n) : setTaken(n);
      const sel = S.mode === 'single' ? S.cart.some(c => c.pang === S.pang && c.number === n) : S.setNum === n;
      h += `<button class="nb${taken ? ' taken' : ''}${sel ? ' sel' : ''}" data-n="${n}" ${taken ? 'disabled aria-disabled="true" title="จองแล้ว"' : ''}>${String(n).padStart(2, '0')}${taken ? '<i>จองแล้ว</i>' : ''}</button>`;
    }
    $('#numGrid').innerHTML = h; renderCounters();
    const sec = S.lastSync ? Math.round((Date.now() - S.lastSync) / 1000) : null;
    $('#syncLbl').textContent = sec === null ? '' : '● อัปเดตล่าสุด ' + new Date(S.lastSync).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  function cartItems() { return S.mode === 'single' ? S.cart : (S.setNum ? pangs().map(p => ({ pang: p.id, number: S.setNum })) : []); }
  function total() { return S.mode === 'single' ? S.cart.length * S.cfg.priceSingle : (S.setNum ? S.cfg.priceSet : 0); }
  function deposit() { return S.mode === 'single' ? S.cart.length * S.cfg.depositSingle : (S.setNum ? S.cfg.depositSet : 0); }
  function moneyHtml(t, d) {
    return `<div class="total-row"><span>ยอดรวม</span><b class="m-total">${baht(t)}</b></div>
      <div class="mrow dep"><span>มัดจำที่ต้องชำระตอนนี้</span><b class="m-dep">${baht(d)}</b></div>
      <div class="mrow"><span>ชำระส่วนที่เหลือก่อนจัดส่ง</span><b class="m-rem">${baht(t - d)}</b></div>`;
  }
  function chips(items, removable) {
    return items.map((c, i) => `<span class="chip" style="--c:${THEME[c.pang].color}"><b>#${String(c.number).padStart(2, '0')}</b> ${esc(pangName(c.pang))}${removable ? `<button type="button" data-rm="${i}" aria-label="ลบ">×</button>` : ''}</span>`).join('');
  }
  function renderCart() {
    const items = cartItems();
    $('#cart').innerHTML = items.length ? (S.mode === 'set' ? `<p class="set-line">ครบชุด 5 องค์ · หมายเลข <b>#${String(S.setNum).padStart(2, '0')}</b> · <s>${baht(S.cfg.priceSetNormal)}</s> ประหยัด ${baht(S.cfg.priceSetNormal - S.cfg.priceSet)}</p>` : '') + chips(items, S.mode === 'single')
      : '<p class="muted">ยังไม่ได้เลือกเลข</p>';
    $('#money').innerHTML = moneyHtml(total(), deposit());
    $('#submitBtn').disabled = !items.length || !S.cfg.open || S.busy;
  }

  async function refresh(silent) {
    try {
      const r = await API.get({ action: 'availability' });
      if (!r.ok) throw 0;
      applyAvail(r.availability, silent);
    } catch (e) { if (!silent) toast('เชื่อมต่อไม่สำเร็จ กำลังลองใหม่', 'err'); }
  }
  function applyAvail(a, silent) {
    S.taken = a.taken; S.av = a; S.lastSync = Date.now(); S.cfg.open = a.open; $('#closedNotice').hidden = a.open;
    // drop selections that someone else took
    const lost = S.cart.filter(c => isTaken(c.pang, c.number));
    if (lost.length) { S.cart = S.cart.filter(c => !isTaken(c.pang, c.number)); toast('มีเลขที่คุณเลือกถูกจองไปแล้ว: ' + lost.map(c => pangName(c.pang) + ' #' + c.number).join(', '), 'err'); }
    if (S.setNum && setTaken(S.setNum)) { toast('เลข #' + S.setNum + ' ไม่ว่างครบทั้งชุดแล้ว กรุณาเลือกใหม่', 'err'); S.setNum = null; }
    renderGrid(); renderCart();
  }

  function bind() {
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-zoom],[data-book],[data-goto],.pp,.mode-tab,.nb,[data-rm],.lb-close,#lightbox');
      if (!t) return;
      if (t.dataset.zoom) { const p = pangs().find(x => x.id === t.dataset.zoom); const lb = $('#lightbox'); lb.querySelector('img').src = `img/${p.id}.jpg`; lb.querySelector('.lb-cap').textContent = `${p.name} · ธาตุ${p.element}`; lb.hidden = false; document.body.classList.add('noscroll'); return; }
      if (t.matches('.lb-close,#lightbox')) { $('#lightbox').hidden = true; document.body.classList.remove('noscroll'); return; }
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
      const body = { action: 'order', mode: S.mode, ...v };
      if (S.mode === 'set') body.number = S.setNum; else body.items = S.cart;
      $('#submitBtn').textContent = 'กำลังส่งคำสั่งจอง…';
      const r = await API.post(body);
      if (!r.ok) {
        err.textContent = r.message || 'จองไม่สำเร็จ';
        if (r.availability) applyAvail(r.availability, true); else refresh(true);
        return;
      }
      showConfirm(r.order, r.paymentText, r.facebookUrl); S.cart = []; S.setNum = null; f.reset(); refresh(true);
    } catch (x) { err.textContent = 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่'; }
    finally { S.busy = false; $('#submitBtn').textContent = 'ยืนยันการจอง'; renderCart(); }
  }
  function showConfirm(o, pay, fb) {
    $('#cEarly').hidden = !o.earlyBird; $('#cOwner').textContent = o.ownerName || '';
    if (fb) $('#fbBtn').href = fb;
    $('#cMoney').innerHTML = moneyHtml(o.total, o.deposit);
    $('#cOrderId').textContent = o.orderId;
    $('#cItems').innerHTML = (o.mode === 'set' ? `<p class="set-line">ครบชุด 5 องค์ · หมายเลข <b>#${String(o.items[0].number).padStart(2, '0')}</b></p>` : '') + chips(o.items);
    $('#cStatus').textContent = o.status; $('#cPay').textContent = pay || S.cfg.paymentText;
    $('#booking').hidden = true; $('#confirm').hidden = false; $('#confirm').scrollIntoView();
  }
  async function lookup(e) {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)), out = $('#lookupResult');
    out.innerHTML = '<p class="muted">กำลังค้นหา…</p>';
    try {
      const r = await API.get({ action: 'lookup', phone: v.phone, orderId: v.orderId });
      out.innerHTML = r.ok ? `<div class="lookup-card"><p>เลขที่ <b>${esc(r.order.orderId)}</b> · ${esc(r.order.name)}</p>${r.order.earlyBird ? '<p class="eb-badge">🎁 EARLY BIRD</p>' : ''}<p class="muted">ผู้ครอบครอง: ${esc(r.order.ownerName)}</p>${chips(r.order.items)}${moneyHtml(r.order.total, r.order.deposit)}<p class="status-chip st-${esc(r.order.status)}">สถานะ: <b>${esc(r.order.status)}</b></p></div>`
        : `<p class="form-err">${esc(r.message)}</p>`;
    } catch (x) { out.innerHTML = '<p class="form-err">เชื่อมต่อไม่สำเร็จ</p>'; }
  }

  async function init() {
    bind();
    try {
      const r = await API.get({ action: 'config' });
      S.cfg = r.config; renderStatic(); S.taken = r.availability.taken; S.av = r.availability; S.lastSync = Date.now(); renderBooking();
      document.body.classList.add('ready');
    } catch (e) { toast('โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้า', 'err'); return; }
    setInterval(() => { if (!document.hidden && !S.busy) refresh(true); }, (window.APP_CONFIG || {}).POLL_MS || 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(true); });
  }
  window.__app = { S, refresh };
  init();
})();
