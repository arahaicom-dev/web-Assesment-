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
  const TYPE_LABEL = { pg: 'Pilihan Ganda', bs: 'Benar/Salah', isian: 'Isian Singkat', uraian: 'Uraian' };

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
  function applyTheme() {
    const t = st().theme, r = document.documentElement;
    r.style.setProperty('--h', t.h); r.style.setProperty('--s', t.s); r.style.setProperty('--depth', t.depth);
    r.dataset.mode = t.mode; r.dataset.motion = t.motion;
    let meta = $('meta[name=theme-color]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    meta.content = `hsl(${t.h} ${t.s}% 52%)`;
  }

  /* ================= Navigasi ================= */
  const NAV = [
    { group: 'Utama' },
    { href: 'beranda', ic: '🏠', label: 'Beranda' },
    { href: 'data', ic: '🗂️', label: 'Kelas, Murid & Mapel' },
    { group: 'Asesmen' },
    ...C.TYPE_ORDER.map(k => ({ href: 'asesmen/' + k, ic: T[k].icon, label: T[k].name, tag: T[k].short })),
    { group: 'Soal' },
    { href: 'bank-soal', ic: '📄', label: 'Bank Soal & Unggah PDF' },
    { group: 'Nilai Akhir' },
    { href: 'rekap', ic: '🧮', label: 'Rekap Nilai Rapor', tag: 'Total' },
    { href: 'leger', ic: '🏆', label: 'Leger Semua Mapel' },
    { group: 'Lainnya' },
    { href: 'istilah', ic: '📖', label: 'Istilah Lama → Baru' },
    { href: 'pengaturan', ic: '🎨', label: 'Pengaturan & Tema' },
    { href: 'akun', ic: '👤', label: 'Akun Guru', server: true }
  ];
  function renderNav(route) {
    $('#nav').innerHTML = NAV.filter(n => !n.server || S.mode === 'server').map(n => n.group ? `<div class="nav-group">${n.group}</div>` :
      `<a href="#/${n.href}" class="${route === n.href || route.startsWith(n.href + '/') ? 'active' : ''}"><span class="ic">${n.ic}</span><span>${n.label}</span>${n.tag ? `<span class="tag">${n.tag}</span>` : ''}</a>`).join('');
    $('#brand-sub').textContent = st().settings.schoolName || 'Penilaian & Nilai Rapor';
    renderUserBox();
  }

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
    const hash = (location.hash || '#/beranda').replace(/^#\/?/, '');
    const parts = hash.split('/');
    const r = parts[0] || 'beranda';
    renderNav(hash);
    $('#sidebar').classList.remove('open');
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
      else { location.hash = '#/beranda'; return; }
    } catch (e) {
      console.error(e);
      out = { html: `<div class="card"><h2>Terjadi kesalahan</h2><pre class="small">${esc(e.stack || e)}</pre></div>` };
    }
    current = out;
    view.innerHTML = `<div class="page">${out.html}</div>`;
    bindTilt(view);
    if (out.mount) out.mount(view);
    window.scrollTo({ top: 0 });
  }
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
            ${q ? `<a class="btn ok sm" href="#/ujian/${a.id}">▶ Kerjakan Online</a>` : ''}
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
        ${q ? `<a class="btn ok sm" href="#/ujian/${a.id}">▶ Murid Kerjakan Online (${q.questions.length} soal)</a>` : `<button class="btn soft sm" data-act="link">📄 Hubungkan Paket Soal</button>`}
        <button class="btn ghost sm" data-act="edit">⚙️ Ubah Asesmen</button></div>
      <div class="grid" style="grid-template-columns: minmax(0,1.6fr) minmax(280px,1fr); align-items:start" id="asm-grid">
        <div class="card">
          <div class="card-head"><h3>Daftar Nilai</h3>
            <div class="btns no-print">${nonKog ? '' : '<button class="btn soft sm" data-act="paste">📋 Tempel dari Excel</button><button class="btn ghost sm" data-act="fill">Isi Semua</button>'}<button class="btn soft sm" data-act="xls">⬇ Excel</button><button class="btn ghost sm" data-act="print">🖨</button></div></div>
          ${cls.students.length ? `<div class="table-wrap"><table id="score-table"><thead><tr><th class="num">No</th><th>NIS</th><th class="sticky-col">Nama Murid</th>${head}${q ? '<th>Online</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>
          <p class="small muted no-print">Nilai tersimpan otomatis. Tekan <span class="kbd">Enter</span> untuk pindah ke murid berikutnya. ${showRemed ? `Nilai remedial dibatasi maksimal KKTP (${s.settings.kktp}) — bisa diubah di Pengaturan.` : ''}</p>` : '<div class="empty">Kelas ini belum memiliki murid. <a href="#/data">Tambah murid</a>.</div>'}
        </div>
        <div>
          <div class="card tilt"><div class="z1" id="stats-box">${statsHtml()}</div></div>
          ${S.mode === 'server' && q ? examPanel(a) : ''}
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
  function examLink(a) { return location.origin + location.pathname.replace(/index\.html$/, '').replace(/\/?$/, '/') + 'ujian.html?token=' + (a.examCode || ''); }
  function examPanel(a) {
    const cls = S.cls(a.classId); const subs = st().submissions[a.id] || {};
    const done = cls.students.filter(m => subs[m.id]).length;
    const review = cls.students.filter(m => subs[m.id] && subs[m.id].result && subs[m.id].result.needsReview).length;
    return `<div class="card tilt"><div class="z1">
      <div class="card-head"><h3>📱 Ujian Online Murid</h3><span class="pill ${a.examOpen ? 'ok' : ''}">${a.examOpen ? '● Dibuka' : 'Ditutup'}</span></div>
      ${a.examCode ? `<div style="text-align:center;margin:6px 0 10px"><div class="small muted">Token ujian</div><div class="score-big" style="font-size:2.6rem;letter-spacing:.15em">${esc(a.examCode)}</div></div>
        <div class="small" style="word-break:break-all;margin-bottom:8px">Murid buka: <a href="${esc(examLink(a))}" target="_blank">${esc(examLink(a))}</a></div>` : '<p class="small muted">Buka ujian untuk membuat token. Murid mengerjakan dari HP/laptop masing-masing, cukup memasukkan token, memilih nama, dan NIS.</p>'}
      <div class="btns" style="margin-bottom:10px"><button class="btn ${a.examOpen ? 'danger' : 'ok'} sm" data-act="exam-toggle">${a.examOpen ? '■ Tutup Ujian' : '▶ Buka Ujian'}</button>
        ${a.examCode ? '<button class="btn soft sm" data-act="exam-copy">🔗 Salin Tautan</button><button class="btn ghost sm" data-act="exam-newcode">↻ Token Baru</button>' : ''}</div>
      <label style="display:flex;gap:8px;align-items:center" class="small"><input type="checkbox" data-act="exam-opt" data-k="shuffle" ${a.shuffle ? 'checked' : ''}> Acak urutan soal per murid</label>
      <label style="display:flex;gap:8px;align-items:center;margin-top:4px" class="small"><input type="checkbox" data-act="exam-opt" data-k="hideScore" ${a.hideScore ? 'checked' : ''}> Sembunyikan nilai dari murid setelah mengumpulkan</label>
      <div class="small muted" style="margin-top:10px">Sudah mengumpulkan: <b>${done}/${cls.students.length}</b>${review ? ` · <span style="color:var(--warn)">${review} perlu koreksi uraian</span>` : ''}</div>
      <div class="bar" style="margin:6px 0 10px"><i style="width:${cls.students.length ? done / cls.students.length * 100 : 0}%"></i></div>
      <button class="btn ghost sm" data-act="refresh">🔄 Muat Ulang Hasil</button>
      <p class="small muted" style="margin:8px 0 0">Murid tanpa NIS bisa masuk hanya dengan memilih nama. Isi NIS di Data Master agar lebih aman.</p></div></div>`;
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
          let ansHtml = '';
          if (qq.type === 'pg') ansHtml = `Jawaban: <b>${esc(ans || '–')}</b>${ans ? ' — ' + esc((qq.options.find(o => o.label === ans) || {}).text || '') : ''} · Kunci: <b>${esc(qq.answer || '?')}</b>`;
          else if (qq.type === 'bs') ansHtml = `Jawaban: <b>${ans === 'B' ? 'Benar' : ans === 'S' ? 'Salah' : '–'}</b> · Kunci: <b>${qq.answer === 'B' ? 'Benar' : qq.answer === 'S' ? 'Salah' : '?'}</b>`;
          else ansHtml = `<div style="white-space:pre-wrap;padding:8px;border-radius:8px;background:var(--surface-2);margin:4px 0">${esc(ans || '(kosong)')}</div><div class="small muted">Kunci/pedoman: ${esc(qq.answer || '–')}</div>`;
          return `<div class="q-card"><div class="q-head"><span class="qn">${i + 1}</span><span class="pill">${TYPE_LABEL[qq.type]}</span><span class="pill ${pill}">${d.status}</span>
            <span style="margin-left:auto" class="small">Skor: <input type="number" class="score" step="0.5" min="0" max="${d.pts}" data-man="${qq.id}" value="${d.got}"> / ${d.pts}</span></div>
            <div class="q-text small">${esc(qq.text)}</div><div class="small" style="margin-top:6px">${ansHtml}</div></div>`;
        }).join('')}
        <div class="foot"><button class="btn ghost" data-close>Tutup</button><button class="btn" id="rv-save">Simpan Koreksi</button></div>`;
    };
    const m = modal(render(), { wide: true, noFocus: true });
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
        html: `<div class="card"><h2>Siapa yang mengerjakan?</h2><p class="muted">Pilih nama murid untuk mulai. ${q.questions.length} soal${a.duration ? ` · waktu ${a.duration} menit` : ''}.</p>
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
          <p class="muted small">${['pg', 'bs', 'isian', 'uraian'].map(t => { const n = q.questions.filter(x => x.type === t).length; return n ? n + ' ' + TYPE_LABEL[t] : ''; }).filter(Boolean).join(' · ')}${a.duration ? ` · Waktu: ${a.duration} menit` : ''}</p>
          <div class="btns" style="justify-content:center"><a class="btn ghost" href="#/ujian/${a.id}">Bukan saya</a><button class="btn lg" data-act="start">Mulai Mengerjakan ▶</button></div></div></div>`,
        actions: { start: () => { ex.started = true; ex.start = Date.now(); route(); } }
      };
    }
    const qs = q.questions; const cur = qs[ex.idx];
    let timer = null;
    const optHtml = () => {
      const ans = ex.answers[cur.id];
      if (cur.type === 'pg') return cur.options.map(o => `<div class="exam-opt ${ans === o.label ? 'sel' : ''}" data-act="pick" data-v="${o.label}"><span class="lab">${o.label}</span><span>${esc(o.text)}</span></div>`).join('');
      if (cur.type === 'bs') return [['B', 'Benar'], ['S', 'Salah']].map(([v, l]) => `<div class="exam-opt ${ans === v ? 'sel' : ''}" data-act="pick" data-v="${v}"><span class="lab">${v}</span><span>${l}</span></div>`).join('');
      if (cur.type === 'isian') return `<input id="ans-in" style="width:100%;font-size:1.05rem;padding:12px" placeholder="Tulis jawaban singkat..." value="${esc(ans || '')}">`;
      return `<textarea id="ans-in" style="min-height:180px;font-size:1rem" placeholder="Tulis jawaban uraianmu di sini...">${esc(ans || '')}</textarea>`;
    };
    const answered = qs.filter(x => ex.answers[x.id] && String(ex.answers[x.id]).trim()).length;
    const submit = async (force) => {
      const left = qs.length - qs.filter(x => ex.answers[x.id] && String(ex.answers[x.id]).trim()).length;
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
          <div class="q-head" style="display:flex;gap:10px;align-items:center;margin-bottom:10px"><span class="grade">${ex.idx + 1}</span><span class="pill">${TYPE_LABEL[cur.type]}</span><span class="pill">${cur.points} poin</span><span class="muted small" style="margin-left:auto">Soal ${ex.idx + 1} dari ${qs.length}</span></div>
          ${cur.image ? `<img src="${cur.image}" alt="" style="max-width:100%;border-radius:12px;margin-bottom:10px">` : ''}
          <div class="q-text" style="font-size:1.12rem;margin-bottom:14px">${esc(cur.text)}</div>
          ${optHtml()}
          <div class="btns" style="justify-content:space-between;margin-top:16px">
            <button class="btn ghost" data-act="prev" ${ex.idx === 0 ? 'disabled' : ''}>← Sebelumnya</button>
            ${ex.idx < qs.length - 1 ? '<button class="btn" data-act="next">Berikutnya →</button>' : '<button class="btn ok" data-act="submit">✔ Kumpulkan</button>'}
          </div>
        </div>
        <div class="card"><h3>${esc(stu.name)}</h3>
          ${a.duration ? `<div class="pill warn" style="font-size:1rem;margin-bottom:10px">⏱ <span id="timer">--:--</span></div>` : ''}
          <div class="small muted" style="margin-bottom:6px">Terjawab ${answered}/${qs.length}</div><div class="bar" style="margin-bottom:12px"><i style="width:${answered / qs.length * 100}%"></i></div>
          <div class="qnav">${qs.map((x, i) => `<button class="${i === ex.idx ? 'cur' : ex.answers[x.id] && String(ex.answers[x.id]).trim() ? 'done' : ''}" data-act="go" data-i="${i}">${i + 1}</button>`).join('')}</div>
          <button class="btn ok" style="width:100%;margin-top:14px" data-act="submit">✔ Kumpulkan</button></div>
        </div>`,
      mount(v) {
        if (window.innerWidth < 860) $('#exam-grid', v).style.gridTemplateColumns = '1fr';
        const inp = $('#ans-in', v);
        if (inp) { inp.addEventListener('input', () => { ex.answers[cur.id] = inp.value; }); inp.focus(); }
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
        pick: el => { ex.answers[cur.id] = el.dataset.v; clearInterval(timer); route(); },
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
  let importDraft = null;
  function viewBank() {
    setTitle('📄 Bank Soal & Unggah PDF', 'Format soal apa pun di PDF otomatis disesuaikan ke format web');
    renderCtx(false);
    const s = st();
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
      <div class="card"><div class="card-head"><h3>Paket Soal Tersimpan</h3></div>
        ${s.questionSets.length ? `<div class="grid auto">${s.questionSets.map(q => {
          const c = t => q.questions.filter(x => x.type === t).length;
          const used = s.assessments.filter(a => a.qsetId === q.id).length;
          return `<div class="card tilt" style="margin:0"><div class="z1"><h3>${esc(q.title)}</h3>
            <p class="small muted" style="margin:0 0 8px">${q.source ? '📄 ' + esc(q.source) + ' · ' : ''}${new Date(q.created).toLocaleDateString('id-ID')}</p>
            <div class="btns" style="margin-bottom:10px"><span class="pill pri">${q.questions.length} soal</span>${c('pg') ? `<span class="pill">PG ${c('pg')}</span>` : ''}${c('bs') ? `<span class="pill">B/S ${c('bs')}</span>` : ''}${c('isian') ? `<span class="pill">Isian ${c('isian')}</span>` : ''}${c('uraian') ? `<span class="pill">Uraian ${c('uraian')}</span>` : ''}${used ? `<span class="pill ok">Dipakai ${used}×</span>` : ''}</div>
            <div class="btns"><a class="btn sm" href="#/bank-soal/${q.id}">✏️ Edit</a><button class="btn soft sm" data-act="use" data-id="${q.id}">➕ Jadikan Asesmen</button><button class="btn ghost sm" data-act="dup" data-id="${q.id}">⧉</button><button class="btn ghost sm" data-act="del" data-id="${q.id}">🗑</button></div></div></div>`;
        }).join('')}</div>` : '<div class="empty"><div class="big">📭</div>Belum ada paket soal. Unggah PDF atau tempel teks soal di atas.</div>'}
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
        dup: el => { const q = JSON.parse(JSON.stringify(S.qset(el.dataset.id))); q.id = S.uid('qs'); q.title += ' (salinan)'; q.created = Date.now(); st().questionSets.push(q); S.save(); route(); },
        del: async el => {
          const q = S.qset(el.dataset.id);
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
      let lines = ext.lines;
      if (ext.charCount < 30 * ext.pages) {
        say('🔎 PDF tampaknya hasil scan (gambar). Menjalankan OCR… (butuh internet, bisa memakan waktu)');
        lines = await ocrPdf(ext.doc, (p, n, pct) => say(`🔎 OCR halaman ${p}/${n}… ${pct}%`));
      }
      const res = P.parse(lines);
      say(`✅ Selesai: ${res.stats.total} soal dikenali.`);
      const thumbs = await renderThumbs(ext.doc, 6);
      startDraft(res, file.name.replace(/\.pdf$/i, ''), file.name, lines, thumbs);
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
    // Bekerja pada salinan agar bisa dibatalkan
    if (!src._work) src._work = JSON.parse(JSON.stringify({ title: src.title, questions: src.questions }));
    const w = src._work;
    setTitle(isDraft ? '✨ Periksa Hasil Konversi' : '✏️ Edit Paket Soal', isDraft ? 'Soal sudah disesuaikan ke format web — periksa, perbaiki bila perlu, lalu simpan' : esc(src.title));
    const total = w.questions.reduce((n, q) => n + (+q.points || 0), 0);
    const c = t => w.questions.filter(x => x.type === t).length;
    const noKey = w.questions.filter(q => (q.type === 'pg' || q.type === 'bs') && !q.answer).length;
    const qHtml = (q, i) => `
      <div class="q-card" data-qi="${i}">
        <div class="q-head"><span class="qn">${i + 1}</span>
          <select data-qf="type">${Object.keys(TYPE_LABEL).map(k => `<option value="${k}" ${q.type === k ? 'selected' : ''}>${TYPE_LABEL[k]}</option>`).join('')}</select>
          <label class="small">Poin <input type="number" min="0" step="0.5" data-qf="points" value="${+q.points || 0}" style="width:70px"></label>
          ${(q.type === 'pg' || q.type === 'bs') && !q.answer ? '<span class="pill bad">Kunci belum ada</span>' : ''}
          <span style="margin-left:auto" class="btns"><button class="btn ghost sm" data-act="img" data-i="${i}" title="Tambah gambar">🖼</button><button class="btn ghost sm" data-act="up" data-i="${i}" title="Naik">↑</button><button class="btn ghost sm" data-act="down" data-i="${i}" title="Turun">↓</button><button class="btn ghost sm" data-act="delq" data-i="${i}" title="Hapus">🗑</button></span></div>
        <textarea data-qf="text" placeholder="Teks pertanyaan">${esc(q.text)}</textarea>
        ${q.image ? `<div style="margin-top:6px"><img src="${q.image}" style="max-height:140px;border-radius:10px"> <button class="btn ghost sm" data-act="rmimg" data-i="${i}">Hapus gambar</button></div>` : ''}
        ${q.type === 'pg' ? `<div style="margin-top:8px">${q.options.map((o, j) => `<div class="opt-row"><span class="lab ${q.answer === o.label ? 'key' : ''}" data-act="key" data-i="${i}" data-l="${o.label}" title="Klik untuk jadikan kunci">${o.label}</span><input type="text" data-opt="${j}" value="${esc(o.text)}"><button class="btn ghost sm" data-act="delopt" data-i="${i}" data-j="${j}">✕</button></div>`).join('')}
          <button class="btn soft sm" data-act="addopt" data-i="${i}">+ Pilihan</button> <span class="small muted">Klik huruf untuk menandai kunci jawaban.</span></div>` : ''}
        ${q.type === 'bs' ? `<div class="btns" style="margin-top:8px"><span class="small muted">Kunci:</span><button class="btn sm ${q.answer === 'B' ? 'ok' : 'ghost'}" data-act="key" data-i="${i}" data-l="B">Benar</button><button class="btn sm ${q.answer === 'S' ? 'danger' : 'ghost'}" data-act="key" data-i="${i}" data-l="S">Salah</button></div>` : ''}
        ${q.type === 'isian' ? `<label class="field" style="margin:8px 0 0"><span>Kunci jawaban (alternatif pisahkan dengan / )</span><input data-qf="answer" value="${esc(q.answer || '')}"></label>` : ''}
        ${q.type === 'uraian' ? `<label class="field" style="margin:8px 0 0"><span>Kunci / pedoman penskoran (kata kunci dipakai untuk saran skor)</span><textarea data-qf="answer" style="min-height:50px">${esc(q.answer || '')}</textarea></label>` : ''}
      </div>`;
    return {
      html: `
      <div class="card"><div class="row">
        <label class="field" style="flex:3"><span>Judul paket soal</span><input id="qs-title" value="${esc(w.title)}"></label>
        <div class="btns" style="margin-bottom:12px"><a class="btn ghost" href="#/bank-soal" data-act="cancel">Batal</a><button class="btn soft" data-act="preview">👁 Pratinjau Murid</button><button class="btn ok" data-act="save">💾 Simpan${isDraft ? ' ke Bank Soal' : ''}</button></div></div>
        <div class="btns"><span class="pill pri">${w.questions.length} soal</span><span class="pill">PG ${c('pg')}</span><span class="pill">B/S ${c('bs')}</span><span class="pill">Isian ${c('isian')}</span><span class="pill">Uraian ${c('uraian')}</span><span class="pill">Total ${fmt(total)} poin</span>${noKey ? `<span class="pill bad">${noKey} soal tanpa kunci</span>` : '<span class="pill ok">Semua kunci lengkap</span>'}
          ${isDraft && src.stats ? `<span class="pill ok">${src.stats.keysApplied} kunci dari bagian Kunci Jawaban</span>` : ''}</div>
        ${isDraft && src.warnings && src.warnings.length ? `<div class="note warn" style="margin-top:10px"><b>Perlu diperiksa:</b><ul class="list-warn">${src.warnings.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      </div>
      <div class="grid" style="grid-template-columns: minmax(0,1fr) ${isDraft && (src.thumbs || src.raw) ? 'minmax(260px, 380px)' : ''}; align-items:start" id="ed-grid">
        <div>${w.questions.map(qHtml).join('')}
          <div class="btns"><button class="btn soft" data-act="addq" data-t="pg">+ Pilihan Ganda</button><button class="btn soft" data-act="addq" data-t="bs">+ Benar/Salah</button><button class="btn soft" data-act="addq" data-t="isian">+ Isian</button><button class="btn soft" data-act="addq" data-t="uraian">+ Uraian</button><button class="btn ghost" data-act="pts">⚖️ Atur Poin per Jenis</button></div></div>
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
          $$('[data-qf]', card).forEach(inp => inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
            const f = inp.dataset.qf;
            if (f === 'points') q.points = +inp.value || 0;
            else if (f === 'type') {
              const old = q.type; q.type = inp.value;
              if (q.type === 'pg' && q.options.length < 2) q.options = (q.options.length ? q.options : []).concat(['A', 'B', 'C', 'D'].slice(q.options.length).map(l => ({ label: l, text: '' })));
              if (q.type !== old && (old === 'pg' || old === 'bs' || q.type === 'bs')) q.answer = null;
              q.points = P.DEFAULT_POINTS[q.type];
              keepScroll();
            } else q[f] = inp.value;
          }));
          $$('[data-opt]', card).forEach(inp => inp.addEventListener('input', () => { q.options[+inp.dataset.opt].text = inp.value; }));
        });
      },
      actions: {
        side: el => { $$('.tabs button', el.parentNode).forEach(b => b.classList.toggle('on', b === el)); $('#side-pdf').classList.toggle('hidden', el.dataset.t !== 'pdf'); $('#side-raw').classList.toggle('hidden', el.dataset.t !== 'raw'); },
        cancel: () => { delete src._work; location.hash = '#/bank-soal'; },
        key: el => { const q = w.questions[+el.dataset.i]; q.answer = q.answer === el.dataset.l ? null : el.dataset.l; keepScroll(); },
        addopt: el => { const q = w.questions[+el.dataset.i]; q.options.push({ label: 'ABCDEFGH'[q.options.length] || '?', text: '' }); keepScroll(); },
        delopt: el => { const q = w.questions[+el.dataset.i]; const rem = q.options.splice(+el.dataset.j, 1)[0]; q.options.forEach((o, k) => { const old = o.label; o.label = 'ABCDEFGH'[k]; if (q.answer === old) q.answer = o.label; }); if (rem && q.answer === rem.label) q.answer = null; keepScroll(); },
        delq: el => { w.questions.splice(+el.dataset.i, 1); keepScroll(); },
        up: el => { const i = +el.dataset.i; if (i > 0) { const t = w.questions[i]; w.questions[i] = w.questions[i - 1]; w.questions[i - 1] = t; keepScroll(); } },
        down: el => { const i = +el.dataset.i; if (i < w.questions.length - 1) { const t = w.questions[i]; w.questions[i] = w.questions[i + 1]; w.questions[i + 1] = t; keepScroll(); } },
        addq: el => { const t = el.dataset.t; w.questions.push({ id: S.uid('q'), num: w.questions.length + 1, type: t, text: '', options: t === 'pg' ? ['A', 'B', 'C', 'D'].map(l => ({ label: l, text: '' })) : [], answer: null, points: P.DEFAULT_POINTS[t] }); route(); setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 30); },
        img: async el => {
          const f = await pickFile('image/*'); if (!f) return;
          const url = await resizeImage(f, 900); w.questions[+el.dataset.i].image = url; keepScroll();
        },
        rmimg: el => { delete w.questions[+el.dataset.i].image; keepScroll(); },
        pts: () => {
          const m = modal(`<h2>Atur Poin per Jenis Soal</h2><div class="row">${Object.keys(TYPE_LABEL).map(k => `<label class="field"><span>${TYPE_LABEL[k]}</span><input type="number" min="0" step="0.5" id="p-${k}" value="${(w.questions.find(q => q.type === k) || {}).points || P.DEFAULT_POINTS[k]}"></label>`).join('')}</div>
            <p class="small muted">Nilai akhir = (poin diperoleh ÷ total poin) × 100.</p><div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="p-ok">Terapkan</button></div>`);
          $('#p-ok', m).onclick = () => { w.questions.forEach(q => { q.points = +$('#p-' + q.type, m).value || 0; }); closeModal(); keepScroll(); };
        },
        preview: () => {
          modal(`<h2>Pratinjau: ${esc(w.title)}</h2>${w.questions.map((q, i) => `<div class="q-card"><div class="q-head"><span class="qn">${i + 1}</span><span class="pill">${TYPE_LABEL[q.type]}</span></div>
            ${q.image ? `<img src="${q.image}" style="max-width:100%;border-radius:10px">` : ''}<div class="q-text">${esc(q.text)}</div>
            ${q.type === 'pg' ? q.options.map(o => `<div class="exam-opt ${o.label === q.answer ? 'right' : ''}"><span class="lab">${o.label}</span><span>${esc(o.text)}</span></div>`).join('') : ''}
            ${q.type === 'bs' ? `<div class="exam-opt ${q.answer === 'B' ? 'right' : ''}"><span class="lab">B</span>Benar</div><div class="exam-opt ${q.answer === 'S' ? 'right' : ''}"><span class="lab">S</span>Salah</div>` : ''}
            ${q.type === 'isian' || q.type === 'uraian' ? `<div class="small muted">Kunci: ${esc(q.answer || '–')}</div>` : ''}</div>`).join('')}
            <div class="foot"><button class="btn" data-close>Tutup</button></div>`, { wide: true, noFocus: true });
        },
        save: () => {
          const title = ($('#qs-title').value || '').trim() || 'Paket Soal';
          const questions = w.questions.map((q, i) => Object.assign({}, q, { num: i + 1 }));
          if (isDraft) {
            const obj = { id: src.id, title, source: src.source, questions, created: Date.now() };
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
            <label class="field"><span>Mode</span><select id="th-mode"><option value="light" ${t.mode === 'light' ? 'selected' : ''}>☀️ Terang</option><option value="dark" ${t.mode === 'dark' ? 'selected' : ''}>🌙 Gelap</option></select></label>
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
        preset: el => { const p = S.PRESETS.find(x => x.id === el.dataset.id); Object.assign(t, { preset: p.id, h: p.h, s: p.s }); applyTheme(); S.save(); keepScroll(); },
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
      <div style="min-width:0;flex:1"><b class="ellipsis">${esc(S.user.name)}</b><div class="small muted"><span id="sync-dot" class="sync-dot"></span><span id="sync-txt"></span></div></div>
      <button class="btn ghost sm" id="btn-logout" title="Keluar">⎋</button>`;
    $('#btn-logout', box).onclick = () => S.logout();
    paintSync(S.syncStatus());
  }
  function paintSync(stt) {
    const d = $('#sync-dot'), t = $('#sync-txt'); if (!d) return;
    d.className = 'sync-dot ' + stt;
    t.textContent = stt === 'saving' ? 'Menyimpan…' : stt === 'error' ? 'Gagal tersimpan' : 'Tersimpan di server';
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

  /* Layar login / pemasangan pertama */
  function authScreen(needsSetup, msg) {
    document.body.classList.add('auth-mode');
    let el = $('#auth');
    if (!el) { el = document.createElement('div'); el.id = 'auth'; el.className = 'auth'; document.body.appendChild(el); }
    el.innerHTML = `<div class="card auth-card tilt"><div class="z1">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px"><div class="logo-wrap"><div class="logo-cube"><span>A</span><span>M</span><span>A</span><span>M</span><span></span><span></span></div></div>
      <div><h2 style="margin:0">Asesmen Merdeka</h2><div class="small muted">${needsSetup ? 'Pemasangan pertama — buat akun admin' : 'Masuk sebagai guru'}</div></div></div>
      ${msg ? `<div class="note warn" style="margin-bottom:12px">${esc(msg)}</div>` : ''}
      <form id="auth-form">
        ${needsSetup ? '<label class="field"><span>Nama sekolah</span><input id="au-school" required placeholder="SMP Negeri 1 ..."></label><label class="field"><span>Nama Anda</span><input id="au-name" required></label>' : ''}
        <label class="field"><span>Username</span><input id="au-user" required autocomplete="username" autocapitalize="off"></label>
        <label class="field"><span>Password${needsSetup ? ' (min. 6 karakter)' : ''}</span><input id="au-pw" type="password" required autocomplete="${needsSetup ? 'new-password' : 'current-password'}"></label>
        <button class="btn lg" style="width:100%" type="submit">${needsSetup ? 'Buat Akun & Mulai' : 'Masuk'}</button>
      </form>
      <div class="small muted" style="margin-top:14px;text-align:center">Murid? <a href="ujian.html">Masuk ke halaman ujian →</a></div>
    </div></div>`;
    bindTilt(el);
    $('#au-user', el).focus();
    $('#auth-form', el).onsubmit = async e => {
      e.preventDefault();
      const btn = $('button[type=submit]', el); btn.disabled = true;
      try {
        if (needsSetup) await S.setup({ schoolName: $('#au-school', el).value.trim(), name: $('#au-name', el).value.trim(), username: $('#au-user', el).value.trim(), password: $('#au-pw', el).value });
        else await S.login($('#au-user', el).value.trim(), $('#au-pw', el).value);
        el.remove(); document.body.classList.remove('auth-mode');
        startApp();
      } catch (err) { btn.disabled = false; toast(err.message, 'bad'); }
    };
  }

  let started = false;
  function startApp() {
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

  $('#menu-btn').onclick = () => $('#sidebar').classList.toggle('open');
  window.App = { toast, route };
  S.onAuthLost = () => { if (!$('#auth')) authScreen(false, 'Sesi berakhir. Silakan login kembali.'); };
  applyTheme();
  S.init().then(r => {
    if (r.needsSetup) authScreen(true);
    else if (r.needLogin) authScreen(false);
    else startApp();
  }).catch(e => {
    $('#view').innerHTML = `<div class="card"><h2>Tidak bisa memuat data</h2><p>${esc(e.message)}</p><p class="small muted">Periksa pengaturan database di cPanel → Setup Node.js App → Environment variables (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD), lalu Restart. Detail juga tercatat di file log-aplikasi.txt di folder aplikasi.</p><button class="btn" onclick="location.reload()">Coba Lagi</button></div>`;
  });
})();
