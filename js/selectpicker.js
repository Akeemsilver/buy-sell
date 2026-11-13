/* A phone-friendly replacement for the browser's built-in drop-down list. Tapping any <select> opens a bottom picker in the app's own style:
   a title, an optional search box (long lists), the choices with a round tick, and Cancel / Done. The <select> keeps its value and fires
   its normal input / change events, so nothing else in the app has to know. Add data-native to a <select> to keep the browser's own list. */
(function (root) {
  'use strict';
  const CSS = `
.spk-scrim{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100000;animation:spkf .15s ease}
.spk{position:fixed;left:0;right:0;bottom:0;margin:0 auto;max-width:620px;max-height:82vh;z-index:100001;display:flex;flex-direction:column;background:var(--card,#fff);color:var(--ink,#241b27);border-radius:22px 22px 0 0;padding:10px 16px calc(16px + env(safe-area-inset-bottom));box-shadow:0 -10px 30px rgba(0,0,0,.25);animation:spku .18s ease;font-family:inherit}
@keyframes spku{from{transform:translateY(40px);opacity:.6}to{transform:none;opacity:1}}@keyframes spkf{from{opacity:0}to{opacity:1}}
.spk .spk-grab{width:44px;height:5px;border-radius:3px;background:var(--line,#ebe8ed);margin:0 auto 12px;flex:none}
.spk h3{margin:0 0 6px;font-size:18px;font-weight:800;flex:none}
.spk .spk-q{display:flex;align-items:center;gap:8px;border:1px solid var(--line,#ebe8ed);border-radius:14px;padding:0 12px;margin:4px 0 6px;flex:none;background:var(--card,#fff)}
.spk .spk-q input{flex:1;min-width:0;border:0;outline:0;background:transparent;box-shadow:none;font-size:16px;padding:13px 0;color:var(--ink,#241b27);height:auto;min-height:0;-webkit-appearance:none;appearance:none}
.spk .spk-q input::-webkit-search-cancel-button{display:none}.spk .spk-q input::placeholder{color:var(--mute,#7b7080);opacity:.6}
.spk .spk-list{overflow-y:auto;flex:1;min-height:60px;-webkit-overflow-scrolling:touch}
.spk .spk-row{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--line,#ebe8ed);border-radius:0;padding:14px 2px;min-height:0;box-shadow:none;color:inherit;font:inherit;font-size:15.5px;font-weight:700;cursor:pointer}
.spk .spk-row.on{color:var(--brand,#741b47)}.spk .spk-row[disabled]{opacity:.4}
.spk .spk-rad{width:24px;height:24px;border-radius:50%;border:2px solid var(--line,#ebe8ed);flex:none;display:flex;align-items:center;justify-content:center}
.spk .spk-row.on .spk-rad{border-color:var(--brand,#741b47)}.spk .spk-row.on .spk-rad:after{content:"";width:12px;height:12px;border-radius:50%;background:var(--brand,#741b47)}
.spk .spk-none{padding:18px 4px;color:var(--mute,#7b7080);text-align:center}
.spk .spk-btns{display:flex;gap:10px;margin-top:10px;flex:none}
.spk .spk-btns button{flex:1;padding:14px;border-radius:14px;border:1px solid var(--line,#ebe8ed);background:var(--card,#fff);color:var(--ink,#241b27);font:inherit;font-size:15px;font-weight:800;min-height:0;box-shadow:none;cursor:pointer}
.spk .spk-btns button.p{background:var(--brand,#741b47);border-color:var(--brand,#741b47);color:#fff}`;
  let node = null, onPop = null;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function close() { if (node) { node.forEach((n) => n.remove()); node = null; } if (onPop) { root.removeEventListener('popstate', onPop); onPop = null; } }
  function titleOf(sel, L) {
    const a = sel.getAttribute('aria-label'); if (a) return a;
    let lab = sel.id ? document.querySelector('label[for="' + sel.id + '"]') : null;
    if (!lab) { let p = sel.previousElementSibling; while (p && p.tagName !== 'LABEL') p = p.previousElementSibling; lab = p; }
    if (!lab) { const c = sel.closest('label'); if (c) { const k = c.cloneNode(true); k.querySelectorAll('select').forEach((x) => x.remove()); lab = k; } }
    const t = lab ? (lab.textContent || '').replace(/\s+/g, ' ').trim() : ''; return t || L.choose;
  }
  function open(sel, labels) {
    close();
    const L = Object.assign({ cancel: 'Cancel', done: 'Done', search: 'Search', choose: 'Choose', none: 'No match', searchMin: 9 }, labels ? labels() : {});
    const opts = [...sel.options].map((o, i) => ({ i, v: o.value, t: o.text, dis: o.disabled }));
    let pend = sel.selectedIndex;
    const scrim = document.createElement('div'); scrim.className = 'spk-scrim';
    const box = document.createElement('div'); box.className = 'spk'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    const rows = (q) => { const f = opts.filter((o) => !q || o.t.toLowerCase().includes(q.toLowerCase())); return f.length ? f.map((o) => `<button type="button" class="spk-row${o.i === pend ? ' on' : ''}" data-i="${o.i}"${o.dis ? ' disabled' : ''}><span>${esc(o.t)}</span><span class="spk-rad"></span></button>`).join('') : `<div class="spk-none">${esc(L.none)}</div>`; };
    box.innerHTML = `<div class="spk-grab"></div><h3>${esc(titleOf(sel, L))}</h3>${opts.length >= L.searchMin ? `<div class="spk-q"><span aria-hidden="true">🔍</span><input type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(L.search)}" aria-label="${esc(L.search)}"></div>` : ''}<div class="spk-list">${rows('')}</div><div class="spk-btns"><button type="button" data-x="cancel">${esc(L.cancel)}</button><button type="button" class="p" data-x="done">${esc(L.done)}</button></div>`;
    document.body.appendChild(scrim); document.body.appendChild(box); node = [scrim, box];
    const list = box.querySelector('.spk-list'), cur = list.querySelector('.on'); if (cur) cur.scrollIntoView({ block: 'center' });
    scrim.addEventListener('click', close);
    box.addEventListener('click', (e) => {
      const r = e.target.closest('.spk-row'), x = e.target.closest('[data-x]');
      if (r && !r.disabled) { pend = Number(r.dataset.i); list.querySelectorAll('.spk-row').forEach((b) => b.classList.toggle('on', Number(b.dataset.i) === pend)); }
      else if (x && x.dataset.x === 'cancel') close();
      else if (x && x.dataset.x === 'done') { if (pend !== sel.selectedIndex) { sel.selectedIndex = pend; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); } close(); }
    });
    const q = box.querySelector('.spk-q input'); if (q) q.addEventListener('input', () => { list.innerHTML = rows(q.value); });
    onPop = () => close(); root.addEventListener('popstate', onPop);
  }
  function install(labels) {
    if (install.done) return; install.done = true;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const pick = (e) => { const s = e.target && e.target.closest ? e.target.closest('select') : null; return s && !s.disabled && !s.multiple && !s.hasAttribute('data-native') ? s : null; };
    let tx = null;
    document.addEventListener('touchstart', (e) => { tx = pick(e) && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { capture: true, passive: true });
    document.addEventListener('touchend', (e) => { const s = pick(e); if (!s || !tx) return; const t = e.changedTouches[0]; const moved = Math.abs(t.clientX - tx.x) + Math.abs(t.clientY - tx.y) > 12; tx = null; if (moved) return; e.preventDefault(); open(s, labels); }, { capture: true, passive: false });
    document.addEventListener('mousedown', (e) => { const s = pick(e); if (s) e.preventDefault(); }, true);   // stops the browser's own list
    document.addEventListener('click', (e) => { const s = pick(e); if (s) { e.preventDefault(); open(s, labels); } }, true);
    document.addEventListener('keydown', (e) => { const s = pick(e); if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(s, labels); } }, true);
  }
  root.SelectPicker = { install, open, close };
})(typeof window !== 'undefined' ? window : globalThis);
