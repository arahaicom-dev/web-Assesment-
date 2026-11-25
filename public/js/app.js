/* Asesmen Merdeka — logika tampilan */
(function () {
  'use strict';
  const C = window.Calc, P = window.SoalParser, S = window.Store;
  const T = C.TYPES;
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = () => S.state;
  const fmt = (n, d) => C.isNum(n) ? n.toLocaleString('id-ID', { maximumFractionDigits: d == null ? 2 : d }) : '–';
  const QT = window.QT;
  const TYPE_LABEL = {}; QT.ORDER.forEach(k => { TYPE_LABEL[k] = QT.TYPES[k].label; });
  const isManual = t => P.MANUAL_TYPES.indexOf(t) >= 0;
  const typeSummary = qs => QT.ORDER.map(t => { const n = qs.filter(x => x.type === t).length; return n ? n + ' ' + TYPE_LABEL[t] : ''; }).filter(Boolean).join(' · ');
  /** Muat gambar/rekaman jawaban yang disimpan di server (jenis Menggambar / Rekam Suara). */
  function loadMedia(root) {
    $$('.qt-media[data-media]', root).forEach(async el => {
      try {
        const r = await S.api('media/' + encodeURIComponent(el.dataset.media));
        el.innerHTML = el.dataset.kind === 'audio' ? `<audio controls src="${r.data}"></audio>` : `<img src="${r.data}" class="zoomable" style="max-width:100%;border-radius:10px;border:1px solid var(--border);background:#fff">`;
      } catch (e) { el.textContent = 'Gagal memuat: ' + e.message; }
    });
  }
  /** Kartu jawaban murid + kunci untuk halaman koreksi. */
  function reviewAnsHTML(q, ans) {
    const skipKey = ['uraian', 'gambar', 'suara', 'polling', 'slide'].indexOf(q.type) >= 0 && !q.answer;
    return `<div class="rv-ans"><div class="small muted">Jawaban murid:</div><div class="rv-box">${QT.answerHTML(q, ans)}</div>${skipKey || q.type === 'polling' || q.type === 'slide' ? '' : `<div class="small muted">${isManual(q.type) ? 'Pedoman' : 'Kunci'}: <b>${esc(QT.keyText(q))}</b></div>`}</div>`;
  }
  /** Pratinjau satu soal seperti tampilan murid (bisa dicoba) + kunci. */
  function previewCard(x, i) {
    return `<div class="q-card"><div class="q-head"><span class="qn">${i + 1}</span><span class="pill">${QT.TYPES[x.type].icon} ${TYPE_LABEL[x.type]}</span><span class="pill">${x.points} poin</span></div>
      ${x.image && x.type !== 'titik' && x.type !== 'label' ? `<img src="${x.image}" class="zoomable q-img" alt="gambar soal">` : ''}${x.type === 'seret' || x.type === 'dropdown' ? '' : `<div class="q-text">${esc(x.text)}</div>`}
      <div class="pv-mount" data-pv="${i}"></div>
      ${x.type === 'slide' || x.type === 'polling' ? '' : `<div class="small muted" style="margin-top:6px">${isManual(x.type) ? 'Pedoman' : 'Kunci'}: <b>${esc(QT.keyText(x))}</b>${QT.hasKey(x) ? '' : ' <span class="pill bad">belum lengkap</span>'}</div>`}</div>`;
  }
  function mountPreviews(m, qs) { $$('[data-pv]', m).forEach(el => { const q = qs[+el.dataset.pv]; QT.mount(el, QT.publicView(q, 'pv'), '', {}); }); }

  /* ================= Utilitas UI ================= */
  function toast(msg, kind) {
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || 'ok'); el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; }, 2800);
    setTimeout(() => el.remove(), 3300);
  }
  function modal(html, opts) {
    opts = opts || {};
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal-bg"><div class="modal ${opts.wide ? 'wide' : ''}">${html}</div></div>`;
    const bg = root.firstChild;
    bg.addEventListener('mousedown', e => { if (e.target === bg && !opts.sticky) closeModal(); });
    const m = $('.modal', root);
    $$('[data-close]', m).forEach(b => b.addEventListener('click', closeModal));
    const first = $('input,select,textarea', m); if (first && !opts.noFocus) setTimeout(() => first.focus(), 50);
    return m;
  }
  function closeModal() { $('#modal-root').innerHTML = ''; }
  function confirmBox(msg, okLabel) {
    return new Promise(res => {
      const m = modal(`<h2>Konfirmasi</h2><p>${msg}</p><div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn danger" id="cf-ok">${okLabel || 'Ya, lanjutkan'}</button></div>`, { noFocus: true });
      $('#cf-ok', m).onclick = () => { closeModal(); res(true); };
      $$('[data-close]', m).forEach(b => b.addEventListener('click', () => res(false)));
    });
  }
  function download(name, content, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function exportTable(table, name, kind) {
    const rows = $$('tr', table).map(tr => $$('th,td', tr).map(td => {
      const inp = $('input,select', td);
      return (inp ? inp.value : td.innerText).replace(/\s+/g, ' ').trim();
    }));
    if (kind === 'csv') {
      const csv = rows.map(r => r.map(c => /[;"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c).join(';')).join('\r\n');
      download(name + '.csv', '﻿' + csv, 'text/csv;charset=utf-8');
    } else {
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table border="1">${rows.map((r, i) => '<tr>' + r.map(c => (i === 0 ? '<th>' : '<td>') + esc(c) + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('')}</table></body></html>`;
      download(name + '.xls', '﻿' + html, 'application/vnd.ms-excel');
    }
  }
  function pickFile(accept) {
    return new Promise(res => {
      const inp = $('#file-input'); inp.value = ''; inp.accept = accept || '';
      inp.onchange = () => res(inp.files[0] || null); inp.click();
    });
  }
  function bindTilt(root) {
    const max = 9;
    $$('.tilt', root).forEach(el => {
      el.addEventListener('pointermove', e => {
        if (st().theme.motion === 'off' || e.pointerType === 'touch') return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        const d = +st().theme.depth || 1;
        el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * max * d}deg) rotateY(${(x - 0.5) * max * d}deg) translateZ(0)`;
        el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%');
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }
  function scoreClass(v) {
    if (!C.isNum(v)) return '';
    return v < st().settings.kktp ? 'low' : (v >= 90 ? 'high' : '');
  }
  function ketPill(v) {
    const k = C.ketercapaian(v, st().settings);
    if (!k) return '<span class="pill">–</span>';
    if (!k.tuntas) return '<span class="pill bad">Remedial</span>';
    return k.tindak === 'Pengayaan' ? '<span class="pill ok">Pengayaan</span>' : '<span class="pill ok">Tercapai</span>';
  }
  function gradeBadge(b) { return b ? `<span class="grade ${esc(b.label)}" title="${esc(b.name)}">${esc(b.label)}</span>` : '–'; }

  /* ================= Tema ================= */
  function applyTheme(keepMode) {
    const t = st().theme, r = document.documentElement;
    r.style.setProperty('--h', t.h); r.style.setProperty('--s', t.s); r.style.setProperty('--depth', t.depth);
    r.dataset.motion = t.motion;
    if (keepMode) return; // sebelum login: pakai pilihan ☀️/🌙 yang tersimpan di perangkat
    if (window.ThemeMode) ThemeMode.set(t.mode || 'dark', true); else r.dataset.mode = t.mode === 'light' ? 'light' : 'dark';
  }
  // Tombol ☀️/🌙: simpan pilihan ke tema akun guru
  window.addEventListener('modechange', e => {
    const t = st().theme; if (t.mode === e.detail.mode) return;
    t.mode = e.detail.mode;
    if (S.mode === 'server' && !S.user) return; // belum login: cukup disimpan di perangkat
    S.save();
    if (/^#\/pengaturan/.test(location.hash)) keepScroll();
  });

  /* ================= Navigasi ================= */
  const NAV = [
    { group: 'Utama' },
    { href: 'beranda', ic: '🏠', label: 'Beranda' },
    { href: 'data', ic: '🗂️', label: 'Kelas, Murid & Mapel' },
    { group: 'Asesmen' },
    ...C.TYPE_ORDER.map(k => ({ href: 'asesmen/' + k, ic: T[k].icon, label: T[k].name, tag: T[k].short })),
    { group: 'Kuis Interaktif' },
    { href: 'kuis', ic: '🎮', label: 'Kuis Seru (Live)', tag: 'Baru' },
    { group: 'Soal' },
    { href: 'bank-soal', ic: '📄', label: 'Bank Soal & Unggah PDF' },
    { group: 'Nilai Akhir' },
    { href: 'rekap', ic: '🧮', label: 'Rekap Nilai Rapor', tag: 'Total' },
    { href: 'leger', ic: '🏆', label: 'Leger Semua Mapel' },
    { group: 'Lainnya' },
    { href: 'istilah', ic: '📖', label: 'Istilah Lama → Baru' },
    { href: 'pengaturan', ic: '🎨', label: 'Pengaturan & Tema' },
    { href: 'akun', ic: '👤', label: 'Akun Guru', server: true },
    { href: 'langganan', ic: '💳', label: 'Langganan', saas: true },
    { href: 'pemilik', ic: '👑', label: 'Panel Pemilik', owner: true }
  ];
  const RAIL = { 'Utama': ['🏠', 'Utama'], 'Asesmen': ['📚', 'Asesmen'], 'Kuis Interaktif': ['🎮', 'Kuis Seru'], 'Soal': ['📄', 'Bank Soal'], 'Nilai Akhir': ['🧮', 'Nilai Akhir'], 'Lainnya': ['⚙️', 'Lainnya'] };
  function navGroups() {
    const vis = NAV.filter(n => (!n.server || S.mode === 'server') && (!n.saas || S.saas) && (!n.owner || (S.saas && S.user && S.user.super)));
    const groups = []; let g = null;
    vis.forEach(n => { if (n.group) { g = { name: n.group, items: [] }; groups.push(g); } else if (g) g.items.push(n); });
    return groups.filter(x => x.items.length);
  }
  function renderNav(route) {
    const groups = navGroups();
    const isActive = n => route === n.href || route.startsWith(n.href + '/');
    let cur = groups.find(g => g.items.some(isActive)) || groups[0];
    const school = st().settings.schoolName || 'Asesmen Merdeka';
    $('#rail').innerHTML = `<a class="rail-home ${cur === groups[0] ? 'on' : ''}" href="#/beranda" title="${esc(school)}"><span>${esc((school.match(/[A-Za-z0-9]/) || ['A'])[0].toUpperCase())}</span></a><i class="rail-sep"></i>` +
      groups.slice(1).map(g => { const [ic, lbl] = RAIL[g.name] || ['•', g.name]; return `<a class="rail-btn ${g === cur ? 'on' : ''}" href="#/${g.items[0].href}" data-tip="${esc(lbl)}" aria-label="${esc(lbl)}"><span>${ic}</span></a>`; }).join('');
    $('#side-title').textContent = cur ? (RAIL[cur.name] || [0, cur.name])[1] : 'Menu';
    $('#nav').innerHTML = `<div class="nav-group">${esc(cur.name)}</div>` + cur.items.map(n =>
      `<a href="#/${n.href}" class="${isActive(n) ? 'active' : ''}"><span class="ic">${n.ic}</span><span>${n.label}</span>${n.tag ? `<span class="tag">${n.tag}</span>` : ''}</a>`).join('');
    $('#brand-sub').textContent = school;
    renderUserBox();
    renderTabbar(groups, cur, isActive);
  }

  /* ---- Tampilan HP: bilah tab bawah & lembar menu ---- */
  function renderTabbar(groups, cur, isActive) {
    let bar = $('#tabbar');
    if (!bar) { bar = document.createElement('nav'); bar.id = 'tabbar'; bar.className = 'tabbar'; document.body.appendChild(bar); document.body.classList.add('has-tabbar'); }
    const G = n => groups.find(g => g.name === n);
    const tabs = [
      { key: 'Utama', ic: '🏠', lbl: 'Beranda', href: 'beranda' },
      { key: 'Asesmen', ic: '📚', lbl: 'Asesmen', sheet: 'Asesmen' },
      { key: 'Kuis Interaktif', ic: '🎮', lbl: 'Kuis', href: 'kuis' },
      { key: 'Soal', ic: '📄', lbl: 'Soal', href: 'bank-soal' },
      { key: 'more', ic: '☰', lbl: 'Lainnya', sheet: 'more' }
    ].filter(t => t.key === 'more' || G(t.key));
    const hash = (location.hash || '#/beranda').replace(/^#\/?/, '');
    const activeKey = cur && (cur.name === 'Utama' && !/^beranda/.test(hash) ? 'more' : (tabs.some(t => t.key === cur.name) ? cur.name : 'more'));
    bar.innerHTML = tabs.map(t => `<a href="${t.href ? '#/' + t.href : '#'}" class="${t.key === activeKey ? 'on' : ''}" ${t.sheet ? `data-sheet="${t.sheet}"` : ''}><span class="ti">${t.ic}</span><span class="tl">${t.lbl}</span></a>`).join('');
    $$('[data-sheet]', bar).forEach(a => a.onclick = e => { e.preventDefault(); openMenuSheet(a.dataset.sheet, groups, isActive); });
  }
  function openMenuSheet(which, groups, isActive) {
    closeMenuSheet();
    const list = which === 'more' ? groups.filter(g => !['Asesmen', 'Kuis Interaktif', 'Soal'].includes(g.name)) : groups.filter(g => g.name === which);
    const row = n => `<a href="#/${n.href}" class="sheet-item ${isActive(n) ? 'on' : ''}"><span class="si">${n.ic}</span><span class="sl">${n.label}</span>${n.tag ? `<span class="tag">${n.tag}</span>` : ''}<span class="chev">›</span></a>`;
    const user = S.mode === 'server' && S.user ? `<div class="sheet-user"><div class="avatar">${esc((S.user.name || '?').charAt(0).toUpperCase())}</div><div style="flex:1;min-width:0"><b class="ellipsis">${esc(S.user.name)}</b><small class="muted ellipsis">${esc(st().settings.schoolName || '')}</small>${S.saas && S.subscription ? `<a href="#/langganan" class="sub-badge ${S.subscription.active ? S.subscription.status : 'expired'}">${subLabel(S.subscription)}</a>` : ''}</div><button class="btn ghost sm" id="sheet-logout">Keluar</button></div>` : '';
    const bg = document.createElement('div'); bg.className = 'sheet-bg'; bg.id = 'menu-sheet';
    bg.innerHTML = `<div class="sheet" role="dialog"><div class="sheet-grip"></div>
      ${which === 'more' ? user : `<h3 class="sheet-title">${esc(which === 'Asesmen' ? 'Jenis Asesmen' : which)}</h3>`}
      ${list.map(g => `${which === 'more' ? `<div class="sheet-group">${esc(g.name)}</div>` : ''}<div class="sheet-list">${g.items.map(row).join('')}</div>`).join('')}
      ${which === 'more' && window.PWA && PWA.canInstall() ? '<button class="btn soft" style="width:100%;margin-top:12px" id="sheet-install">📲 Pasang aplikasi di HP</button>' : ''}
    </div>`;
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('.sheet-item')) closeMenuSheet(); });
    const lo = $('#sheet-logout', bg); if (lo) lo.onclick = () => S.logout();
    const ins = $('#sheet-install', bg); if (ins) ins.onclick = () => { closeMenuSheet(); PWA.install(); };
    // geser ke bawah untuk menutup
    const sheet = $('.sheet', bg); let y0 = null;
    sheet.addEventListener('touchstart', e => { if (sheet.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
    sheet.addEventListener('touchmove', e => { if (y0 === null) return; const dy = e.touches[0].clientY - y0; if (dy > 0) sheet.style.transform = `translateY(${dy}px)`; }, { passive: true });
    sheet.addEventListener('touchend', e => { if (y0 === null) return; const dy = (e.changedTouches[0].clientY - y0); y0 = null; if (dy > 90) closeMenuSheet(); else sheet.style.transform = ''; });
    document.body.appendChild(bg);
  }
  function closeMenuSheet() { const m = $('#menu-sheet'); if (m) m.remove(); }

  /* ---- Konteks kelas & mapel ---- */
  function ensureCtx() {
    const s = st();
    if (!S.cls(s.ui.classId)) s.ui.classId = s.classes[0] ? s.classes[0].id : null;
    if (!S.subj(s.ui.subjectId)) s.ui.subjectId = s.subjects[0] ? s.subjects[0].id : null;
  }
  function renderCtx(show, opts) {
    const box = $('#ctx');
    if (!show) { box.style.display = 'none'; return; }
    ensureCtx();
    const s = st();
    box.style.display = '';
    box.innerHTML = `
      <label>Kelas</label>
      <select id="ctx-class">${s.classes.map(c => `<option value="${c.id}" ${c.id === s.ui.classId ? 'selected' : ''}>${esc(c.name)}</option>`).join('') || '<option>—</option>'}</select>
      ${opts && opts.noSubject ? '' : `<label>Mapel</label>
      <select id="ctx-subj">${s.subjects.map(m => `<option value="${m.id}" ${m.id === s.ui.subjectId ? 'selected' : ''}>${esc(m.name)}</option>`).join('') || '<option>—</option>'}</select>`}
      <span class="pill pri" title="Ubah di Pengaturan">${esc(s.settings.tahunAjaran)} · ${s.settings.semester === 'genap' ? 'Genap' : 'Ganjil'}</span>`;
    $('#ctx-class').onchange = e => { s.ui.classId = e.target.value; S.save(); route(); };
    const sj = $('#ctx-subj'); if (sj) sj.onchange = e => { s.ui.subjectId = e.target.value; S.save(); route(); };
  }
  function needSetup() {
    const s = st();
    if (s.classes.length && s.subjects.length) return '';
    return `<div class="card empty"><div class="big">🗂️</div><h2>Siapkan data dulu</h2>
      <p>Tambahkan minimal satu <b>kelas</b> (beserta murid) dan satu <b>mata pelajaran</b> (beserta Tujuan Pembelajaran).</p>
      <div class="btns" style="justify-content:center"><a class="btn" href="#/data">Buka Data Master</a><button class="btn soft" data-act="demo">Muat Data Contoh</button></div></div>`;
  }

  /* ================= Router ================= */
  let current = null;
  function setTitle(title, sub) { $('#page-title').innerHTML = `<h1>${title}</h1>${sub ? `<div class="muted small">${sub}</div>` : ''}`; }
  function route() {
    let hash = (location.hash || '#/beranda').replace(/^#\/?/, '');
    if (S.locked() && !/^(langganan|akun|pemilik)/.test(hash)) { hash = 'langganan'; history.replaceState(null, '', '#/langganan'); }
    const parts = hash.split('/');
    const r = parts[0] || 'beranda';
    renderNav(hash);
    document.body.classList.remove('nav-open');
    closeMenuSheet();
    const view = $('#view');
    let out;
    try {
      if (r === 'beranda') out = viewHome();
      else if (r === 'data') out = viewData(parts[1]);
      else if (r === 'asesmen' && T[parts[1]] && parts[2]) out = viewAssessment(parts[1], parts[2]);
      else if (r === 'asesmen' && T[parts[1]]) out = viewType(parts[1]);
      else if (r === 'bank-soal' && parts[1]) out = viewQsetEditor(parts[1]);
      else if (r === 'bank-soal') out = viewBank();
      else if (r === 'ujian' && parts[1]) out = viewExam(parts[1], parts[2]);
      else if (r === 'rekap') out = viewRekap(parts[1]);
      else if (r === 'leger') out = viewLeger();
      else if (r === 'istilah') out = viewGlossary();
      else if (r === 'pengaturan') out = viewSettings();
      else if (r === 'akun' && S.mode === 'server') out = viewAccount();
      else if (r === 'langganan' && S.saas) out = viewBilling();
      else if (r === 'kuis') out = parts[1] ? viewGameHost(parts[1]) : viewGames();
      else if (r === 'pemilik' && S.saas && S.user && S.user.super) out = viewOwner(parts[1]);
      else { location.hash = '#/beranda'; return; }
    } catch (e) {
      console.error(e);
      out = { html: `<div class="card"><h2>Terjadi kesalahan</h2><pre class="small">${esc(e.stack || e)}</pre></div>` };
    }
    if (gamePoll && !/^kuis\/\d+/.test(hash)) { clearInterval(gamePoll); gamePoll = null; document.body.classList.remove('fs-mode'); if (window.Music) Music.stop(); }
    current = out;
    const onHosting = S.mode === 'local' && /^https?:$/.test(location.protocol) && !/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname);
    let banner = onHosting ? `<div class="note warn no-print" style="margin-bottom:16px"><b>⚠️ Aplikasi berjalan dalam MODE LOKAL (server tidak terdeteksi).</b> Data hanya tersimpan di browser ini, tidak ada login, dan murid tidak bisa ujian dari HP masing-masing (tidak ada token).
      <br>Pastikan folder <b>api</b> ikut terunggah dan PHP aktif. Cek: buka <a href="api/health" target="_blank">${esc(location.host + location.pathname.replace(/[^/]*$/, ''))}api/health</a> — kalau benar, isinya memuat <span class="kbd">"mode":"server"</span>.</div>` : '';
    const sub = S.subscription;
    if (S.saas && sub && sub.active && sub.status === 'trial' && r !== 'langganan') banner += `<div class="note no-print" style="margin-bottom:16px">🎁 Masa coba gratis tersisa <b>${sub.daysLeft} hari</b>. <a href="#/langganan">Pilih paket langganan →</a></div>`;
    else if (S.saas && sub && sub.active && sub.status === 'active' && sub.daysLeft !== null && sub.daysLeft <= 7 && r !== 'langganan') banner += `<div class="note warn no-print" style="margin-bottom:16px">⏳ Langganan berakhir dalam <b>${sub.daysLeft} hari</b>. <a href="#/langganan">Perpanjang sekarang →</a></div>`;
    view.innerHTML = `<div class="page">${banner}${out.html}</div>`;
    bindTilt(view);
    if (out.mount) out.mount(view);
    window.scrollTo({ top: 0 });
  }
  // Perbesar gambar soal saat diketuk
  document.addEventListener('click', e => {
    const im = e.target.closest && e.target.closest('img.zoomable');
    if (!im) return;
    const ov = document.createElement('div'); ov.className = 'img-zoom';
    ov.innerHTML = `<img src="${im.src}" alt=""><button class="btn ghost sm">✕ Tutup</button>`;
    ov.onclick = () => ov.remove(); document.body.appendChild(ov);
  });
  // Aksi global berbasis data-act
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (act === 'demo') {
      if (st().classes.length && !confirm('Tambahkan data contoh (2 kelas, 3 mapel) ke data yang sudah ada?')) return;
      S.seedDemo(); toast('Data contoh dimuat.'); route(); return;
    }
    if (current && current.actions && current.actions[act]) { e.preventDefault(); current.actions[act](el, e); }
  });

  /* ================= Beranda ================= */
  function viewHome() {
    setTitle('Beranda', 'Kurikulum Merdeka — asesmen, penilaian, dan nilai rapor otomatis');
    renderCtx(false);
    const s = st();
    const nStudents = s.classes.reduce((n, c) => n + c.students.length, 0);
    const per = S.periode();
    const asms = s.assessments.filter(a => (a.periode || per) === per);
    const allScores = asms.filter(a => a.type !== 'diagnostik').flatMap(a => Object.values(s.scores[a.id] || {})).map(C.toNum).filter(C.isNum);
    const avg = C.mean(allScores);
    const stat = (ic, num, lbl) => `<div class="card stat tilt"><div class="blob"><span>${ic}</span></div><div class="z1"><div class="num">${num}</div><div class="lbl">${lbl}</div></div></div>`;
    const counts = {}; C.TYPE_ORDER.forEach(k => counts[k] = asms.filter(a => a.type === k).length);
    const empty = !s.classes.length && !s.subjects.length;
    return {
      html: `
      <div class="card hero tilt">
        <div class="z1">
          <h1>Asesmen Merdeka 🎓</h1>
          <p>Kelola semua jenis asesmen — dari <b>Asesmen Diagnostik</b>, <b>Formatif</b>, <b>Sumatif Lingkup Materi</b>, <b>Sumatif Tengah Semester</b>, sampai <b>Sumatif Akhir Semester/Tahun</b> — lengkap dengan penghitungan nilai rapor otomatis dan unggah soal PDF.</p>
          <div class="btns">
            ${empty ? '<button class="btn ghost lg" data-act="demo">✨ Muat Data Contoh</button><a class="btn ghost lg" href="#/data">Mulai dari Nol</a>'
          : '<a class="btn ghost lg" href="#/rekap">🧮 Lihat Nilai Akhir</a><a class="btn ghost lg" href="#/bank-soal">📄 Unggah Soal PDF</a>'}
          </div>
        </div>
        <div class="stage"><div class="big-cube"><div>SLM</div><div>STS</div><div>SAS</div><div>SAT</div><div>AD</div><div>AF</div></div></div>
      </div>
      <div class="grid g4" style="margin-top:18px">
        ${stat('🏫', s.classes.length, 'Kelas')}
        ${stat('👩‍🎓', nStudents, 'Murid')}
        ${stat('🗒️', asms.length, 'Asesmen semester ini')}
        ${stat('📈', fmt(avg, 1), 'Rata-rata nilai')}
      </div>
      <h2 style="margin:26px 0 12px">Menu Asesmen</h2>
      <div class="grid g3">
        ${C.TYPE_ORDER.map(k => `<a class="card tile tilt" href="#/asesmen/${k}">
          <div class="ico3d z2">${T[k].icon}</div>
          <div class="z1"><h3>${T[k].name} <span class="pill pri">${T[k].short}</span></h3>
          <div class="old">Dulu: <s>${T[k].old}</s></div>
          <p class="small muted" style="margin:8px 0 6px">${T[k].desc}</p>
          <span class="pill">${counts[k]} asesmen</span> ${T[k].rapor === true ? '<span class="pill ok">Masuk rapor</span>' : T[k].rapor === 'opsional' ? '<span class="pill warn">Opsional</span>' : '<span class="pill">Tidak masuk rapor</span>'}</div>
        </a>`).join('')}
        <a class="card tile tilt" href="#/rekap"><div class="ico3d z2">🧮</div><div class="z1"><h3>Total Nilai Rapor</h3><div class="old">Rekap semua komponen</div>
          <p class="small muted" style="margin:8px 0 6px">Nilai Akhir = ${s.settings.weightsAkhir.slm}% rata-rata SLM + ${s.settings.weightsAkhir.sts}% STS + ${s.settings.weightsAkhir.akhir}% ${s.settings.semester === 'genap' ? 'SAT' : 'SAS'}${s.settings.includeFormatif ? ' + ' + s.settings.weightsAkhir.formatif + '% Formatif' : ''}.</p>
          <span class="pill ok">Otomatis</span></div></a>
        <a class="card tile tilt" href="#/kuis"><div class="ico3d z2">🎮</div><div class="z1"><h3>Kuis Seru (Live) <span class="pill ok">Baru</span></h3><div class="old">Kuis interaktif bergaya permainan</div>
          <p class="small muted" style="margin:8px 0 6px">Murid bergabung dari HP dengan kode, berlomba menjawab cepat, papan peringkat langsung, dan podium juara.</p></div></a>
        <a class="card tile tilt" href="#/bank-soal"><div class="ico3d z2">📄</div><div class="z1"><h3>Unggah Soal PDF</h3><div class="old">Format apa pun → format web</div>
          <p class="small muted" style="margin:8px 0 6px">Soal dari PDF otomatis dikenali (pilihan ganda, benar/salah, isian, uraian) lengkap dengan kunci, lalu bisa dikerjakan murid secara online.</p>
          <span class="pill">${s.questionSets.length} paket soal</span></div></a>
        <a class="card tile tilt" href="#/pengaturan"><div class="ico3d z2">🎨</div><div class="z1"><h3>Ubah Warna Tema</h3><div class="old">${S.PRESETS.length} pilihan + warna bebas</div>
          <p class="small muted" style="margin:8px 0 6px">Pilih warna, mode terang/gelap, dan kedalaman efek 3D sesuai selera.</p></div></a>
      </div>`
    };
  }

  /* ================= Istilah ================= */
  function viewGlossary() {
    setTitle('Istilah Lama → Istilah Baru', 'Mengacu pada Kurikulum Merdeka & Panduan Pembelajaran dan Asesmen terbaru');
    renderCtx(false);
    return {
      html: `<div class="card"><div class="table-wrap"><table><thead><tr><th>Istilah Lama (Kurikulum 2013 / KTSP)</th><th>Istilah Baru yang Dipakai Aplikasi</th></tr></thead>
      <tbody>${C.GLOSSARY.map(([o, n]) => `<tr><td class="muted"><s>${esc(o)}</s></td><td><b>${esc(n)}</b></td></tr>`).join('')}</tbody></table></div></div>
      <div class="card"><h3>Prinsip penilaian yang diterapkan</h3>
      <ul>
        <li><b>Asesmen Diagnostik</b> dipakai untuk memetakan kemampuan awal (kognitif) dan kondisi murid (non-kognitif); hasilnya <b>tidak</b> diolah menjadi nilai rapor.</li>
        <li><b>Asesmen Formatif</b> berfungsi sebagai umpan balik selama pembelajaran; secara default tidak dihitung ke rapor (bisa diaktifkan di Pengaturan).</li>
        <li><b>Asesmen Sumatif</b> (SLM, STS, SAS/SAT) diolah menjadi nilai rapor dengan bobot yang dapat diatur sekolah.</li>
        <li>Ketuntasan memakai <b>KKTP</b> (bukan KKM). Murid di bawah KKTP diarahkan ke <b>remedial</b>, murid yang sangat baik ke <b>pengayaan</b>.</li>
        <li>Rapor memuat <b>nilai akhir</b> dan <b>deskripsi capaian</b> per Tujuan Pembelajaran (TP) yang disusun otomatis.</li>
      </ul></div>`
    };
  }

  /* ================= Data Master ================= */
  function viewData(tab) {
    tab = tab || 'kelas';
    setTitle('Kelas, Murid & Mata Pelajaran', 'Data dasar yang dipakai semua asesmen');
    renderCtx(false);
    const s = st();
    ensureCtx();
    const cls = S.cls(s.ui.classId);
    const subj = S.subj(s.ui.subjectId);
    const tabs = `<div class="tabs"><button class="${tab === 'kelas' ? 'on' : ''}" data-act="tab" data-t="kelas">🏫 Kelas & Murid</button><button class="${tab === 'mapel' ? 'on' : ''}" data-act="tab" data-t="mapel">📘 Mapel & Tujuan Pembelajaran</button></div>`;
    let html = tabs;
    if (tab === 'kelas') {
      html += `<div class="grid" style="grid-template-columns: 280px 1fr; align-items:start" id="data-grid">
        <div class="card"><div class="card-head"><h3>Daftar Kelas</h3><button class="btn sm" data-act="add-class">+ Kelas</button></div>
          ${s.classes.map(c => `<div class="btns" style="margin:6px 0"><button class="btn ${c.id === s.ui.classId ? '' : 'ghost'}" style="flex:1;justify-content:space-between" data-act="pick-class" data-id="${c.id}"><span>${esc(c.name)}</span><span class="small">${c.students.length} murid</span></button></div>`).join('') || '<p class="muted small">Belum ada kelas.</p>'}
          ${!s.classes.length ? '<button class="btn soft sm" data-act="demo">Muat data contoh</button>' : ''}
        </div>
        <div class="card">${cls ? `
          <div class="card-head"><h3>Murid ${esc(cls.name)} <span class="pill">Fase ${esc(cls.fase || '-')}</span></h3>
            <div class="btns"><button class="btn sm" data-act="add-student">+ Murid</button><button class="btn soft sm" data-act="bulk-student">📋 Tempel Daftar</button>
            <button class="btn ghost sm" data-act="edit-class">✏️ Kelas</button><button class="btn danger sm" data-act="del-class">Hapus Kelas</button></div></div>
          <div class="table-wrap"><table><thead><tr><th class="num">No</th><th>NIS/NISN</th><th>Nama Murid</th><th></th></tr></thead><tbody>
          ${cls.students.map((m, i) => `<tr><td class="num">${i + 1}</td><td><input value="${esc(m.nis)}" data-f="nis" data-id="${m.id}" style="width:120px"></td><td><input value="${esc(m.name)}" data-f="name" data-id="${m.id}" style="width:100%"></td>
            <td><button class="btn ghost sm" data-act="del-student" data-id="${m.id}">🗑</button></td></tr>`).join('') || '<tr><td colspan="4" class="empty">Belum ada murid. Klik “Tempel Daftar” untuk menambah banyak sekaligus.</td></tr>'}
          </tbody></table></div>` : '<div class="empty">Pilih atau buat kelas.</div>'}
        </div></div>`;
    } else {
      html += `<div class="grid" style="grid-template-columns: 280px 1fr; align-items:start" id="data-grid">
        <div class="card"><div class="card-head"><h3>Mata Pelajaran</h3><button class="btn sm" data-act="add-subj">+ Mapel</button></div>
          ${s.subjects.map(m => `<div class="btns" style="margin:6px 0"><button class="btn ${m.id === s.ui.subjectId ? '' : 'ghost'}" style="flex:1;justify-content:space-between" data-act="pick-subj" data-id="${m.id}"><span>${esc(m.name)}</span><span class="small">${m.tps.length} TP</span></button></div>`).join('') || '<p class="muted small">Belum ada mapel.</p>'}
        </div>
        <div class="card">${subj ? `
          <div class="card-head"><h3>Tujuan Pembelajaran (TP) — ${esc(subj.name)}</h3>
            <div class="btns"><button class="btn sm" data-act="add-tp">+ TP</button><button class="btn soft sm" data-act="bulk-tp">📋 Tempel Daftar TP</button>
            <button class="btn ghost sm" data-act="edit-subj">✏️ Mapel</button><button class="btn danger sm" data-act="del-subj">Hapus Mapel</button></div></div>
          <p class="small muted">TP dipakai untuk menandai asesmen sumatif agar deskripsi capaian rapor tersusun otomatis.</p>
          <div class="table-wrap"><table><thead><tr><th>Kode</th><th>Deskripsi Tujuan Pembelajaran</th><th></th></tr></thead><tbody>
          ${subj.tps.map(tp => `<tr><td><input value="${esc(tp.code)}" data-tf="code" data-id="${tp.id}" style="width:90px"></td><td><input value="${esc(tp.desc)}" data-tf="desc" data-id="${tp.id}" style="width:100%"></td>
            <td><button class="btn ghost sm" data-act="del-tp" data-id="${tp.id}">🗑</button></td></tr>`).join('') || '<tr><td colspan="3" class="empty">Belum ada TP.</td></tr>'}
          </tbody></table></div>` : '<div class="empty">Pilih atau buat mata pelajaran.</div>'}
        </div></div>`;
    }
    const nameModal = (title, fields, onSave) => {
      const m = modal(`<h2>${title}</h2>${fields.map(f => `<label class="field"><span>${f.label}</span>${f.type === 'select' ? `<select id="f-${f.k}">${f.options.map(o => `<option ${o === f.v ? 'selected' : ''}>${o}</option>`).join('')}</select>` : `<input id="f-${f.k}" value="${esc(f.v || '')}" placeholder="${esc(f.ph || '')}">`}</label>`).join('')}
        <div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="f-save">Simpan</button></div>`);
      const save = () => { const vals = {}; fields.forEach(f => vals[f.k] = $('#f-' + f.k, m).value.trim()); if (onSave(vals) !== false) { closeModal(); S.save(); route(); } };
      $('#f-save', m).onclick = save;
      m.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') save(); });
    };
    const bulk = (title, help, onSave) => {
      const m = modal(`<h2>${title}</h2><p class="small muted">${help}</p><textarea id="bulk" style="min-height:220px"></textarea>
        <div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="b-save">Tambahkan</button></div>`);
      $('#b-save', m).onclick = () => { const n = onSave($('#bulk', m).value.split('\n').map(x => x.trim()).filter(Boolean)); closeModal(); S.save(); toast(n + ' data ditambahkan.'); route(); };
    };
    const FASE = ['A', 'B', 'C', 'D', 'E', 'F'];
    return {
      html,
      mount(v) {
        $$('input[data-f]', v).forEach(inp => inp.addEventListener('change', () => {
          const m = cls.students.find(x => x.id === inp.dataset.id); m[inp.dataset.f] = inp.value.trim(); S.save();
        }));
        $$('input[data-tf]', v).forEach(inp => inp.addEventListener('change', () => {
          const tp = subj.tps.find(x => x.id === inp.dataset.id); tp[inp.dataset.tf] = inp.value.trim(); S.save();
        }));
        if (window.innerWidth < 860) { const g = $('#data-grid', v); if (g) g.style.gridTemplateColumns = '1fr'; }
      },
      actions: {
        tab: el => { location.hash = '#/data/' + el.dataset.t; },
        'pick-class': el => { s.ui.classId = el.dataset.id; S.save(); route(); },
        'pick-subj': el => { s.ui.subjectId = el.dataset.id; S.save(); route(); },
        'add-class': () => nameModal('Kelas Baru', [{ k: 'name', label: 'Nama kelas', ph: 'mis. VII A' }, { k: 'fase', label: 'Fase', type: 'select', options: FASE, v: 'D' }], v => {
          if (!v.name) return false; const c = { id: S.uid('c'), name: v.name, fase: v.fase, students: [] }; s.classes.push(c); s.ui.classId = c.id;
        }),
        'edit-class': () => nameModal('Ubah Kelas', [{ k: 'name', label: 'Nama kelas', v: cls.name }, { k: 'fase', label: 'Fase', type: 'select', options: FASE, v: cls.fase }], v => { cls.name = v.name || cls.name; cls.fase = v.fase; }),
        'del-class': async () => {
          if (!await confirmBox(`Hapus kelas <b>${esc(cls.name)}</b> beserta semua asesmen dan nilainya?`, 'Hapus')) return;
          s.assessments.filter(a => a.classId === cls.id).forEach(a => S.deleteAssessment(a.id));
          s.classes = s.classes.filter(c => c !== cls); S.save(); route();
        },
        'add-student': () => nameModal('Murid Baru', [{ k: 'nis', label: 'NIS/NISN' }, { k: 'name', label: 'Nama lengkap' }], v => { if (!v.name) return false; cls.students.push({ id: S.uid('s'), nis: v.nis, name: v.name }); }),
        'bulk-student': () => bulk('Tempel Daftar Murid', 'Satu murid per baris. Format: <span class="kbd">Nama</span> atau <span class="kbd">NIS;Nama</span> / <span class="kbd">NIS[Tab]Nama</span> (bisa langsung salin dari Excel).', lines => {
          lines.forEach(l => { const p = l.split(/\t|;|,(?=\s*\D)/); let nis = '', name = l; if (p.length >= 2) { if (/\d/.test(p[0])) { nis = p[0].trim(); name = p.slice(1).join(' ').trim(); } else { name = p[0].trim(); nis = (p[1] || '').trim(); } } cls.students.push({ id: S.uid('s'), nis, name: name.replace(/^\d+[.)]\s*/, '') }); });
          return lines.length;
        }),
        'del-student': async el => { if (!await confirmBox('Hapus murid ini?', 'Hapus')) return; cls.students = cls.students.filter(x => x.id !== el.dataset.id); S.save(); route(); },
        'add-subj': () => nameModal('Mata Pelajaran Baru', [{ k: 'name', label: 'Nama mapel', ph: 'mis. Matematika' }], v => { if (!v.name) return false; const m = { id: S.uid('m'), name: v.name, tps: [] }; s.subjects.push(m); s.ui.subjectId = m.id; }),
        'edit-subj': () => nameModal('Ubah Mapel', [{ k: 'name', label: 'Nama mapel', v: subj.name }], v => { subj.name = v.name || subj.name; }),
        'del-subj': async () => {
          if (!await confirmBox(`Hapus mapel <b>${esc(subj.name)}</b> beserta semua asesmennya?`, 'Hapus')) return;
          s.assessments.filter(a => a.subjectId === subj.id).forEach(a => S.deleteAssessment(a.id));
          s.subjects = s.subjects.filter(x => x !== subj); S.save(); route();
        },
        'add-tp': () => nameModal('Tujuan Pembelajaran Baru', [{ k: 'code', label: 'Kode', v: 'TP ' + (subj.tps.length + 1) }, { k: 'desc', label: 'Deskripsi', ph: 'mis. Menjelaskan ...' }], v => { if (!v.desc) return false; subj.tps.push({ id: S.uid('tp'), code: v.code, desc: v.desc }); }),
        'bulk-tp': () => bulk('Tempel Daftar TP', 'Satu TP per baris. Kode otomatis, atau tulis <span class="kbd">TP 1. Deskripsi</span> / <span class="kbd">7.1 Deskripsi</span>.', lines => {
          lines.forEach(l => { const m = l.match(/^((?:TP\s*)?[\d.]+)\s*[.):\-]?\s+(.*)$/i); subj.tps.push({ id: S.uid('tp'), code: m ? m[1].trim() : 'TP ' + (subj.tps.length + 1), desc: m ? m[2] : l }); });
          return lines.length;
        }),
        'del-tp': el => { subj.tps = subj.tps.filter(x => x.id !== el.dataset.id); S.save(); route(); }
      }
    };
  }

  /* ================= Daftar asesmen per jenis ================= */
  function assessmentModal(type, existing, preset) {
    const s = st(); const cls = S.cls(s.ui.classId); const subj = S.subj(s.ui.subjectId);
    const a = existing || Object.assign({ type, title: '', date: new Date().toISOString().slice(0, 10), tpIds: [], qsetId: '', duration: 0, diagKind: 'kognitif', categories: 'Visual, Auditori, Kinestetik' }, preset || {});
    const isDiag = type === 'diagnostik';
    const defTitle = { diagnostik: 'Asesmen Diagnostik Kognitif', formatif: 'Asesmen Formatif ', slm: 'SLM ' + (S.assessmentsFor(cls.id, subj.id, 'slm').length + 1) + ' — ', sts: 'Sumatif Tengah Semester ' + (s.settings.semester === 'genap' ? 'Genap' : 'Ganjil'), sas: 'Sumatif Akhir Semester Ganjil', sat: 'Sumatif Akhir Tahun' }[type];
    const qsets = s.questionSets;
    const m = modal(`<h2>${existing ? 'Ubah' : 'Buat'} ${T[type].name}</h2>
      <p class="small muted">Kelas <b>${esc(cls.name)}</b> · Mapel <b>${esc(subj.name)}</b> · ${esc(S.periode())}</p>
      <label class="field"><span>Judul</span><input id="a-title" value="${esc(a.title || defTitle)}"></label>
      <div class="row"><label class="field"><span>Tanggal</span><input type="date" id="a-date" value="${esc(a.date)}"></label>
      ${isDiag ? `<label class="field"><span>Jenis diagnostik</span><select id="a-kind"><option value="kognitif" ${a.diagKind === 'kognitif' ? 'selected' : ''}>Kognitif (nilai 0–100)</option><option value="nonkognitif" ${a.diagKind === 'nonkognitif' ? 'selected' : ''}>Non-kognitif (kategori)</option></select></label>` : ''}</div>
      ${isDiag ? `<label class="field" id="cat-wrap" style="${a.diagKind === 'nonkognitif' ? '' : 'display:none'}"><span>Kategori non-kognitif (pisahkan dengan koma)</span><input id="a-cats" value="${esc(a.categories || '')}" placeholder="Visual, Auditori, Kinestetik"></label>` : ''}
      <div class="field"><span>Tujuan Pembelajaran yang diukur</span>
        <div style="max-height:160px;overflow:auto;border:1px solid var(--border);border-radius:10px;padding:8px">
        ${subj.tps.map(tp => `<label style="display:flex;gap:8px;padding:3px 0"><input type="checkbox" class="a-tp" value="${tp.id}" ${(a.tpIds || []).includes(tp.id) ? 'checked' : ''}><span><b>${esc(tp.code)}</b> ${esc(tp.desc)}</span></label>`).join('') || '<span class="small muted">Belum ada TP untuk mapel ini — tambahkan di Data Master.</span>'}
        </div></div>
      <div class="row"><label class="field"><span>Paket soal untuk ujian online (opsional)</span><select id="a-qset"><option value="">— Tanpa soal (input nilai manual) —</option>
        ${qsets.map(q => `<option value="${q.id}" ${a.qsetId === q.id ? 'selected' : ''}>${esc(q.title)} (${q.questions.length} soal)</option>`).join('')}</select></label>
        <label class="field" style="max-width:150px"><span>Durasi (menit, 0 = bebas)</span><input type="number" min="0" id="a-dur" value="${+a.duration || 0}"></label></div>
      <div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="a-save">Simpan</button></div>`);
    const kind = $('#a-kind', m); if (kind) kind.onchange = () => { $('#cat-wrap', m).style.display = kind.value === 'nonkognitif' ? '' : 'none'; };
    $('#a-save', m).onclick = () => {
      const obj = existing || { id: S.uid('a'), type, classId: cls.id, subjectId: subj.id, periode: S.periode(), created: Date.now() };
      obj.title = $('#a-title', m).value.trim() || defTitle;
      obj.date = $('#a-date', m).value;
      obj.tpIds = $$('.a-tp:checked', m).map(x => x.value);
      obj.qsetId = $('#a-qset', m).value;
      obj.duration = Math.max(0, +$('#a-dur', m).value || 0);
      if (isDiag) { obj.diagKind = kind.value; obj.categories = ($('#a-cats', m).value || ''); }
      if (!existing) s.assessments.push(obj);
      S.save(); closeModal(); toast('Asesmen disimpan.');
      location.hash = '#/asesmen/' + type + '/' + obj.id;
      route();
    };
  }

  function viewType(type) {
    const info = T[type];
    setTitle(info.icon + ' ' + info.name, 'Dulu: ' + info.old);
    renderCtx(true);
    const setup = needSetup(); if (setup) return { html: setup };
    const s = st(); const cls = S.cls(s.ui.classId); const subj = S.subj(s.ui.subjectId);
    const list = S.assessmentsFor(cls.id, subj.id, type);
    const tpName = id => { const t = subj.tps.find(x => x.id === id); return t ? t.code : '?'; };
    const isNonKog = a => a.type === 'diagnostik' && a.diagKind === 'nonkognitif';
    const cards = list.map(a => {
      const vals = cls.students.map(m => S.getScore(a.id, m.id));
      const stt = C.stats(vals, s.settings);
      const filled = vals.filter(v => v !== undefined && v !== null && v !== '').length;
      const q = a.qsetId && S.qset(a.qsetId);
      return `<div class="card tilt">
        <div class="z1">
          <div class="card-head"><h3>${esc(a.title)}</h3><span class="pill">${esc(a.date || '')}</span></div>
          <div class="btns" style="margin-bottom:10px">${(a.tpIds || []).map(id => `<span class="pill pri">${esc(tpName(id))}</span>`).join('')}${q ? `<span class="pill ok">📄 ${q.questions.length} soal online</span>` : ''}${isNonKog(a) ? '<span class="pill warn">Non-kognitif</span>' : ''}</div>
          ${isNonKog(a) ? `<p class="small muted">${filled}/${cls.students.length} murid terisi</p>` : `
          <div class="grid g3" style="gap:8px;margin-bottom:10px">
            <div><div class="small muted">Rata-rata</div><b style="font-size:1.3rem">${fmt(stt.avg, 1)}</b></div>
            <div><div class="small muted">Tertinggi</div><b style="font-size:1.3rem">${fmt(stt.max)}</b></div>
            <div><div class="small muted">Terendah</div><b style="font-size:1.3rem">${fmt(stt.min)}</b></div>
          </div>
          ${type === 'diagnostik' ? '' : `<div class="small muted">Ketercapaian (KKTP ${s.settings.kktp}): ${stt.tuntas}/${stt.n} murid</div><div class="bar" style="margin:6px 0 10px"><i style="width:${stt.persen || 0}%"></i></div>`}
          <div class="small muted">${filled}/${cls.students.length} nilai terisi</div>`}
          <div class="btns" style="margin-top:12px">
            <a class="btn sm" href="#/asesmen/${type}/${a.id}">✍️ Input Nilai</a>
            ${S.mode === 'server' ? `<a class="btn ${q ? 'ok' : 'soft'} sm" href="#/asesmen/${type}/${a.id}">📱 Token Ujian${q && a.examOpen ? ' · ' + esc(a.examCode) : ''}</a>` : ''}
            ${q && S.mode !== 'server' ? `<a class="btn ok sm" href="#/ujian/${a.id}">▶ Kerjakan Online</a>` : ''}
            <button class="btn ghost sm" data-act="edit" data-id="${a.id}">⚙️</button>
            <button class="btn ghost sm" data-act="del" data-id="${a.id}">🗑</button>
          </div>
        </div></div>`;
    }).join('');

    // Matriks semua asesmen jenis ini
    let matrix = '';
    if (list.length && !(type === 'diagnostik' && list.every(isNonKog))) {
      const numeric = list.filter(a => !isNonKog(a));
      const rows = cls.students.map((m, i) => {
        const vals = numeric.map(a => C.toNum(S.getScore(a.id, m.id)));
        const avg = C.mean(vals);
        return `<tr><td class="num">${i + 1}</td><td class="sticky-col">${esc(m.name)}</td>${vals.map(v => `<td class="num">${fmt(v)}</td>`).join('')}
          <td class="num"><b>${fmt(avg, 2)}</b></td><td>${type === 'diagnostik' ? `<span class="pill">${esc(C.diagnosticGroup(avg, s.settings) || '–')}</span>` : ketPill(avg)}</td></tr>`;
      }).join('');
      const colAvg = numeric.map(a => C.mean(cls.students.map(m => S.getScore(a.id, m.id))));
      matrix = `<div class="card"><div class="card-head"><h3>Rekap ${info.name} — ${esc(cls.name)}</h3>
        <div class="btns"><button class="btn soft sm" data-act="xls">⬇ Excel</button><button class="btn ghost sm" data-act="print">🖨 Cetak</button></div></div>
        <div class="table-wrap"><table id="type-matrix"><thead><tr><th class="num">No</th><th class="sticky-col">Nama Murid</th>${numeric.map((a, i) => `<th class="num" title="${esc(a.title)}">${info.short}${numeric.length > 1 ? ' ' + (i + 1) : ''}</th>`).join('')}<th class="num">Rata-rata</th><th>Keterangan</th></tr></thead>
        <tbody>${rows}</tbody><tfoot><tr><td></td><td class="sticky-col">Rata-rata kelas</td>${colAvg.map(v => `<td class="num">${fmt(v, 1)}</td>`).join('')}<td class="num">${fmt(C.mean(colAvg), 1)}</td><td></td></tr></tfoot></table></div></div>`;
    }

    return {
      html: `
      <div class="card"><div class="card-head"><h2 style="flex:1">${info.name} <span class="pill pri">${info.short}</span></h2>
        <button class="btn lg" data-act="new">+ Buat ${info.short === 'AD' || info.short === 'AF' ? info.name : info.short} Baru</button></div>
        <p class="muted" style="margin:0">${info.desc}</p>
        ${type === 'formatif' ? `<p class="small" style="margin:8px 0 0">${s.settings.includeFormatif ? '<span class="pill ok">Formatif saat ini DIHITUNG ke rapor</span>' : '<span class="pill">Formatif saat ini tidak dihitung ke rapor</span>'} — ubah di <a href="#/pengaturan">Pengaturan</a>.</p>` : ''}
      </div>
      ${list.length ? `<div class="grid auto" style="margin:18px 0">${cards}</div>${matrix}` : `<div class="card empty" style="margin-top:18px"><div class="big">${info.icon}</div><h3>Belum ada ${info.name}</h3><p>Buat asesmen baru, lalu isi nilai secara manual atau minta murid mengerjakan soal online dari PDF yang diunggah.</p><button class="btn" data-act="new">+ Buat Sekarang</button></div>`}`,
      actions: {
        new: () => assessmentModal(type),
        edit: el => assessmentModal(type, S.asm(el.dataset.id)),
        del: async el => { const a = S.asm(el.dataset.id); if (!await confirmBox(`Hapus <b>${esc(a.title)}</b> beserta seluruh nilainya?`, 'Hapus')) return; S.deleteAssessment(a.id); S.save(); route(); },
        xls: () => exportTable($('#type-matrix'), info.short + '_' + cls.name + '_' + subj.name),
        print: () => window.print()
      }
    };
  }

  /* ================= Input nilai satu asesmen ================= */
  function viewAssessment(type, id) {
    const a = S.asm(id);
    if (!a) { location.hash = '#/asesmen/' + type; return { html: '' }; }
    const s = st();
    s.ui.classId = a.classId; s.ui.subjectId = a.subjectId;
    const cls = S.cls(a.classId), subj = S.subj(a.subjectId), info = T[a.type];
    setTitle(`${info.icon} ${esc(a.title)}`, `${info.name} · ${esc(cls.name)} · ${esc(subj.name)} · ${esc(a.date || '')}`);
    renderCtx(false);
    const nonKog = a.type === 'diagnostik' && a.diagKind === 'nonkognitif';
    const cats = (a.categories || '').split(',').map(x => x.trim()).filter(Boolean);
    const isF = a.type === 'formatif';
    const showRemed = ['slm', 'sts', 'sas', 'sat'].includes(a.type);
    const subs = s.submissions[a.id] || {};
    const q = a.qsetId && S.qset(a.qsetId);

    const raw = sid => S.getScore(a.id, sid);
    const obj = sid => { const v = raw(sid); return v && typeof v === 'object' ? v : { score: v }; };

    const rows = cls.students.map((m, i) => {
      const o = obj(m.id), sub = subs[m.id];
      const scoreVal = C.isNum(C.toNum(o.score)) ? C.toNum(o.score) : '';
      const eff = C.toNum(raw(m.id));
      let cells;
      if (nonKog) {
        cells = `<td><select data-cat="${m.id}"><option value="">—</option>${cats.map(c => `<option ${o.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></td>
          <td><input data-note="${m.id}" value="${esc(o.note || '')}" placeholder="Catatan" style="width:100%"></td>`;
      } else {
        cells = `<td class="num"><input class="score ${scoreClass(C.toNum(o.score))}" type="number" min="0" max="100" step="any" data-score="${m.id}" value="${scoreVal}"></td>
          ${showRemed ? `<td class="num">${C.isNum(C.toNum(o.score)) && C.toNum(o.score) < s.settings.kktp ? `<input class="score" type="number" min="0" max="100" step="any" data-remed="${m.id}" value="${C.isNum(o.remedial) ? o.remedial : ''}" title="Nilai remedial">` : '<span class="muted small">–</span>'}</td><td class="num"><b data-eff="${m.id}">${fmt(eff)}</b></td>` : ''}
          <td data-ket="${m.id}">${a.type === 'diagnostik' ? `<span class="pill">${esc(C.diagnosticGroup(eff, s.settings) || '–')}</span>` : ketPill(eff)}</td>
          ${isF ? `<td><input data-note="${m.id}" value="${esc(o.note || '')}" placeholder="Umpan balik untuk murid" style="width:100%;min-width:200px"></td>` : ''}`;
      }
      const subCell = q ? `<td>${sub ? `<button class="btn ${sub.result.needsReview ? 'soft' : 'ghost'} sm" data-act="review" data-id="${m.id}">${sub.result.needsReview ? '📝 Koreksi' : '👁 Jawaban'}</button>` : `<a class="btn ghost sm" href="#/ujian/${a.id}/${m.id}">▶</a>`}</td>` : '';
      return `<tr><td class="num">${i + 1}</td><td class="muted small">${esc(m.nis || '')}</td><td class="sticky-col">${esc(m.name)}</td>${cells}${subCell}</tr>`;
    }).join('');

    const head = nonKog ? '<th>Kategori</th><th>Catatan</th>' :
      `<th class="num">Nilai</th>${showRemed ? '<th class="num">Remedial</th><th class="num">Nilai Akhir</th>' : ''}<th>${a.type === 'diagnostik' ? 'Pemetaan' : 'Ketercapaian'}</th>${isF ? '<th>Umpan Balik</th>' : ''}`;

    function statsHtml() {
      if (nonKog) {
        const cnt = {}; cats.forEach(c => cnt[c] = 0);
        cls.students.forEach(m => { const c = obj(m.id).cat; if (c) cnt[c] = (cnt[c] || 0) + 1; });
        const max = Math.max(1, ...Object.values(cnt));
        return `<h3>Sebaran Kategori</h3><div class="chart3d">${Object.keys(cnt).map(k => `<div class="col"><div class="v">${cnt[k]}</div><div class="barz" style="height:${cnt[k] / max * 140}px"></div><div class="l">${esc(k)}</div></div>`).join('')}</div>`;
      }
      const vals = cls.students.map(m => raw(m.id));
      const stt = C.stats(vals, s.settings);
      let groups;
      if (a.type === 'diagnostik') {
        groups = s.settings.diagnosticBands.slice().sort((x, y) => y.min - x.min).map(b => ({ l: b.name, n: vals.map(C.toNum).filter(C.isNum).filter(v => C.diagnosticGroup(v, s.settings) === b.name).length }));
      } else {
        groups = s.settings.bands.slice().sort((x, y) => y.min - x.min).map(b => ({ l: b.label + ' · ' + b.name, n: vals.map(C.toNum).filter(C.isNum).filter(v => C.band(v, s.settings).label === b.label).length }));
      }
      const max = Math.max(1, ...groups.map(g => g.n));
      return `<div class="grid g4" style="gap:10px;margin-bottom:8px">
          <div><div class="small muted">Rata-rata</div><b style="font-size:1.5rem">${fmt(stt.avg, 1)}</b></div>
          <div><div class="small muted">Tertinggi</div><b style="font-size:1.5rem">${fmt(stt.max)}</b></div>
          <div><div class="small muted">Terendah</div><b style="font-size:1.5rem">${fmt(stt.min)}</b></div>
          <div><div class="small muted">${a.type === 'diagnostik' ? 'Terisi' : 'Tercapai'}</div><b style="font-size:1.5rem">${a.type === 'diagnostik' ? stt.n : (stt.n ? fmt(stt.persen, 1) + '%' : '–')}</b></div></div>
        <div class="chart3d">${groups.map(g => `<div class="col"><div class="v">${g.n}</div><div class="barz" style="height:${g.n / max * 130}px"></div><div class="l" title="${esc(g.l)}">${esc(g.l)}</div></div>`).join('')}</div>`;
    }

    const recompute = (sid) => {
      const o = obj(sid);
      const sc = C.toNum(o.score);
      const val = {};
      if (C.isNum(sc)) val.score = sc;
      if (o.note) val.note = o.note;
      if (C.isNum(o.remedial) && C.isNum(sc) && sc < s.settings.kktp) {
        val.remedial = o.remedial;
        const cap = s.settings.remedialCap !== false ? s.settings.kktp : 100;
        val.final = Math.max(sc, Math.min(o.remedial, cap));
      }
      if (o.cat) val.cat = o.cat;
      const keys = Object.keys(val);
      if (!keys.length) S.setScore(a.id, sid, null);
      else if (keys.length === 1 && keys[0] === 'score') S.setScore(a.id, sid, val.score);
      else S.setScore(a.id, sid, val);
    };

    return {
      html: `
      <div class="btns no-print" style="margin-bottom:14px"><a class="btn ghost sm" href="#/asesmen/${a.type}">← Kembali ke ${info.name}</a>
        ${q ? (S.mode === 'server' ? `<a class="btn ghost sm" href="#/ujian/${a.id}" title="Murid mengerjakan bergantian di laptop/komputer ini">💻 Kerjakan di Perangkat Ini</a>` : `<a class="btn ok sm" href="#/ujian/${a.id}">▶ Murid Kerjakan Online (${q.questions.length} soal)</a>`) : `<button class="btn soft sm" data-act="link">📄 Hubungkan Paket Soal</button>`}
        <button class="btn ghost sm" data-act="edit">⚙️ Ubah Asesmen</button></div>
      ${S.mode === 'server' ? (q ? examPanel(a) : `<div class="card exam-share" style="margin-bottom:18px"><div class="card-head"><h3>📱 Ujian dari HP Murid — Token & Link</h3><span class="pill">Belum ada soal</span></div>
        <p style="margin:0 0 10px">Asesmen ini <b>belum terhubung ke paket soal</b>, jadi belum bisa dikerjakan murid secara online.</p>
        <ol class="small" style="margin:0 0 12px;padding-left:18px"><li>Unggah soal di menu <a href="#/bank-soal">Bank Soal & Unggah PDF</a> (lewati bila sudah).</li><li>Klik <b>Hubungkan Paket Soal</b> di bawah, pilih paket soalnya, lalu Simpan.</li><li>Tombol <b>Buka Ujian & Buat Token</b> serta <b>Salin Link / WhatsApp</b> akan muncul di sini.</li></ol>
        <button class="btn" data-act="link">📄 Hubungkan Paket Soal</button></div>`) : ''}
      <div class="grid" style="grid-template-columns: minmax(0,1.6fr) minmax(280px,1fr); align-items:start" id="asm-grid">
        <div class="card">
          <div class="card-head"><h3>Daftar Nilai</h3>
            <div class="btns no-print">${nonKog ? '' : '<button class="btn soft sm" data-act="paste">📋 Tempel dari Excel</button><button class="btn ghost sm" data-act="fill">Isi Semua</button>'}<button class="btn soft sm" data-act="xls">⬇ Excel</button><button class="btn ghost sm" data-act="print">🖨</button></div></div>
          ${cls.students.length ? `<div class="table-wrap"><table id="score-table"><thead><tr><th class="num">No</th><th>NIS</th><th class="sticky-col">Nama Murid</th>${head}${q ? '<th>Online</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>
          <p class="small muted no-print">Nilai tersimpan otomatis. Tekan <span class="kbd">Enter</span> untuk pindah ke murid berikutnya. ${showRemed ? `Nilai remedial dibatasi maksimal KKTP (${s.settings.kktp}) — bisa diubah di Pengaturan.` : ''}</p>` : '<div class="empty">Kelas ini belum memiliki murid. <a href="#/data">Tambah murid</a>.</div>'}
        </div>
        <div>
          <div class="card tilt"><div class="z1" id="stats-box">${statsHtml()}</div></div>
          <div class="card"><h3>Info</h3>
            <p class="small" style="margin:0 0 6px"><b>TP diukur:</b> ${(a.tpIds || []).map(id => { const t = subj.tps.find(x => x.id === id); return t ? `<span class="pill pri" title="${esc(t.desc)}">${esc(t.code)}</span>` : ''; }).join(' ') || '<span class="muted">–</span>'}</p>
            <p class="small muted" style="margin:0">${info.desc}</p></div>
        </div>
      </div>`,
      mount(v) {
        if (window.innerWidth < 1000) $('#asm-grid', v).style.gridTemplateColumns = '1fr';
        const refreshRow = sid => {
          const eff = C.toNum(raw(sid));
          const e = $(`[data-eff="${sid}"]`, v); if (e) e.textContent = fmt(eff);
          const k = $(`[data-ket="${sid}"]`, v); if (k) k.innerHTML = a.type === 'diagnostik' ? `<span class="pill">${esc(C.diagnosticGroup(eff, s.settings) || '–')}</span>` : ketPill(eff);
          $('#stats-box', v).innerHTML = statsHtml();
        };
        $$('input[data-score]', v).forEach((inp, idx, all) => {
          inp.addEventListener('input', () => {
            const sid = inp.dataset.score; const o = obj(sid);
            let n = inp.value === '' ? null : Math.max(0, Math.min(100, parseFloat(inp.value)));
            o.score = C.isNum(n) ? n : null;
            S.state.scores[a.id] = S.state.scores[a.id] || {};
            S.state.scores[a.id][sid] = o; recompute(sid); S.save();
            inp.className = 'score ' + scoreClass(n);
            refreshRow(sid);
          });
          inp.addEventListener('change', () => { if (showRemed) { const sc = C.toNum(obj(inp.dataset.score).score); const needs = C.isNum(sc) && sc < s.settings.kktp; const has = !!$(`[data-remed="${inp.dataset.score}"]`, v); if (needs !== has) { const y = window.scrollY; route(); window.scrollTo(0, y); } } });
          inp.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); const nx = all[idx + 1]; if (nx) { nx.focus(); nx.select(); } } if (e.key === 'ArrowUp') { e.preventDefault(); const pv = all[idx - 1]; if (pv) { pv.focus(); pv.select(); } } });
        });
        $$('input[data-remed]', v).forEach(inp => inp.addEventListener('input', () => {
          const sid = inp.dataset.remed; const o = obj(sid);
          o.remedial = inp.value === '' ? null : Math.max(0, Math.min(100, parseFloat(inp.value)));
          S.state.scores[a.id][sid] = o; recompute(sid); S.save(); refreshRow(sid);
        }));
        $$('input[data-note]', v).forEach(inp => inp.addEventListener('change', () => {
          const sid = inp.dataset.note; const o = obj(sid); o.note = inp.value.trim();
          S.state.scores[a.id] = S.state.scores[a.id] || {}; S.state.scores[a.id][sid] = o; recompute(sid); S.save();
        }));
        $$('select[data-cat]', v).forEach(sel => sel.addEventListener('change', () => {
          const sid = sel.dataset.cat; const o = obj(sid); o.cat = sel.value;
          S.state.scores[a.id] = S.state.scores[a.id] || {}; S.state.scores[a.id][sid] = o; recompute(sid); S.save();
          $('#stats-box', v).innerHTML = statsHtml();
        }));
      },
      actions: {
        edit: () => assessmentModal(a.type, a),
        link: () => assessmentModal(a.type, a),
        xls: () => exportTable($('#score-table'), a.title.replace(/[^\w\s-]/g, '') + '_' + cls.name),
        print: () => window.print(),
        fill: () => {
          const m = modal(`<h2>Isi nilai yang masih kosong</h2><label class="field"><span>Nilai</span><input type="number" id="fill-v" value="${s.settings.kktp}"></label><div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="fill-ok">Isi</button></div>`);
          $('#fill-ok', m).onclick = () => { const v = +$('#fill-v', m).value; cls.students.forEach(st2 => { if (!C.isNum(C.toNum(raw(st2.id)))) { const o = obj(st2.id); o.score = v; S.state.scores[a.id] = S.state.scores[a.id] || {}; S.state.scores[a.id][st2.id] = o; recompute(st2.id); } }); S.save(); closeModal(); route(); };
        },
        paste: () => {
          const m = modal(`<h2>Tempel Nilai dari Excel</h2><p class="small muted">Salin satu kolom nilai dari Excel/Spreadsheet (urut sesuai daftar murid), atau dua kolom <span class="kbd">Nama[Tab]Nilai</span> agar dicocokkan berdasarkan nama.</p><textarea id="pv" style="min-height:220px"></textarea><div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="pv-ok">Terapkan</button></div>`);
          $('#pv-ok', m).onclick = () => {
            const lines = $('#pv', m).value.split('\n').map(x => x.trim()).filter(Boolean);
            let n = 0;
            const norm = x => x.toLowerCase().replace(/[^a-z]/g, '');
            lines.forEach((l, i) => {
              const parts = l.split(/\t|;/).map(x => x.trim());
              let target = null, val = null;
              if (parts.length >= 2) {
                val = parseFloat(parts[parts.length - 1].replace(',', '.'));
                const nm = norm(parts.slice(0, -1).find(p => /[a-z]/i.test(p)) || '');
                target = cls.students.find(x => norm(x.name) === nm) || cls.students.find(x => nm && norm(x.name).startsWith(nm)) || cls.students.find(x => x.nis && parts.includes(x.nis));
              } else { val = parseFloat(l.replace(',', '.')); target = cls.students[i]; }
              if (target && C.isNum(val)) { const o = obj(target.id); o.score = Math.max(0, Math.min(100, val)); S.state.scores[a.id] = S.state.scores[a.id] || {}; S.state.scores[a.id][target.id] = o; recompute(target.id); n++; }
            });
            S.save(); closeModal(); toast(n + ' nilai diterapkan.'); route();
          };
        },
        review: el => reviewModal(a, el.dataset.id),
        'exam-toggle': () => {
          if (!a.examCode) a.examCode = newExamCode();
          a.examOpen = !a.examOpen; S.save(); keepScroll();
          toast(a.examOpen ? 'Ujian dibuka. Bagikan token ' + a.examCode + ' ke murid.' : 'Ujian ditutup.');
        },
        'exam-opt': el => { a[el.dataset.k] = !a[el.dataset.k]; S.save(); keepScroll(); },
        'exam-newcode': async () => { if (!await confirmBox('Buat token baru? Token lama tidak bisa dipakai lagi.', 'Buat Token Baru')) return; a.examCode = newExamCode(); S.save(); keepScroll(); },
        'exam-wa': () => {
          const subj = S.subj(a.subjectId);
          const txt = `Ujian ${a.title} (${subj ? subj.name : ''}) sudah dibuka.\nToken: ${a.examCode}\nKerjakan di: ${examLink(a)}\nMasuk dengan memilih nama dan mengisi NIS.`;
          window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
        },
        'exam-copy': () => { const t = examLink(a); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Tautan disalin.'), () => prompt('Salin tautan ini:', t)); },
        'refresh': async () => { await S.flush(); const ch = await S.pull(); keepScroll(); toast(ch ? 'Data diperbarui.' : 'Belum ada perubahan baru.'); }
      }
    };
  }

  /* ---- Panel ujian online murid (mode server) ---- */
  function newExamCode() {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = '';
    const r = crypto.getRandomValues(new Uint32Array(6));
    for (let i = 0; i < 6; i++) c += abc[r[i] % abc.length];
    return c;
  }
  function examLink(a) { return location.origin + location.pathname.replace(/[^/]*$/, '') + 'ujian.html?token=' + (a.examCode || ''); }
  function examPanel(a) {
    const cls = S.cls(a.classId); const subs = st().submissions[a.id] || {};
    const done = cls.students.filter(m => subs[m.id]).length;
    const review = cls.students.filter(m => subs[m.id] && subs[m.id].result && subs[m.id].result.needsReview).length;
    const link = examLink(a);
    return `<div class="card exam-share ${a.examOpen ? 'open' : ''}" style="margin-bottom:18px">
      <div class="card-head"><h3>📱 Ujian dari HP Murid — Token & Link</h3><span class="pill ${a.examOpen ? 'ok' : ''}">${a.examOpen ? '● Ujian dibuka' : 'Ujian belum dibuka'}</span></div>
      <div class="exam-share-grid">
        <div class="exam-token">
          ${a.examOpen ? `<div class="small muted">Token ujian</div><div class="score-big token-big">${esc(a.examCode)}</div>`
            : `<div style="font-size:42px">🔒</div><div class="small muted">Klik tombol di bawah untuk membuat token</div>`}
          <button class="btn ${a.examOpen ? 'danger' : 'ok'} ${a.examOpen ? 'sm' : 'lg'}" data-act="exam-toggle" style="margin-top:10px">${a.examOpen ? '■ Tutup Ujian' : '▶ Buka Ujian & Buat Token'}</button>
        </div>
        <div>
          ${a.examOpen ? `
            <div class="small"><b>Bagikan ke murid</b> (mis. lewat WhatsApp):</div>
            <div class="share-link"><input readonly value="${esc(link)}" onclick="this.select()"><button class="btn soft sm" data-act="exam-copy">🔗 Salin Link</button><button class="btn ok sm" data-act="exam-wa">💬 WhatsApp</button></div>
            <ol class="small" style="margin:8px 0;padding-left:18px">
              <li>Murid membuka link di atas (atau <b>${esc(location.host)}/ujian.html</b> lalu mengetik token <b>${esc(a.examCode)}</b>).</li>
              <li>Murid memilih namanya, lalu mengisi <b>NIS</b>.</li>
              <li>Nilai otomatis masuk ke daftar nilai di bawah.</li>
            </ol>`
          : `<p class="small" style="margin-top:0">Agar murid mengerjakan dari <b>HP/laptop masing-masing</b>:</p>
            <ol class="small" style="margin:0 0 8px;padding-left:18px"><li>Klik <b>Buka Ujian & Buat Token</b>.</li><li>Bagikan link atau token yang muncul ke murid.</li><li>Tutup ujian bila waktu sudah selesai.</li></ol>`}
          <div class="btns" style="margin:6px 0">
            <label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-act="exam-opt" data-k="shuffle" ${a.shuffle ? 'checked' : ''}> Acak urutan soal</label>
            <label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-act="exam-opt" data-k="hideScore" ${a.hideScore ? 'checked' : ''}> Sembunyikan nilai dari murid</label>
            ${a.examOpen ? '<button class="btn ghost sm" data-act="exam-newcode">↻ Ganti Token</button>' : ''}
          </div>
          <div class="small muted">Sudah mengumpulkan: <b>${done}/${cls.students.length}</b>${review ? ` · <span style="color:var(--warn)">${review} perlu koreksi uraian</span>` : ''} · <a href="#" data-act="refresh">🔄 muat ulang hasil</a></div>
          <div class="bar" style="margin-top:6px"><i style="width:${cls.students.length ? done / cls.students.length * 100 : 0}%"></i></div>
        </div>
      </div></div>`;
  }

  /* ---- Koreksi jawaban online ---- */
  function reviewModal(a, sid, after) {
    const s = st(); const q = S.qset(a.qsetId); const sub = s.submissions[a.id] && s.submissions[a.id][sid];
    const stu = S.cls(a.classId).students.find(x => x.id === sid);
    if (!q || !sub) return;
    const manual = Object.assign({}, sub.manual || {});
    const render = () => {
      const res = P.grade(q.questions, sub.answers, manual);
      return `<h2>Jawaban ${esc(stu ? stu.name : '')}</h2>
        <div class="btns" style="margin-bottom:12px"><span class="score-big" style="font-size:2.6rem">${fmt(res.score, 1)}</span><span class="muted">${fmt(res.earned)} / ${fmt(res.total)} poin · dikumpulkan ${new Date(sub.at).toLocaleString('id-ID')}</span></div>
        ${q.questions.map((qq, i) => {
          const d = res.detail[i]; const ans = sub.answers[qq.id];
          const pill = d.status === 'benar' ? 'ok' : d.status === 'salah' || d.status === 'kosong' ? 'bad' : 'warn';
          const ansHtml = reviewAnsHTML(qq, ans);
          if (d.status === 'tidak dinilai') return `<div class="q-card"><div class="q-head"><span class="qn">${i + 1}</span><span class="pill">${TYPE_LABEL[qq.type]}</span><span class="pill">tidak dinilai</span></div><div class="q-text small">${esc(qq.text)}</div>${qq.type === 'polling' ? `<div class="small" style="margin-top:6px">${ansHtml}</div>` : ''}</div>`;
          return `<div class="q-card"><div class="q-head"><span class="qn">${i + 1}</span><span class="pill">${TYPE_LABEL[qq.type]}</span><span class="pill ${pill}">${d.status}</span>
            <span style="margin-left:auto" class="small">Skor: <input type="number" class="score" step="0.5" min="0" max="${d.pts}" data-man="${qq.id}" value="${d.got}"> / ${d.pts}</span></div>
            <div class="q-text small">${esc(qq.text)}</div><div class="small" style="margin-top:6px">${ansHtml}</div></div>`;
        }).join('')}
        <div class="foot"><button class="btn ghost" data-close>Tutup</button><button class="btn" id="rv-save">Simpan Koreksi</button></div>`;
    };
    const m = modal(render(), { wide: true, noFocus: true });
    loadMedia(m);
    $$('[data-man]', m).forEach(inp => inp.addEventListener('change', () => { manual[inp.dataset.man] = inp.value; }));
    $('#rv-save', m).onclick = () => {
      $$('[data-man]', m).forEach(inp => { manual[inp.dataset.man] = inp.value; });
      sub.manual = manual;
      sub.result = P.grade(q.questions, sub.answers, manual);
      sub.result.needsReview = false;
      const prev = S.getScore(a.id, sid);
      const o = prev && typeof prev === 'object' ? prev : {};
      if (o.note || C.isNum(o.remedial)) { o.score = sub.result.score; S.setScore(a.id, sid, o); } else S.setScore(a.id, sid, sub.result.score);
      S.save(); closeModal(); toast('Koreksi disimpan. Nilai: ' + fmt(sub.result.score, 1));
      if (after) after(); else route();
    };
  }

  /* ================= Ujian online ================= */
  const examState = {};
  function viewExam(aid, sid) {
    const a = S.asm(aid);
    if (!a) { location.hash = '#/beranda'; return { html: '' }; }
    const s = st(); const q = S.qset(a.qsetId); const cls = S.cls(a.classId); const subj = S.subj(a.subjectId);
    renderCtx(false);
    setTitle('▶ ' + esc(a.title), `${T[a.type].name} · ${esc(cls.name)} · ${esc(subj.name)}`);
    if (!q) return { html: `<div class="card empty"><div class="big">📄</div><h3>Asesmen ini belum punya paket soal</h3><a class="btn" href="#/asesmen/${a.type}/${a.id}">Kembali</a></div>` };
    const subs = s.submissions[a.id] = s.submissions[a.id] || {};
    // Pilih murid
    if (!sid) {
      return {
        html: `${S.mode === 'server' ? `<div class="note" style="margin-bottom:14px">💻 Ini mode <b>mengerjakan di perangkat ini</b> (murid bergantian memakai laptop/komputer guru). Supaya murid mengerjakan dari <b>HP masing-masing</b>, pakai <b>token ujian</b>: <a href="#/asesmen/${a.type}/${a.id}">buka halaman Token & Link Ujian →</a></div>` : ''}<div class="card"><h2>Siapa yang mengerjakan?</h2><p class="muted">Pilih nama murid untuk mulai. ${q.questions.length} soal${a.duration ? ` · waktu ${a.duration} menit` : ''}.</p>
          <div class="grid auto" style="gap:10px">${cls.students.map(m => `<a class="btn ${subs[m.id] ? 'ghost' : 'soft'}" style="justify-content:space-between" href="#/ujian/${a.id}/${m.id}"><span>${esc(m.name)}</span>${subs[m.id] ? `<span class="pill ok">${fmt(subs[m.id].result.score, 0)}</span>` : ''}</a>`).join('')}</div></div>
          <div class="btns"><a class="btn ghost" href="#/asesmen/${a.type}/${a.id}">← Kembali ke daftar nilai</a></div>`
      };
    }
    const stu = cls.students.find(x => x.id === sid);
    if (!stu) { location.hash = '#/ujian/' + aid; return { html: '' }; }
    const key = aid + ':' + sid;
    if (subs[sid] && !examState[key]) return examResult(a, q, stu);
    const ex = examState[key] = examState[key] || { idx: 0, answers: {}, start: Date.now(), started: false };
    if (!ex.started) {
      return {
        html: `<div class="card tilt" style="max-width:640px;margin:0 auto;text-align:center"><div class="z1">
          <div class="big" style="font-size:54px">📝</div><h2>${esc(a.title)}</h2>
          <p>Halo <b>${esc(stu.name)}</b>! Kamu akan mengerjakan <b>${q.questions.length} soal</b> ${esc(subj.name)}.</p>
          <p class="muted small">${typeSummary(q.questions)}${a.duration ? ` · Waktu: ${a.duration} menit` : ''}</p>
          <div class="btns" style="justify-content:center"><a class="btn ghost" href="#/ujian/${a.id}">Bukan saya</a><button class="btn lg" data-act="start">Mulai Mengerjakan ▶</button></div></div></div>`,
        actions: { start: () => { ex.started = true; ex.start = Date.now(); route(); } }
      };
    }
    const qs = q.questions; const cur = qs[ex.idx];
    let timer = null;
    const isAns = x => P.isAnswered(x, ex.answers[x.id]);
    const answered = qs.filter(isAns).length;
    const submit = async (force) => {
      const left = qs.filter(x => x.type !== 'slide' && !isAns(x)).length;
      if (!force && !await confirmBox(left ? `Masih ada <b>${left} soal</b> yang belum dijawab. Tetap kumpulkan?` : 'Kumpulkan jawaban sekarang?', 'Kumpulkan')) return;
      clearInterval(timer);
      const result = P.grade(qs, ex.answers);
      subs[sid] = { answers: ex.answers, manual: {}, result, at: Date.now(), duration: Math.round((Date.now() - ex.start) / 1000) };
      const prev = S.getScore(a.id, sid);
      if (prev && typeof prev === 'object') { prev.score = result.score; S.setScore(a.id, sid, prev); } else S.setScore(a.id, sid, result.score);
      delete examState[key]; S.save(); route();
    };
    return {
      html: `<div class="grid" style="grid-template-columns: minmax(0,1fr) 260px; align-items:start" id="exam-grid">
        <div class="card">
          <div class="q-head" style="display:flex;gap:10px;align-items:center;margin-bottom:10px"><span class="grade">${ex.idx + 1}</span><span class="pill">${QT.TYPES[cur.type].icon} ${TYPE_LABEL[cur.type]}</span>${+cur.points ? `<span class="pill">${cur.points} poin</span>` : ''}<span class="muted small" style="margin-left:auto">Soal ${ex.idx + 1} dari ${qs.length}</span></div>
          ${cur.image && cur.type !== 'titik' && cur.type !== 'label' && cur.type !== 'gambar' ? `<img src="${cur.image}" alt="gambar soal" class="zoomable q-img">` : ''}
          ${cur.type === 'seret' || cur.type === 'dropdown' ? '' : `<div class="q-text" style="font-size:1.12rem;margin-bottom:14px">${esc(cur.text)}</div>`}
          <div id="qt-host"></div>
          <div class="btns" style="justify-content:space-between;margin-top:16px">
            <button class="btn ghost" data-act="prev" ${ex.idx === 0 ? 'disabled' : ''}>← Sebelumnya</button>
            ${ex.idx < qs.length - 1 ? '<button class="btn" data-act="next">Berikutnya →</button>' : '<button class="btn ok" data-act="submit">✔ Kumpulkan</button>'}
          </div>
        </div>
        <div class="card"><h3>${esc(stu.name)}</h3>
          ${a.duration ? `<div class="pill warn" style="font-size:1rem;margin-bottom:10px">⏱ <span id="timer">--:--</span></div>` : ''}
          <div class="small muted" style="margin-bottom:6px">Terjawab ${answered}/${qs.length}</div><div class="bar" style="margin-bottom:12px"><i style="width:${answered / qs.length * 100}%"></i></div>
          <div class="qnav">${qs.map((x, i) => `<button class="${i === ex.idx ? 'cur' : isAns(x) ? 'done' : ''}" data-act="go" data-i="${i}">${i + 1}</button>`).join('')}</div>
          <button class="btn ok" style="width:100%;margin-top:14px" data-act="submit">✔ Kumpulkan</button></div>
        </div>`,
      mount(v) {
        if (window.innerWidth < 860) $('#exam-grid', v).style.gridTemplateColumns = '1fr';
        ex.views = ex.views || {};
        const pv = ex.views[cur.id] = ex.views[cur.id] || QT.publicView(cur, key + cur.id);
        QT.mount($('#qt-host', v), pv, ex.answers[cur.id], { onChange: val => { ex.answers[cur.id] = val; const b = $$('.qnav button', v)[ex.idx]; if (b) b.classList.toggle('done', P.isAnswered(cur, val)); } });
        const inp = $('#qt-host .qt-in', v); if (inp) inp.focus();
        if (a.duration) {
          const tick = () => {
            const left = a.duration * 60 - Math.floor((Date.now() - ex.start) / 1000);
            const el = $('#timer'); if (!el) { clearInterval(timer); return; }
            if (left <= 0) { clearInterval(timer); toast('Waktu habis! Jawaban dikumpulkan otomatis.', 'bad'); submit(true); return; }
            el.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
          };
          tick(); timer = setInterval(tick, 1000);
          window.addEventListener('hashchange', () => clearInterval(timer), { once: true });
        }
      },
      actions: {
        next: () => { clearInterval(timer); ex.idx = Math.min(qs.length - 1, ex.idx + 1); route(); },
        prev: () => { clearInterval(timer); ex.idx = Math.max(0, ex.idx - 1); route(); },
        go: el => { clearInterval(timer); ex.idx = +el.dataset.i; route(); },
        submit: () => submit(false)
      }
    };
  }
  function examResult(a, q, stu) {
    const sub = st().submissions[a.id][stu.id];
    const res = sub.result;
    const b = C.band(res.score, st().settings);
    return {
      html: `<div class="card tilt" style="max-width:720px;margin:0 auto;text-align:center"><div class="z1">
        <div style="font-size:48px">${res.score >= st().settings.kktp ? '🎉' : '💪'}</div>
        <h2>${esc(stu.name)}</h2><div class="score-big">${fmt(res.score, 1)}</div>
        <p class="muted">${fmt(res.earned)} dari ${fmt(res.total)} poin · ${gradeBadge(b)} ${ketPill(res.score)}</p>
        ${res.needsReview ? '<div class="note warn">Ada soal uraian yang menunggu koreksi guru. Nilai bisa berubah setelah dikoreksi.</div>' : ''}
        <div class="grid g4" style="margin:16px 0;gap:8px">${['benar', 'salah', 'kosong', 'perlu koreksi'].map(k => `<div><div class="small muted">${k}</div><b style="font-size:1.4rem">${res.detail.filter(d => d.status === k).length}</b></div>`).join('')}</div>
        <div class="btns" style="justify-content:center"><a class="btn ghost" href="#/ujian/${a.id}">Murid Lain</a><button class="btn soft" data-act="rev">📝 Koreksi / Lihat Jawaban (Guru)</button><button class="btn danger" data-act="redo">↻ Ulangi</button><a class="btn" href="#/asesmen/${a.type}/${a.id}">Daftar Nilai</a></div>
      </div></div>`,
      actions: {
        rev: () => reviewModal(a, stu.id),
        redo: async () => { if (!await confirmBox('Hapus jawaban ini dan ulangi ujian?', 'Ulangi')) return; delete st().submissions[a.id][stu.id]; S.setScore(a.id, stu.id, null); S.save(); route(); }
      }
    };
  }

  /* ================= Bank soal & unggah PDF ================= */
  let importDraft = null, bankFilter = 'all';
  function viewBank() {
    setTitle('📄 Bank Soal & Unggah PDF', 'Format soal apa pun di PDF otomatis disesuaikan ke format web');
    renderCtx(false);
    const s = st();
    const multiUser = S.mode === 'server' && !!S.user;
    const sets = s.questionSets.filter(q => bankFilter !== 'mine' || !multiUser || q.ownerId === S.user.id);
    return {
      html: `
      <div class="grid g2">
        <div class="card"><h3>Unggah File Soal</h3>
          <div class="drop" id="drop"><div class="pdf3d">PDF</div><b>Klik atau seret file PDF ke sini</b><div class="small muted">Juga menerima .txt. Pilihan ganda, benar/salah, isian, dan uraian dikenali otomatis.</div></div>
          <div id="import-status" class="small" style="margin-top:10px"></div>
        </div>
        <div class="card"><h3>…atau Tempel Teks Soal</h3>
          <textarea id="paste-src" style="min-height:170px" placeholder="1. Ibu kota Indonesia adalah ...&#10;A. Bandung&#10;B. Jakarta&#10;C. Surabaya&#10;Kunci: B&#10;&#10;2. Jelaskan pengertian fotosintesis!"></textarea>
          <div class="btns" style="margin-top:10px"><button class="btn" data-act="parse-paste">✨ Ubah ke Format Web</button><button class="btn ghost sm" data-act="blank">+ Buat Paket Kosong</button></div>
        </div>
      </div>
      <div class="card"><div class="card-head"><h3>Paket Soal Tersimpan</h3>
        ${multiUser ? `<div class="tabs" style="margin:0"><button class="${bankFilter === 'all' ? 'on' : ''}" data-act="bf" data-f="all">Semua di sekolah</button><button class="${bankFilter === 'mine' ? 'on' : ''}" data-act="bf" data-f="mine">Milik saya</button></div>` : ''}</div>
        ${multiUser ? `<p class="small muted" style="margin-top:0">${S.user.role === 'admin' ? '👑 Anda admin sekolah: bisa mengedit semua paket soal.' : '✏️ Anda bisa mengedit paket soal milik sendiri. Paket soal guru lain bisa dilihat, dipakai, atau diduplikat.'}</p>` : ''}
        ${sets.length ? `<div class="grid auto">${sets.map(q => {
          const c = t => q.questions.filter(x => x.type === t).length;
          const used = s.assessments.filter(a => a.qsetId === q.id).length;
          const can = canEditQset(q), imgs = q.questions.filter(x => x.image).length;
          return `<div class="card tilt" style="margin:0"><div class="z1"><h3>${esc(q.title)}</h3>
            <p class="small muted" style="margin:0 0 8px">${multiUser ? `👤 ${esc(q.ownerName || 'tanpa pemilik')}${q.ownerId === S.user.id ? ' (Anda)' : ''} · ` : ''}${q.source ? '📄 ' + esc(q.source) + ' · ' : ''}${new Date(q.created).toLocaleDateString('id-ID')}</p>
            <div class="btns" style="margin-bottom:10px"><span class="pill pri">${q.questions.length} soal</span>${c('pg') ? `<span class="pill">PG ${c('pg')}</span>` : ''}${c('bs') ? `<span class="pill">B/S ${c('bs')}</span>` : ''}${c('isian') ? `<span class="pill">Isian ${c('isian')}</span>` : ''}${c('uraian') ? `<span class="pill">Uraian ${c('uraian')}</span>` : ''}${imgs ? `<span class="pill">🖼 ${imgs}</span>` : ''}${used ? `<span class="pill ok">Dipakai ${used}×</span>` : ''}</div>
            <div class="btns">${can ? `<a class="btn sm" href="#/bank-soal/${q.id}">✏️ Edit</a>` : `<button class="btn ghost sm" data-act="view" data-id="${q.id}">👁 Lihat</button>`}<button class="btn soft sm" data-act="use" data-id="${q.id}">➕ Jadikan Asesmen</button><button class="btn ghost sm" data-act="dup" data-id="${q.id}" title="${can ? 'Duplikat' : 'Duplikat untuk diedit'}">⧉${can ? '' : ' Duplikat'}</button>${can ? `<button class="btn ghost sm" data-act="del" data-id="${q.id}">🗑</button>` : ''}</div></div></div>`;
        }).join('')}</div>` : `<div class="empty"><div class="big">📭</div>${bankFilter === 'mine' && multiUser ? 'Anda belum punya paket soal sendiri.' : 'Belum ada paket soal. Unggah PDF atau tempel teks soal di atas.'}</div>`}
      </div>
      <div class="card"><h3>Format yang dikenali otomatis</h3>
        <div class="grid g3 small">
          <div><b>Penomoran</b><br><span class="kbd">1.</span> <span class="kbd">1)</span> <span class="kbd">(1)</span> <span class="kbd">No. 1</span> <span class="kbd">Soal 1:</span></div>
          <div><b>Pilihan jawaban</b><br><span class="kbd">A.</span> <span class="kbd">a)</span> <span class="kbd">(A)</span> — per baris atau sebaris</div>
          <div><b>Kunci jawaban</b><br><span class="kbd">Kunci: B</span> <span class="kbd">Jawaban: B</span> opsi bertanda <span class="kbd">*</span>, atau bagian <span class="kbd">KUNCI JAWABAN</span> di akhir</div>
          <div><b>Bagian soal</b><br><span class="kbd">I. PILIHAN GANDA</span> <span class="kbd">II. ISIAN</span> <span class="kbd">III. URAIAN</span> <span class="kbd">Benar/Salah</span></div>
          <div><b>Skor per soal</b><br><span class="kbd">(skor 5)</span> <span class="kbd">[10 poin]</span> <span class="kbd">(bobot 2)</span></div>
          <div><b>Tata letak</b><br>PDF dua kolom, kop sekolah, nomor halaman, dan sub-pernyataan 1), 2), 3) di dalam soal.</div>
        </div>
        <p class="small muted" style="margin-bottom:0">Hasil pengenalan selalu bisa diperiksa dan diperbaiki di editor sebelum dipakai. PDF hasil scan (gambar) akan dibaca dengan OCR bila ada koneksi internet.</p></div>`,
      mount(v) {
        const drop = $('#drop', v);
        drop.onclick = async () => { const f = await pickFile('.pdf,.txt,application/pdf,text/plain'); if (f) handleFile(f); };
        drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
        drop.ondragleave = () => drop.classList.remove('over');
        drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };
      },
      actions: {
        'parse-paste': () => {
          const txt = $('#paste-src').value;
          if (!txt.trim()) return toast('Tempel teks soal terlebih dahulu.', 'bad');
          startDraft(P.parse(txt), 'Paket Soal Baru', 'teks tempelan', txt.split('\n'));
        },
        blank: () => { importDraft = { id: S.uid('qs'), title: 'Paket Soal Baru', questions: [], created: Date.now(), source: '', warnings: [], isNew: true }; location.hash = '#/bank-soal/draft'; },
        use: el => useQset(el.dataset.id),
        dup: el => { const c = dupQset(S.qset(el.dataset.id)); toast('Salinan dibuat — sekarang milik Anda dan bisa diedit.'); location.hash = '#/bank-soal/' + c.id; },
        view: el => previewQset(S.qset(el.dataset.id)),
        bf: el => { bankFilter = el.dataset.f; route(); },
        del: async el => {
          const q = S.qset(el.dataset.id);
          if (!canEditQset(q)) return toast('Hanya pembuat atau admin sekolah yang boleh menghapus.', 'bad');
          if (!await confirmBox(`Hapus paket soal <b>${esc(q.title)}</b>? Asesmen yang memakainya tetap ada, tetapi tidak bisa dikerjakan online lagi.`, 'Hapus')) return;
          st().questionSets = st().questionSets.filter(x => x !== q); st().assessments.forEach(a => { if (a.qsetId === q.id) a.qsetId = ''; }); S.save(); route();
        }
      }
    };
  }
  function useQset(qid) {
    const s = st(); ensureCtx();
    if (!s.classes.length || !s.subjects.length) { toast('Tambahkan kelas dan mapel terlebih dahulu.', 'bad'); location.hash = '#/data'; return; }
    const m = modal(`<h2>Jadikan Asesmen</h2><p class="small muted">Pilih jenis asesmen, kelas, dan mapel.</p>
      <label class="field"><span>Jenis asesmen</span><select id="u-type">${C.TYPE_ORDER.map(k => `<option value="${k}" ${k === 'slm' ? 'selected' : ''}>${T[k].name} (${T[k].short})</option>`).join('')}</select></label>
      <div class="row"><label class="field"><span>Kelas</span><select id="u-cls">${s.classes.map(c => `<option value="${c.id}" ${c.id === s.ui.classId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Mapel</span><select id="u-subj">${s.subjects.map(c => `<option value="${c.id}" ${c.id === s.ui.subjectId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label></div>
      <div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="u-ok">Lanjut</button></div>`);
    $('#u-ok', m).onclick = () => {
      s.ui.classId = $('#u-cls', m).value; s.ui.subjectId = $('#u-subj', m).value; S.save();
      const type = $('#u-type', m).value; closeModal();
      assessmentModal(type, null, { qsetId: qid, title: S.qset(qid).title });
    };
  }

  async function handleFile(file) {
    const status = $('#import-status');
    const say = h => { if (status) status.innerHTML = h; };
    try {
      if (/\.txt$/i.test(file.name) || file.type === 'text/plain') {
        const txt = await file.text();
        return startDraft(P.parse(txt), file.name.replace(/\.\w+$/, ''), file.name, txt.split('\n'));
      }
      if (!window.pdfjsLib) throw new Error('Pustaka PDF tidak termuat. Buka aplikasi melalui server web (lihat README).');
      say('⏳ Membaca PDF…');
      const buf = await file.arrayBuffer();
      const ext = await P.extractPdf(buf, (p, n) => say(`⏳ Membaca halaman ${p}/${n}…`));
      let lines = ext.lines, ocr = false;
      if (ext.charCount < 30 * ext.pages) {
        say('🔎 PDF tampaknya hasil scan (gambar). Menjalankan OCR… (butuh internet, bisa memakan waktu)');
        lines = await ocrPdf(ext.doc, (p, n, pct) => say(`🔎 OCR halaman ${p}/${n}… ${pct}%`));
        ocr = true;
      }
      const res = P.parse(lines);
      let nImg = 0;
      if (!ocr && ext.images.length) { say('🖼 Mengambil gambar soal dari PDF…'); try { nImg = await attachPdfImages(res, ext); } catch (e) { console.error(e); } }
      say(`✅ Selesai: ${res.stats.total} soal dikenali${nImg ? `, ${nImg} soal bergambar` : ''}.`);
      const thumbs = await renderThumbs(ext.doc, 6);
      startDraft(res, file.name.replace(/\.pdf$/i, ''), file.name, lines, thumbs);
      importDraft.pdfDoc = ext.doc; importDraft.imgCount = nImg;
    } catch (e) {
      console.error(e);
      say(`<span style="color:var(--bad)">❌ ${esc(e.message || e)}</span>`);
      toast('Gagal membaca file: ' + (e.message || e), 'bad');
    }
  }
  async function renderThumbs(doc, max) {
    const out = [];
    for (let p = 1; p <= Math.min(doc.numPages, max); p++) {
      try {
        const page = await doc.getPage(p);
        const vp = page.getViewport({ scale: 1.1 });
        const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
        await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        out.push(c.toDataURL('image/jpeg', 0.7));
      } catch (e) { break; }
    }
    return out;
  }
  function loadScript(src) {
    return new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = src; sc.onload = res; sc.onerror = () => rej(new Error('Gagal memuat ' + src)); document.head.appendChild(sc); });
  }
  async function ocrPdf(doc, onProg) {
    if (!window.Tesseract) await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    const worker = await window.Tesseract.createWorker('ind+eng', 1, { logger: m => { if (m.status === 'recognizing text' && onProg) onProg(cur, doc.numPages, Math.round(m.progress * 100)); } });
    let cur = 1; const lines = [];
    for (let p = 1; p <= doc.numPages; p++) {
      cur = p;
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale: 2 });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      const r = await worker.recognize(c);
      lines.push(...r.data.text.split('\n'), '');
    }
    await worker.terminate();
    return lines;
  }
  /* ---- Hak edit paket soal ---- */
  const ownerStamp = () => (S.mode === 'server' && S.user ? { ownerId: S.user.id, ownerName: S.user.name } : {});
  function canEditQset(q) {
    if (S.mode !== 'server' || !S.user) return true;
    if (S.user.role === 'admin') return true;
    return q && q.ownerId === S.user.id;
  }
  function previewQset(q) {
    const m = modal(`<h2>${esc(q.title)}</h2><p class="small muted" style="margin-top:0">${q.ownerName ? 'Dibuat oleh ' + esc(q.ownerName) + ' · ' : ''}${q.questions.length} soal · ${typeSummary(q.questions)}</p>${q.questions.map(previewCard).join('')}
      <div class="foot"><button class="btn" data-close>Tutup</button></div>`, { wide: true, noFocus: true });
    mountPreviews(m, q.questions);
  }
  function dupQset(q) {
    const c = JSON.parse(JSON.stringify(q)); c.id = S.uid('qs'); c.title += ' (salinan)'; c.created = Date.now();
    Object.assign(c, ownerStamp()); st().questionSets.push(c); S.save(); return c;
  }

  /* ---- Gambar dari PDF ---- */
  let editorPdf = null; // PDF yang dibuka di editor untuk mengambil gambar
  async function pageCanvas(doc, p, scale) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale });
    const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return { canvas: c, vp };
  }
  /** Potong area (pecahan 0..1 dari lebar/tinggi halaman) menjadi gambar tajam. */
  async function cropFraction(doc, p, fr) {
    const { canvas } = await pageCanvas(doc, p, 2.5);
    const sx = Math.max(0, fr.x * canvas.width), sy = Math.max(0, fr.y * canvas.height);
    const sw = Math.min(canvas.width - sx, fr.w * canvas.width), sh = Math.min(canvas.height - sy, fr.h * canvas.height);
    const k = Math.min(1, 1200 / sw);
    const out = document.createElement('canvas'); out.width = Math.round(sw * k); out.height = Math.round(sh * k);
    const ctx = out.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out.width, out.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height);
    return out.toDataURL('image/jpeg', 0.9);
  }
  /** Tempel gambar PDF ke soal pemiliknya (dipotong langsung dari halaman, utuh & tajam). */
  async function attachPdfImages(res, ext) {
    const map = P.assignImages(res.questions, ext.meta, ext.images, res.keyLine);
    let n = 0;
    const area = l => l.reduce((a, b) => a + (b.x2 - b.x1) * (b.y2 - b.y1), 0);
    for (const k in map) {
      const byPage = {};
      map[k].forEach(im => (byPage[im.page] = byPage[im.page] || []).push(im));
      const pg = +Object.keys(byPage).sort((a, b) => area(byPage[b]) - area(byPage[a]))[0];
      const list = byPage[pg];
      const u = { x1: Math.min(...list.map(b => b.x1)), x2: Math.max(...list.map(b => b.x2)), y1: Math.min(...list.map(b => b.y1)), y2: Math.max(...list.map(b => b.y2)) };
      const pad = 6, padL = list.length > 1 ? 22 : pad; // beberapa gambar (mis. pilihan A–D) → sertakan hurufnya
      const page = await ext.doc.getPage(pg); const vp = page.getViewport({ scale: 1 });
      const r = vp.convertToViewportRectangle([u.x1 - padL, u.y1 - pad, u.x2 + pad, u.y2 + pad + (list.length > 1 ? 16 : 0)]);
      const x = Math.min(r[0], r[2]), y = Math.min(r[1], r[3]);
      res.questions[k].image = await cropFraction(ext.doc, pg, { x: x / vp.width, y: y / vp.height, w: Math.abs(r[2] - r[0]) / vp.width, h: Math.abs(r[3] - r[1]) / vp.height });
      n++;
    }
    return n;
  }
  /** Alat potong manual: pilih bagian halaman PDF dengan menyeret. */
  async function cropModal(doc, onDone) {
    let pg = 1, sel = null;
    const m = modal(`<h2>✂️ Ambil Gambar dari PDF</h2><p class="small muted" style="margin-top:0">Seret di atas halaman untuk memilih gambar, grafik, atau tabel, lalu klik <b>Gunakan</b>.</p>
      <div class="btns" style="margin-bottom:8px"><button class="btn ghost sm" id="cp-prev">← Halaman</button><b id="cp-pg"></b><button class="btn ghost sm" id="cp-next">Halaman →</button></div>
      <div class="crop-stage" id="cp-stage"><canvas id="cp-cv"></canvas><div class="crop-sel hidden" id="cp-sel"></div></div>
      <div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="cp-ok" disabled>Gunakan Potongan Ini</button></div>`, { wide: true, noFocus: true });
    const stage = $('#cp-stage', m), cv = $('#cp-cv', m), box = $('#cp-sel', m);
    const draw = async () => {
      $('#cp-pg', m).textContent = `${pg} / ${doc.numPages}`; sel = null; box.classList.add('hidden'); $('#cp-ok', m).disabled = true;
      const { canvas } = await pageCanvas(doc, pg, 1.6);
      cv.width = canvas.width; cv.height = canvas.height; cv.getContext('2d').drawImage(canvas, 0, 0);
    };
    $('#cp-prev', m).onclick = () => { if (pg > 1) { pg--; draw(); } };
    $('#cp-next', m).onclick = () => { if (pg < doc.numPages) { pg++; draw(); } };
    let start = null;
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) }; };
    const paint = () => { const r = cv.getBoundingClientRect(), sr = stage.getBoundingClientRect(); box.style.left = (r.left - sr.left + sel.x * r.width) + 'px'; box.style.top = (r.top - sr.top + stage.scrollTop + sel.y * r.height) + 'px'; box.style.width = sel.w * r.width + 'px'; box.style.height = sel.h * r.height + 'px'; box.classList.remove('hidden'); };
    stage.addEventListener('pointerdown', e => { start = pos(e); stage.setPointerCapture(e.pointerId); e.preventDefault(); });
    stage.addEventListener('pointermove', e => { if (!start) return; const p = pos(e); sel = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) }; paint(); });
    stage.addEventListener('pointerup', () => { start = null; $('#cp-ok', m).disabled = !(sel && sel.w > 0.02 && sel.h > 0.01); });
    $('#cp-ok', m).onclick = async () => { const b = $('#cp-ok', m); b.disabled = true; b.textContent = 'Memotong…'; const url = await cropFraction(doc, pg, sel); closeModal(); onDone(url); };
    draw();
  }

  function startDraft(res, title, source, rawLines, thumbs) {
    importDraft = { id: S.uid('qs'), title, source, questions: res.questions, warnings: res.warnings, stats: res.stats, raw: rawLines, thumbs: thumbs || [], created: Date.now(), isNew: true };
    if (!res.questions.length) toast('Tidak ada soal bernomor yang dikenali. Periksa teks mentah atau tambah soal manual.', 'bad');
    location.hash = '#/bank-soal/draft';
  }

  /* ---- Editor paket soal ---- */
  function viewQsetEditor(id) {
    renderCtx(false);
    const isDraft = id === 'draft';
    const src = isDraft ? importDraft : S.qset(id);
    if (!src) { location.hash = '#/bank-soal'; return { html: '' }; }
    if (!isDraft && !canEditQset(src)) { toast('Paket soal ini milik ' + (src.ownerName || 'guru lain') + '. Duplikat dulu untuk mengedit salinan Anda sendiri.', 'bad'); location.hash = '#/bank-soal'; return { html: '' }; }
    // Bekerja pada salinan agar bisa dibatalkan
    if (!src._work) src._work = JSON.parse(JSON.stringify({ title: src.title, questions: src.questions }));
    const w = src._work;
    const pdfDoc = (isDraft && importDraft.pdfDoc) || editorPdf;
    setTitle(isDraft ? '✨ Periksa Hasil Konversi' : '✏️ Edit Paket Soal', isDraft ? 'Soal sudah disesuaikan ke format web — periksa, perbaiki bila perlu, lalu simpan' : esc(src.title));
    const total = w.questions.reduce((n, q) => n + (+q.points || 0), 0);
    const noKey = w.questions.filter(q => !QT.hasKey(q)).length;
    const qHtml = (q, i) => `
      <div class="q-card" data-qi="${i}">
        <div class="q-head"><span class="qn">${i + 1}</span>
          <select data-qt="type">${QT.ORDER.map(k => `<option value="${k}" ${q.type === k ? 'selected' : ''}>${QT.TYPES[k].icon} ${TYPE_LABEL[k]}</option>`).join('')}</select>
          ${q.type === 'slide' || q.type === 'polling' ? '<span class="pill">tidak dinilai</span>' : `<label class="small">Poin <input type="number" min="0" step="0.5" data-qt="points" value="${+q.points || 0}" style="width:70px"></label>`}
          ${QT.hasKey(q) ? '' : '<span class="pill bad">Kunci belum lengkap</span>'}
          <span style="margin-left:auto" class="btns">${pdfDoc ? `<button class="btn soft sm" data-act="crop" data-i="${i}" title="Potong gambar dari halaman PDF">✂️ Dari PDF</button>` : ''}<button class="btn ghost sm" data-act="img" data-i="${i}" title="Unggah gambar dari perangkat">🖼</button><button class="btn ghost sm" data-act="up" data-i="${i}" title="Naik">↑</button><button class="btn ghost sm" data-act="down" data-i="${i}" title="Turun">↓</button><button class="btn ghost sm" data-act="delq" data-i="${i}" title="Hapus">🗑</button></span></div>
        <textarea data-qt="text" placeholder="${q.type === 'slide' ? 'Isi materi / penjelasan' : q.type === 'seret' ? 'Kalimat dengan [[jawaban]] pada bagian kosong' : q.type === 'dropdown' ? 'Kalimat dengan [[benar|salah|salah]]' : 'Teks pertanyaan'}">${esc(q.text)}</textarea>
        ${q.image ? `<div class="q-img-row">${q.type === 'titik' || q.type === 'label' ? '' : `<img src="${q.image}" class="zoomable" alt="gambar soal">`}<button class="btn ghost sm" data-act="rmimg" data-i="${i}">Hapus gambar</button></div>` : ''}
        <div class="qt-ed">${QT.editor(q)}</div>
      </div>`;
    return {
      html: `
      <div class="card"><div class="row">
        <label class="field" style="flex:3"><span>Judul paket soal</span><input id="qs-title" value="${esc(w.title)}"></label>
        ${!pdfDoc && window.pdfjsLib ? '<button class="btn ghost" data-act="openpdf" style="margin-bottom:12px" title="Buka PDF soal untuk memotong gambarnya">📄 Buka PDF (ambil gambar)</button>' : ''}
        <div class="btns" style="margin-bottom:12px"><a class="btn ghost" href="#/bank-soal" data-act="cancel">Batal</a><button class="btn soft" data-act="preview">👁 Pratinjau Murid</button><button class="btn ok" data-act="save">💾 Simpan${isDraft ? ' ke Bank Soal' : ''}</button></div></div>
        <div class="btns"><span class="pill pri">${w.questions.length} soal</span>${QT.ORDER.filter(t => w.questions.some(x => x.type === t)).map(t => `<span class="pill">${QT.TYPES[t].icon} ${TYPE_LABEL[t]} ${w.questions.filter(x => x.type === t).length}</span>`).join('')}<span class="pill">Total ${fmt(total)} poin</span>${noKey ? `<span class="pill bad">${noKey} soal kuncinya belum lengkap</span>` : '<span class="pill ok">Semua kunci lengkap</span>'}
          ${isDraft && src.stats ? `<span class="pill ok">${src.stats.keysApplied} kunci dari bagian Kunci Jawaban</span>` : ''}${isDraft && src.imgCount ? `<span class="pill ok">🖼 ${src.imgCount} gambar diambil otomatis dari PDF</span>` : ''}${w.questions.some(q => q.image) ? `<span class="pill">🖼 ${w.questions.filter(q => q.image).length} soal bergambar</span>` : ''}</div>
        ${pdfDoc ? '<p class="small muted" style="margin:8px 0 0">Gambar yang belum terambil (mis. grafik/tabel berupa garis) bisa dipotong manual dengan tombol <b>✂️ Dari PDF</b> pada soalnya.</p>' : ''}
        ${isDraft && src.warnings && src.warnings.length ? `<div class="note warn" style="margin-top:10px"><b>Perlu diperiksa:</b><ul class="list-warn">${src.warnings.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      </div>
      <div class="grid" style="grid-template-columns: minmax(0,1fr) ${isDraft && (src.thumbs || src.raw) ? 'minmax(260px, 380px)' : ''}; align-items:start" id="ed-grid">
        <div>${w.questions.map(qHtml).join('')}
          <div class="btns"><button class="btn" data-act="addpick">＋ Tambah Soal (17 jenis)</button><button class="btn soft" data-act="addq" data-t="pg">+ Pilihan Ganda</button><button class="btn soft" data-act="addq" data-t="isian">+ Isian</button><button class="btn soft" data-act="addq" data-t="uraian">+ Uraian</button><button class="btn ghost" data-act="pts">⚖️ Atur Poin per Jenis</button></div></div>
        ${isDraft && (src.thumbs || src.raw) ? `<div class="card" style="position:sticky;top:12px;max-height:calc(100vh - 30px);overflow:auto">
          <div class="tabs"><button class="on" data-act="side" data-t="pdf">PDF Asli</button><button data-act="side" data-t="raw">Teks Terbaca</button></div>
          <div id="side-pdf">${(src.thumbs || []).map(t => `<img src="${t}" style="width:100%;border-radius:10px;border:1px solid var(--border);margin-bottom:8px">`).join('') || '<p class="small muted">Tidak ada pratinjau.</p>'}</div>
          <pre id="side-raw" class="small hidden" style="white-space:pre-wrap">${esc((src.raw || []).join('\n'))}</pre></div>` : ''}
      </div>`,
      mount(v) {
        if (window.innerWidth < 1000) $('#ed-grid', v).style.gridTemplateColumns = '1fr';
        $('#qs-title', v).addEventListener('input', e => { w.title = e.target.value; });
        $$('.q-card', v).forEach(card => {
          const q = w.questions[+card.dataset.qi];
          $$('[data-qt]', card).forEach(inp => inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
            const f = inp.dataset.qt;
            if (f === 'points') q.points = +inp.value || 0;
            else if (f === 'type') { QT.convert(q, inp.value); keepScroll(); }
            else q[f] = inp.value;
          }));
          QT.bindEditor($('.qt-ed', card), q, keepScroll);
        });
      },
      actions: {
        side: el => { $$('.tabs button', el.parentNode).forEach(b => b.classList.toggle('on', b === el)); $('#side-pdf').classList.toggle('hidden', el.dataset.t !== 'pdf'); $('#side-raw').classList.toggle('hidden', el.dataset.t !== 'raw'); },
        cancel: () => { delete src._work; location.hash = '#/bank-soal'; },
        delq: el => { w.questions.splice(+el.dataset.i, 1); keepScroll(); },
        up: el => { const i = +el.dataset.i; if (i > 0) { const t = w.questions[i]; w.questions[i] = w.questions[i - 1]; w.questions[i - 1] = t; keepScroll(); } },
        down: el => { const i = +el.dataset.i; if (i < w.questions.length - 1) { const t = w.questions[i]; w.questions[i] = w.questions[i + 1]; w.questions[i + 1] = t; keepScroll(); } },
        addq: el => { const q = QT.blank(el.dataset.t, S.uid('q')); q.num = w.questions.length + 1; w.questions.push(q); route(); setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 30); },
        addpick: () => {
          const m = modal(`<h2>Pilih Jenis Soal</h2><p class="small muted" style="margin-top:0">Semua jenis bisa dipakai di Ujian. Yang bertanda 🎮 juga bisa dipakai di Kuis Seru mode Permainan.</p>
            <div class="qt-picker">${QT.ORDER.map(t => `<button class="qt-pick" data-t="${t}"><span class="qt-pi">${QT.TYPES[t].icon}</span><b>${TYPE_LABEL[t]}</b><small>${QT.TYPES[t].desc}</small>${QT.TYPES[t].game ? '<i>🎮</i>' : ''}</button>`).join('')}</div>
            <div class="foot"><button class="btn ghost" data-close>Batal</button></div>`, { wide: true, noFocus: true });
          $$('.qt-pick', m).forEach(b => b.onclick = () => { closeModal(); const q = QT.blank(b.dataset.t, S.uid('q')); q.num = w.questions.length + 1; w.questions.push(q); route(); setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 30); });
        },
        img: async el => {
          const f = await pickFile('image/*'); if (!f) return;
          const url = await resizeImage(f, 1200); w.questions[+el.dataset.i].image = url; keepScroll();
        },
        rmimg: el => { delete w.questions[+el.dataset.i].image; keepScroll(); },
        crop: el => { if (!pdfDoc) return; cropModal(pdfDoc, url => { w.questions[+el.dataset.i].image = url; keepScroll(); toast('Gambar ditempel ke soal no. ' + (+el.dataset.i + 1) + '.'); }); },
        openpdf: async () => {
          const f = await pickFile('.pdf,application/pdf'); if (!f) return;
          try { editorPdf = await window.pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise; toast('PDF dibuka. Klik ✂️ Dari PDF pada soal untuk mengambil gambarnya.'); keepScroll(); }
          catch (e) { toast('Gagal membuka PDF: ' + e.message, 'bad'); }
        },
        pts: () => {
          const m = modal(`<h2>Atur Poin per Jenis Soal</h2><div class="row">${QT.ORDER.filter(k => k !== 'slide' && k !== 'polling' && w.questions.some(q => q.type === k)).map(k => `<label class="field"><span>${TYPE_LABEL[k]}</span><input type="number" min="0" step="0.5" id="p-${k}" value="${(w.questions.find(q => q.type === k) || {}).points || P.DEFAULT_POINTS[k]}"></label>`).join('')}</div>
            <p class="small muted">Nilai akhir = (poin diperoleh ÷ total poin) × 100.</p><div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="p-ok">Terapkan</button></div>`);
          $('#p-ok', m).onclick = () => { w.questions.forEach(q => { const inp = $('#p-' + q.type, m); if (inp) q.points = +inp.value || 0; }); closeModal(); keepScroll(); };
        },
        preview: () => {
          const m = modal(`<h2>Pratinjau: ${esc(w.title)}</h2><p class="small muted" style="margin-top:0">Tampilan seperti di HP murid — boleh dicoba. Pilihan diacak saat murid mengerjakan.</p>${w.questions.map(previewCard).join('')}
            <div class="foot"><button class="btn" data-close>Tutup</button></div>`, { wide: true, noFocus: true });
          mountPreviews(m, w.questions);
        },
        save: () => {
          const title = ($('#qs-title').value || '').trim() || 'Paket Soal';
          const questions = w.questions.map((q, i) => { const o = Object.assign({}, q, { num: i + 1 }); delete o.line; return o; });
          if (isDraft) {
            const obj = Object.assign({ id: src.id, title, source: src.source, questions, created: Date.now() }, ownerStamp());
            st().questionSets.push(obj); importDraft = null; S.save();
            toast('Paket soal disimpan ke Bank Soal.');
            location.hash = '#/bank-soal';
            setTimeout(() => useQset(obj.id), 300);
          } else {
            src.title = title; src.questions = questions; delete src._work; S.save();
            toast('Perubahan disimpan.'); location.hash = '#/bank-soal';
          }
        }
      }
    };
  }
  function keepScroll() { const y = window.scrollY; route(); window.scrollTo(0, y); }
  function resizeImage(file, max) {
    return new Promise((res, rej) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = rej; img.src = url;
    });
  }

  /* ================= Rekap nilai rapor (total) ================= */
  function viewRekap(mode) {
    mode = mode === 'tengah' ? 'tengah' : 'akhir';
    setTitle('🧮 Rekap Nilai Rapor', 'Total semua komponen asesmen — dihitung otomatis');
    renderCtx(true);
    const setup = needSetup(); if (setup) return { html: setup };
    const s = st(); const cls = S.cls(s.ui.classId); const subj = S.subj(s.ui.subjectId);
    const ctx = S.ctx(cls.id, subj.id);
    const slms = ctx.assessments.filter(a => a.type === 'slm');
    const useF = s.settings.includeFormatif;
    const akhirLbl = s.settings.semester === 'genap' ? 'SAT' : 'SAS';
    const reps = cls.students.map(m => ({ m, r: C.studentReport(ctx, m.id, m.name) }));
    const finals = reps.map(x => mode === 'akhir' ? x.r.nilaiAkhir : x.r.nilaiTengah);
    const ranks = C.rank(finals);
    const wA = s.settings.weightsAkhir, wT = s.settings.weightsTengah;
    const formula = mode === 'akhir'
      ? `Nilai Akhir = ${wA.slm}% × Rata-rata SLM${useF ? ` + ${wA.formatif}% × Rata-rata Formatif` : ''} + ${wA.sts}% × STS + ${wA.akhir}% × ${akhirLbl}`
      : `Nilai Tengah Semester = ${wT.slm}% × Rata-rata SLM${useF ? ` + ${wT.formatif}% × Rata-rata Formatif` : ''} + ${wT.sts}% × STS`;
    const rows = reps.map(({ m, r }, i) => {
      const final = finals[i];
      const pred = mode === 'akhir' ? r.predikat : r.predikatTengah;
      const missing = mode === 'akhir' ? r.akhirMissing : r.tengahMissing;
      return `<tr><td class="num">${i + 1}</td><td class="sticky-col" style="white-space:nowrap"><b>${esc(m.name)}</b><div class="small muted">${esc(m.nis || '')}</div></td>
        ${r.slm.map(v => `<td class="num">${fmt(v)}</td>`).join('')}
        <td class="num"><b>${fmt(r.slmAvg)}</b></td>
        ${useF ? `<td class="num">${fmt(r.formatifAvg)}</td>` : ''}
        <td class="num">${fmt(r.sts)}</td>
        ${mode === 'akhir' ? `<td class="num">${fmt(r.akhir)}</td>` : ''}
        <td class="num"><span style="font-size:1.15rem;font-weight:800">${fmt(final)}</span>${missing.length ? `<div class="small" style="color:var(--warn)" title="Komponen belum ada: ${missing.join(', ')}">⚠ sementara</div>` : ''}</td>
        <td class="num">${gradeBadge(pred)}</td><td>${ketPill(final)}</td><td class="num">${ranks[i] || '–'}</td>
        <td class="small" style="min-width:260px">${esc(r.deskripsi) || '<span class="muted">Tandai TP pada asesmen untuk membuat deskripsi otomatis.</span>'}</td></tr>`;
    }).join('');
    const col = f => C.mean(reps.map(x => f(x.r)));
    const stt = C.stats(finals, s.settings);
    const bandsSorted = s.settings.bands.slice().sort((a, b) => b.min - a.min);
    const dist = bandsSorted.map(b => ({ l: b.label, n: finals.filter(C.isNum).filter(v => C.band(v, s.settings).label === b.label).length }));
    const maxD = Math.max(1, ...dist.map(d => d.n));
    return {
      html: `
      <div class="tabs no-print"><button class="${mode === 'akhir' ? 'on' : ''}" data-act="mode" data-m="akhir">📘 Rapor Akhir Semester</button><button class="${mode === 'tengah' ? 'on' : ''}" data-act="mode" data-m="tengah">📗 Rapor Tengah Semester</button></div>
      <div class="print-only"><h2>${esc(s.settings.schoolName)}</h2><p>Rekap ${mode === 'akhir' ? 'Nilai Rapor Akhir Semester' : 'Nilai Tengah Semester'} — Kelas ${esc(cls.name)} — ${esc(subj.name)} — ${esc(S.periode())}</p></div>
      <div class="grid g4">
        <div class="card stat tilt"><div class="blob"><span>📊</span></div><div class="z1"><div class="num">${fmt(stt.avg, 1)}</div><div class="lbl">Rata-rata kelas</div></div></div>
        <div class="card stat tilt"><div class="blob"><span>🥇</span></div><div class="z1"><div class="num">${fmt(stt.max)}</div><div class="lbl">Nilai tertinggi</div></div></div>
        <div class="card stat tilt"><div class="blob"><span>✅</span></div><div class="z1"><div class="num">${stt.n ? fmt(stt.persen, 1) + '%' : '–'}</div><div class="lbl">Mencapai KKTP (${s.settings.kktp})</div></div></div>
        <div class="card stat tilt"><div class="blob"><span>🔁</span></div><div class="z1"><div class="num">${stt.belum}</div><div class="lbl">Perlu remedial</div></div></div>
      </div>
      <div class="grid" style="grid-template-columns: minmax(0,2fr) minmax(240px,1fr);margin-top:18px" id="rk-grid">
        <div class="card" style="margin:0"><h3>Rumus yang dipakai</h3><div class="note"><b>${formula}</b></div>
          <p class="small muted" style="margin:8px 0 0">Komponen yang belum ada dilewati dan bobotnya dinormalisasi (ditandai ⚠ sementara). Bobot, KKTP, predikat, dan apakah formatif dihitung dapat diubah di <a href="#/pengaturan">Pengaturan</a>. Komponen: ${slms.length} SLM, ${ctx.assessments.filter(a => a.type === 'sts').length} STS, ${ctx.assessments.filter(a => a.type === 'sas' || a.type === 'sat').length} ${akhirLbl}.</p></div>
        <div class="card tilt" style="margin:0"><div class="z1"><h3>Sebaran Predikat</h3><div class="chart3d" style="height:150px">${dist.map(d => `<div class="col"><div class="v">${d.n}</div><div class="barz" style="height:${d.n / maxD * 100}px"></div><div class="l">${esc(d.l)}</div></div>`).join('')}</div></div></div>
      </div>
      <div class="card"><div class="card-head"><h3>${mode === 'akhir' ? 'Nilai Rapor Akhir Semester' : 'Nilai Tengah Semester'} — ${esc(cls.name)} · ${esc(subj.name)}</h3>
        <div class="btns"><button class="btn soft sm" data-act="xls">⬇ Excel</button><button class="btn ghost sm" data-act="csv">⬇ CSV</button><button class="btn ghost sm" data-act="print">🖨 Cetak</button></div></div>
        <div class="table-wrap"><table id="rekap-table"><thead><tr><th class="num">No</th><th class="sticky-col">Nama Murid</th>
          ${slms.map((a, i) => `<th class="num" title="${esc(a.title)}">SLM ${i + 1}</th>`).join('')}<th class="num">Rata SLM</th>${useF ? '<th class="num">Formatif</th>' : ''}<th class="num">STS</th>${mode === 'akhir' ? `<th class="num">${akhirLbl}</th>` : ''}
          <th class="num">${mode === 'akhir' ? 'Nilai Akhir' : 'Nilai Tengah'}</th><th class="num">Predikat</th><th>Ketercapaian</th><th class="num">Rank</th><th>Deskripsi Capaian</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="20" class="empty">Belum ada murid.</td></tr>'}</tbody>
          <tfoot><tr><td></td><td class="sticky-col">Rata-rata kelas</td>${slms.map((a, k) => `<td class="num">${fmt(col(r => r.slm[k]), 1)}</td>`).join('')}<td class="num">${fmt(col(r => r.slmAvg), 1)}</td>${useF ? `<td class="num">${fmt(col(r => r.formatifAvg), 1)}</td>` : ''}<td class="num">${fmt(col(r => r.sts), 1)}</td>${mode === 'akhir' ? `<td class="num">${fmt(col(r => r.akhir), 1)}</td>` : ''}<td class="num">${fmt(stt.avg, 1)}</td><td colspan="4"></td></tr></tfoot>
        </table></div></div>`,
      mount(v) { if (window.innerWidth < 900) $('#rk-grid', v).style.gridTemplateColumns = '1fr'; },
      actions: {
        mode: el => { location.hash = '#/rekap/' + el.dataset.m; },
        xls: () => exportTable($('#rekap-table'), `Rekap_${mode}_${cls.name}_${subj.name}`),
        csv: () => exportTable($('#rekap-table'), `Rekap_${mode}_${cls.name}_${subj.name}`, 'csv'),
        print: () => window.print()
      }
    };
  }

  /* ================= Leger semua mapel ================= */
  function viewLeger() {
    setTitle('🏆 Leger Nilai Semua Mapel', 'Nilai akhir seluruh mata pelajaran, jumlah, rata-rata, dan peringkat');
    renderCtx(true, { noSubject: true });
    const setup = needSetup(); if (setup) return { html: setup };
    const s = st(); const cls = S.cls(s.ui.classId);
    const subs = s.subjects;
    const data = cls.students.map(m => {
      const vals = subs.map(sj => C.studentReport(S.ctx(cls.id, sj.id), m.id, m.name).nilaiAkhir);
      const nums = vals.filter(C.isNum);
      return { m, vals, sum: nums.length ? nums.reduce((a, b) => a + b, 0) : null, avg: C.mean(nums) };
    });
    const ranks = C.rank(data.map(d => d.sum));
    const best = data.map((d, i) => ({ d, r: ranks[i] })).filter(x => x.r).sort((a, b) => a.r - b.r).slice(0, 3);
    return {
      html: `
      ${best.length ? `<div class="grid g3">${best.map((x, k) => `<div class="card stat tilt"><div class="blob"><span>${['🥇', '🥈', '🥉'][k]}</span></div><div class="z1"><div class="lbl">Peringkat ${x.r}</div><div class="num" style="font-size:1.4rem">${esc(x.d.m.name)}</div><div class="lbl">Rata-rata ${fmt(x.d.avg, 2)} · Jumlah ${fmt(x.d.sum)}</div></div></div>`).join('')}</div>` : ''}
      <div class="card" style="margin-top:18px"><div class="card-head"><h3>Leger ${esc(cls.name)} — ${esc(S.periode())}</h3>
        <div class="btns"><button class="btn soft sm" data-act="xls">⬇ Excel</button><button class="btn ghost sm" data-act="print">🖨 Cetak</button></div></div>
        <div class="table-wrap"><table id="leger-table"><thead><tr><th class="num">No</th><th class="sticky-col">Nama Murid</th>${subs.map(sj => `<th class="num">${esc(sj.name)}</th>`).join('')}<th class="num">Jumlah</th><th class="num">Rata-rata</th><th class="num">Peringkat</th></tr></thead>
        <tbody>${data.map((d, i) => `<tr><td class="num">${i + 1}</td><td class="sticky-col">${esc(d.m.name)}</td>${d.vals.map(v => `<td class="num"><span style="${C.isNum(v) && v < s.settings.kktp ? 'color:var(--bad);font-weight:700' : ''}">${fmt(v)}</span></td>`).join('')}<td class="num"><b>${fmt(d.sum)}</b></td><td class="num">${fmt(d.avg, 2)}</td><td class="num">${ranks[i] ? `<span class="grade" style="width:30px;height:30px">${ranks[i]}</span>` : '–'}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td></td><td class="sticky-col">Rata-rata</td>${subs.map((sj, k) => `<td class="num">${fmt(C.mean(data.map(d => d.vals[k])), 1)}</td>`).join('')}<td class="num">${fmt(C.mean(data.map(d => d.sum)), 1)}</td><td class="num">${fmt(C.mean(data.map(d => d.avg)), 2)}</td><td></td></tr></tfoot></table></div>
        <p class="small muted">Nilai berwarna merah berada di bawah KKTP (${s.settings.kktp}).</p></div>`,
      actions: { xls: () => exportTable($('#leger-table'), 'Leger_' + cls.name), print: () => window.print() }
    };
  }

  /* ================= Pengaturan & tema ================= */
  function viewSettings() {
    setTitle('🎨 Pengaturan & Tema', 'Warna, identitas sekolah, bobot nilai, dan cadangan data');
    renderCtx(false);
    const s = st(), t = s.theme, g = s.settings;
    const w = (obj, k, label, dis) => `<label class="field"><span>${label}</span><input type="number" min="0" max="100" data-w="${obj}.${k}" value="${g[obj][k]}" ${dis ? 'disabled' : ''}></label>`;
    const sumA = (+g.weightsAkhir.slm) + (+g.weightsAkhir.sts) + (+g.weightsAkhir.akhir) + (g.includeFormatif ? +g.weightsAkhir.formatif : 0);
    const sumT = (+g.weightsTengah.slm) + (+g.weightsTengah.sts) + (g.includeFormatif ? +g.weightsTengah.formatif : 0);
    return {
      html: `
      <div class="grid g2" style="align-items:start" id="set-grid">
      <div>
        <div class="card"><h2>🎨 Warna Tema</h2>
          <div class="swatches" style="margin-bottom:30px">${S.PRESETS.map(p => `<div class="swatch ${t.preset === p.id ? 'on' : ''}" data-act="preset" data-id="${p.id}" style="background:linear-gradient(135deg,hsl(${p.h} ${p.s}% 55%),hsl(${p.h + 38} ${p.s}% 58%))"><small>${p.name}</small></div>`).join('')}</div>
          <label class="field"><span>Warna bebas (geser) — hue ${t.h}°</span><input type="range" class="hue-slider" min="0" max="359" id="th-h" value="${t.h}"></label>
          <div class="row">
            <label class="field"><span>Intensitas warna</span><input type="range" min="10" max="95" id="th-s" value="${t.s}"></label>
            <label class="field"><span>Kedalaman efek 3D</span><input type="range" min="0" max="1.6" step="0.1" id="th-d" value="${t.depth}"></label>
          </div>
          <div class="row">
            <label class="field"><span>Mode</span><select id="th-mode"><option value="light" ${t.mode === 'light' ? 'selected' : ''}>☀️ Siang (terang)</option><option value="dark" ${t.mode === 'dark' ? 'selected' : ''}>🌙 Malam (gelap)</option><option value="auto" ${t.mode === 'auto' ? 'selected' : ''}>🌗 Otomatis (ikut HP/laptop)</option></select></label>
            <label class="field"><span>Animasi 3D</span><select id="th-motion"><option value="on" ${t.motion === 'on' ? 'selected' : ''}>Aktif</option><option value="off" ${t.motion === 'off' ? 'selected' : ''}>Nonaktif (hemat baterai)</option></select></label>
          </div>
          <p class="small muted" style="margin:0">Warna kedua, latar, bayangan, dan kontras teks menyesuaikan otomatis sehingga tetap nyaman dipandang.</p>
        </div>
        <div class="card"><h2>🏫 Identitas & Periode</h2>
          <label class="field"><span>Nama sekolah</span><input data-g="schoolName" value="${esc(g.schoolName)}"></label>
          <label class="field"><span>Nama guru</span><input data-g="teacherName" value="${esc(g.teacherName)}"></label>
          <div class="row"><label class="field"><span>Tahun ajaran</span><input data-g="tahunAjaran" value="${esc(g.tahunAjaran)}" placeholder="2026/2027"></label>
          <label class="field"><span>Semester</span><select data-g="semester"><option value="ganjil" ${g.semester === 'ganjil' ? 'selected' : ''}>Ganjil (pakai SAS)</option><option value="genap" ${g.semester === 'genap' ? 'selected' : ''}>Genap (pakai SAT)</option></select></label></div>
          <p class="small muted" style="margin:0">Asesmen disimpan per tahun ajaran & semester. Mengganti periode akan menampilkan asesmen periode tersebut.</p>
        </div>
      </div>
      <div>
        <div class="card"><h2>🧮 Penghitungan Nilai</h2>
          <div class="row"><label class="field"><span>KKTP (Kriteria Ketercapaian TP)</span><input type="number" min="0" max="100" data-g="kktp" value="${g.kktp}"></label>
          <label class="field"><span>Pembulatan nilai rapor</span><select data-g="decimals"><option value="0" ${+g.decimals === 0 ? 'selected' : ''}>Bilangan bulat</option><option value="1" ${+g.decimals === 1 ? 'selected' : ''}>1 desimal</option><option value="2" ${+g.decimals === 2 ? 'selected' : ''}>2 desimal</option></select></label></div>
          <label style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><input type="checkbox" data-gc="includeFormatif" ${g.includeFormatif ? 'checked' : ''}> Hitung Asesmen Formatif ke nilai rapor</label>
          <label style="display:flex;gap:8px;align-items:center;margin-bottom:12px"><input type="checkbox" data-gc="remedialCap" ${g.remedialCap !== false ? 'checked' : ''}> Nilai remedial maksimal sama dengan KKTP</label>
          <h3>Bobot Nilai Akhir Semester (%)</h3>
          <div class="row">${w('weightsAkhir', 'slm', 'Rata-rata SLM')}${w('weightsAkhir', 'formatif', 'Formatif', !g.includeFormatif)}${w('weightsAkhir', 'sts', 'STS')}${w('weightsAkhir', 'akhir', g.semester === 'genap' ? 'SAT' : 'SAS')}</div>
          <p class="small ${sumA === 100 ? 'muted' : ''}" style="margin-top:0;${sumA !== 100 ? 'color:var(--warn)' : ''}">Jumlah bobot: <b>${sumA}%</b>${sumA !== 100 ? ' — tidak harus 100, akan dinormalisasi otomatis.' : ' ✓'}</p>
          <h3>Bobot Nilai Tengah Semester (%)</h3>
          <div class="row">${w('weightsTengah', 'slm', 'Rata-rata SLM')}${w('weightsTengah', 'formatif', 'Formatif', !g.includeFormatif)}${w('weightsTengah', 'sts', 'STS')}</div>
          <p class="small muted" style="margin-top:0">Jumlah bobot: <b>${sumT}%</b></p>
          <h3>Predikat</h3>
          <div class="table-wrap"><table><thead><tr><th>Huruf</th><th>Nama</th><th>Nilai minimal</th></tr></thead><tbody>
            ${g.bands.map((b, i) => `<tr><td><input data-band="${i}" data-k="label" value="${esc(b.label)}" style="width:60px"></td><td><input data-band="${i}" data-k="name" value="${esc(b.name)}"></td><td><input type="number" data-band="${i}" data-k="min" value="${b.min}" style="width:80px"></td></tr>`).join('')}
          </tbody></table></div>
          <h3 style="margin-top:14px">Pemetaan Asesmen Diagnostik</h3>
          <div class="table-wrap"><table><thead><tr><th>Kelompok</th><th>Nilai minimal</th></tr></thead><tbody>
            ${g.diagnosticBands.map((b, i) => `<tr><td><input data-dband="${i}" data-k="name" value="${esc(b.name)}"></td><td><input type="number" data-dband="${i}" data-k="min" value="${b.min}" style="width:80px"></td></tr>`).join('')}
          </tbody></table></div>
        </div>
        <div class="card"><h2>💾 Data</h2>
          <p class="small muted">${S.mode === 'server' ? 'Data tersimpan di <b>database MySQL</b> server dan bisa dibuka dari perangkat mana pun setelah login. Tetap ekspor cadangan secara berkala.' : 'Semua data tersimpan di browser perangkat ini. Ekspor cadangan secara berkala atau untuk memindahkan ke perangkat lain.'}</p>
          <div class="btns"><button class="btn" data-act="export">⬇ Ekspor Cadangan (.json)</button>${isAdmin() ? '<button class="btn soft" data-act="import">⬆ Pulihkan dari Cadangan</button>' : ''}<button class="btn ghost" data-act="demo">Muat Data Contoh</button>${isAdmin() ? '<button class="btn danger" data-act="reset">Hapus Semua Data</button>' : ''}</div>
          ${S.mode === 'server' && localData() && isAdmin() ? `<div class="note" style="margin-top:12px">Ditemukan data lama yang tersimpan di browser ini (${localData().classes.length} kelas, ${localData().assessments.length} asesmen). <button class="btn sm" data-act="migrate">⬆ Pindahkan ke Server</button></div>` : ''}
        </div>
      </div></div>`,
      mount(v) {
        if (window.innerWidth < 1000) $('#set-grid', v).style.gridTemplateColumns = '1fr';
        const live = () => { applyTheme(); S.save(); };
        $('#th-h', v).addEventListener('input', e => { t.h = +e.target.value; t.preset = 'custom'; live(); e.target.previousElementSibling && (e.target.parentNode.querySelector('span').textContent = `Warna bebas (geser) — hue ${t.h}°`); $$('.swatch', v).forEach(x => x.classList.remove('on')); });
        $('#th-s', v).addEventListener('input', e => { t.s = +e.target.value; live(); });
        $('#th-d', v).addEventListener('input', e => { t.depth = +e.target.value; live(); });
        $('#th-mode', v).addEventListener('change', e => { t.mode = e.target.value; live(); });
        $('#th-motion', v).addEventListener('change', e => { t.motion = e.target.value; live(); });
        $$('[data-g]', v).forEach(inp => inp.addEventListener('change', () => {
          const k = inp.dataset.g; g[k] = ['kktp', 'decimals'].includes(k) ? +inp.value : inp.value.trim(); S.save();
          if (k === 'semester' || k === 'schoolName' || k === 'kktp') keepScroll();
        }));
        $$('[data-gc]', v).forEach(inp => inp.addEventListener('change', () => { g[inp.dataset.gc] = inp.checked; S.save(); keepScroll(); }));
        $$('[data-w]', v).forEach(inp => inp.addEventListener('change', () => { const [o, k] = inp.dataset.w.split('.'); g[o][k] = Math.max(0, +inp.value || 0); S.save(); keepScroll(); }));
        $$('[data-band]', v).forEach(inp => inp.addEventListener('change', () => { const b = g.bands[+inp.dataset.band]; b[inp.dataset.k] = inp.dataset.k === 'min' ? +inp.value : inp.value; S.save(); }));
        $$('[data-dband]', v).forEach(inp => inp.addEventListener('change', () => { const b = g.diagnosticBands[+inp.dataset.dband]; b[inp.dataset.k] = inp.dataset.k === 'min' ? +inp.value : inp.value; S.save(); }));
      },
      actions: {
        preset: el => { const p = S.PRESETS.find(x => x.id === el.dataset.id); Object.assign(t, { preset: p.id, h: p.h, s: p.s }, p.mode ? { mode: p.mode } : {}); applyTheme(); S.save(); keepScroll(); },
        export: () => download('asesmen-merdeka-cadangan-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(s, (k, v) => k && k[0] === '_' ? undefined : v, 1), 'application/json'),
        import: async () => {
          const f = await pickFile('.json,application/json'); if (!f) return;
          try {
            const d = JSON.parse(await f.text());
            if (!d || !Array.isArray(d.classes)) throw new Error('Format tidak dikenali');
            if (!await confirmBox('Data saat ini akan diganti dengan isi cadangan. Lanjutkan?', 'Pulihkan')) return;
            await S.replaceAll(d); applyTheme(); route(); toast('Data berhasil dipulihkan.');
          } catch (e) { toast('Gagal memulihkan: ' + e.message, 'bad'); }
        },
        migrate: async () => {
          const d = localData();
          if (!await confirmBox(`Data di server akan <b>diganti</b> dengan data dari browser ini (${d.classes.length} kelas, ${d.assessments.length} asesmen). Lanjutkan?`, 'Pindahkan')) return;
          try { await S.replaceAll(d); localStorage.removeItem(S.KEY); applyTheme(); route(); toast('Data lama berhasil dipindahkan ke server.'); }
          catch (e) { toast('Gagal: ' + e.message, 'bad'); }
        },
        reset: async () => { if (!await confirmBox('Hapus <b>semua</b> kelas, murid, asesmen, nilai, dan bank soal? Tindakan ini tidak bisa dibatalkan.', 'Hapus Semua')) return; try { await S.reset(); applyTheme(); route(); toast('Semua data dihapus.'); } catch (e) { toast('Gagal: ' + e.message, 'bad'); } }
      }
    };
  }

  /* ================= Akun (mode server) ================= */
  function isAdmin() { return S.mode !== 'server' || (S.user && S.user.role === 'admin'); }
  function localData() {
    try { const d = JSON.parse(localStorage.getItem(S.KEY) || 'null'); return d && Array.isArray(d.classes) && (d.classes.length || d.assessments.length) ? d : null; } catch (e) { return null; }
  }
  function renderUserBox() {
    let box = $('#user-box');
    if (S.mode !== 'server' || !S.user) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.id = 'user-box'; box.className = 'user-box'; $('#sidebar').appendChild(box); }
    box.innerHTML = `<div class="avatar">${esc((S.user.name || '?').charAt(0).toUpperCase())}</div>
      <div style="min-width:0;flex:1"><b class="ellipsis">${esc(S.user.name)}</b><div class="small muted"><span id="sync-dot" class="sync-dot"></span><span id="sync-txt"></span></div>${S.saas && S.subscription ? `<a href="#/langganan" class="sub-badge ${S.subscription.active ? S.subscription.status : 'expired'}">${subLabel(S.subscription)}</a>` : ''}</div>
      <button class="btn ghost sm" id="btn-logout" title="Keluar">⎋</button>`;
    $('#btn-logout', box).onclick = () => S.logout();
    paintSync(S.syncStatus());
  }
  function paintSync(stt) {
    const d = $('#sync-dot'), t = $('#sync-txt'); if (!d) return;
    d.className = 'sync-dot ' + stt;
    t.textContent = stt === 'saving' ? 'Menyimpan…' : stt === 'error' ? 'Gagal tersimpan' : stt === 'locked' ? 'Hanya-baca' : 'Tersimpan di server';
  }

  function viewAccount() {
    setTitle('👤 Akun Guru', 'Login, password, dan pengelolaan akun');
    renderCtx(false);
    const me = S.user;
    const out = {
      html: `<div class="grid g2" style="align-items:start" id="acc-grid">
        <div class="card"><h2>Akun Saya</h2>
          <p><b>${esc(me.name)}</b> <span class="pill pri">${me.role === 'admin' ? 'Admin' : 'Guru'}</span><br><span class="muted small">Username: ${esc(me.username)}</span></p>
          <h3>Ganti Password</h3>
          <label class="field"><span>Password lama</span><input type="password" id="pw-old" autocomplete="current-password"></label>
          <label class="field"><span>Password baru (min. 6 karakter)</span><input type="password" id="pw-new" autocomplete="new-password"></label>
          <div class="btns"><button class="btn" data-act="pw">Simpan Password</button><button class="btn ghost" data-act="logout">⎋ Keluar</button></div>
        </div>
        ${me.role === 'admin' ? `<div class="card"><div class="card-head"><h2>Akun Guru Lain</h2><button class="btn sm" data-act="add-user">+ Akun</button></div>
          <p class="small muted">Semua guru berbagi data sekolah yang sama (kelas, mapel, asesmen). Admin dapat memulihkan cadangan dan menghapus data.</p>
          <div id="user-list" class="muted small">Memuat…</div></div>` : ''}
      </div>`,
      async mount(v) {
        if (window.innerWidth < 1000) $('#acc-grid', v).style.gridTemplateColumns = '1fr';
        const list = $('#user-list', v); if (!list) return;
        try {
          const r = await S.api('users');
          list.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th></th></tr></thead><tbody>${r.users.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.username)}</td><td><span class="pill ${u.role === 'admin' ? 'pri' : ''}">${u.role}</span></td>
            <td class="btns"><button class="btn ghost sm" data-act="reset-pw" data-id="${u.id}" data-n="${esc(u.name)}">🔑</button>${u.id === me.id ? '' : `<button class="btn ghost sm" data-act="del-user" data-id="${u.id}" data-n="${esc(u.name)}">🗑</button>`}</td></tr>`).join('')}</tbody></table></div>`;
        } catch (e) { list.textContent = e.message; }
      },
      actions: {
        logout: () => S.logout(),
        pw: async () => {
          try { await S.api('me/password', { method: 'PUT', body: { oldPassword: $('#pw-old').value, newPassword: $('#pw-new').value } }); toast('Password diganti.'); $('#pw-old').value = $('#pw-new').value = ''; }
          catch (e) { toast(e.message, 'bad'); }
        },
        'add-user': () => {
          const m = modal(`<h2>Akun Guru Baru</h2>
            <label class="field"><span>Nama lengkap</span><input id="nu-name"></label>
            <div class="row"><label class="field"><span>Username</span><input id="nu-user" autocomplete="off"></label><label class="field"><span>Password awal</span><input id="nu-pw" type="text" autocomplete="off"></label></div>
            <label class="field"><span>Peran</span><select id="nu-role"><option value="guru">Guru</option><option value="admin">Admin</option></select></label>
            <div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="nu-ok">Buat Akun</button></div>`);
          $('#nu-ok', m).onclick = async () => {
            try { await S.api('users', { body: { name: $('#nu-name', m).value.trim(), username: $('#nu-user', m).value.trim(), password: $('#nu-pw', m).value, role: $('#nu-role', m).value } }); closeModal(); toast('Akun dibuat.'); route(); }
            catch (e) { toast(e.message, 'bad'); }
          };
        },
        'reset-pw': el => {
          const m = modal(`<h2>Atur Password ${esc(el.dataset.n)}</h2><label class="field"><span>Password baru</span><input id="rp" type="text" autocomplete="off"></label><div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="rp-ok">Simpan</button></div>`);
          $('#rp-ok', m).onclick = async () => { try { await S.api('users/' + el.dataset.id + '/password', { method: 'PUT', body: { password: $('#rp', m).value } }); closeModal(); toast('Password diatur ulang.'); } catch (e) { toast(e.message, 'bad'); } };
        },
        'del-user': async el => {
          if (!await confirmBox(`Hapus akun <b>${esc(el.dataset.n)}</b>? Data asesmen tetap ada.`, 'Hapus')) return;
          try { await S.api('users/' + el.dataset.id, { method: 'DELETE' }); route(); } catch (e) { toast(e.message, 'bad'); }
        }
      }
    };
    return out;
  }

  /* Layar pengaturan database (versi PHP, pemasangan pertama) */
  function configScreen() {
    document.body.classList.add('auth-mode');
    let el = $('#auth');
    setTimeout(() => window.ThemeMode && ThemeMode.paint(), 0);
    if (!el) { el = document.createElement('div'); el.id = 'auth'; el.className = 'auth'; document.body.appendChild(el); }
    el.innerHTML = `<div class="card auth-card" style="width:min(520px,100%)">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><div class="logo-wrap"><div class="logo-cube"><span>A</span><span>M</span><span>A</span><span>M</span><span></span><span></span></div></div>
      <div><h2 style="margin:0">Pasang Asesmen Merdeka</h2><div class="small muted">Langkah 1 dari 2 — hubungkan ke database MySQL</div></div></div>
      <p class="small muted" style="margin-top:0">Isi sesuai database yang dibuat di <b>cPanel → MySQL® Databases</b>. Nama database &amp; user biasanya diawali nama akun hosting, mis. <span class="kbd">akunanda_asesmen</span>.</p>
      <form id="cfg-form">
        <div class="row"><label class="field" style="flex:2"><span>Host database</span><input id="c-host" value="localhost" required></label>
        <label class="field" style="flex:1;min-width:90px"><span>Port</span><input id="c-port" value="3306" inputmode="numeric"></label></div>
        <label class="field"><span>Nama database</span><input id="c-name" required autocomplete="off" placeholder="akunanda_asesmen"></label>
        <label class="field"><span>User database</span><input id="c-user" required autocomplete="off" placeholder="akunanda_guru"></label>
        <label class="field"><span>Password database</span><input id="c-pass" type="password" autocomplete="new-password"></label>
        <button class="btn lg" style="width:100%" type="submit">Hubungkan &amp; Lanjut →</button>
      </form></div>`;
    $('#c-name', el).focus();
    $('#cfg-form', el).onsubmit = async e => {
      e.preventDefault();
      const btn = $('button[type=submit]', el); btn.disabled = true; btn.textContent = 'Menghubungkan…';
      try {
        await S.installConfig({ host: $('#c-host', el).value.trim(), port: +$('#c-port', el).value || 3306, name: $('#c-name', el).value.trim(), user: $('#c-user', el).value.trim(), pass: $('#c-pass', el).value });
        toast('Database terhubung. Sekarang buat akun admin.');
        authScreen(true);
      } catch (err) { btn.disabled = false; btn.textContent = 'Hubungkan & Lanjut →'; toast(err.message, 'bad'); }
    };
  }

  /* Layar login / daftar sekolah / pemasangan pertama */
  function authScreen(mode, msg) {
    // mode: true = pemasangan pertama (pemilik), 'register' = daftar sekolah, lainnya = login
    if (mode === true) mode = 'setup';
    if (!mode) mode = 'login';
    if (mode === 'register' && !S.saas) mode = 'login';
    document.body.classList.add('auth-mode');
    let el = $('#auth');
    setTimeout(() => window.ThemeMode && ThemeMode.paint(), 0);
    if (!el) { el = document.createElement('div'); el.id = 'auth'; el.className = 'auth'; document.body.appendChild(el); }
    const sub = { setup: S.saas ? 'Pemasangan pertama — buat akun pemilik platform' : 'Pemasangan pertama — buat akun admin', register: 'Daftar sekolah baru — coba gratis', login: 'Masuk ke akun sekolah' }[mode];
    const userLabel = S.saas ? 'Email' : 'Username';
    el.innerHTML = `<button class="mode-toggle auth-mode-btn" type="button" aria-label="Ganti mode">☀️</button><div class="card auth-card tilt"><div class="z1">
      ${window.Art ? `<div class="auth-mascot">${Art.kubi({ pose: mode === 'register' ? 'cheer' : 'wave', eyes: 'happy' })}</div>` : ''}
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px"><div class="logo-wrap"><div class="logo-cube"><span>A</span><span>M</span><span>A</span><span>M</span><span></span><span></span></div></div>
      <div><h2 style="margin:0">Asesmen Merdeka</h2><div class="small muted">${sub}</div></div></div>
      ${S.saas && mode !== 'setup' ? `<div class="tabs" style="width:100%"><button type="button" class="${mode === 'login' ? 'on' : ''}" style="flex:1" data-m="login">Masuk</button><button type="button" class="${mode === 'register' ? 'on' : ''}" style="flex:1" data-m="register">Daftar Sekolah</button></div>` : ''}
      ${msg ? `<div class="note warn" style="margin-bottom:12px">${esc(msg)}</div>` : ''}
      ${mode === 'setup' && S.saas ? '<p class="small muted" style="margin-top:0">Akun ini adalah <b>pemilik platform</b>: bisa memakai aplikasi untuk sekolah Anda sendiri sekaligus mengelola sekolah lain yang berlangganan, pembayaran, dan harga.</p>' : ''}
      <form id="auth-form">
        ${mode === 'setup' || mode === 'register' ? '<label class="field"><span>Nama sekolah</span><input id="au-school" required placeholder="SMP Negeri 1 ..."></label><label class="field"><span>Nama Anda</span><input id="au-name" required autocomplete="name"></label>' : ''}
        <label class="field"><span>${mode === 'login' ? (S.saas ? 'Email atau username' : 'Username') : userLabel}</span><input id="au-user" required autocomplete="${mode === 'login' ? 'username' : 'email'}" autocapitalize="off" ${mode !== 'login' && S.saas ? 'type="email"' : ''}></label>
        ${mode === 'register' ? '<label class="field"><span>No. WhatsApp (opsional)</span><input id="au-phone" inputmode="tel" autocomplete="tel" placeholder="08…"></label>' : ''}
        <label class="field"><span>Password${mode !== 'login' ? ' (min. 6 karakter)' : ''}</span><input id="au-pw" type="password" required autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}"></label>
        <button class="btn lg" style="width:100%" type="submit">${mode === 'setup' ? 'Buat Akun & Mulai' : mode === 'register' ? 'Daftar & Mulai Coba Gratis' : 'Masuk'}</button>
      </form>
      ${mode === 'login' && S.saas ? '<div class="small muted" style="margin-top:10px;text-align:center">Lupa password? Minta admin sekolah Anda mengatur ulang di menu Akun Guru.</div>' : ''}
      <div class="small muted" style="margin-top:14px;text-align:center">${S.saas ? '<a href="index.html">← Halaman utama</a> · ' : ''}Murid? <a href="ujian.html">Masuk ke halaman ujian →</a></div>
    </div></div>`;
    bindTilt(el);
    $$('[data-m]', el).forEach(b => b.onclick = () => { history.replaceState(null, '', b.dataset.m === 'register' ? '#daftar' : '#masuk'); authScreen(b.dataset.m); });
    ($('#au-school', el) || $('#au-user', el)).focus();
    $('#auth-form', el).onsubmit = async e => {
      e.preventDefault();
      const btn = $('button[type=submit]', el); btn.disabled = true;
      const val = id => { const x = $(id, el); return x ? x.value.trim() : ''; };
      try {
        if (mode === 'setup') await S.setup({ schoolName: val('#au-school'), name: val('#au-name'), username: val('#au-user'), password: $('#au-pw', el).value });
        else if (mode === 'register') await S.register({ schoolName: val('#au-school'), name: val('#au-name'), email: val('#au-user'), phone: val('#au-phone'), password: $('#au-pw', el).value });
        else await S.login(val('#au-user'), $('#au-pw', el).value);
        el.remove(); document.body.classList.remove('auth-mode');
        if (/^#(daftar|masuk)$/.test(location.hash)) history.replaceState(null, '', '#/beranda');
        startApp();
        if (mode === 'register') toast('Selamat datang! Masa coba gratis Anda sudah aktif.');
      } catch (err) { btn.disabled = false; toast(err.message, 'bad'); }
    };
  }

  /* ================= Langganan (SaaS) ================= */
  const rupiah = n => 'Rp' + Math.round(+n || 0).toLocaleString('id-ID');
  const tgl = d => d ? new Date(String(d).replace(' ', 'T')).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '–';
  function subLabel(sb) {
    if (!sb) return '';
    if (sb.status === 'unlimited') return '★ Tanpa batas';
    if (sb.status === 'suspended') return '⛔ Dinonaktifkan';
    if (!sb.active) return '⚠ Langganan habis';
    if (sb.status === 'trial') return '🎁 Coba gratis · ' + sb.daysLeft + ' hari';
    return '✓ Aktif · ' + sb.daysLeft + ' hari';
  }
  const PAY_STATUS = { pending: ['warn', 'Menunggu verifikasi'], approved: ['ok', 'Disetujui'], rejected: ['bad', 'Ditolak'] };

  function viewBilling() {
    setTitle('💳 Langganan', 'Status langganan sekolah dan pembayaran');
    renderCtx(false);
    const out = {
      html: '<div id="billing" class="muted">Memuat…</div>',
      async mount(v) {
        let d;
        try { d = await S.api('billing'); } catch (e) { $('#billing', v).innerHTML = `<div class="card">${esc(e.message)}</div>`; return; }
        S.subscription = d.subscription; renderUserBox();
        const sb = d.subscription;
        const locked = !sb.active;
        const waLink = d.whatsapp ? `https://wa.me/${d.whatsapp.replace(/^0/, '62')}` : '';
        $('#billing', v).innerHTML = `
          ${locked ? `<div class="note warn" style="margin-bottom:16px"><b>${sb.status === 'suspended' ? 'Akun sekolah dinonaktifkan.' : 'Masa ' + (sb.plan === 'trial' ? 'coba gratis' : 'langganan') + ' sudah berakhir.'}</b> Data Anda tetap aman, tetapi aplikasi terkunci sampai langganan diperpanjang. ${sb.status === 'suspended' ? 'Hubungi pengelola.' : 'Pilih paket di bawah lalu kirim bukti transfer.'}</div>` : ''}
          <div class="grid g3">
            <div class="card stat tilt"><div class="blob"><span>🏫</span></div><div class="z1"><div class="lbl">Sekolah</div><div class="num" style="font-size:1.3rem">${esc(sb.name)}</div></div></div>
            <div class="card stat tilt"><div class="blob"><span>${sb.active ? '✅' : '⛔'}</span></div><div class="z1"><div class="lbl">Status</div><div class="num" style="font-size:1.3rem">${subLabel(sb)}</div></div></div>
            <div class="card stat tilt"><div class="blob"><span>📅</span></div><div class="z1"><div class="lbl">Aktif sampai</div><div class="num" style="font-size:1.3rem">${sb.status === 'unlimited' ? 'Tanpa batas' : tgl(sb.paidUntil)}</div></div></div>
          </div>
          ${sb.status === 'unlimited' ? '<div class="card"><p style="margin:0">Sekolah ini tidak memiliki batas waktu langganan.</p></div>' : `
          <h2 style="margin:24px 0 12px">Pilih Paket</h2>
          <div class="grid g3">${d.plans.map((p, i) => `<div class="card tilt plan-card ${i === 1 ? 'featured' : ''}"><div class="z1">
            ${i === 1 ? '<span class="pill ok" style="position:absolute;top:14px;right:14px">Populer</span>' : ''}
            <h3>${esc(p.name)}</h3><div class="price">${rupiah(p.price)}</div><div class="small muted">untuk ${p.months} bulan${p.months > 1 ? ` · ±${rupiah(p.price / p.months)}/bulan` : ''}</div>
            <p class="small" style="min-height:2.6em">${esc(p.desc || '')}</p>
            ${d.isAdmin ? `<button class="btn ${i === 1 ? '' : 'soft'}" style="width:100%" data-act="pay" data-id="${esc(p.id)}">Pilih Paket Ini</button>` : '<div class="small muted">Hanya admin sekolah yang dapat membayar.</div>'}
          </div></div>`).join('')}</div>`}
          <div class="card" style="margin-top:18px"><div class="card-head"><h3>Riwayat Pembayaran</h3>${waLink ? `<a class="btn ok sm" target="_blank" href="${waLink}">💬 Hubungi Admin</a>` : ''}</div>
            ${d.payments.length ? `<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Paket</th><th class="num">Jumlah</th><th>Status</th><th>Catatan</th></tr></thead><tbody>
            ${d.payments.map(x => `<tr><td>${tgl(x.created_at)}</td><td>${esc(x.plan_name)} (${x.months} bln)</td><td class="num">${rupiah(x.amount)}</td><td><span class="pill ${PAY_STATUS[x.status][0]}">${PAY_STATUS[x.status][1]}</span></td><td class="small">${esc(x.admin_note || x.note || '')}</td></tr>`).join('')}
            </tbody></table></div>` : '<p class="muted small" style="margin:0">Belum ada pembayaran.</p>'}</div>`;
        bindTilt(v);
        out.data = d;
      },
      actions: {
        pay: el => {
          const d = out.data; const p = d.plans.find(x => x.id === el.dataset.id); const amount = p.price + d.subscription.uniqueCode;
          let proof = '';
          const m = modal(`<h2>Bayar Paket ${esc(p.name)}</h2>
            <div class="pay-box"><div class="small muted">Transfer tepat sebesar</div><div class="score-big" style="font-size:2.4rem">${rupiah(amount)}</div>
              <div class="small muted">${rupiah(p.price)} + kode unik ${d.subscription.uniqueCode} (agar pembayaran mudah dikenali)</div></div>
            <h3>Ke rekening</h3><pre class="bank-info">${esc(d.bankInfo)}</pre>
            <label class="field"><span>Foto / screenshot bukti transfer</span><input type="file" id="pf" accept="image/*"></label>
            <img id="pf-prev" class="hidden" style="max-height:200px;border-radius:12px;margin-bottom:10px">
            <label class="field"><span>Catatan (opsional)</span><input id="pn" placeholder="mis. transfer dari rekening a.n. …"></label>
            <p class="small muted">Setelah diverifikasi admin, masa aktif bertambah ${p.months} bulan secara otomatis.</p>
            <div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn ok" id="p-ok">Kirim Bukti Transfer</button></div>`, { noFocus: true });
          $('#pf', m).onchange = async e => { const f = e.target.files[0]; if (!f) return; proof = await resizeImage(f, 1100); const im = $('#pf-prev', m); im.src = proof; im.classList.remove('hidden'); };
          $('#p-ok', m).onclick = async () => {
            if (!proof) return toast('Pilih foto bukti transfer terlebih dahulu.', 'bad');
            const b = $('#p-ok', m); b.disabled = true;
            try { await S.api('billing/pay', { body: { planId: p.id, proof, note: $('#pn', m).value.trim() } }); closeModal(); toast('Bukti transfer terkirim. Menunggu verifikasi admin.'); route(); }
            catch (e) { b.disabled = false; toast(e.message, 'bad'); }
          };
        }
      }
    };
    return out;
  }

  /* ================= Kuis Seru (permainan live) ================= */
  let gamePoll = null, hostAutoMusic = null;
  const gameAvailable = () => S.mode === 'server' && S.backend === 'php';
  const playLink = code => location.origin + location.pathname.replace(/[^/]*$/, '') + 'kuis.html?kode=' + code;
  const GAME_STATUS = { lobby: ['warn', 'Menunggu pemain'], running: ['ok', '● Berlangsung'], ended: ['', 'Selesai'] };

  function viewGames() {
    setTitle('🎮 Kuis Seru (Live)', 'Kuis interaktif bergaya permainan — murid bergabung dari HP dengan kode');
    renderCtx(false);
    if (!gameAvailable()) return { html: `<div class="card empty"><div class="big">🎮</div><h3>Kuis Seru membutuhkan versi server PHP</h3><p>Fitur ini berjalan saat aplikasi dipasang di hosting (versi PHP + MySQL) dan Anda login.</p></div>` };
    const out = {
      html: `<div class="card hero tilt"><div class="z1"><h2 style="margin:0 0 6px">Belajar seperti bermain 🎉</h2>
        <p style="margin:0 0 14px">Pilih paket soal, tampilkan kode di proyektor, lalu murid bergabung dari HP. Ada dua mode: <b>🎮 Permainan</b> (poin kecepatan, papan peringkat, podium) dan <b>📝 Ujian</b> (timer total, ragu-ragu, pengawasan keluar halaman, soal uraian).</p>
        <div class="btns"><button class="btn ghost lg" data-act="new">🎮 Buat Permainan</button><button class="btn ghost lg" data-act="new-exam">📝 Buat Ujian</button></div></div></div>
        <div id="games" class="muted" style="margin-top:18px">Memuat…</div>`,
      async mount(v) {
        let d; try { d = await S.api('games'); } catch (e) { $('#games', v).innerHTML = `<div class="card">${esc(e.message)}</div>`; return; }
        $('#games', v).innerHTML = d.games.length ? `<div class="grid auto">${d.games.map(g => `<div class="card tilt" style="margin:0"><div class="z1">
          <div class="card-head"><h3>${esc(g.title)}</h3><span class="pill ${GAME_STATUS[g.status][0]}">${GAME_STATUS[g.status][1]}</span></div>
          <p class="small muted" style="margin:0 0 8px"><span class="pill ${g.is_exam ? 'pri' : 'ok'}">${g.is_exam ? '📝 Ujian' : '🎮 Permainan'}</span> ${tgl(g.created_at)} · kode ${esc(g.code)} · ${g.players} ${g.is_exam ? 'peserta' : 'pemain'}${!g.is_exam && g.answered ? ` · akurasi ${Math.round(g.correct / g.answered * 100)}%` : ''}${g.class_id && S.cls(g.class_id) ? ' · ' + esc(S.cls(g.class_id).name) : ''}</p>
          <div class="btns"><a class="btn sm" href="#/kuis/${g.id}">${g.status === 'ended' ? '📊 Hasil' : '▶ Buka Layar Kuis'}</a><button class="btn ghost sm" data-act="del" data-id="${g.id}">🗑</button></div></div></div>`).join('')}</div>`
          : '<div class="card empty"><div class="big">🕹️</div>Belum ada kuis. Klik <b>Buat Kuis Seru</b> untuk memulai.</div>';
        bindTilt(v);
      },
      actions: {
        new: () => newGameModal(),
        'new-exam': () => newGameModal({ mode: 'exam' }),
        del: async el => { if (!await confirmBox('Hapus kuis ini beserta hasilnya?', 'Hapus')) return; try { await S.api('games/' + el.dataset.id, { method: 'DELETE' }); route(); } catch (e) { toast(e.message, 'bad'); } }
      }
    };
    return out;
  }

  function newGameModal(preset) {
    const s = st(); ensureCtx(); preset = preset || {};
    if (!s.questionSets.length) { toast('Buat atau unggah paket soal dulu di Bank Soal.', 'bad'); location.hash = '#/bank-soal'; return; }
    const usable = q => q.questions.filter(x => QT.TYPES[x.type] && QT.TYPES[x.type].game && QT.hasKey(x)).length;
    const usableExam = q => q.questions.filter(x => QT.TYPES[x.type] && QT.hasKey(x)).length;
    let mode = preset.mode === 'exam' ? 'exam' : 'game';
    const m = modal(`<h2>Buat Kuis Seru</h2>
      <div class="mode-pick"><button type="button" class="mode-card" data-mode="game"><b>🎮 Permainan</b><small>Timer per soal, poin kecepatan, papan peringkat & podium juara</small></button>
        <button type="button" class="mode-card" data-mode="exam"><b>📝 Ujian</b><small>Timer total, bebas pindah soal, ragu-ragu, pengawasan, soal uraian</small></button></div>
      <label class="field"><span>Paket soal</span><select id="g-qs">${s.questionSets.map(q => `<option value="${q.id}" ${preset.qsetId === q.id ? 'selected' : ''} data-g="${usable(q)}" data-e="${usableExam(q)}">${esc(q.title)}</option>`).join('')}</select></label>
      <label class="field"><span>Judul kuis</span><input id="g-title" placeholder="(sama dengan judul paket soal)" value="${esc(preset.title || '')}"></label>
      <div class="row"><label class="field"><span>Peserta</span><select id="g-cls"><option value="">Bebas — murid mengetik nama panggilan</option>${s.classes.map(c => `<option value="${c.id}" ${(preset.classId || '') === c.id ? 'selected' : ''}>Kelas ${esc(c.name)} — pilih nama (nilai bisa disimpan)</option>`).join('')}</select></label>
      <label class="field only-game" style="max-width:170px"><span>Waktu per soal</span><select id="g-time">${[10, 15, 20, 30, 45, 60, 90, 120].map(t => `<option value="${t}" ${(preset.time || 20) === t ? 'selected' : ''}>${t} detik</option>`).join('')}</select></label>
      <label class="field only-exam" style="max-width:170px"><span>Durasi ujian</span><select id="g-dur">${[[15, '15 menit'], [30, '30 menit'], [45, '45 menit'], [60, '60 menit'], [90, '90 menit'], [120, '120 menit'], [0, 'Tanpa batas']].map(([v, l]) => `<option value="${v}" ${(preset.duration == null ? 60 : preset.duration) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <label class="field"><span>Mapel (untuk menyimpan nilai)</span><select id="g-subj">${s.subjects.map(x => `<option value="${x.id}" ${(preset.subjectId || s.ui.subjectId) === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
      <div class="grid g2 small" style="gap:6px">
        <label style="display:flex;gap:8px"><input type="checkbox" id="g-sq" checked> Acak urutan soal per murid</label>
        <label style="display:flex;gap:8px"><input type="checkbox" id="g-so" checked> Acak urutan pilihan jawaban</label>
        <label class="only-game" style="display:flex;gap:8px"><input type="checkbox" id="g-sa" checked> Tampilkan jawaban benar setelah menjawab</label>
        <label class="only-game" style="display:flex;gap:8px"><input type="checkbox" id="g-sb" checked> Bonus poin untuk jawaban cepat</label>
        <label class="only-exam" style="display:flex;gap:8px"><input type="checkbox" id="g-sr" checked> Tampilkan nilai ke murid setelah selesai</label>
      </div>
      <label class="field only-exam" style="margin-top:10px"><span>Pengawasan: jika murid keluar dari halaman ujian (pindah aplikasi/tab)…</span><select id="g-viol">
        <option value="0">Catat saja sebagai pelanggaran</option><option value="3" selected>Kumpulkan otomatis setelah 3 pelanggaran</option><option value="5">Kumpulkan otomatis setelah 5 pelanggaran</option><option value="1">Kumpulkan otomatis pada pelanggaran pertama</option></select></label>
      <div class="music-box">
        <label class="switch-row"><input type="checkbox" id="g-music-on" checked><span class="sw"></span><span><b>🎵 Musik latar di HP murid</b><small>Otomatis menyala saat murid masuk. Murid tetap bisa mengecilkan atau mematikan di HP-nya.</small></span></label>
        <div class="row" id="g-music-row" style="margin-top:8px"><label class="field" style="margin:0"><span>Pilih musik (ketuk untuk mendengar contoh)</span><select id="g-music"></select></label></div>
        <label class="switch-row" style="margin-top:10px"><input type="checkbox" id="g-music-host"><span class="sw"></span><span><b>🔊 Putar juga di layar guru</b><small>Musik keluar dari laptop/proyektor kelas saat layar kuis dibuka.</small></span></label>
      </div>
      <p class="small muted" id="g-note"></p>
      <div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="g-ok">Buat & Buka Layar Kuis</button></div>`);
    const mdef = md => { try { return Object.assign({ on: true, track: md === 'exam' ? 'fokus' : 'semangat', host: md !== 'exam' }, JSON.parse(localStorage.getItem('kuis-musik-def-' + md) || '{}')); } catch (e) { return { on: true, track: md === 'exam' ? 'fokus' : 'semangat', host: md !== 'exam' }; } };
    let lastMode = null;
    const fillMusic = () => {
      if (lastMode === mode) return; lastMode = mode;
      const T2 = window.Music ? Music.TRACKS : [], mine = mode === 'exam' ? 'ujian' : 'main', d = mdef(mode);
      const sel = $('#g-music', m);
      sel.innerHTML = `<optgroup label="${mode === 'exam' ? 'Cocok untuk ujian' : 'Untuk permainan'}">${T2.filter(t => t.kind === mine).map(t => `<option value="${t.id}">${t.emoji} ${t.name} — ${t.desc}</option>`).join('')}</optgroup><optgroup label="Lainnya">${T2.filter(t => t.kind !== mine).map(t => `<option value="${t.id}">${t.emoji} ${t.name} — ${t.desc}</option>`).join('')}</optgroup>`;
      const on = preset.music !== undefined && preset.mode === mode ? !!preset.music : d.on;
      sel.value = (preset.mode === mode && preset.music) || d.track;
      $('#g-music-on', m).checked = on; $('#g-music-host', m).checked = d.host;
      paintMusic();
    };
    const paintMusic = () => { const on = $('#g-music-on', m).checked; $('#g-music', m).disabled = !on; $('#g-music-row', m).style.opacity = on ? 1 : .45; };
    const paint = () => {
      fillMusic();
      $$('.mode-card', m).forEach(c => c.classList.toggle('on', c.dataset.mode === mode));
      $$('.only-game', m).forEach(x => x.classList.toggle('hidden', mode !== 'game'));
      $$('.only-exam', m).forEach(x => x.classList.toggle('hidden', mode !== 'exam'));
      const o = $('#g-qs', m).selectedOptions[0];
      $('#g-note', m).innerHTML = mode === 'exam'
        ? `${o ? o.dataset.e : 0} soal dipakai — semua 17 jenis soal bisa dipakai (uraian, menggambar & rekam suara dikoreksi guru). Pilih <b>kelas</b> agar murid masuk dengan nama & NIS dan nilainya bisa disimpan.`
        : `${o ? o.dataset.g : 0} soal dipakai. Uraian, menggambar, rekam suara, dan soal yang kuncinya belum lengkap tidak dipakai di mode permainan (pakai mode Ujian).`;
      $('#g-ok', m).textContent = mode === 'exam' ? 'Buat & Buka Layar Pengawas' : 'Buat & Buka Layar Kuis';
      if (mode === 'exam' && !$('#g-cls', m).value && s.classes[0]) $('#g-cls', m).value = s.classes[0].id;
    };
    $$('.mode-card', m).forEach(c => c.onclick = () => { mode = c.dataset.mode; paint(); });
    $('#g-music-on', m).onchange = () => { paintMusic(); if (!$('#g-music-on', m).checked && window.Music) Music.stop(); };
    $('#g-music', m).onchange = e => { if (window.Music) { Music.unlock(); Music.setVolume(0.45); if (e.target.value) { Music.play(e.target.value); clearTimeout(window.__mp); window.__mp = setTimeout(() => Music.stop(), 6000); } else Music.stop(); } };
    $('#g-qs', m).onchange = paint;
    paint();
    $('#g-ok', m).onclick = async () => {
      const b = $('#g-ok', m); b.disabled = true;
      try {
        if (window.Music) Music.stop();
        const musicOn = $('#g-music-on', m).checked, track = $('#g-music', m).value, hostOn = $('#g-music-host', m).checked;
        localStorage.setItem('kuis-musik-def-' + mode, JSON.stringify({ on: musicOn, track, host: hostOn }));
        hostAutoMusic = hostOn ? track : null;
        const r = await S.api('games', { body: { mode, music: musicOn ? track : '', qsetId: $('#g-qs', m).value, title: $('#g-title', m).value.trim(), classId: $('#g-cls', m).value || null, subjectId: $('#g-subj', m).value || null, time: +$('#g-time', m).value,
          duration: +$('#g-dur', m).value, showResult: $('#g-sr', m).checked, maxViolations: +$('#g-viol', m).value,
          shuffleQ: $('#g-sq', m).checked, shuffleOpt: $('#g-so', m).checked, showAnswer: $('#g-sa', m).checked, speedBonus: $('#g-sb', m).checked } });
        closeModal();
        if (r.skipped) toast(r.skipped + ' soal dilewati (' + (mode === 'exam' ? 'belum ada kunci' : 'uraian / belum ada kunci') + ').', 'bad');
        location.hash = '#/kuis/' + r.id;
      } catch (e) { b.disabled = false; toast(e.message, 'bad'); }
    };
  }

  function viewGameHost(id) {
    renderCtx(false);
    setTitle('🎮 Kuis Seru', 'Layar guru — tampilkan di proyektor');
    if (!gameAvailable()) { location.hash = '#/kuis'; return { html: '' }; }
    const out = {
      html: '<div id="host" class="muted">Memuat…</div>',
      data: null,
      async load() {
        if ($('#modal-root').innerHTML) return;
        let d; try { d = await S.api('games/' + id); } catch (e) { $('#host').innerHTML = `<div class="card">${esc(e.message)}</div>`; clearInterval(gamePoll); gamePoll = null; return; }
        out.data = d; renderHost(d);
      },
      mount() {
        out.load();
        if (hostAutoMusic && window.Music) { Music.unlock(); Music.setVolume(+(localStorage.getItem('host-vol') || 0.5)); Music.play(hostAutoMusic); hostAutoMusic = null; }
        clearInterval(gamePoll);
        gamePoll = setInterval(() => { if (!/^#\/kuis\/\d+/.test(location.hash)) { clearInterval(gamePoll); gamePoll = null; return; } if (out.data && out.data.game.status === 'ended') return; out.load(); }, 2000);
      },
      actions: {
        start: async () => { try { await S.api('games/' + id + '/start', { method: 'POST' }); out.load(); } catch (e) { toast(e.message, 'bad'); } },
        end: async () => { const ex = out.data.game.settings.mode === 'exam'; if (!await confirmBox(ex ? 'Akhiri ujian sekarang? Lembar jawaban murid yang belum menekan Selesai akan <b>dikumpulkan otomatis</b>.' : 'Akhiri kuis sekarang? Murid yang belum selesai tidak bisa lanjut menjawab.', ex ? 'Akhiri Ujian' : 'Akhiri Kuis')) return; try { await S.api('games/' + id + '/end', { method: 'POST' }); out.load(); } catch (e) { toast(e.message, 'bad'); } },
        kick: async el => { if (!await confirmBox(`Keluarkan <b>${esc(el.dataset.n)}</b> dari kuis?`, 'Keluarkan')) return; await S.api('games/' + id + '/kick', { body: { playerId: +el.dataset.id } }); out.load(); },
        copy: () => { const t = playLink(out.data.game.code); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Tautan disalin.'), () => prompt('Salin tautan ini:', t)); },
        wa: () => { const g = out.data.game; window.open('https://wa.me/?text=' + encodeURIComponent(`Ayo ikut Kuis Seru "${g.title}"!\nKode: ${g.code}\nGabung di: ${playLink(g.code)}`), '_blank'); },
        fs: () => { document.body.classList.toggle('fs-mode'); if (document.body.classList.contains('fs-mode') && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); else if (document.fullscreenElement) document.exitFullscreen(); },
        save: () => saveGameScores(out.data),
        xls: () => exportTable($('#res-table'), 'Kuis_' + out.data.game.title.replace(/[^\w\s-]/g, '')),
        music: () => hostMusic(),
        again: () => { const g = out.data.game; newGameModal({ music: g.settings.music, mode: g.settings.mode, qsetId: g.settings.qsetId, title: g.title, classId: g.classId, subjectId: g.subjectId, time: g.settings.time, duration: g.settings.duration }); },
        reset: async el => { if (!await confirmBox(`Ulang ujian untuk <b>${esc(el.dataset.n)}</b>? Jawaban, nilai, dan catatan pelanggarannya dihapus sehingga ia bisa mengerjakan dari awal.`, 'Ulang Ujian')) return; try { await S.api('games/' + id + '/reset', { body: { playerId: +el.dataset.id } }); out.load(); } catch (e) { toast(e.message, 'bad'); } },
        review: el => examReviewModal(out, +el.dataset.id)
      }
    };
    return out;
  }

  function renderHost(d) {
    const g = d.game, ps = d.players, total = d.questions.length, box = $('#host');
    if (!box) return;
    if (g.settings.mode === 'exam') return renderExamHost(d, box);
    setTitle('🎮 ' + esc(g.title), `${total} soal · ${g.settings.time} detik/soal${g.classId && S.cls(g.classId) ? ' · Kelas ' + esc(S.cls(g.classId).name) : ' · nama bebas'}`);
    const link = playLink(g.code);
    const top = `<div class="btns no-print" style="margin-bottom:12px"><a class="btn ghost sm" href="#/kuis">← Semua Kuis</a><button class="btn ghost sm" data-act="fs">⛶ Layar Penuh</button><button class="btn ghost sm" data-act="music">${window.Music && Music.current() ? '🎵 Musik: ' + esc((Music.TRACKS.find(x => x.id === Music.current()) || {}).name || '') : '🎵 Musik'}</button><span class="pill ${GAME_STATUS[g.status][0]}">${GAME_STATUS[g.status][1]}</span></div>`;
    const finished = ps.filter(p => p.finished).length;
    const acc = p => p.answered ? Math.round(p.correct / p.answered * 100) : 0;
    if (g.status === 'lobby') {
      box.innerHTML = top + `<div class="card host-join">
        <div><div class="small muted">Buka di HP: <b>${esc(location.host + location.pathname.replace(/[^/]*$/, ''))}kuis.html</b> lalu masukkan kode</div>
          <div class="host-code">${esc(g.code)}</div>
          <div class="btns" style="margin-top:12px"><button class="btn soft sm" data-act="copy">🔗 Salin Link</button><button class="btn ok sm" data-act="wa">💬 Bagikan ke WhatsApp</button></div></div>
        <div style="text-align:center"><div style="font-size:3.4rem;font-weight:900">${ps.length}</div><div class="muted">pemain bergabung</div>
          <button class="btn lg" data-act="start" ${ps.length ? '' : 'disabled'} style="margin-top:14px">▶ Mulai Kuis</button></div></div>
        <div class="card"><h3>Pemain di ruang tunggu</h3><div class="host-players">${ps.map(p => `<span class="kz-chip" title="Klik untuk mengeluarkan" style="cursor:pointer" data-act="kick" data-id="${p.id}" data-n="${esc(p.nickname)}">${esc(p.avatar || '🙂')} ${esc(p.nickname)}</span>`).join('') || '<span class="muted">Menunggu murid bergabung…</span>'}</div></div>`;
      return;
    }
    if (g.status === 'running') {
      const avg = ps.length ? Math.round(ps.reduce((a, p) => a + acc(p), 0) / ps.length) : 0;
      box.innerHTML = top + `<div class="grid g4">
          <div class="card stat"><div class="blob"><span>🔑</span></div><div class="num">${esc(g.code)}</div><div class="lbl">Kode (masih bisa bergabung)</div></div>
          <div class="card stat"><div class="blob"><span>👥</span></div><div class="num">${ps.length}</div><div class="lbl">Pemain</div></div>
          <div class="card stat"><div class="blob"><span>🏁</span></div><div class="num">${finished}/${ps.length}</div><div class="lbl">Sudah selesai</div></div>
          <div class="card stat"><div class="blob"><span>🎯</span></div><div class="num">${avg}%</div><div class="lbl">Rata-rata akurasi</div></div></div>
        <div class="card host-board" style="margin-top:18px"><div class="card-head"><h3>🏆 Papan Peringkat</h3>${finished === ps.length && ps.length ? '<span class="pill ok">Semua sudah selesai</span>' : ''}<button class="btn danger" data-act="end">■ Akhiri Kuis & Umumkan Juara</button></div>
          ${ps.map((p, i) => { const ans = Object.values(p.answers || {}); return `<div class="row-b"><span class="rk">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><span class="kz-av sm">${esc(p.avatar || '🙂')}</span><span class="nm">${esc(p.nickname)}${p.streak > 1 ? ` <span class="kz-streak">🔥${p.streak}</span>` : ''}</span>
            <div class="prog">${Array.from({ length: total }, (_, k) => `<i class="${ans[k] ? (ans[k].ok ? 'ok' : 'no') : ''}"></i>`).join('')}</div><span class="sc">${p.score.toLocaleString('id-ID')}</span><span class="acc">${acc(p)}%</span></div>`; }).join('') || '<p class="muted">Belum ada pemain.</p>'}</div>`;
      return;
    }
    // Selesai: podium & laporan
    const podium = [1, 0, 2].filter(k => ps[k]).map(k => `<div class="kz-pod p${k + 1}"><div class="kz-av lg">${esc(ps[k].avatar || '🙂')}</div><div class="kz-pod-name">${esc(ps[k].nickname)}</div><div class="kz-pod-box"><b>${k + 1}</b><small>${ps[k].score.toLocaleString('id-ID')}</small></div></div>`).join('');
    const linked = ps.filter(p => p.student_id).length;
    box.innerHTML = top + `<div class="card" style="text-align:center"><h2>🏆 Juara Kuis</h2><div class="kz-podium">${podium || '<p class="muted">Tidak ada pemain.</p>'}</div></div>
      <div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(260px,1fr);align-items:start" id="res-grid">
        <div class="card"><div class="card-head"><h3>Hasil Pemain</h3><div class="btns">${g.classId ? `<button class="btn ok sm" data-act="save" ${linked ? '' : 'disabled'}>💾 Simpan sebagai Nilai</button>` : ''}<button class="btn soft sm" data-act="xls">⬇ Excel</button><button class="btn ghost sm" data-act="again">↻ Main Lagi</button></div></div>
          <div class="table-wrap"><table id="res-table"><thead><tr><th class="num">Rank</th><th>Nama</th><th class="num">Poin</th><th class="num">Benar</th><th class="num">Nilai (0–100)</th><th class="num">Beruntun</th></tr></thead><tbody>
          ${ps.map((p, i) => `<tr><td class="num">${i + 1}</td><td>${esc(p.avatar || '')} ${esc(p.nickname)}</td><td class="num"><b>${p.score.toLocaleString('id-ID')}</b></td><td class="num">${p.correct}/${total}</td><td class="num">${Math.round(p.correct / total * 100)}</td><td class="num">🔥${p.best_streak}</td></tr>`).join('')}
          </tbody></table></div>
          ${g.classId ? '<p class="small muted">Nilai = jumlah benar ÷ jumlah soal × 100 (poin permainan tidak dipakai sebagai nilai).</p>' : '<p class="small muted">Kuis ini memakai nama bebas, jadi hasilnya tidak bisa disimpan ke daftar nilai. Pilih kelas saat membuat kuis agar bisa disimpan.</p>'}</div>
        <div class="card"><h3>Ketercapaian per Soal</h3>${d.questions.map(q => { const pc = q.n ? Math.round(q.ok / q.n * 100) : 0; return `<div class="q-acc" title="${esc(q.text)}"><b>No.${q.no}</b><div><div class="small ellipsis">${esc(q.text)}</div><div class="bar"><i style="width:${pc}%"></i></div></div><span class="pill ${pc >= 70 ? 'ok' : pc >= 40 ? 'warn' : 'bad'}">${pc}%</span></div>`; }).join('')}
          <p class="small muted">Soal dengan persentase rendah perlu dibahas ulang.</p></div></div>`;
    if (window.innerWidth < 1000) $('#res-grid').style.gridTemplateColumns = '1fr';
  }

  /* ---- Layar pengawas Mode Ujian ---- */
  const mmss = ms => { if (ms === null || ms === undefined) return '–'; const s2 = Math.ceil(ms / 1000); return String(Math.floor(s2 / 60)).padStart(2, '0') + ':' + String(s2 % 60).padStart(2, '0'); };
  function renderExamHost(d, box) {
    const g = d.game, ps = d.players, total = d.questions.length, set = g.settings;
    setTitle('📝 ' + esc(g.title), `Mode Ujian · ${total} soal · ${set.duration ? set.duration + ' menit' : 'tanpa batas waktu'}${g.classId && S.cls(g.classId) ? ' · Kelas ' + esc(S.cls(g.classId).name) : ''}`);
    const link = playLink(g.code);
    const top = `<div class="btns no-print" style="margin-bottom:12px"><a class="btn ghost sm" href="#/kuis">← Semua Kuis</a><button class="btn ghost sm" data-act="fs">⛶ Layar Penuh</button><button class="btn ghost sm" data-act="music">${window.Music && Music.current() ? '🎵 Musik: ' + esc((Music.TRACKS.find(x => x.id === Music.current()) || {}).name || '') : '🎵 Musik'}</button><span class="pill ${GAME_STATUS[g.status][0]}">${g.status === 'running' ? '● Ujian berlangsung' : g.status === 'lobby' ? 'Menunggu peserta' : 'Selesai'}</span></div>`;
    const st0 = p => p.finished ? ['ok', '✔ Selesai'] : p.started_ms ? ['pri', '✍ Mengerjakan'] : ['', 'Belum mulai'];
    const stat = (ic, num, lbl) => `<div class="card stat"><div class="blob"><span>${ic}</span></div><div class="num">${num}</div><div class="lbl">${lbl}</div></div>`;
    const done = ps.filter(p => p.finished), work = ps.filter(p => p.started_ms && !p.finished);
    const viol = ps.reduce((a, p) => a + p.violations, 0);
    const scored = done.filter(p => p.exam_score !== null);
    const avg = scored.length ? Math.round(scored.reduce((a, p) => a + p.exam_score, 0) / scored.length * 10) / 10 : null;
    const needReview = done.filter(p => p.result && p.result.needsReview).length;
    if (g.status === 'lobby') {
      box.innerHTML = top + `<div class="card host-join">
        <div><div class="small muted">Peserta membuka <b>${esc(location.host + location.pathname.replace(/[^/]*$/, ''))}kuis.html</b> lalu memasukkan kode</div>
          <div class="host-code">${esc(g.code)}</div>
          <div class="btns" style="margin-top:12px"><button class="btn soft sm" data-act="copy">🔗 Salin Link</button><button class="btn ok sm" data-act="wa">💬 Bagikan ke WhatsApp</button></div>
          <ul class="small muted" style="margin:12px 0 0;padding-left:18px"><li>Durasi: ${set.duration ? set.duration + ' menit (dihitung sejak murid menekan Mulai)' : 'tanpa batas'}</li><li>Pengawasan: ${set.maxViolations ? 'dikumpulkan otomatis setelah ' + set.maxViolations + ' kali keluar halaman' : 'keluar halaman dicatat sebagai pelanggaran'}</li><li>Nilai ${set.showResult ? 'ditampilkan' : 'tidak ditampilkan'} ke murid setelah selesai</li></ul></div>
        <div style="text-align:center"><div style="font-size:3.4rem;font-weight:900">${ps.length}</div><div class="muted">peserta siap</div>
          <button class="btn lg" data-act="start" ${ps.length ? '' : 'disabled'} style="margin-top:14px">▶ Mulai Ujian</button></div></div>
        <div class="card"><h3>Peserta</h3><div class="host-players">${ps.map(p => `<span class="kz-chip" title="Klik untuk mengeluarkan" style="cursor:pointer" data-act="kick" data-id="${p.id}" data-n="${esc(p.nickname)}">${esc(p.avatar || '🙂')} ${esc(p.nickname)}</span>`).join('') || '<span class="muted">Menunggu peserta bergabung…</span>'}</div></div>`;
      return;
    }
    const rows = ps.map((p, i) => {
      const [c, l] = st0(p);
      const pct = Math.round((p.answeredCount || 0) / total * 100);
      return `<tr><td class="num">${i + 1}</td><td><b>${esc(p.nickname)}</b></td><td><span class="pill ${c}">${l}</span></td>
        <td style="min-width:140px"><div class="small">${p.answeredCount || 0}/${total} dijawab${p.flagCount ? ` · <span style="color:var(--warn)">${p.flagCount} ragu</span>` : ''}</div><div class="bar"><i style="width:${pct}%"></i></div></td>
        <td class="num">${p.violations ? `<span class="pill bad">⚠ ${p.violations}</span>` : '<span class="muted">0</span>'}</td>
        <td class="num">${p.finished ? '–' : mmss(p.remainingMs)}</td>
        <td class="num">${p.exam_score !== null ? `<b style="font-size:1.1rem">${fmt(p.exam_score, 1)}</b>${p.result && p.result.needsReview ? '<div class="small" style="color:var(--warn)">perlu koreksi</div>' : ''}` : '–'}</td>
        <td class="btns">${p.finished ? `<button class="btn ${p.result && p.result.needsReview ? 'soft' : 'ghost'} sm" data-act="review" data-id="${p.id}">📝 Koreksi</button>` : ''}<button class="btn ghost sm" data-act="reset" data-id="${p.id}" data-n="${esc(p.nickname)}" title="Ulang ujian">↻</button></td></tr>`;
    }).join('');
    const table = `<div class="table-wrap"><table id="res-table"><thead><tr><th class="num">No</th><th>Nama</th><th>Status</th><th>Progres</th><th class="num">Pelanggaran</th><th class="num">Sisa Waktu</th><th class="num">Nilai</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="8" class="empty">Belum ada peserta.</td></tr>'}</tbody></table></div>`;
    if (g.status === 'running') {
      box.innerHTML = top + `<div class="grid g4">${stat('👥', ps.length, 'Peserta')}${stat('✍', work.length, 'Sedang mengerjakan')}${stat('✅', done.length + '/' + ps.length, 'Sudah selesai')}${stat('⚠', viol, 'Total pelanggaran')}</div>
        <div class="card" style="margin-top:18px"><div class="card-head"><h3>Pemantauan Peserta <span class="pill">kode ${esc(g.code)}</span></h3><button class="btn danger" data-act="end">■ Akhiri Ujian</button></div>${table}
        <p class="small muted">Diperbarui otomatis setiap 2 detik. Peserta yang terlambat masih bisa bergabung dengan kode yang sama. Tombol ↻ mengulang ujian seorang peserta.</p></div>`;
      return;
    }
    box.innerHTML = top + `<div class="grid g4">${stat('👥', ps.length, 'Peserta')}${stat('📊', avg === null ? '–' : fmt(avg, 1), 'Rata-rata nilai')}${stat('✅', scored.filter(p => p.exam_score >= st().settings.kktp).length + '/' + scored.length, 'Mencapai KKTP (' + st().settings.kktp + ')')}${stat('📝', needReview, 'Perlu koreksi uraian')}</div>
      <div class="grid" style="grid-template-columns:minmax(0,1.7fr) minmax(260px,1fr);align-items:start;margin-top:18px" id="res-grid">
        <div class="card" style="margin:0"><div class="card-head"><h3>Hasil Ujian</h3><div class="btns">${g.classId ? `<button class="btn ok sm" data-act="save" ${ps.some(p => p.student_id) ? '' : 'disabled'}>💾 Simpan sebagai Nilai</button>` : ''}<button class="btn soft sm" data-act="xls">⬇ Excel</button><button class="btn ghost sm" data-act="again">↻ Buat Ulang</button></div></div>${table}
          ${needReview ? '<div class="note warn" style="margin-top:10px">Ada jawaban uraian yang belum dikoreksi. Nilai sementara memakai saran skor otomatis — klik <b>📝 Koreksi</b> untuk memastikan.</div>' : ''}</div>
        <div class="card" style="margin:0"><h3>Ketercapaian per Soal</h3>${d.questions.map(q => { const pc = q.n ? Math.round(q.ok / q.n * 100) : 0; return `<div class="q-acc" title="${esc(q.text)}"><b>No.${q.no}</b><div><div class="small ellipsis">${esc(q.text)}</div><div class="bar"><i style="width:${pc}%"></i></div></div><span class="pill ${isManual(q.type) || q.type === 'slide' || q.type === 'polling' ? '' : pc >= 70 ? 'ok' : pc >= 40 ? 'warn' : 'bad'}">${isManual(q.type) || q.type === 'slide' || q.type === 'polling' ? TYPE_LABEL[q.type].toLowerCase() : pc + '%'}</span></div>`; }).join('')}</div></div>`;
    if (window.innerWidth < 1000) $('#res-grid').style.gridTemplateColumns = '1fr';
  }

  function examReviewModal(out, pid) {
    const d = out.data, p = d.players.find(x => x.id === pid);
    if (!p || !p.result) return toast('Peserta ini belum mengumpulkan.', 'bad');
    const det = {}; p.result.detail.forEach(x => { det[x.id] = x; });
    const manual = Object.assign({}, p.manual || {});
    const ansOf = q => { const v = p.answers[q.id]; return v && typeof v === 'object' ? v.a : v; };
    const m = modal(`<h2>Koreksi — ${esc(p.nickname)}</h2>
      <div class="btns" style="margin-bottom:12px"><span class="score-big" style="font-size:2.4rem" id="rv-score">${fmt(p.exam_score, 1)}</span><span class="muted">${p.violations ? `⚠ ${p.violations} pelanggaran · ` : ''}poin ${fmt(p.result.earned)} / ${fmt(p.result.total)}</span></div>
      ${d.questions.map(q => {
        const x = det[q.id] || { got: 0, pts: q.points, status: 'kosong' }; const a = ansOf(q);
        const pill = x.status === 'benar' || x.status === 'dikoreksi' ? 'ok' : x.status === 'perlu koreksi' || x.status === 'sebagian' ? 'warn' : 'bad';
        const ansHtml = reviewAnsHTML(q, a);
        if (q.type === 'slide' || q.type === 'polling') return `<div class="q-card"><div class="q-head"><span class="qn">${q.no}</span><span class="pill">${TYPE_LABEL[q.type]}</span><span class="pill">tidak dinilai</span></div><div class="q-text small">${esc(q.text)}</div>${q.type === 'polling' ? `<div class="small" style="margin-top:6px">${ansHtml}</div>` : ''}</div>`;
        return `<div class="q-card"><div class="q-head"><span class="qn">${q.no}</span><span class="pill">${TYPE_LABEL[q.type]}</span><span class="pill ${pill}">${x.status}</span>
          <span style="margin-left:auto" class="small">Skor: <input type="number" class="score" step="0.5" min="0" max="${x.pts}" data-man="${esc(q.id)}" value="${manual[q.id] !== undefined ? manual[q.id] : x.got}"> / ${x.pts}</span></div>
          <div class="q-text small">${esc(q.text)}</div><div class="small" style="margin-top:6px">${ansHtml}</div></div>`;
      }).join('')}
      <div class="foot"><button class="btn ghost" data-close>Tutup</button><button class="btn" id="rv-save">Simpan Koreksi</button></div>`, { wide: true, noFocus: true });
    loadMedia(m);
    $('#rv-save', m).onclick = async () => {
      const man = {};
      $$('[data-man]', m).forEach(inp => { const q = d.questions.find(x => x.id === inp.dataset.man); const x = det[q.id]; if (isManual(q.type) || +inp.value !== (x ? x.got : 0)) man[q.id] = inp.value; });
      try { const r = await S.api('games/' + d.game.id + '/grade', { body: { playerId: pid, manual: man } }); closeModal(); toast('Koreksi tersimpan. Nilai: ' + fmt(r.score, 1)); out.load(); }
      catch (e) { toast(e.message, 'bad'); }
    };
  }

  /* Musik di layar guru (proyektor) */
  function hostMusic() {
    if (!window.Music) return;
    const cur = Music.current(), vol = +(localStorage.getItem('host-vol') || 0.5);
    const m = modal(`<h2>🎵 Musik di Layar Guru</h2><p class="small muted" style="margin-top:0">Diputar dari perangkat ini (mis. laptop yang tersambung ke proyektor/speaker kelas).</p>
      <div class="snd-list"><button class="snd-item ${!cur ? 'on' : ''}" data-t=""><span class="snd-e">🔇</span><span class="snd-n"><b>Tanpa musik</b><small>Hening</small></span></button>
      ${Music.TRACKS.map(t => `<button class="snd-item ${t.id === cur ? 'on' : ''}" data-t="${t.id}"><span class="snd-e">${t.emoji}</span><span class="snd-n"><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></span><span class="snd-k ${t.kind}">${t.kind === 'ujian' ? 'Ujian' : 'Main'}</span></button>`).join('')}</div>
      <label class="snd-vol">🔈 <input type="range" min="0" max="1" step="0.05" value="${vol}" id="hv"> 🔊</label>
      <div class="foot"><button class="btn" data-close>Selesai</button></div>`, { noFocus: true });
    $$('.snd-item', m).forEach(b => b.onclick = () => { $$('.snd-item', m).forEach(x => x.classList.toggle('on', x === b)); Music.unlock(); Music.setVolume(vol); if (b.dataset.t) Music.play(b.dataset.t); else Music.stop(); });
    $('#hv', m).oninput = e => { localStorage.setItem('host-vol', e.target.value); Music.setVolume(+e.target.value); };
    $$('[data-close]', m).forEach(b => b.addEventListener('click', () => { const g = current && current.data; if (g) renderHost(g); }));
  }

  function saveGameScores(d) {
    const s = st(); const g = d.game, graded = d.questions.filter(q => q.type !== 'slide' && q.type !== 'polling'), total = graded.length;
    const cls = S.cls(g.classId);
    if (!cls) return toast('Kelas kuis ini tidak ditemukan.', 'bad');
    const m = modal(`<h2>Simpan sebagai Nilai</h2><p class="small muted">${g.settings.mode === 'exam' ? 'Nilai tiap murid = nilai ujian (poin diperoleh ÷ total poin × 100), termasuk hasil koreksi uraian.' : 'Nilai tiap murid = jumlah benar ÷ ' + total + ' soal × 100 (jawaban benar sebagian dihitung sebagian).'} Murid yang tidak ikut dibiarkan kosong.</p>
      <label class="field"><span>Jenis asesmen</span><select id="sv-type">${['formatif', 'slm', 'diagnostik', 'sts', 'sas', 'sat'].map(k => `<option value="${k}">${T[k].name} (${T[k].short})</option>`).join('')}</select></label>
      <label class="field"><span>Mapel</span><select id="sv-subj">${s.subjects.map(x => `<option value="${x.id}" ${(g.subjectId || s.ui.subjectId) === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Judul</span><input id="sv-title" value="${esc((g.settings.mode === 'exam' ? '' : 'Kuis Seru — ') + g.title)}"></label>
      <div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn ok" id="sv-ok">Simpan Nilai</button></div>`);
    $('#sv-ok', m).onclick = () => {
      const type = $('#sv-type', m).value;
      const a = { id: S.uid('a'), type, title: $('#sv-title', m).value.trim() || g.title, classId: cls.id, subjectId: $('#sv-subj', m).value, tpIds: [], date: new Date().toISOString().slice(0, 10), periode: S.periode(), created: Date.now() };
      s.assessments.push(a);
      let n = 0;
      const isExam = g.settings.mode === 'exam';
      d.players.forEach(p => {
        if (!p.student_id || !cls.students.some(x => x.id === p.student_id)) return;
        const v = isExam ? p.exam_score : total ? Math.round(graded.reduce((t, q) => { const a = (p.answers || {})[q.id]; return t + (a ? (a.f !== undefined ? +a.f : a.ok ? 1 : 0) : 0); }, 0) / total * 100) : 0;
        if (v === null || v === undefined) return;
        S.setScore(a.id, p.student_id, Math.round(v * 100) / 100); n++;
      });
      S.save(); closeModal(); toast(n + ' nilai disimpan ke ' + T[type].name + '.');
      s.ui.classId = cls.id; s.ui.subjectId = a.subjectId;
      location.hash = '#/asesmen/' + type + '/' + a.id;
    };
  }

  /* ================= Panel Pemilik Platform ================= */
  function viewOwner(tab) {
    tab = tab || 'sekolah';
    setTitle('👑 Panel Pemilik', 'Kelola sekolah pelanggan, pembayaran, harga, dan rekening');
    renderCtx(false);
    const out = {
      html: `<div class="tabs"><button class="${tab === 'sekolah' ? 'on' : ''}" data-act="tab" data-t="sekolah">🏫 Sekolah</button><button class="${tab === 'bayar' ? 'on' : ''}" data-act="tab" data-t="bayar">💸 Pembayaran <span id="pend-badge"></span></button><button class="${tab === 'atur' ? 'on' : ''}" data-act="tab" data-t="atur">⚙️ Harga & Rekening</button></div><div id="owner" class="muted">Memuat…</div>`,
      async mount(v) {
        let d;
        try { d = await S.api('owner/overview'); } catch (e) { $('#owner', v).innerHTML = `<div class="card">${esc(e.message)}</div>`; return; }
        out.data = d;
        if (d.pending) $('#pend-badge', v).innerHTML = `<span class="pill bad">${d.pending}</span>`;
        const box = $('#owner', v);
        if (tab === 'sekolah') {
          const act = d.tenants.filter(t => t.active).length;
          box.innerHTML = `<div class="grid g4">
            <div class="card stat tilt"><div class="blob"><span>🏫</span></div><div class="z1"><div class="num">${d.tenants.length}</div><div class="lbl">Sekolah terdaftar</div></div></div>
            <div class="card stat tilt"><div class="blob"><span>✅</span></div><div class="z1"><div class="num">${act}</div><div class="lbl">Sekolah aktif</div></div></div>
            <div class="card stat tilt"><div class="blob"><span>💰</span></div><div class="z1"><div class="num" style="font-size:1.5rem">${rupiah(d.revenueMonth)}</div><div class="lbl">Pendapatan bulan ini</div></div></div>
            <div class="card stat tilt"><div class="blob"><span>📈</span></div><div class="z1"><div class="num" style="font-size:1.5rem">${rupiah(d.revenue)}</div><div class="lbl">Total pendapatan</div></div></div></div>
            <div class="card" style="margin-top:18px"><div class="card-head"><h3>Daftar Sekolah</h3><input id="t-q" placeholder="Cari sekolah / email…" style="max-width:260px"></div>
            <div class="table-wrap"><table id="t-table"><thead><tr><th>Sekolah</th><th>Kontak</th><th>Status</th><th>Aktif sampai</th><th class="num">Guru</th><th class="num">Murid</th><th class="num">Asesmen</th><th class="num">Pendapatan</th><th></th></tr></thead><tbody>
            ${d.tenants.map(t => `<tr data-q="${esc((t.name + ' ' + (t.contactEmail || '') + ' ' + (t.contactName || '')).toLowerCase())}"><td><b>${esc(t.name)}</b><div class="small muted">Daftar ${tgl(t.createdAt)}</div></td>
              <td class="small">${esc(t.contactName || '')}<br>${esc(t.contactEmail || '')}${t.contactPhone ? `<br><a target="_blank" href="https://wa.me/${esc(t.contactPhone.replace(/^0/, '62').replace(/\D/g, ''))}">${esc(t.contactPhone)}</a>` : ''}</td>
              <td><span class="sub-badge ${t.active ? t.status : 'expired'}">${subLabel(t)}</span></td><td class="small">${t.status === 'unlimited' ? '∞' : tgl(t.paidUntil)}</td>
              <td class="num">${t.users}</td><td class="num">${t.students}</td><td class="num">${t.assessments}</td><td class="num">${rupiah(t.revenue)}</td>
              <td><button class="btn soft sm" data-act="manage" data-id="${t.id}">Kelola</button></td></tr>`).join('')}
            </tbody></table></div></div>`;
          $('#t-q', box).oninput = e => { const f = e.target.value.toLowerCase(); $$('#t-table tbody tr', box).forEach(tr => { tr.style.display = !f || tr.dataset.q.includes(f) ? '' : 'none'; }); };
        } else if (tab === 'bayar') {
          const r = await S.api('owner/payments?status=' + (out.all ? 'all' : 'pending'));
          box.innerHTML = `<div class="card"><div class="card-head"><h3>${out.all ? 'Semua Pembayaran' : 'Menunggu Verifikasi'}</h3><button class="btn ghost sm" data-act="toggle-all">${out.all ? 'Tampilkan yang menunggu saja' : 'Tampilkan semua'}</button></div>
            ${r.payments.length ? r.payments.map(x => `<div class="pay-row">
              ${x.proof ? `<a href="#" data-act="proof" data-id="${x.id}"><img src="${x.proof}" alt="bukti"></a>` : '<div class="noimg">Tanpa bukti</div>'}
              <div style="flex:1;min-width:200px"><b>${esc(x.tenant_name)}</b> <span class="pill ${PAY_STATUS[x.status][0]}">${PAY_STATUS[x.status][1]}</span>
                <div>${esc(x.plan_name)} · ${x.months} bulan · <b>${rupiah(x.amount)}</b></div>
                <div class="small muted">Dikirim ${tgl(x.created_at)}${x.note ? ' · “' + esc(x.note) + '”' : ''}${x.admin_note ? ' · Catatan: ' + esc(x.admin_note) : ''}</div></div>
              ${x.status === 'pending' ? `<div class="btns"><button class="btn ok sm" data-act="approve" data-id="${x.id}">✔ Setujui</button><button class="btn danger sm" data-act="reject" data-id="${x.id}">✕ Tolak</button></div>` : ''}
            </div>`).join('') : '<p class="muted">Tidak ada pembayaran.</p>'}</div>`;
          out.payments = r.payments;
        } else {
          const p = d.platform;
          box.innerHTML = `<div class="grid g2" style="align-items:start">
            <div class="card"><h3>Identitas & Kontak</h3>
              <label class="field"><span>Nama layanan</span><input id="pf-brand" value="${esc(p.brand)}"></label>
              <label class="field"><span>Slogan di halaman utama</span><input id="pf-tag" value="${esc(p.tagline)}"></label>
              <div class="row"><label class="field"><span>Masa coba gratis (hari)</span><input type="number" id="pf-trial" min="0" value="${p.trialDays}"></label>
              <label class="field"><span>WhatsApp admin (62…)</span><input id="pf-wa" value="${esc(p.whatsapp)}" placeholder="628123456789"></label></div>
              <label class="field"><span>Email admin</span><input id="pf-email" value="${esc(p.email)}"></label>
              <label class="field"><span>Info rekening untuk transfer</span><textarea id="pf-bank" style="min-height:110px">${esc(p.bankInfo)}</textarea></label></div>
            <div class="card"><div class="card-head"><h3>Paket & Harga</h3><button class="btn soft sm" data-act="add-plan">+ Paket</button></div>
              <div id="plans">${p.plans.map(planRow).join('')}</div>
              <p class="small muted">Kode paket hanya huruf kecil/angka (mis. <span class="kbd">tahunan</span>). Harga dalam rupiah.</p></div></div>
            <div class="btns"><button class="btn lg" data-act="save-config">💾 Simpan Pengaturan</button></div>`;
        }
        bindTilt(box);
      },
      actions: {
        tab: el => { location.hash = '#/pemilik/' + el.dataset.t; },
        'toggle-all': () => { out.all = !out.all; out.mount($('#view')); },
        proof: el => { const x = out.payments.find(p => p.id === +el.dataset.id); modal(`<h2>Bukti Transfer — ${esc(x.tenant_name)}</h2><img src="${x.proof}" style="width:100%;border-radius:12px"><div class="foot"><button class="btn" data-close>Tutup</button></div>`, { wide: true, noFocus: true }); },
        approve: async el => {
          const x = out.payments.find(p => p.id === +el.dataset.id);
          if (!await confirmBox(`Setujui pembayaran <b>${rupiah(x.amount)}</b> dari <b>${esc(x.tenant_name)}</b>? Masa aktif bertambah ${x.months} bulan.`, 'Setujui')) return;
          try { await S.api('owner/payments/' + x.id, { body: { action: 'approve' } }); toast('Pembayaran disetujui, masa aktif diperpanjang.'); route(); } catch (e) { toast(e.message, 'bad'); }
        },
        reject: el => {
          const m = modal(`<h2>Tolak Pembayaran</h2><label class="field"><span>Alasan (akan terlihat oleh sekolah)</span><input id="rj" placeholder="mis. nominal tidak sesuai / bukti tidak terbaca"></label><div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn danger" id="rj-ok">Tolak</button></div>`);
          $('#rj-ok', m).onclick = async () => { try { await S.api('owner/payments/' + el.dataset.id, { body: { action: 'reject', note: $('#rj', m).value.trim() } }); closeModal(); toast('Pembayaran ditolak.'); route(); } catch (e) { toast(e.message, 'bad'); } };
        },
        manage: el => {
          const t = out.data.tenants.find(x => x.id === +el.dataset.id);
          const m = modal(`<h2>${esc(t.name)}</h2><p class="small muted" style="margin-top:0">${subLabel(t)} · aktif sampai ${t.status === 'unlimited' ? 'tanpa batas' : tgl(t.paidUntil)} · admin: ${esc(t.adminUser || '-')}</p>
            <h3>Perpanjang / atur masa aktif</h3>
            <div class="btns" style="margin-bottom:10px"><button class="btn soft sm" data-days="7">+7 hari</button><button class="btn soft sm" data-days="30">+30 hari</button><button class="btn soft sm" data-days="182">+6 bulan</button><button class="btn soft sm" data-days="365">+1 tahun</button></div>
            <div class="row"><label class="field"><span>Atur tanggal berakhir</span><input type="date" id="mt-date"></label><button class="btn ghost" id="mt-set" style="margin-bottom:12px">Atur</button><button class="btn ghost" id="mt-unl" style="margin-bottom:12px">∞ Tanpa batas</button></div>
            <h3>Lainnya</h3>
            <div class="btns"><button class="btn ${t.status === 'suspended' ? 'ok' : 'danger'} sm" id="mt-susp">${t.status === 'suspended' ? 'Aktifkan kembali' : 'Nonaktifkan sekolah'}</button>${t.adminId ? '<button class="btn ghost sm" id="mt-pw">🔑 Atur ulang password admin</button>' : ''}</div>
            <div class="foot"><button class="btn" data-close>Tutup</button></div>`, { noFocus: true });
          const upd = async body => { try { await S.api('owner/tenants/' + t.id, { method: 'PUT', body }); closeModal(); toast('Tersimpan.'); route(); } catch (e) { toast(e.message, 'bad'); } };
          $$('[data-days]', m).forEach(b => b.onclick = () => upd({ addDays: +b.dataset.days }));
          $('#mt-set', m).onclick = () => { const v = $('#mt-date', m).value; if (v) upd({ setUntil: v }); };
          $('#mt-unl', m).onclick = () => upd({ unlimited: true });
          $('#mt-susp', m).onclick = () => upd({ suspended: t.status !== 'suspended' });
          const pw = $('#mt-pw', m);
          if (pw) pw.onclick = async () => {
            const np = prompt('Password baru untuk ' + t.adminUser + ' (min. 6 karakter):'); if (!np) return;
            try { await S.api('owner/users/' + t.adminId + '/password', { method: 'PUT', body: { password: np } }); toast('Password admin diatur ulang.'); } catch (e) { toast(e.message, 'bad'); }
          };
        },
        'add-plan': () => { $('#plans').insertAdjacentHTML('beforeend', planRow({ id: '', name: '', price: 0, months: 1, desc: '' })); },
        'del-plan': el => { el.closest('.plan-row').remove(); },
        'save-config': async () => {
          const plans = $$('.plan-row').map(r => ({ id: $('[data-k=id]', r).value.trim(), name: $('[data-k=name]', r).value.trim(), price: +$('[data-k=price]', r).value || 0, months: +$('[data-k=months]', r).value || 1, desc: $('[data-k=desc]', r).value.trim() }));
          try {
            await S.api('owner/config', { method: 'PUT', body: { brand: $('#pf-brand').value, tagline: $('#pf-tag').value, trialDays: +$('#pf-trial').value, whatsapp: $('#pf-wa').value, email: $('#pf-email').value, bankInfo: $('#pf-bank').value, plans } });
            toast('Pengaturan tersimpan. Harga baru langsung tampil di halaman utama.');
          } catch (e) { toast(e.message, 'bad'); }
        }
      }
    };
    return out;
  }
  function planRow(p) {
    return `<div class="plan-row"><div class="row">
      <label class="field" style="max-width:120px"><span>Kode</span><input data-k="id" value="${esc(p.id)}" placeholder="tahunan"></label>
      <label class="field"><span>Nama paket</span><input data-k="name" value="${esc(p.name)}"></label>
      <label class="field" style="max-width:140px"><span>Harga (Rp)</span><input type="number" min="0" data-k="price" value="${p.price}"></label>
      <label class="field" style="max-width:90px"><span>Bulan</span><input type="number" min="1" data-k="months" value="${p.months}"></label>
      <button class="btn ghost sm" data-act="del-plan" style="margin-bottom:12px">🗑</button></div>
      <label class="field"><span>Keterangan singkat</span><input data-k="desc" value="${esc(p.desc || '')}"></label></div>`;
  }

  let started = false;
  function startApp() {
    if (S.mode === 'server' && !S.themeSaved && window.ThemeMode) st().theme.mode = ThemeMode.get();
    applyTheme();
    route();
    if (started) return;
    started = true;
    window.addEventListener('hashchange', route);
    if (S.mode === 'server') {
      S.onStatus(paintSync);
      // Ambil data terbaru secara berkala (mis. hasil ujian murid) tanpa mengganggu yang sedang mengetik
      const idle = () => document.visibilityState === 'visible' && !$('#modal-root').innerHTML && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) && !/bank-soal\/|ujian\//.test(location.hash);
      const tick = async () => { if (!idle()) return; try { if (await S.pull()) keepScroll(); } catch (e) { /* abaikan */ } };
      setInterval(tick, 20000);
      window.addEventListener('focus', tick);
      window.addEventListener('beforeunload', e => { if (S.pending()) { S.flush(); e.preventDefault(); e.returnValue = ''; } });
    }
  }

  $('#menu-btn').onclick = () => document.body.classList.toggle('nav-open');
  $('#nav-backdrop').onclick = () => document.body.classList.remove('nav-open');
  window.App = { toast, route };
  S.onAuthLost = () => { if (!$('#auth')) authScreen(false, 'Sesi berakhir. Silakan login kembali.'); };
  S.onLocked = () => { renderUserBox(); if (!/^#\/(langganan|akun|pemilik)/.test(location.hash)) { toast('Masa langganan sekolah berakhir — data hanya bisa dilihat. Perpanjang di menu Langganan.', 'bad'); location.hash = '#/langganan'; } };
  applyTheme(true);
  S.init().then(r => {
    if (r.needsConfig) configScreen();
    else if (r.needsSetup) authScreen(true);
    else if (r.needLogin) authScreen(location.hash === '#daftar' ? 'register' : 'login');
    else startApp();
  }).catch(e => {
    $('#view').innerHTML = `<div class="card"><h2>Tidak bisa memuat data</h2><p>${esc(e.message)}</p><p class="small muted">${S.backend === 'php' ? 'Periksa database di cPanel → MySQL® Databases. Untuk mengisi ulang pengaturan database, hapus file <b>api/config.php</b> lewat File Manager lalu muat ulang halaman ini.' : 'Periksa pengaturan database di cPanel → Setup Node.js App → Environment variables (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD), lalu Restart. Detail juga tercatat di file log-aplikasi.txt di folder aplikasi.'}</p><button class="btn" onclick="location.reload()">Coba Lagi</button></div>`;
  });
})();
