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
  const passageNums = (qs, q) => q.passage ? qs.map((y, k) => y.passage && y.passage.id === q.passage.id ? k + 1 : 0).filter(Boolean) : [];
  const numsText = ns => ns.length > 2 && ns[ns.length - 1] - ns[0] === ns.length - 1 ? ns[0] + '–' + ns[ns.length - 1] : ns.join(', ');
  function previewCard(x, i, all) {
    const pn = all ? passageNums(all, x) : [];
    const showPass = x.passage && (!all || pn[0] === i + 1);
    return `${showPass ? QT.passageHTML(x, { note: pn.length ? 'untuk soal no. ' + numsText(pn) : '' }) : ''}<div class="q-card"><div class="q-head"><span class="qn">${i + 1}</span><span class="pill">${QT.TYPES[x.type].icon} ${TYPE_LABEL[x.type]}</span><span class="pill">${x.points} poin</span>${x.passage && !showPass ? '<span class="pill">📖 teks di atas</span>' : ''}</div>
      ${x.image && x.type !== 'titik' && x.type !== 'label' ? `<img src="${x.image}" class="zoomable q-img" alt="gambar soal">` : ''}${x.type === 'seret' || x.type === 'dropdown' ? '' : `<div class="q-text">${QT.rich(x.text)}</div>`}
      <div class="pv-mount" data-pv="${i}"></div>
      ${x.type === 'slide' || x.type === 'polling' ? '' : `<div class="small muted pv-key" style="margin-top:6px">${isManual(x.type) ? 'Pedoman' : 'Kunci'}: <b>${esc(QT.keyText(x))}</b>${QT.hasKey(x) ? '' : ' <span class="pill bad">belum lengkap</span>'}</div>`}</div>`;
  }
  /** Galeri 17 jenis soal (tombol). act: aksi saat diklik (mk = buat paket baru, addq = tambah ke paket). */
  function typeGallery(act) {
    return `<div class="qt-picker">${QT.ORDER.map(t => `<button class="qt-pick" data-act="${act}" data-t="${t}"><span class="qt-pi">${QT.TYPES[t].icon}</span><b>${TYPE_LABEL[t]}</b><small>${QT.TYPES[t].desc}</small>${QT.TYPES[t].game ? '<i title="Bisa untuk Kuis Permainan">🎮</i>' : ''}</button>`).join('')}</div>`;
  }
  /** Mulai paket soal baru dengan satu soal berjenis t, lalu buka editor. */
  function startManual(t) {
    const q = QT.blank(t, S.uid('q')); q.num = 1;
    importDraft = { id: S.uid('qs'), title: 'Paket Soal Baru', questions: [q], created: Date.now(), source: '', warnings: [], isNew: true };
    location.hash = '#/bank-soal/draft';
  }
  /* ================= Panduan jenis soal ================= */
  let demoImg = null;
  function demoImage() {
    if (demoImg) return demoImg;
    const c = document.createElement('canvas'); c.width = 600; c.height = 400; const g = c.getContext('2d');
    g.fillStyle = '#eaf6ff'; g.fillRect(0, 0, 600, 400);
    g.fillStyle = '#7cc46b'; g.fillRect(0, 300, 600, 100);
    g.fillStyle = '#8a5a2b'; g.fillRect(285, 170, 30, 140);
    g.fillStyle = '#2e9e4f'; g.beginPath(); g.arc(300, 140, 85, 0, 7); g.fill();
    g.fillStyle = '#ffcf33'; g.beginPath(); g.arc(510, 75, 45, 0, 7); g.fill();
    g.strokeStyle = '#6b4a2b'; g.lineWidth = 6; for (const x of [270, 300, 330]) { g.beginPath(); g.moveTo(300, 305); g.lineTo(x + (x - 300) * 1.5, 360); g.stroke(); }
    return (demoImg = c.toDataURL('image/png'));
  }
  function guideExample(t) {
    const G = window.PANDUAN[t]; let q = G.contoh ? JSON.parse(JSON.stringify(G.contoh)) : null;
    if (t === 'titik') q = { type: 'titik', text: 'Ketuk gambar matahari!', image: demoImage(), spot: { x: 0.85, y: 0.19, r: 0.09, ar: 0.6667 }, points: 2 };
    if (t === 'label') q = { type: 'label', text: 'Beri label pada bagian pohon!', image: demoImage(), marks: [{ x: 0.5, y: 0.33, label: 'Daun' }, { x: 0.5, y: 0.6, label: 'Batang' }, { x: 0.5, y: 0.86, label: 'Akar' }], points: 3 };
    if (q) q.id = 'demo-' + t;
    return q;
  }
  const GRADE_TAG = t => isManual(t) ? '<span class="pill warn">✍️ Dikoreksi guru</span>' : (t === 'polling' || t === 'slide') ? '<span class="pill">Tidak dinilai</span>' : '<span class="pill ok">⚡ Dinilai otomatis</span>';
  const MODE_TAG = t => QT.TYPES[t].game ? '<span class="pill pri">🎮 Permainan & 📝 Ujian</span>' : '<span class="pill">📝 Ujian saja</span>';
  function guideHTML(t, opts) {
    opts = opts || {};
    const G = window.PANDUAN[t], T2 = QT.TYPES[t];
    return `<div class="pd-card" id="pd-${t}">
      <div class="pd-head"><span class="pd-ic">${T2.icon}</span><div><h3>${T2.label}</h3><div class="btns" style="gap:6px">${GRADE_TAG(t)}${MODE_TAG(t)}${+P.DEFAULT_POINTS[t] ? `<span class="pill">Poin bawaan ${P.DEFAULT_POINTS[t]}</span>` : ''}</div></div>
        ${opts.noMake ? '' : `<button class="btn soft sm no-print" data-act="mk" data-t="${t}" style="margin-left:auto">＋ Buat soal jenis ini</button>`}</div>
      <div class="pd-grid">
        <div>
          <h4>🎯 Kapan dipakai</h4><p>${G.kapan}</p>
          <h4>👩‍🏫 Cara membuat (guru)</h4><ol>${G.buat.map(x => `<li>${x}</li>`).join('')}</ol>
          <h4>📱 Cara murid menjawab</h4><p>${G.murid}</p>
          <h4>🧮 Penilaian</h4><p>${G.nilai}</p>
          ${G.pdf ? `<h4>📄 Bisa dari PDF / teks — contoh format</h4><pre class="pd-pre">${esc(G.pdf)}</pre>` : `<h4>📄 Dari PDF</h4><p class="muted">Jenis ini dibuat langsung di editor (tidak dikenali otomatis dari PDF). Soal hasil unggah PDF bisa diubah ke jenis ini lewat pilihan jenis soal.</p>`}
          ${G.tips && G.tips.length ? `<h4>💡 Tips</h4><ul>${G.tips.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
        </div>
        <div class="pd-demo no-print"><div class="pd-demo-h">👀 Coba sendiri (tampilan murid)</div><div class="pd-demo-body" data-demo="${t}"></div></div>
      </div></div>`;
  }
  function mountGuideDemos(root) {
    $$('[data-demo]', root).forEach(el => {
      const t = el.dataset.demo, q = guideExample(t); if (!q) return;
      let ans = '';
      el.innerHTML = `${q.image && t !== 'titik' && t !== 'label' && t !== 'gambar' ? `<img src="${q.image}" class="q-img">` : ''}${t === 'seret' || t === 'dropdown' ? '' : `<div class="q-text" style="margin-bottom:10px">${QT.rich(q.text)}</div>`}<div class="pd-mount"></div>
        ${t === 'slide' ? '' : `<div class="btns" style="margin-top:10px"><button class="btn sm pd-check">✔ Periksa jawaban</button><button class="btn ghost sm pd-reset">↺ Ulang</button></div><div class="pd-res small"></div>`}`;
      const mnt = () => { ans = ''; $('.pd-res', el) && ($('.pd-res', el).innerHTML = ''); QT.mount($('.pd-mount', el), QT.publicView(q, 'demo'), '', { onChange: v => { ans = v; } }); };
      mnt();
      const chk = $('.pd-check', el), rs = $('.pd-reset', el);
      if (rs) rs.onclick = mnt;
      if (chk) chk.onclick = () => {
        const f = P.gradeOne(q, ans), box = $('.pd-res', el);
        if (f === undefined) box.innerHTML = '<span class="pill">Tercatat — polling tidak dinilai.</span>';
        else if (f === null) box.innerHTML = P.isAnswered(q, ans) ? '<span class="pill warn">Jawaban tersimpan — jenis ini dinilai guru di halaman Koreksi.</span>' : '<span class="pill bad">Belum dijawab.</span>';
        else box.innerHTML = `<span class="pill ${f >= 1 ? 'ok' : f > 0 ? 'warn' : 'bad'}">${f >= 1 ? '🎉 Benar' : f > 0 ? 'Benar sebagian' : 'Belum tepat'} — nilai ${fmt(f * q.points)} dari ${q.points} poin</span> <span class="muted">Kunci: ${esc(QT.keyText(q))}</span>`;
      };
    });
  }
  function teksGuideHTML() {
    const X = window.PANDUAN._teks;
    return `<div class="card" id="pd-teks"><div class="pd-head"><span class="pd-ic">📖</span><div><h3>Teks bacaan untuk beberapa soal</h3><div class="small muted">mis. "Bacalah teks berikut untuk menjawab soal nomor 6–10!"</div></div></div>
      <div class="pd-grid"><div>
        <h4>📏 Aturan penulisan di PDF / teks</h4><ol>${X.aturan.map(x => `<li>${x}</li>`).join('')}</ol>
        <h4>✅ Bentuk baris petunjuk yang dikenali</h4><ul>${X.bentuk.map(x => `<li><span class="kbd">${esc(x)}</span></li>`).join('')}</ul>
        <h4>🎯 Hasilnya di web</h4><ul>${X.hasil.map(x => `<li>${x}</li>`).join('')}</ul>
      </div><div><h4>📄 Contoh</h4><pre class="pd-pre">${esc(X.contoh)}</pre></div></div></div>`;
  }
  function viewGuide(focus) {
    setTitle('📘 Panduan Jenis Soal', '17 jenis soal: kapan dipakai, cara membuat, cara murid menjawab, dan cara penilaiannya');
    renderCtx(false);
    const groups = [
      ['⚡ Dinilai otomatis', QT.ORDER.filter(t => !isManual(t) && t !== 'polling' && t !== 'slide')],
      ['✍️ Dikoreksi guru', QT.ORDER.filter(isManual)],
      ['📊 Tidak dinilai', ['polling', 'slide']]
    ];
    return {
      html: `<div class="card hero tilt no-print-bg"><div class="z1"><h2 style="margin:0 0 8px">Cara cepat memakai soal 🚀</h2>
        <ol class="pd-steps">
          <li><b>Buat soal</b> — di <a href="#/bank-soal">Bank Soal</a>, klik jenis soal di kotak "Buat Soal Langsung", <i>atau</i> unggah PDF/tempel teks soal.</li>
          <li><b>Lengkapi kunci</b> — soal yang kuncinya belum lengkap diberi tanda merah <span class="pill bad">Kunci belum lengkap</span>. Cek tampilan murid dengan <b>👁 Pratinjau Murid</b>, lalu <b>💾 Simpan</b>.</li>
          <li><b>Pakai soalnya</b> — di <a href="#/kuis">Kuis Seru</a> pilih <b>🎮 Buat Permainan</b> (poin & peringkat) atau <b>📝 Buat Ujian</b> (timer, pengawasan, semua jenis soal); atau pasang di asesmen (SLM/STS/SAS…) sebagai ujian dengan token.</li>
          <li><b>Koreksi & nilai</b> — soal otomatis langsung bernilai; uraian, gambar, dan rekaman dinilai di tombol <b>📝 Koreksi</b>. Nilai akhir = poin diperoleh ÷ total poin × 100.</li>
        </ol>
        <div class="btns no-print" style="margin-top:10px"><button class="btn ghost sm" data-act="print">🖨 Cetak / Simpan PDF</button></div></div></div>
      <div class="pd-toc"><b>📖 Lainnya</b><a class="chip" href="#/panduan-soal/teks">📖 Teks bacaan untuk beberapa soal</a><a class="chip" href="#/panduan-soal/tabel">▦ Tabel & 📋 Petunjuk soal</a></div>
      ${groups.map(([g, ts]) => `<div class="pd-toc"><b>${g}</b>${ts.map(t => `<a class="chip" href="#/panduan-soal/${t}">${QT.TYPES[t].icon} ${TYPE_LABEL[t]}</a>`).join('')}</div>`).join('')}
      <div class="card small"><b>Penilaian sebagian:</b> pada PG Kompleks, Menjodohkan, Mengurutkan, Mengelompokkan, Seret ke Kalimat, Pilihan dalam Kalimat, dan Label Gambar, murid mendapat poin sesuai bagian yang benar. Contoh: soal 4 poin, 3 dari 4 pasangan benar → 3 poin. Di Kuis Permainan, jawaban benar sebagian juga mendapat poin sebagian.</div>
      ${teksGuideHTML()}
      <div class="card" id="pd-tabel"><div class="pd-head"><span class="pd-ic">▦</span><div><h3>Tabel & Petunjuk Soal</h3><div class="small muted">tabel di soal/teks bacaan, dan halaman petunjuk sebelum ujian</div></div></div>
        <div class="pd-grid"><div>
          <h4>▦ Tabel</h4><ul>
            <li>Dari PDF/Word: tabel dikenali otomatis bila kolomnya berjarak (minimal 2 baris & 2 kolom).</li>
            <li>Tempel dari Excel (kolom dipisah Tab) juga dikenali.</li>
            <li>Ketik sendiri: satu baris tabel per baris, kolom dipisah <span class="kbd">|</span>, mis. <span class="kbd">| Kelas | Jumlah |</span>. Baris pertama menjadi judul kolom. Tombol <b>▦</b> di editor menyisipkan contoh tabel.</li>
          </ul>
          <h4>📋 Petunjuk soal</h4><ul>
            <li>Di PDF: tulis judul <span class="kbd">PETUNJUK UMUM</span> / <span class="kbd">Petunjuk Pengerjaan</span> sebelum soal pertama, lalu poin-poinnya (1., 2., … atau •). Diambil otomatis.</li>
            <li>Di editor paket soal: bagian <b>📋 Petunjuk soal</b> (kosong = petunjuk standar).</li>
            <li>Murid membaca petunjuk <b>setelah memasukkan nama/NIS</b>, mencentang "Saya sudah membaca petunjuk", lalu menekan <b>Mulai</b>. <b>Waktu ujian baru berjalan setelah Mulai ditekan.</b></li>
            <li>Cara menjawab tiap jenis soal yang ada di ujian ditambahkan otomatis.</li>
          </ul></div>
          <div><h4>📄 Contoh</h4><pre class="pd-pre">PETUNJUK UMUM
1. Berdoalah sebelum mengerjakan.
2. Tulis nama dan NIS dengan benar.
3. Periksa kembali jawabanmu.

I. PILIHAN GANDA
1. Perhatikan tabel berikut!
Kelas      Jumlah murid
VII A      32
VII B      30
Kelas dengan murid terbanyak adalah ....
A. VII A
B. VII B</pre></div></div></div>
      ${QT.ORDER.map(t => `<div class="card">${guideHTML(t)}</div>`).join('')}`,
      mount(v) {
        mountGuideDemos(v);
        if (focus && $('#pd-' + focus, v)) setTimeout(() => { const el = $('#pd-' + focus, v); el.closest('.card').scrollIntoView({ behavior: 'smooth', block: 'start' }); el.closest('.card').classList.add('pd-flash'); }, 80);
      },
      actions: { mk: el => startManual(el.dataset.t), print: () => window.print() }
    };
  }
  function guideModal(t) {
    const m = modal(`${guideHTML(t, { noMake: true })}<div class="foot"><a class="btn ghost" href="#/panduan-soal" data-close>Semua panduan</a><button class="btn" data-close>Mengerti</button></div>`, { wide: true, noFocus: true });
    mountGuideDemos(m);
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
    { href: 'kartu', ic: '🪪', label: 'Kartu Ujian' },
    { href: 'absen', ic: '📋', label: 'Absensi Ujian' },
    { href: 'panitia', ic: '🎫', label: 'Kartu Panitia', tag: 'Baru' },
    { group: 'Asesmen' },
    ...C.TYPE_ORDER.map(k => ({ href: 'asesmen/' + k, ic: T[k].icon, label: T[k].name, tag: T[k].short })),
    { group: 'Kuis Interaktif' },
    { href: 'kuis', ic: '🎮', label: 'Kuis Seru (Live)', tag: 'Baru' },
    { href: 'pantau', ic: '📡', label: 'Ujian Berjalan', server: true },
    { href: 'hasil', ic: '📊', label: 'Hasil Ujian', tag: 'Baru' },
    { group: 'Soal' },
    { href: 'perpustakaan', ic: '📚', label: 'Perpustakaan Soal', tag: 'Baru' },
    { href: 'bank-soal', ic: '⬆️', label: 'Unggah & Buat Soal' },
    { href: 'panduan-soal', ic: '📘', label: 'Panduan Jenis Soal', tag: '17' },
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
    route = String(route).replace(/\?.*$/, '');
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
      { key: 'Kuis Interaktif', ic: '🎮', lbl: 'Kuis', sheet: 'Kuis Interaktif' },
      { key: 'Soal', ic: '📚', lbl: 'Soal', sheet: 'Soal' },
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
      ${which === 'more' ? user : `<h3 class="sheet-title">${esc(which === 'Asesmen' ? 'Jenis Asesmen' : which === 'Kuis Interaktif' ? 'Kuis & Hasil' : which === 'Soal' ? 'Soal' : which)}</h3>`}
      ${list.map(g => `${which === 'more' ? `<div class="sheet-group">${esc(g.name)}</div>` : ''}<div class="sheet-list">${g.items.map(row).join('')}</div>`).join('')}
      ${which === 'more' && window.PWA && PWA.canInstall() ? '<button class="btn soft" style="width:100%;margin-top:12px" id="sheet-install">📲 Pasang aplikasi di HP</button>' : ''}
      ${which === 'more' && window.PWA && !PWA.inApp && PWA.isAndroid ? `<a class="btn soft" style="width:100%;margin-top:8px" href="${PWA.apk}" download>🤖 Unduh Aplikasi Android (APK)</a>` : ''}
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
  let current = null, lastSection = null, lastHash = null;
  /** Efek singkat saat berpindah menu (ikon menu muncul + bunyi pendek). */
  function menuIntro(r, parts) {
    const key = r === 'asesmen' && parts[1] ? 'asesmen/' + parts[1] : r;
    const prev = lastSection; lastSection = key;
    if (!prev || prev === key || !window.MenuFx) return;
    let icon, label;
    if (r === 'asesmen' && T[parts[1]]) { icon = T[parts[1]].icon; label = T[parts[1]].name; }
    else { const n = NAV.find(x => x.href === r || x.href === key); if (!n) return; icon = n.ic; label = n.label; }
    MenuFx.play(key, icon, label);
  }
  function setTitle(title, sub) { $('#page-title').innerHTML = `<h1>${title}</h1>${sub ? `<div class="muted small">${sub}</div>` : ''}`; }
  function route() {
    let hash = (location.hash || '#/beranda').replace(/^#\/?/, '');
    if (S.locked() && !/^(langganan|akun|pemilik)/.test(hash)) { hash = 'langganan'; history.replaceState(null, '', '#/langganan'); }
    const parts = hash.replace(/\?.*$/, '').split('/');
    const r = parts[0] || 'beranda';
    renderNav(hash);
    const hashChanged = hash !== lastHash; lastHash = hash;
    if (hashChanged) menuIntro(r, parts);
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
      else if (r === 'panduan-soal') out = viewGuide(parts[1]);
      else if (r === 'pengaturan') out = viewSettings();
      else if (r === 'akun' && S.mode === 'server') out = viewAccount();
      else if (r === 'langganan' && S.saas) out = viewBilling();
      else if (r === 'kuis') out = parts[1] ? viewGameHost(parts[1]) : viewGames();
      else if (r === 'pantau' && S.mode === 'server') out = viewMonitor();
      else if (r === 'kartu') out = viewCards();
      else if (r === 'absen') out = viewAbsen();
      else if (r === 'panitia') out = viewPanitia();
      else if (r === 'perpustakaan') out = viewLibrary(parts[1]);
      else if (r === 'hasil' || /^hasil\?/.test(r)) out = viewReports(parts[1], parts[2]);
      else if (r === 'pemilik' && S.saas && S.user && S.user.super) out = viewOwner(parts[1]);
      else { location.hash = '#/beranda'; return; }
    } catch (e) {
      console.error(e);
      out = { html: `<div class="card"><h2>Terjadi kesalahan</h2><pre class="small">${esc(e.stack || e)}</pre></div>` };
    }
    if (monitorPoll && !/^pantau/.test(hash)) { clearInterval(monitorPoll); monitorPoll = null; }
    if (gamePoll && !/^kuis\/\d+/.test(hash)) { clearInterval(gamePoll); gamePoll = null; document.body.classList.remove('fs-mode'); if (window.Music) Music.stop(); }
    current = out;
    const onHosting = S.mode === 'local' && /^https?:$/.test(location.protocol) && !/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname);
    let banner = onHosting ? `<div class="note warn no-print" style="margin-bottom:16px"><b>⚠️ Aplikasi berjalan dalam MODE LOKAL (server tidak terdeteksi).</b> Data hanya tersimpan di browser ini, tidak ada login, dan murid tidak bisa ujian dari HP masing-masing (tidak ada token).
      <br>Pastikan folder <b>api</b> ikut terunggah dan PHP aktif. Cek: buka <a href="api/health" target="_blank">${esc(location.host + location.pathname.replace(/[^/]*$/, ''))}api/health</a> — kalau benar, isinya memuat <span class="kbd">"mode":"server"</span>.</div>` : '';
    const sub = S.subscription;
    if (S.saas && sub && sub.active && sub.status === 'trial' && r !== 'langganan') banner += `<div class="note no-print" style="margin-bottom:16px">🎁 Masa coba gratis tersisa <b>${sub.daysLeft} hari</b>. <a href="#/langganan">Pilih paket langganan →</a></div>`;
    else if (S.saas && sub && sub.active && sub.status === 'active' && sub.daysLeft !== null && sub.daysLeft <= 7 && r !== 'langganan') banner += `<div class="note warn no-print" style="margin-bottom:16px">⏳ Langganan berakhir dalam <b>${sub.daysLeft} hari</b>. <a href="#/langganan">Perpanjang sekarang →</a></div>`;
    view.innerHTML = `<div class="page${hashChanged ? " page-enter" : ""}">${banner}${out.html}</div>`;
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
  const apkUrl = () => location.origin + location.pathname.replace(/[^/]*$/, '') + 'unduh/asesmen-merdeka.apk';
  /** Tampilkan data login akun guru agar bisa langsung dibagikan. */
  function credModal(name, user, pw, email) {
    const url = location.origin + location.pathname.replace(/[^/]*$/, '') + 'app.html';
    const txt = `Akun Asesmen Merdeka untuk ${name}\nAlamat: ${url}\nUsername: ${user}${email ? '\natau email: ' + email : ''}\nPassword: ${pw}\n\nSetelah masuk, ganti password di menu Akun Guru.`;
    const m = modal(`<h2>✅ Akun siap dipakai</h2><p class="small muted" style="margin-top:0">Berikan data ini ke <b>${esc(name)}</b>. Ketik persis sama (huruf besar/kecil berpengaruh pada password).</p>
      <div class="cred-box"><div><span>Alamat</span><b>${esc(url)}</b></div><div><span>Username</span><b>${esc(user)}</b></div>${email ? `<div><span>atau Email</span><b>${esc(email)}</b></div>` : ''}<div><span>Password</span><b>${esc(pw)}</b></div></div>
      <div class="foot"><button class="btn ghost" data-act-c="copy">📋 Salin</button><button class="btn soft" data-act-c="wa">💬 Kirim via WhatsApp</button><button class="btn" data-close>Selesai</button></div>`);
    $('[data-act-c=copy]', m).onclick = () => (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Data login disalin.')).catch(() => prompt('Salin:', txt));
    $('[data-act-c=wa]', m).onclick = () => window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
  }
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
      ${window.PWA && PWA.inApp ? '' : `<div class="card app-promo" style="margin-top:18px">
        <div class="ap-ic">📲</div>
        <div class="ap-txt"><h3>Aplikasi Asesmen Merdeka untuk HP</h3><p class="small muted">Pasang di HP Android Anda dan murid: buka langsung dari ikon, layar penuh. Bagikan tautan atau QR ini ke murid.</p>
          <div class="btns"><a class="btn ok" href="${PWA ? PWA.apk : 'unduh/asesmen-merdeka.apk'}" download>🤖 Unduh Aplikasi Android</a><button class="btn soft" data-act="apk-copy">🔗 Salin Tautan</button><button class="btn soft" data-act="apk-wa">💬 Bagikan via WhatsApp</button><button class="btn ghost" data-act="apk-ios">🍎 iPhone</button></div></div>
        <div class="ap-qr" id="apk-qr-home"></div>
      </div>`}
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
      </div>`,
      mount(v) {
        const box = $('#apk-qr-home', v);
        if (box) loadQR().then(() => { const q = window.qrcode(0, 'M'); q.addData(apkUrl()); q.make(); box.innerHTML = q.createSvgTag({ cellSize: 3, margin: 2, scalable: true }) + '<small>Pindai untuk unduh</small>'; }).catch(() => box.remove());
      },
      actions: {
        'apk-copy': () => { const u = apkUrl(); (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast('Tautan aplikasi disalin.')).catch(() => prompt('Salin tautan ini:', u)); },
        'apk-wa': () => window.open('https://wa.me/?text=' + encodeURIComponent('Pasang aplikasi Asesmen Merdeka di HP Android:\n' + apkUrl() + '\n\nSetelah terpasang, buka aplikasi lalu pilih Gabung Ujian/Kuis.'), '_blank'),
        'apk-ios': () => window.PWA && PWA.iosHelp()
      }
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
  /* ================= Impor daftar murid (Excel / CSV / tempel) ================= */
  let xlsxLoading = null;
  function loadXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!xlsxLoading) xlsxLoading = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'lib/xlsx/xlsx.full.min.js'; sc.onload = () => res(window.XLSX); sc.onerror = () => { xlsxLoading = null; rej(new Error('Gagal memuat pembaca Excel. Periksa koneksi lalu coba lagi.')); }; document.head.appendChild(sc); });
    return xlsxLoading;
  }
  /** Baca file Excel/ODS/CSV → [{ name, rows }] (angka panjang & nol di depan dipertahankan). */
  async function readSheets(file) {
    const X = await loadXLSX();
    const wb = X.read(new Uint8Array(await file.arrayBuffer()), { type: 'array', cellDates: false, cellNF: true, codepage: 65001 });
    return wb.SheetNames.map(name => {
      const ws = wb.Sheets[name]; if (!ws || !ws['!ref']) return { name, rows: [] };
      const rg = X.utils.decode_range(ws['!ref']), rows = [];
      for (let r = rg.s.r; r <= Math.min(rg.e.r, rg.s.r + 5000); r++) {
        const row = [];
        for (let c = rg.s.c; c <= Math.min(rg.e.c, rg.s.c + 60); c++) {
          const cell = ws[X.utils.encode_cell({ r, c })]; let v = '';
          if (cell) {
            if (cell.t === 'n' && Number.isInteger(cell.v) && Math.abs(cell.v) < 1e17) { v = String(cell.v); if (cell.w && /^0\d+$/.test(cell.w.trim())) v = cell.w.trim(); }
            else v = cell.w != null && cell.t !== 's' ? cell.w : (cell.v == null ? '' : String(cell.v));
          }
          row.push(v);
        }
        rows.push(row);
      }
      // sel gabungan (merge): salin nilai ke seluruh area agar header bertingkat terbaca
      (ws['!merges'] || []).forEach(m => { const v = (rows[m.s.r - rg.s.r] || [])[m.s.c - rg.s.c]; if (!v) return; for (let r = m.s.r; r <= m.e.r; r++) for (let c = m.s.c; c <= m.e.c; c++) { const rr = rows[r - rg.s.r]; if (rr && !rr[c - rg.s.c] && r === m.s.r) rr[c - rg.s.c] = v; } });
      return { name, rows };
    });
  }
  const clsKey = n => String(n || '').toUpperCase().replace(/^KELAS\s*/, '').replace(/[^A-Z0-9]/g, '');
  const colName = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  async function pickRosterFile(defaultCls) {
    const f = await pickFile('.xlsx,.xls,.xlsm,.ods,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv');
    if (!f) return;
    toast('Membaca ' + f.name + '…');
    try {
      const sheets = await readSheets(f);
      rosterModal(sheets, f.name.replace(/\.[^.]+$/, ''), defaultCls);
    } catch (e) { toast('File tidak bisa dibaca: ' + e.message, 'bad'); }
  }
  function pasteRoster(defaultCls) {
    const m = modal(`<h2>Tempel Daftar Murid</h2><p class="small muted" style="margin-top:0">Salin tabel dari Excel / Google Sheets / Word / Dapodik (boleh beserta judul kolomnya), lalu tempel di sini. Kolom nama, NIS/NISN, dan kelas dikenali otomatis. Bisa juga satu nama per baris.</p>
      <textarea id="rp-text" style="min-height:220px" placeholder="No	Nama	NISN&#10;1	Adinda Putri	0123456789&#10;2	Bagas Pratama	0123456790"></textarea>
      <div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="rp-ok">Lanjut → Periksa</button></div>`);
    $('#rp-ok', m).onclick = () => {
      const t = $('#rp-text', m).value; if (!t.trim()) return toast('Tempel daftar murid dulu.', 'bad');
      let rows = SiswaImport.textToRows(t);
      if (rows.every(r => r.length === 1)) rows = rows.map(r => [r[0].replace(/^\s*\d+\s*[.)]\s+/, '')]).map(r => { const mm = r[0].match(/^\s*(\d{4,})\s*[;,\-]?\s+(.+)$/); return mm ? [mm[1], mm[2]] : r; });
      if (rows.filter(r => r.some(c => c.trim())).length && rows.every(r => r.length <= 2) && !SiswaImport.parseSheet(rows).rows.length) rows = [['Nama']].concat(rows.map(r => [r[r.length - 1]]));
      closeModal(); rosterModal([{ name: 'Tempelan', rows }], 'Kelas Baru', defaultCls);
    };
  }
  /** Pratinjau & penyesuaian hasil baca, lalu impor. */
  function rosterModal(sheets, fileTitle, defaultCls) {
    const s = st();
    const maps = {}; // pengaturan kolom manual per sheet
    let w = SiswaImport.parseWorkbook(sheets, maps);
    if (!w.total) {
      modal(`<h2>Daftar murid tidak ditemukan</h2><div class="note warn">Kami tidak menemukan kolom nama murid di file ini.</div><p class="small">Pastikan ada kolom berisi nama murid (judul kolom seperti <b>Nama</b>, <b>Nama Siswa</b>, atau <b>Nama Peserta Didik</b> akan membantu). Sheet yang dibaca: ${sheets.map(x => esc(x.name)).join(', ')}.</p><div class="foot"><button class="btn" data-close>Tutup</button></div>`);
      return;
    }
    const oneOther = w.classes.length === 1 && (!defaultCls || clsKey(w.classes[0]) !== clsKey(defaultCls.name));
    const opt = { target: w.suggest === 'column' || oneOther ? 'column' : w.suggest === 'sheets' ? 'sheets' : defaultCls ? 'cur' : 'new', newName: w.classes.length === 1 ? w.classes[0] : fileTitle, idField: 'auto', title: null, skipDup: true, sheet: w.used[0].name };
    const allCaps = () => { const a = [].concat(...w.used.map(x => x.rows)); return a.filter(x => x.name === x.name.toUpperCase() && /[A-Z]/.test(x.name)).length >= a.length / 2; };
    if (opt.title === null) opt.title = allCaps();
    const idOf = x => opt.idField === 'nisn' ? (x.nisn || x.nis) : opt.idField === 'nis' ? (x.nis || x.nisn) : (x.nis || x.nisn);
    const hasBoth = () => w.used.some(sh => sh.map.nis !== undefined && sh.map.nisn !== undefined);
    // daftar rencana impor
    const plan = () => {
      const out = [];
      w.used.forEach(sh => sh.rows.forEach(x => {
        let cname;
        if (opt.target === 'cur') cname = defaultCls ? defaultCls.name : opt.newName;
        else if (opt.target === 'new') cname = opt.newName.trim() || 'Kelas Baru';
        else if (opt.target === 'column') cname = x.kelas || (defaultCls ? defaultCls.name : opt.newName);
        else cname = sh.name;
        out.push({ name: opt.title ? SiswaImport.titleCase(x.name) : x.name, nis: idOf(x), nisn: x.nisn || '', cname, jk: x.jk });
      }));
      const byKey = {}; s.classes.forEach(c => { byKey[clsKey(c.name)] = c; });
      out.forEach(x => {
        const c = opt.target === 'cur' && defaultCls ? defaultCls : byKey[clsKey(x.cname)];
        x.cls = c || null; x.isNewCls = !c;
        const dup = c && c.students.find(y => (x.nis && y.nis && y.nis === x.nis) || y.name.toLowerCase().replace(/\s+/g, ' ') === x.name.toLowerCase());
        x.dup = !!dup; x.dupRef = dup || null;
      });
      // duplikat di dalam file
      const seen = {}; out.forEach(x => { const k = clsKey(x.cname) + '|' + (x.nis || x.name.toLowerCase()); if (seen[k]) x.dupFile = true; seen[k] = 1; });
      return out;
    };
    const m = modal('<div id="rm"></div>', { wide: true, noFocus: true, sticky: true });
    const draw = () => {
      const p = plan(), sh = w.used.find(x => x.name === opt.sheet) || w.used[0];
      const add = p.filter(x => !(opt.skipDup && (x.dup || x.dupFile)));
      const newCls = [...new Set(add.filter(x => x.isNewCls).map(x => x.cname))];
      const width = Math.max(...(sheets.find(x => x.name === sh.name).rows.slice(0, 50).map(r => r.length)), 1);
      const colOpts = (f) => `<option value="">— tidak ada —</option>${Array.from({ length: width }, (_, i) => `<option value="${i}" ${sh.map[f] === i ? 'selected' : ''}>Kolom ${colName(i)}${sh.headers[i] ? ' · ' + esc(sh.headers[i].slice(0, 24)) : ''}</option>`).join('')}`;
      $('#rm', m).innerHTML = `<h2>📥 Impor Daftar Murid</h2>
        <div class="note ok" style="margin-bottom:10px">✅ Ditemukan <b>${w.total} murid</b>${w.used.length > 1 ? ` dari <b>${w.used.length} sheet</b>` : ''}${w.classes.length ? ` · kolom kelas: <b>${w.classes.map(esc).join(', ')}</b>` : ''}. Kolom dikenali otomatis — ubah di bawah bila ada yang tertukar.</div>
        ${[].concat(...w.used.map(x => x.warnings)).filter((x, i, a) => a.indexOf(x) === i).map(x => `<div class="note warn small" style="margin-bottom:6px">${esc(x)}</div>`).join('')}
        <div class="grid g2" style="gap:14px;align-items:start">
          <div>
            <h3 style="margin:6px 0">1. Kolom yang dibaca${w.used.length > 1 ? ` <select id="rm-sheet" style="width:auto;font-size:.85rem">${w.used.map(x => `<option ${x.name === sh.name ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : ''}</h3>
            <div class="row"><label class="field"><span>Nama murid</span><select data-col="name">${colOpts('name')}</select></label><label class="field"><span>NIS / NIPD</span><select data-col="nis">${colOpts('nis')}</select></label></div>
            <div class="row"><label class="field"><span>NISN</span><select data-col="nisn">${colOpts('nisn')}</select></label><label class="field"><span>Kelas / Rombel</span><select data-col="kelas">${colOpts('kelas')}</select></label></div>
            ${hasBoth() ? `<label class="field"><span>Nomor yang disimpan sebagai NIS/NISN (dipakai murid saat masuk ujian)</span><select id="rm-id"><option value="auto" ${opt.idField === 'auto' ? 'selected' : ''}>NIS (bila kosong pakai NISN)</option><option value="nisn" ${opt.idField === 'nisn' ? 'selected' : ''}>NISN</option></select></label>` : ''}
            <h3 style="margin:10px 0 6px">2. Masukkan ke kelas</h3>
            <div class="rm-targets">
              ${defaultCls ? `<label class="radio-row"><input type="radio" name="rm-t" value="cur" ${opt.target === 'cur' ? 'checked' : ''}> Kelas yang sedang dibuka: <b>${esc(defaultCls.name)}</b></label>` : ''}
              ${w.classes.length ? `<label class="radio-row"><input type="radio" name="rm-t" value="column" ${opt.target === 'column' ? 'checked' : ''}> Sesuai kolom <b>Kelas/Rombel</b> di file (${w.classes.length} kelas; kelas yang belum ada dibuat otomatis)</label>` : ''}
              ${w.used.length > 1 ? `<label class="radio-row"><input type="radio" name="rm-t" value="sheets" ${opt.target === 'sheets' ? 'checked' : ''}> Satu kelas per sheet (${w.used.map(x => esc(x.name)).join(', ')})</label>` : ''}
              <label class="radio-row"><input type="radio" name="rm-t" value="new" ${opt.target === 'new' ? 'checked' : ''}> Kelas baru / kelas bernama: <input id="rm-new" value="${esc(opt.newName)}" style="width:150px;padding:6px 8px"></label>
            </div>
            <label class="switch-row" style="margin-top:10px"><input type="checkbox" id="rm-title" ${opt.title ? 'checked' : ''}><span class="sw"></span><span><b>Rapikan NAMA KAPITAL</b><small>ADINDA PUTRI → Adinda Putri</small></span></label>
            <label class="switch-row" style="margin-top:8px"><input type="checkbox" id="rm-dup" ${opt.skipDup ? 'checked' : ''}><span class="sw"></span><span><b>Lewati murid yang sudah ada</b><small>Dicocokkan dengan NIS atau nama. NIS yang masih kosong akan dilengkapi.</small></span></label>
          </div>
          <div>
            <h3 style="margin:6px 0">3. Pratinjau</h3>
            <div class="table-wrap" style="max-height:340px;overflow:auto"><table><thead><tr><th class="num">No</th><th>NIS/NISN</th><th>Nama</th><th>Kelas</th><th></th></tr></thead><tbody>
              ${p.slice(0, 200).map((x, i) => `<tr style="${opt.skipDup && (x.dup || x.dupFile) ? 'opacity:.45' : ''}"><td class="num">${i + 1}</td><td>${esc(x.nis || '–')}</td><td>${esc(x.name)}</td><td>${esc(x.cname)}${x.isNewCls ? ' <span class="pill pri">baru</span>' : ''}</td><td>${x.dup ? '<span class="pill">sudah ada</span>' : x.dupFile ? '<span class="pill">ganda</span>' : ''}</td></tr>`).join('')}
            </tbody></table></div>${p.length > 200 ? `<p class="small muted">…dan ${p.length - 200} lainnya</p>` : ''}
          </div>
        </div>
        <div class="foot"><span class="small muted" style="margin-right:auto">${add.length} murid akan ditambahkan${newCls.length ? ` · ${newCls.length} kelas baru: ${newCls.map(esc).join(', ')}` : ''}</span><button class="btn ghost" data-close>Batal</button><button class="btn ok" id="rm-ok" ${add.length ? '' : 'disabled'}>📥 Impor ${add.length} Murid</button></div>`;
      $$('[data-close]', m).forEach(b => b.onclick = closeModal);
      const sel = $('#rm-sheet', m); if (sel) sel.onchange = () => { opt.sheet = sel.value; draw(); };
      $$('[data-col]', m).forEach(se => se.onchange = () => {
        const map = Object.assign({}, sh.map); if (se.value === '') delete map[se.dataset.col]; else map[se.dataset.col] = +se.value;
        if (map.name === undefined) { toast('Kolom nama wajib dipilih.', 'bad'); return draw(); }
        maps[sh.name] = { map, headerRow: sh.headerRow };
        w = SiswaImport.parseWorkbook(sheets, maps); if (!w.used.length) { delete maps[sh.name]; w = SiswaImport.parseWorkbook(sheets, maps); toast('Kolom itu tidak berisi nama.', 'bad'); }
        draw();
      });
      const idSel = $('#rm-id', m); if (idSel) idSel.onchange = () => { opt.idField = idSel.value; draw(); };
      $$('input[name=rm-t]', m).forEach(r => r.onchange = () => { opt.target = r.value; draw(); });
      $('#rm-new', m).oninput = e => { opt.newName = e.target.value; }; $('#rm-new', m).onchange = () => { if (opt.target !== 'new') opt.target = 'new'; draw(); };
      $('#rm-title', m).onchange = e => { opt.title = e.target.checked; draw(); };
      $('#rm-dup', m).onchange = e => { opt.skipDup = e.target.checked; draw(); };
      $('#rm-ok', m).onclick = () => {
        const p2 = plan(); let n = 0, filled = 0; const made = {};
        p2.forEach(x => {
          if (opt.skipDup && x.dupFile) return;
          if (opt.skipDup && x.dup) { if (x.dupRef && !x.dupRef.nis && x.nis) { x.dupRef.nis = x.nis; filled++; } if (x.dupRef && !x.dupRef.nisn && x.nisn) { x.dupRef.nisn = x.nisn; filled++; } return; }
          let c = x.cls || made[clsKey(x.cname)];
          if (!c) { c = { id: S.uid('c'), name: x.cname, fase: SiswaImport.faseOf(x.cname) || (defaultCls && defaultCls.fase) || 'D', students: [] }; s.classes.push(c); made[clsKey(x.cname)] = c; }
          c.students.push({ id: S.uid('s'), nis: x.nis || '', nisn: x.nisn || '', name: x.name }); n++;
        });
        const first = Object.values(made)[0] || (opt.target === 'cur' ? defaultCls : (p2.find(x => x.cls) || {}).cls);
        if (first) s.ui.classId = first.id;
        S.save(); closeModal(); route();
        toast(`${n} murid diimpor${Object.keys(made).length ? ', ' + Object.keys(made).length + ' kelas baru dibuat' : ''}${filled ? ', ' + filled + ' NIS dilengkapi' : ''}.`);
      };
    };
    draw();
  }

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
        <div class="card"><div class="card-head"><h3>Daftar Kelas</h3><div class="btns"><button class="btn sm" data-act="add-class">+ Kelas</button></div></div>
          <button class="btn soft sm" style="width:100%;margin-bottom:6px" data-act="xls-new" title="Buat kelas & murid sekaligus dari file Excel">📥 Impor Kelas & Murid dari Excel</button>
          ${s.classes.map(c => `<div class="btns" style="margin:6px 0"><button class="btn ${c.id === s.ui.classId ? '' : 'ghost'}" style="flex:1;justify-content:space-between" data-act="pick-class" data-id="${c.id}"><span>${esc(c.name)}</span><span class="small">${c.students.length} murid</span></button></div>`).join('') || '<p class="muted small">Belum ada kelas.</p>'}
          ${!s.classes.length ? '<button class="btn soft sm" data-act="demo">Muat data contoh</button>' : ''}
        </div>
        <div class="card">${cls ? `
          <div class="card-head"><h3>Murid ${esc(cls.name)} <span class="pill">Fase ${esc(cls.fase || '-')}</span></h3>
            <div class="btns"><button class="btn sm" data-act="add-student">+ Murid</button><button class="btn ok sm" data-act="xls-student">📥 Unggah Excel</button><button class="btn soft sm" data-act="bulk-student">📋 Tempel Daftar</button><button class="btn soft sm" data-act="photo-bulk">🖼 Foto</button><a class="btn soft sm" href="#/kartu">🪪 Kartu Ujian</a>
            <button class="btn ghost sm" data-act="edit-class">✏️ Kelas</button>${isAdminUser() ? '<button class="btn danger sm" data-act="del-class">Hapus Kelas</button>' : ''}</div></div>
          <div class="table-wrap"><table><thead><tr><th class="num">No</th><th>Foto</th><th>NIS</th><th>NISN</th><th>Nama Murid</th><th></th></tr></thead><tbody>
          ${cls.students.map((m, i) => `<tr><td class="num">${i + 1}</td><td><button class="ph-btn" data-act="photo-one" data-id="${m.id}" title="Pasang/ganti foto" ${m.photo ? `data-ph="${esc(m.photo)}"` : ''}>📷</button></td><td><input value="${esc(m.nis)}" data-f="nis" data-id="${m.id}" style="width:110px"></td><td><input value="${esc(m.nisn || '')}" data-f="nisn" data-id="${m.id}" style="width:120px" placeholder="–"></td><td><input value="${esc(m.name)}" data-f="name" data-id="${m.id}" style="width:100%"></td>
            <td><button class="btn ghost sm" data-act="del-student" data-id="${m.id}">🗑</button></td></tr>`).join('') || `<tr><td colspan="6" class="empty"><div style="padding:10px 0"><div style="font-size:34px">📥</div><b>Belum ada murid.</b><br>Klik <b>Unggah Excel</b> (format apa pun: Dapodik, daftar hadir, rekap nilai…) atau seret file Excel ke sini.<br><button class="btn ok" style="margin-top:10px" data-act="xls-student">📥 Unggah File Excel</button></div></td></tr>`}
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
            <button class="btn ghost sm" data-act="edit-subj">✏️ Mapel</button>${isAdminUser() ? '<button class="btn danger sm" data-act="del-subj">Hapus Mapel</button>' : ''}</div></div>
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
        const dg = $('#data-grid', v);
        if (dg && tab !== 'mapel') {
          dg.addEventListener('dragover', e => { e.preventDefault(); dg.classList.add('drop-on'); });
          dg.addEventListener('dragleave', e => { if (!dg.contains(e.relatedTarget)) dg.classList.remove('drop-on'); });
          dg.addEventListener('drop', async e => {
            e.preventDefault(); dg.classList.remove('drop-on');
            const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return;
            if (!/\.(xlsx|xls|xlsm|ods|csv|txt)$/i.test(f.name)) return toast('Gunakan file Excel (.xlsx/.xls), ODS, atau CSV.', 'bad');
            try { rosterModal(await readSheets(f), f.name.replace(/\.[^.]+$/, ''), S.cls(st().ui.classId)); } catch (err) { toast('File tidak bisa dibaca: ' + err.message, 'bad'); }
          });
        }
        $$('input[data-f]', v).forEach(inp => inp.addEventListener('change', () => {
          const m = cls.students.find(x => x.id === inp.dataset.id); m[inp.dataset.f] = inp.value.trim(); S.save();
        }));
        $$('input[data-tf]', v).forEach(inp => inp.addEventListener('change', () => {
          const tp = subj.tps.find(x => x.id === inp.dataset.id); tp[inp.dataset.tf] = inp.value.trim(); S.save();
        }));
        if (window.innerWidth < 860) { const g = $('#data-grid', v); if (g) g.style.gridTemplateColumns = '1fr'; }
        fillPhotos(v);
      },
      actions: {
        tab: el => { location.hash = '#/data/' + el.dataset.t; },
        'pick-class': el => { s.ui.classId = el.dataset.id; S.save(); route(); },
        'pick-subj': el => { s.ui.subjectId = el.dataset.id; S.save(); route(); },
        'add-class': () => nameModal('Kelas Baru', [{ k: 'name', label: 'Nama kelas', ph: 'mis. VII A' }, { k: 'fase', label: 'Fase', type: 'select', options: FASE, v: 'D' }], v => {
          if (!v.name) return false; const g = SiswaImport.faseOf(v.name); const c = { id: S.uid('c'), name: v.name, fase: v.fase === 'D' && g ? g : v.fase, students: [] }; s.classes.push(c); s.ui.classId = c.id;
        }),
        'edit-class': () => nameModal('Ubah Kelas', [{ k: 'name', label: 'Nama kelas', v: cls.name }, { k: 'fase', label: 'Fase', type: 'select', options: FASE, v: cls.fase }], v => { cls.name = v.name || cls.name; cls.fase = v.fase; }),
        'del-class': async () => {
          if (!await confirmBox(`Hapus kelas <b>${esc(cls.name)}</b> beserta semua asesmen dan nilainya?`, 'Hapus')) return;
          s.assessments.filter(a => a.classId === cls.id).forEach(a => S.deleteAssessment(a.id));
          s.classes = s.classes.filter(c => c !== cls); S.save(); route();
        },
        'add-student': () => nameModal('Murid Baru', [{ k: 'nis', label: 'NIS (dipakai murid saat masuk ujian)' }, { k: 'nisn', label: 'NISN' }, { k: 'name', label: 'Nama lengkap' }], v => { if (!v.name) return false; cls.students.push({ id: S.uid('s'), nis: v.nis || v.nisn || '', nisn: v.nisn || '', name: v.name }); }),
        'bulk-student': () => pasteRoster(cls),
        'photo-bulk': () => photoBulk([cls], () => route()),
        'photo-one': el => photoOne(el, cls.students.find(x => x.id === el.dataset.id), () => route()),
        'xls-student': () => pickRosterFile(cls),
        'xls-new': () => pickRosterFile(null),
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
      const obj = existing || Object.assign({ id: S.uid('a'), type, classId: cls.id, subjectId: subj.id, periode: S.periode(), created: Date.now() }, ownerStamp());
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
          <div class="btns" style="margin-bottom:10px">${ownerPill(a)}${(a.tpIds || []).map(id => `<span class="pill pri">${esc(tpName(id))}</span>`).join('')}${q ? `<span class="pill ok">📄 ${q.questions.length} soal online</span>` : ''}${isNonKog(a) ? '<span class="pill warn">Non-kognitif</span>' : ''}</div>
          ${isNonKog(a) ? `<p class="small muted">${filled}/${cls.students.length} murid terisi</p>` : `
          <div class="grid g3" style="gap:8px;margin-bottom:10px">
            <div><div class="small muted">Rata-rata</div><b style="font-size:1.3rem">${fmt(stt.avg, 1)}</b></div>
            <div><div class="small muted">Tertinggi</div><b style="font-size:1.3rem">${fmt(stt.max)}</b></div>
            <div><div class="small muted">Terendah</div><b style="font-size:1.3rem">${fmt(stt.min)}</b></div>
          </div>
          ${type === 'diagnostik' ? '' : `<div class="small muted">Ketercapaian (KKTP ${s.settings.kktp}): ${stt.tuntas}/${stt.n} murid</div><div class="bar" style="margin:6px 0 10px"><i style="width:${stt.persen || 0}%"></i></div>`}
          <div class="small muted">${filled}/${cls.students.length} nilai terisi</div>`}
          <div class="btns" style="margin-top:12px">
            <a class="btn sm" href="#/asesmen/${type}/${a.id}">${canEditAsm(a) ? '✍️ Input Nilai' : '👁 Lihat Nilai'}</a>
            ${S.mode === 'server' ? `<a class="btn ${q ? 'ok' : 'soft'} sm" href="#/asesmen/${type}/${a.id}">📱 Token Ujian${q && a.examOpen ? ' · ' + esc(a.examCode) : ''}</a>` : ''}
            ${q && S.mode !== 'server' ? `<a class="btn ok sm" href="#/ujian/${a.id}">▶ Kerjakan Online</a>` : ''}
            ${canEditAsm(a) ? `<button class="btn ghost sm" data-act="edit" data-id="${a.id}">⚙️</button>
            <button class="btn ghost sm" data-act="del" data-id="${a.id}">🗑</button>` : ''}
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
        del: async el => { const a = S.asm(el.dataset.id); if (!canEditAsm(a)) return toast('Hanya pembuat atau admin sekolah yang boleh menghapus.', 'bad'); if (!await confirmBox(`Hapus <b>${esc(a.title)}</b> beserta seluruh nilainya?`, 'Hapus')) return; S.deleteAssessment(a.id); S.save(); route(); },
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
    const can = canEditAsm(a), dis = can ? '' : ' disabled';

    const rows = cls.students.map((m, i) => {
      const o = obj(m.id), sub = subs[m.id];
      const scoreVal = C.isNum(C.toNum(o.score)) ? C.toNum(o.score) : '';
      const eff = C.toNum(raw(m.id));
      let cells;
      if (nonKog) {
        cells = `<td><select data-cat="${m.id}"${dis}><option value="">—</option>${cats.map(c => `<option ${o.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></td>
          <td><input data-note="${m.id}" value="${esc(o.note || '')}" placeholder="Catatan" style="width:100%"${dis}></td>`;
      } else {
        cells = `<td class="num"><input class="score ${scoreClass(C.toNum(o.score))}" type="number" min="0" max="100" step="any" data-score="${m.id}" value="${scoreVal}"${dis}></td>
          ${showRemed ? `<td class="num">${C.isNum(C.toNum(o.score)) && C.toNum(o.score) < s.settings.kktp ? `<input class="score" type="number" min="0" max="100" step="any" data-remed="${m.id}" value="${C.isNum(o.remedial) ? o.remedial : ''}" title="Nilai remedial"${dis}>` : '<span class="muted small">–</span>'}</td><td class="num"><b data-eff="${m.id}">${fmt(eff)}</b></td>` : ''}
          <td data-ket="${m.id}">${a.type === 'diagnostik' ? `<span class="pill">${esc(C.diagnosticGroup(eff, s.settings) || '–')}</span>` : ketPill(eff)}</td>
          ${isF ? `<td><input data-note="${m.id}" value="${esc(o.note || '')}" placeholder="Umpan balik untuk murid" style="width:100%;min-width:200px"${dis}></td>` : ''}`;
      }
      const subCell = q ? `<td class="btns" style="flex-wrap:nowrap">${sub ? `<button class="btn ${sub.result.needsReview ? 'soft' : 'ghost'} sm" data-act="review" data-id="${m.id}">${sub.result.needsReview ? '📝 Koreksi' : '👁 Jawaban'}</button>` : can ? `<a class="btn ghost sm" href="#/ujian/${a.id}/${m.id}">▶</a>` : '<span class="muted small">–</span>'}${can && S.mode === 'server' && (sub || a.examOpen) ? `<button class="btn ghost sm" data-act="tfix" data-id="${m.id}" title="Atasi masalah murid ini">🛠</button>` : ''}</td>` : '';
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
      <div class="btns no-print" style="margin-bottom:14px"><a class="btn ghost sm" href="#/asesmen/${a.type}">← Kembali ke ${info.name}</a>${ownerPill(a)}
        ${!can ? '' : q ? (S.mode === 'server' ? `<a class="btn ghost sm" href="#/ujian/${a.id}" title="Murid mengerjakan bergantian di laptop/komputer ini">💻 Kerjakan di Perangkat Ini</a>` : `<a class="btn ok sm" href="#/ujian/${a.id}">▶ Murid Kerjakan Online (${q.questions.length} soal)</a>`) : `<button class="btn soft sm" data-act="link">📄 Hubungkan Paket Soal</button>`}
        ${can ? '<button class="btn ghost sm" data-act="edit">⚙️ Ubah Asesmen</button>' : ''}</div>
      ${!can ? roNote(a) + (a.examOpen && a.examCode ? `<div class="card" style="margin-bottom:18px"><b>📱 Ujian online sedang dibuka</b> · token <span class="kbd">${esc(a.examCode)}</span></div>` : '') : S.mode === 'server' ? (q ? examPanel(a) : `<div class="card exam-share" style="margin-bottom:18px"><div class="card-head"><h3>📱 Ujian dari HP Murid — Token & Link</h3><span class="pill">Belum ada soal</span></div>
        <p style="margin:0 0 10px">Asesmen ini <b>belum terhubung ke paket soal</b>, jadi belum bisa dikerjakan murid secara online.</p>
        <ol class="small" style="margin:0 0 12px;padding-left:18px"><li>Unggah soal di menu <a href="#/bank-soal">Bank Soal & Unggah PDF</a> (lewati bila sudah).</li><li>Klik <b>Hubungkan Paket Soal</b> di bawah, pilih paket soalnya, lalu Simpan.</li><li>Tombol <b>Buka Ujian & Buat Token</b> serta <b>Salin Link / WhatsApp</b> akan muncul di sini.</li></ol>
        <button class="btn" data-act="link">📄 Hubungkan Paket Soal</button></div>`) : ''}
      <div class="grid" style="grid-template-columns: minmax(0,1.6fr) minmax(280px,1fr); align-items:start" id="asm-grid">
        <div class="card">
          <div class="card-head"><h3>Daftar Nilai</h3>
            <div class="btns no-print">${nonKog || !can ? '' : '<button class="btn soft sm" data-act="paste">📋 Tempel dari Excel</button><button class="btn ghost sm" data-act="fill">Isi Semua</button>'}<button class="btn soft sm" data-act="xls">⬇ Excel</button><button class="btn ghost sm" data-act="print">🖨</button></div></div>
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
        tfix: el => {
          const m = cls.students.find(x => x.id === el.dataset.id), sub = (st().submissions[a.id] || {})[el.dataset.id];
          fixModal({
            name: m ? m.name : '', finished: !!sub, token: true, timed: !!a.duration,
            info: sub ? 'Sudah mengumpulkan · nilai ' + fmt(sub.result.score, 1) : 'Belum mengumpulkan (mungkin sedang mengerjakan)',
            onContinue: async () => { const r = await S.api('exam-admin', { body: { assessmentId: a.id, studentId: el.dataset.id, mode: 'continue' } }); return r.kept + ' jawaban dipertahankan'; },
            onRestart: async () => { await S.api('exam-admin', { body: { assessmentId: a.id, studentId: el.dataset.id, mode: 'restart' } }); },
            done: async () => { await S.pull(true); route(); }
          });
        },
        'exam-link': () => linkClassesModal(a, keepScroll),
        'exam-toggle': () => {
          if (!a.examCode) a.examCode = newExamCode();
          const open = !a.examOpen; linkedAsm(a).forEach(x => { if (canEditAsm(x)) { x.examOpen = open; x.examCode = a.examCode; } }); S.save(); keepScroll();
          toast(a.examOpen ? 'Ujian dibuka. Bagikan token ' + a.examCode + ' ke murid.' : 'Ujian ditutup.');
        },
        'exam-opt': el => { const v = !a[el.dataset.k]; linkedAsm(a).forEach(x => { if (canEditAsm(x)) x[el.dataset.k] = v; }); S.save(); keepScroll(); },
        'exam-newcode': async () => { if (!await confirmBox('Buat token baru? Token lama tidak bisa dipakai lagi.', 'Buat Token Baru')) return; const c = newExamCode(); linkedAsm(a).forEach(x => { if (canEditAsm(x)) x.examCode = c; }); S.save(); keepScroll(); },
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
  /** Asesmen yang berbagi token yang sama (satu ujian untuk beberapa kelas). */
  const linkedAsm = a => a.linkId ? st().assessments.filter(x => x.linkId === a.linkId) : [a];
  function linkClassesModal(a, done) {
    const s = st(), group = linkedAsm(a), inGroup = cid => group.some(x => x.classId === cid);
    const m = modal(`<h2>🏫 Satu token untuk beberapa kelas</h2>
      <p class="small muted" style="margin-top:0">Murid dari kelas yang dicentang memakai token <b>${esc(a.examCode)}</b> yang sama, memilih kelas & namanya, lalu nilainya masuk ke daftar nilai kelas masing-masing (asesmen "${esc(a.title)}" dibuat otomatis untuk tiap kelas).</p>
      <div class="pz-nums">${s.classes.map(c => `<label class="pz-num" style="min-width:auto"><input type="checkbox" value="${esc(c.id)}" ${inGroup(c.id) ? 'checked' : ''} ${c.id === a.classId ? 'disabled' : ''}><span style="padding:0 12px">${esc(c.name)} <small>(${c.students.length})</small></span></label>`).join('')}</div>
      <div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="lk-ok">Simpan</button></div>`);
    $('#lk-ok', m).onclick = () => {
      const want = $$('.pz-num input:checked', m).map(x => x.value).concat([a.classId]);
      if (!a.linkId) a.linkId = S.uid('lk');
      want.forEach(cid => {
        if (linkedAsm(a).some(x => x.classId === cid)) return;
        const copy = Object.assign({}, a, { id: S.uid('a'), classId: cid, created: Date.now() }, ownerStamp());
        delete copy.tpIds; copy.tpIds = (a.tpIds || []).slice();
        s.assessments.push(copy);
      });
      linkedAsm(a).forEach(x => { if (want.indexOf(x.classId) < 0 && x.id !== a.id) { x.examOpen = false; delete x.linkId; } });
      S.save(); closeModal(); toast('Token ' + a.examCode + ' berlaku untuk ' + want.length + ' kelas.'); done();
    };
  }
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
              <li>Murid membuka link di atas — atau buka <b>${esc(location.host + location.pathname.replace(/[^/]*$/, ''))}gabung</b>, menulis nama, lalu mengetik token <b>${esc(a.examCode)}</b>.</li>
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
          ${a.examOpen ? `<div class="small" style="margin:4px 0 8px">🏫 Kelas: ${linkedAsm(a).map(x => { const c = S.cls(x.classId), sb = st().submissions[x.id] || {}; return c ? `<span class="pill ${x.id === a.id ? 'pri' : ''}">${esc(c.name)} · ${c.students.filter(m => sb[m.id]).length}/${c.students.length}</span>` : ''; }).join(' ')} <button class="btn ghost sm" data-act="exam-link">＋ Kelas lain (token sama)</button></div>` : ''}
          <div class="small muted">Sudah mengumpulkan: <b>${done}/${cls.students.length}</b>${review ? ` · <span style="color:var(--warn)">${review} perlu koreksi uraian</span>` : ''} · <a href="#" data-act="refresh">🔄 muat ulang hasil</a></div>
          <div class="bar" style="margin-top:6px"><i style="width:${cls.students.length ? done / cls.students.length * 100 : 0}%"></i></div>
        </div>
      </div></div>`;
  }

  /**
   * Atasi masalah satu murid tanpa mengulang ujian murid lain.
   * o: {name, info, finished, violations, timed, token, onContinue(addMin, clearViolations), onRestart(), onKick(), done()}
   */
  function fixModal(o) {
    const m = modal(`<h2>🛠 Atasi Masalah: ${esc(o.name)}</h2><p class="small muted" style="margin-top:0">${esc(o.info || '')}</p>
      <p class="small" style="margin-top:0">Hanya murid ini yang terpengaruh — murid lain tidak perlu mengulang.</p>
      <div class="fix-opt"><div><b>▶ Lanjutkan mengerjakan</b><small>Jawaban yang sudah ada <b>tetap tersimpan</b>. Cocok untuk: HP mati/keluar, terkunci karena pelanggaran, tidak sengaja menekan Selesai, waktu habis.${o.token ? ' Waktu dimulai lagi saat murid menekan Mulai.' : ''}</small>
        ${!o.token && o.timed ? `<label class="small">Tambah waktu <select id="fx-add">${[0, 5, 10, 15, 20, 30, 45, 60].map(x => `<option value="${x}" ${x === 10 ? 'selected' : ''}>${x ? '+' + x + ' menit' : 'tidak'}</option>`).join('')}</select></label>` : ''}
        ${!o.token && o.violations ? `<label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="fx-viol" checked> Hapus catatan ${o.violations} pelanggaran</label>` : ''}</div>
        <button class="btn ok" id="fx-cont">▶ Lanjutkan</button></div>
      <div class="fix-opt"><div><b>↻ Ulang dari awal</b><small>Semua jawaban & nilai murid ini <b>dihapus</b>, lalu ia mengerjakan dari nomor 1. Cocok bila ada kecurangan atau ujian salah dikerjakan.</small></div>
        <button class="btn danger" id="fx-rst">↻ Ulang</button></div>
      ${o.onKick ? `<div class="fix-opt"><div><b>🚫 Keluarkan</b><small>Hapus peserta ini dari daftar. Cocok bila murid salah memilih nama (nama dipakai teman) — nama itu bisa dipilih lagi oleh pemiliknya.</small></div>
        <button class="btn ghost" id="fx-kick">🚫 Keluarkan</button></div>` : ''}
      <p class="small muted">Setelah dibuka kembali, minta murid membuka lagi tautan/token yang sama${o.token ? '' : ' (layar murid juga berpindah otomatis dalam beberapa detik)'}.</p>
      <div class="foot"><button class="btn ghost" data-close>Tutup</button></div>`, { noFocus: true });
    const run = async (fn, msg, confirmMsg) => {
      if (confirmMsg && !await confirmBox(confirmMsg, 'Ya')) return;
      try { const r = await fn(); closeModal(); toast(msg + (typeof r === 'string' ? ' — ' + r : '') + '.'); await o.done(); } catch (e) { toast(e.message, 'bad'); }
    };
    $('#fx-cont', m).onclick = () => run(() => o.onContinue($('#fx-add', m) ? +$('#fx-add', m).value : 0, $('#fx-viol', m) ? $('#fx-viol', m).checked : false), 'Ujian ' + o.name + ' dibuka kembali');
    $('#fx-rst', m).onclick = () => run(o.onRestart, 'Ujian ' + o.name + ' diulang dari awal', `Hapus semua jawaban & nilai <b>${esc(o.name)}</b> lalu ulang dari awal?`);
    if (o.onKick) $('#fx-kick', m).onclick = () => run(o.onKick, o.name + ' dikeluarkan', `Keluarkan <b>${esc(o.name)}</b> dari daftar peserta?`);
  }

  /* ---- Koreksi jawaban online ---- */
  function reviewModal(a, sid, after) {
    const s = st(); const q = S.qset(a.qsetId); const sub = s.submissions[a.id] && s.submissions[a.id][sid];
    const stu = S.cls(a.classId).students.find(x => x.id === sid);
    if (!q || !sub) return;
    const canRv = canEditAsm(a);
    const manual = Object.assign({}, sub.manual || {});
    const render = () => {
      const res = P.grade(q.questions, sub.answers, manual);
      return `<h2>Jawaban ${esc(stu ? stu.name : '')}</h2>
        <div class="btns" style="margin-bottom:12px"><span class="score-big" style="font-size:2.6rem">${fmt(res.score, 1)}</span><span class="muted">${fmt(res.earned)} / ${fmt(res.total)} poin · dikumpulkan ${new Date(sub.at).toLocaleString('id-ID')}</span></div>
        ${q.questions.map((qq, i) => {
          const d = res.detail[i]; const ans = sub.answers[qq.id];
          const pill = d.status === 'benar' ? 'ok' : d.status === 'salah' || d.status === 'kosong' ? 'bad' : 'warn';
          const ansHtml = reviewAnsHTML(qq, ans);
          if (d.status === 'tidak dinilai') return `<div class="q-card"><div class="q-head"><span class="qn">${i + 1}</span><span class="pill">${TYPE_LABEL[qq.type]}</span><span class="pill">tidak dinilai</span></div><div class="q-text small">${QT.rich(qq.text)}</div>${qq.type === 'polling' ? `<div class="small" style="margin-top:6px">${ansHtml}</div>` : ''}</div>`;
          return `<div class="q-card"><div class="q-head"><span class="qn">${i + 1}</span><span class="pill">${TYPE_LABEL[qq.type]}</span><span class="pill ${pill}">${d.status}</span>
            <span style="margin-left:auto" class="small">Skor: <input type="number" class="score" step="0.5" min="0" max="${d.pts}" data-man="${qq.id}" value="${d.got}"${canRv ? '' : ' disabled'}> / ${d.pts}</span></div>
            ${QT.passageHTML(qq, { closed: true })}<div class="q-text small">${QT.rich(qq.text)}</div><div class="small" style="margin-top:6px">${ansHtml}</div></div>`;
        }).join('')}
        <div class="foot">${canRv ? '' : '<span class="small muted" style="margin-right:auto">👁 Hanya lihat — koreksi oleh pembuat asesmen atau admin.</span>'}<button class="btn ghost" data-close>Tutup</button>${canRv ? '<button class="btn" id="rv-save">Simpan Koreksi</button>' : ''}</div>`;
    };
    const m = modal(render(), { wide: true, noFocus: true });
    loadMedia(m);
    $$('[data-man]', m).forEach(inp => inp.addEventListener('change', () => { manual[inp.dataset.man] = inp.value; }));
    if (canRv) $('#rv-save', m).onclick = () => {
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
    if (!canEditAsm(a)) return { html: roNote(a) + `<a class="btn ghost" href="#/asesmen/${a.type}/${a.id}">← Kembali</a>` };
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
          <div style="text-align:left">${QT.instructionsHTML(q.instructions, q.questions.map(x => x.type))}</div>
          <label class="ins-ok"><input type="checkbox" id="ins-ok"> Saya sudah membaca petunjuk</label>
          <p class="small muted">⏱ Waktu baru mulai dihitung setelah tombol <b>Mulai</b> ditekan.</p>
          <div class="btns" style="justify-content:center"><a class="btn ghost" href="#/ujian/${a.id}">Bukan saya</a><button class="btn lg" data-act="start" id="ins-go" disabled>Mulai Mengerjakan ▶</button></div></div></div>`,
        mount(v) { const c = $('#ins-ok', v); c.onchange = () => { $('#ins-go', v).disabled = !c.checked; }; },
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
          ${QT.passageHTML(cur)}
          ${cur.image && cur.type !== 'titik' && cur.type !== 'label' && cur.type !== 'gambar' ? `<img src="${cur.image}" alt="gambar soal" class="zoomable q-img">` : ''}
          ${cur.type === 'seret' || cur.type === 'dropdown' ? '' : `<div class="q-text" style="font-size:1.12rem;margin-bottom:14px">${QT.rich(cur.text)}</div>`}
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
    setTitle('⬆️ Unggah & Buat Soal', 'Unggah PDF/teks soal atau buat langsung — hasilnya tersimpan di Perpustakaan Soal');
    renderCtx(false);
    const s = st();
    const multiUser = S.mode === 'server' && !!S.user;
    const sets = s.questionSets.filter(q => bankFilter !== 'mine' || !multiUser || q.ownerId === S.user.id);
    return {
      html: `
      <div class="card"><div class="card-head"><h3>✏️ Buat Soal Langsung — 17 Jenis Soal</h3><a class="btn soft sm" href="#/panduan-soal">📘 Panduan setiap jenis soal</a></div>
        <p class="small muted" style="margin:0 0 4px">🎮 = bisa dipakai di Kuis Permainan · semua jenis bisa dipakai di Ujian</p>
        <p class="small muted" style="margin-top:0">Klik jenis soal untuk mulai membuat paket soal baru. Di dalam editor Anda bisa menambah soal jenis lain sebanyak apa pun.</p>
        ${typeGallery('mk')}</div>
      <div class="grid g2">
        <div class="card"><h3>Unggah File Soal</h3>
          <div class="drop" id="drop"><div class="pdf3d">PDF</div><b>Klik atau seret file PDF ke sini</b><div class="small muted">Juga menerima .txt. Pilihan ganda (biasa &amp; kompleks), benar/salah, isian, menjodohkan, dan uraian dikenali otomatis.</div></div>
          <details class="small" style="margin-top:10px"><summary><b>🔑 Kunci jawaban otomatis tercentang</b> — tulis bagian <b>KUNCI JAWABAN</b> di bawah soal pada PDF</summary>
            <div class="muted" style="margin-top:6px;line-height:1.7">Semua format ini dikenali (judul boleh <i>Kunci Jawaban</i> / <i>Pedoman Penskoran</i>):<br>
            • Per nomor: <span class="kbd">1. B  2. C  3. A, D</span> (PG kompleks: <span class="kbd">A, D</span> / <span class="kbd">A dan D</span> / <span class="kbd">AD</span>)<br>
            • Tabel mendatar: baris <span class="kbd">No 1 2 3</span> lalu <span class="kbd">Kunci B C A</span> · tabel <span class="kbd">No | Kunci</span><br>
            • Benar/Salah: <span class="kbd">4. Benar</span> / <span class="kbd">4. B</span> · Menjodohkan: <span class="kbd">6. B  7. A</span><br>
            • Isian & uraian: <span class="kbd">8. Merkurius</span>, <span class="kbd">9. Air menguap lalu …</span> (boleh beberapa baris)</div></details>
          <div id="import-status" class="small" style="margin-top:10px"></div>
          <div class="note small" style="margin-top:10px">📖 <b>Ada teks bacaan untuk beberapa soal?</b> Tulis baris seperti <span class="kbd">Bacalah teks berikut untuk menjawab soal nomor 6–10!</span> sebelum teksnya. <a href="#/panduan-soal/teks">Lihat aturannya →</a></div>
        </div>
        <div class="card"><h3>…atau Tempel Teks Soal</h3>
          <textarea id="paste-src" style="min-height:170px" placeholder="1. Ibu kota Indonesia adalah ...&#10;A. Bandung&#10;B. Jakarta&#10;C. Surabaya&#10;Kunci: B&#10;&#10;2. Jelaskan pengertian fotosintesis!"></textarea>
          <div class="btns" style="margin-top:10px"><button class="btn" data-act="parse-paste">✨ Ubah ke Format Web</button><button class="btn ghost sm" data-act="blank">+ Buat Paket Kosong</button></div>
        </div>
      </div>
      <div class="card" id="lib"><div class="card-head"><h3>📚 Perpustakaan Soal <span class="pill" id="lib-n">${sets.length}</span></h3>
        <input id="lib-q" type="search" placeholder="🔎 Cari judul, mapel, isi soal, atau nama guru…" style="flex:1;min-width:220px;max-width:380px">
        <select id="lib-t" style="width:auto"><option value="">Semua jenis soal</option>${QT.ORDER.map(t => `<option value="${t}">${QT.TYPES[t].icon} ${TYPE_LABEL[t]}</option>`).join('')}</select>
        ${multiUser ? `<div class="tabs" style="margin:0"><button class="${bankFilter === 'all' ? 'on' : ''}" data-act="bf" data-f="all">Semua di sekolah</button><button class="${bankFilter === 'mine' ? 'on' : ''}" data-act="bf" data-f="mine">Milik saya</button></div>` : ''}</div>
        ${multiUser ? `<p class="small muted" style="margin-top:0">${S.user.role === 'admin' ? '👑 Anda admin sekolah: bisa mengedit semua paket soal.' : '✏️ Anda bisa mengedit paket soal milik sendiri. Paket soal guru lain bisa dilihat, dipakai, atau diduplikat.'}</p>` : ''}
        ${sets.length ? `<div class="grid auto">${sets.map(q => {
          const c = t => q.questions.filter(x => x.type === t).length;
          const used = s.assessments.filter(a => a.qsetId === q.id).length;
          const can = canEditQset(q), imgs = q.questions.filter(x => x.image).length;
          const hay = [q.title, q.ownerName, q.source, q.instructions].concat(q.questions.map(x => x.text + ' ' + (x.passage ? x.passage.title : ''))).join(' ').toLowerCase().slice(0, 20000);
          return `<div class="card tilt lib-item" style="margin:0" data-hay="${esc(hay)}" data-types="${esc(q.questions.map(x => x.type).filter((t, k, a) => a.indexOf(t) === k).join(' '))}"><div class="z1"><h3>${esc(q.title)}</h3>
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
        const lq = $('#lib-q', v), lt = $('#lib-t', v);
        const libFilter = () => {
          const words = lq.value.toLowerCase().split(/\s+/).filter(Boolean), t = lt.value; let n = 0;
          $$('.lib-item', v).forEach(c => { const ok = words.every(w => c.dataset.hay.indexOf(w) >= 0) && (!t || c.dataset.types.split(' ').indexOf(t) >= 0); c.style.display = ok ? '' : 'none'; if (ok) n++; });
          $('#lib-n', v).textContent = n;
        };
        if (lq) { lq.oninput = libFilter; lt.onchange = libFilter; }
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
        mk: el => startManual(el.dataset.t),
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
  const isAdminUser = () => S.mode !== 'server' || !S.user || S.user.role === 'admin';
  /** Boleh mengubah asesmen & nilainya? (pembuat atau admin sekolah) */
  function canEditAsm(a) {
    if (isAdminUser() || !a) return true;
    return !a.ownerId || +a.ownerId === +S.user.id;
  }
  const canGame = g => isAdminUser() || +g.createdBy === +S.user.id || +g.created_by === +S.user.id;
  const ownerPill = a => S.mode === 'server' && a.ownerName ? `<span class="pill ${canEditAsm(a) ? '' : 'warn'}" title="Pembuat">👤 ${esc(a.ownerName)}${S.user && +a.ownerId === +S.user.id ? ' (Anda)' : ''}</span>` : '';
  const roNote = a => `<div class="note warn" style="margin-bottom:14px">👁 <b>Hanya lihat.</b> Asesmen ini dibuat oleh <b>${esc(a.ownerName || 'guru lain')}</b>. Anda bisa melihat nilai & rekapnya; perubahan hanya bisa dilakukan oleh pembuatnya atau admin sekolah.</div>`;
  function canEditQset(q) {
    if (S.mode !== 'server' || !S.user) return true;
    if (S.user.role === 'admin') return true;
    return q && q.ownerId === S.user.id;
  }
  function previewQset(q) {
    const m = modal(`<h2>${esc(q.title)}</h2><p class="small muted" style="margin-top:0">${q.ownerName ? 'Dibuat oleh ' + esc(q.ownerName) + ' · ' : ''}${q.questions.length} soal · ${typeSummary(q.questions)}</p>${QT.instructionsHTML(q.instructions, q.questions.map(x => x.type))}${q.questions.map((x, k) => previewCard(x, k, q.questions)).join('')}
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
    const map = P.assignImages(res.questions, ext.meta, ext.images, res.keyLine, res.passages);
    let n = 0;
    const area = l => l.reduce((a, b) => a + (b.x2 - b.x1) * (b.y2 - b.y1), 0);
    for (const k in map) {
      const byPage = {};
      map[k].forEach(im => (byPage[im.page] = byPage[im.page] || []).push(im));
      const pg = +Object.keys(byPage).sort((a, b) => area(byPage[b]) - area(byPage[a]))[0];
      const list = byPage[pg];
      const u = { x1: Math.min(...list.map(b => b.x1)), x2: Math.max(...list.map(b => b.x2)), y1: Math.min(...list.map(b => b.y1)), y2: Math.max(...list.map(b => b.y2)) };
      const pad = list.length > 1 ? 6 : 1.5, padL = list.length > 1 ? 22 : pad; // beberapa gambar (mis. pilihan A–D) → sertakan hurufnya
      const page = await ext.doc.getPage(pg); const vp = page.getViewport({ scale: 1 });
      const r = vp.convertToViewportRectangle([u.x1 - padL, u.y1 - pad, u.x2 + pad, u.y2 + pad + (list.length > 1 ? 16 : 0)]);
      const x = Math.min(r[0], r[2]), y = Math.min(r[1], r[3]);
      const url = await cropFraction(ext.doc, pg, { x: x / vp.width, y: y / vp.height, w: Math.abs(r[2] - r[0]) / vp.width, h: Math.abs(r[3] - r[1]) / vp.height });
      if (/^p:/.test(k)) res.questions.forEach(q => { if (q.passage && q.passage.id === k.slice(2)) q.passage.image = url; });
      else res.questions[k].image = url;
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
    importDraft = { id: S.uid('qs'), title, source, instructions: res.instructions || '', questions: res.questions, warnings: res.warnings, stats: res.stats, keyLine: res.keyLine, raw: rawLines, thumbs: thumbs || [], created: Date.now(), isNew: true };
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
    if (!src._work) src._work = JSON.parse(JSON.stringify({ title: src.title, instructions: src.instructions || '', questions: src.questions }));
    const w = src._work;
    const pdfDoc = (isDraft && importDraft.pdfDoc) || editorPdf;
    setTitle(isDraft && src.isNew ? '✏️ Buat Paket Soal Baru' : isDraft ? '✨ Periksa Hasil Konversi' : '✏️ Edit Paket Soal', isDraft && src.isNew ? 'Isi soal, tambah jenis soal lain di bawah, lalu simpan ke Bank Soal' : isDraft ? 'Soal sudah disesuaikan ke format web — periksa, perbaiki bila perlu, lalu simpan' : esc(src.title));
    const total = w.questions.reduce((n, q) => n + (+q.points || 0), 0);
    const noKey = w.questions.filter(q => !QT.hasKey(q)).length;
    const keyBadge = q => {
      if (q.type === 'slide' || q.type === 'polling') return '';
      const manual = ['uraian', 'gambar', 'suara'].indexOf(q.type) >= 0;
      if (manual) return q.answer && String(q.answer).trim() ? `<span class="pill ok key-pill" title="${esc(String(q.answer))}">✅ Kunci uraian ada</span>` : '<span class="pill key-pill" title="Opsional: isi jawaban acuan di kotak Kunci/Pedoman">📝 Kunci uraian (opsional)</span>';
      if (!QT.hasKey(q)) return '<span class="pill bad key-pill">⚠️ Kunci belum ada</span>';
      const kt = String(QT.keyText(q)); return `<span class="pill ok key-pill" title="${esc(kt)}">✅ Kunci: ${esc(kt.length > 28 ? kt.slice(0, 26) + '…' : kt)}</span>`;
    };
    const qHtml = (q, i) => `
      <div class="q-card" data-qi="${i}">
        <div class="q-head"><span class="qn">${i + 1}</span>
          <select data-qt="type">${QT.ORDER.map(k => `<option value="${k}" ${q.type === k ? 'selected' : ''}>${QT.TYPES[k].icon} ${TYPE_LABEL[k]}</option>`).join('')}</select>
          ${q.type === 'slide' || q.type === 'polling' ? '<span class="pill">tidak dinilai</span>' : `<label class="small">Poin <input type="number" min="0" step="0.5" data-qt="points" value="${+q.points || 0}" style="width:70px"></label>`}
          <button class="btn ghost sm" data-act="guide" data-t="${q.type}" title="Cara membuat soal jenis ini">❓ Panduan</button>
          ${keyBadge(q)}
          <span style="margin-left:auto" class="btns">${pdfDoc ? `<button class="btn soft sm" data-act="crop" data-i="${i}" title="Potong gambar dari halaman PDF">✂️ Dari PDF</button>` : ''}${q.passage ? '' : `<button class="btn ghost sm" data-act="pass-add" data-i="${i}" title="Tambahkan teks bacaan untuk soal ini (dan soal lain)">📖</button>`}<button class="btn ghost sm" data-act="ins-table" data-i="${i}" title="Sisipkan tabel">▦</button><button class="btn ghost sm" data-act="img" data-i="${i}" title="Unggah gambar dari perangkat">🖼</button><button class="btn ghost sm" data-act="up" data-i="${i}" title="Naik">↑</button><button class="btn ghost sm" data-act="down" data-i="${i}" title="Turun">↓</button><button class="btn ghost sm" data-act="delq" data-i="${i}" title="Hapus">🗑</button></span></div>
        <textarea data-qt="text" placeholder="${q.type === 'slide' ? 'Isi materi / penjelasan' : q.type === 'seret' ? 'Kalimat dengan [[jawaban]] pada bagian kosong' : q.type === 'dropdown' ? 'Kalimat dengan [[benar|salah|salah]]' : 'Teks pertanyaan'}">${esc(q.text)}</textarea>
        ${q.image ? `<div class="q-img-row">${q.type === 'titik' || q.type === 'label' ? '' : `<img src="${q.image}" class="zoomable" alt="gambar soal">`}<button class="btn ghost sm" data-act="rmimg" data-i="${i}">Hapus gambar</button></div>` : ''}
        ${q.passage ? `<div class="passage-ed"><div class="btns" style="align-items:center"><b>📖 Teks bacaan</b><span class="small muted">dipakai soal no. ${numsText(passageNums(w.questions, q))}</span>
            <span style="margin-left:auto" class="btns"><button class="btn ghost sm" data-act="pass-img" data-i="${i}" title="Gambar untuk teks bacaan">🖼</button>${q.passage.image ? `<button class="btn ghost sm" data-act="pass-rmimg" data-i="${i}">Hapus gambar</button>` : ''}<button class="btn ghost sm" data-act="pass-link" data-i="${i}" title="Atur soal yang memakai teks ini">🔗 Atur soal</button><button class="btn ghost sm" data-act="pass-off" data-i="${i}">✕ Lepas dari soal ini</button><button class="btn ghost sm" data-act="pass-del" data-i="${i}" title="Bukan teks bacaan: hapus dari semua soal">🗑 Hapus dari semua soal</button><button class="btn ghost sm" data-act="pass-instr" data-i="${i}" title="Pindahkan isinya ke Petunjuk soal">📋 Jadikan petunjuk</button></span></div>
            <input data-pt="title" value="${esc(q.passage.title || '')}" placeholder="Judul teks (opsional), mis. Teks 2: Penerapan Nilai Pancasila">
            ${q.passage.image ? `<img src="${q.passage.image}" class="zoomable" style="max-height:160px;border-radius:10px;margin:6px 0">` : ''}
            <textarea data-pt="text" placeholder="Isi teks bacaan" style="min-height:110px">${esc(q.passage.text || '')}</textarea>
            <div class="small muted">Perubahan di sini berlaku untuk semua soal yang memakai teks ini.${q.passage.image ? ' Tulis <span class="kbd">{{gambar}}</span> pada baris tersendiri untuk mengatur letak gambar.' : ''} Tabel: <span class="kbd">| a | b |</span> per baris.</div></div>` : ''}
        <div class="qt-ed">${QT.editor(q)}</div>
      </div>`;
    return {
      html: `
      <div class="card"><div class="row">
        <label class="field" style="flex:3"><span>Judul paket soal</span><input id="qs-title" value="${esc(w.title)}"></label>
        <details class="field ins-ed" style="flex-basis:100%" ${w.instructions ? 'open' : ''}><summary><b>📋 Petunjuk soal</b> <span class="small muted">— dibaca murid setelah memasukkan NIS, sebelum waktu ujian berjalan${w.instructions ? '' : ' (kosong = petunjuk standar)'}</span></summary>
          <textarea id="qs-instr" style="min-height:90px;margin-top:6px" placeholder="${esc(QT.DEFAULT_INSTR.map((x, k) => (k + 1) + '. ' + x).join('\n'))}">${esc(w.instructions || '')}</textarea>
          <div class="small muted">Satu petunjuk per baris. Tabel (<span class="kbd">| a | b |</span>) dan pecahan (<span class="kbd">1/2</span>) juga bisa. Cara menjawab tiap jenis soal ditambahkan otomatis.</div></details>
        ${!pdfDoc && window.pdfjsLib ? '<button class="btn ghost" data-act="openpdf" style="margin-bottom:12px" title="Buka PDF soal untuk memotong gambarnya">📄 Buka PDF (ambil gambar)</button>' : ''}
        <div class="btns" style="margin-bottom:12px"><a class="btn ghost" href="#/bank-soal" data-act="cancel">Batal</a><button class="btn soft" data-act="preview">👁 Pratinjau Murid</button><button class="btn ok" data-act="save">💾 Simpan${isDraft ? ' ke Bank Soal' : ''}</button></div></div>
        <div class="btns"><span class="pill pri">${w.questions.length} soal</span>${QT.ORDER.filter(t => w.questions.some(x => x.type === t)).map(t => `<span class="pill">${QT.TYPES[t].icon} ${TYPE_LABEL[t]} ${w.questions.filter(x => x.type === t).length}</span>`).join('')}<span class="pill">Total ${fmt(total)} poin</span>${noKey ? `<button class="pill bad" data-act="go-nokey" title="Lompat ke soal yang belum ada kuncinya">⚠️ ${noKey} soal belum ada kunci → lihat</button>` : '<span class="pill ok">✅ Semua kunci lengkap</span>'}
          ${isDraft && src.stats ? (src.stats.keysApplied ? `<span class="pill ok">🔑 ${src.stats.keysApplied} kunci otomatis dari bagian Kunci Jawaban PDF</span>` : (src.keyLine === -1 && noKey ? '<span class="pill warn" title="Tulis bagian KUNCI JAWABAN di bawah soal pada PDF agar kunci tercentang otomatis">🔑 Bagian Kunci Jawaban tidak ditemukan di PDF</span>' : '')) : ''}${isDraft && src.imgCount ? `<span class="pill ok">🖼 ${src.imgCount} gambar diambil otomatis dari PDF</span>` : ''}${w.questions.some(q => q.image) ? `<span class="pill">🖼 ${w.questions.filter(q => q.image).length} soal bergambar</span>` : ''}</div>
        ${pdfDoc ? '<p class="small muted" style="margin:8px 0 0">Gambar yang belum terambil (mis. grafik/tabel berupa garis) bisa dipotong manual dengan tombol <b>✂️ Dari PDF</b> pada soalnya.</p>' : ''}
        ${isDraft && src.warnings && src.warnings.length ? `<div class="note warn" style="margin-top:10px"><b>Perlu diperiksa:</b><ul class="list-warn">${src.warnings.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      </div>
      <div class="grid" style="grid-template-columns: minmax(0,1fr) ${isDraft && (src.thumbs || src.raw) ? 'minmax(260px, 380px)' : ''}; align-items:start" id="ed-grid">
        <div>${w.questions.length ? '' : `<div class="card"><h3>Pilih jenis soal pertama</h3>${typeGallery('addq')}</div>`}${w.questions.map(qHtml).join('')}
          <div class="btns"><button class="btn" data-act="addpick">＋ Tambah Soal (17 jenis)</button><button class="btn soft" data-act="addq" data-t="pg">+ Pilihan Ganda</button><button class="btn soft" data-act="addq" data-t="isian">+ Isian</button><button class="btn soft" data-act="addq" data-t="uraian">+ Uraian</button><button class="btn ghost" data-act="pts">⚖️ Atur Poin per Jenis</button></div></div>
        ${isDraft && (src.thumbs || src.raw) ? `<div class="card" style="position:sticky;top:12px;max-height:calc(100vh - 30px);overflow:auto">
          <div class="tabs"><button class="on" data-act="side" data-t="pdf">PDF Asli</button><button data-act="side" data-t="raw">Teks Terbaca</button></div>
          <div id="side-pdf">${(src.thumbs || []).map(t => `<img src="${t}" style="width:100%;border-radius:10px;border:1px solid var(--border);margin-bottom:8px">`).join('') || '<p class="small muted">Tidak ada pratinjau.</p>'}</div>
          <pre id="side-raw" class="small hidden" style="white-space:pre-wrap">${esc((src.raw || []).join('\n'))}</pre></div>` : ''}
      </div>`,
      mount(v) {
        if (window.innerWidth < 1000) $('#ed-grid', v).style.gridTemplateColumns = '1fr';
        $('#qs-title', v).addEventListener('input', e => { w.title = e.target.value; });
        $('#qs-instr', v).addEventListener('input', e => { w.instructions = e.target.value; });
        $$('.q-card', v).forEach(card => {
          const q = w.questions[+card.dataset.qi];
          $$('[data-qt]', card).forEach(inp => inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
            const f = inp.dataset.qt;
            if (f === 'points') q.points = +inp.value || 0;
            else if (f === 'type') { QT.convert(q, inp.value); keepScroll(); }
            else q[f] = inp.value;
          }));
          QT.bindEditor($('.qt-ed', card), q, keepScroll);
          $$('[data-pt]', card).forEach(inp => inp.addEventListener('input', () => {
            const pid = q.passage.id, f = inp.dataset.pt;
            w.questions.forEach(x => { if (x.passage && x.passage.id === pid) x.passage[f] = inp.value; });
          }));
        });
      },
      actions: {
        side: el => { $$('.tabs button', el.parentNode).forEach(b => b.classList.toggle('on', b === el)); $('#side-pdf').classList.toggle('hidden', el.dataset.t !== 'pdf'); $('#side-raw').classList.toggle('hidden', el.dataset.t !== 'raw'); },
        cancel: () => { delete src._work; location.hash = '#/bank-soal'; },
        'go-nokey': () => { const i = w.questions.findIndex(q => !QT.hasKey(q)); const c = $(`.q-card[data-qi="${i}"]`); if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 1600); } },
        delq: el => { w.questions.splice(+el.dataset.i, 1); keepScroll(); },
        up: el => { const i = +el.dataset.i; if (i > 0) { const t = w.questions[i]; w.questions[i] = w.questions[i - 1]; w.questions[i - 1] = t; keepScroll(); } },
        down: el => { const i = +el.dataset.i; if (i < w.questions.length - 1) { const t = w.questions[i]; w.questions[i] = w.questions[i + 1]; w.questions[i + 1] = t; keepScroll(); } },
        addq: el => { const q = QT.blank(el.dataset.t, S.uid('q')); q.num = w.questions.length + 1; w.questions.push(q); route(); setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 30); },
        guide: el => guideModal(el.dataset.t),
        'pass-add': el => passageModal(w, +el.dataset.i, keepScroll),
        'pass-link': el => passageModal(w, +el.dataset.i, keepScroll),
        'ins-table': el => { const q = w.questions[+el.dataset.i]; q.text = (q.text ? q.text.replace(/\s+$/, '') + '\n' : '') + '| Kolom 1 | Kolom 2 |\n| isi | isi |\n| isi | isi |'; keepScroll(); toast('Tabel disisipkan. Ubah isinya di kotak pertanyaan: satu baris = satu baris tabel, pisahkan kolom dengan |'); },
        'pass-del': async el => { const pid = w.questions[+el.dataset.i].passage.id; const n = w.questions.filter(x => x.passage && x.passage.id === pid).length; if (!await confirmBox(`Hapus teks bacaan ini dari <b>${n} soal</b>?`, 'Hapus')) return; w.questions.forEach(x => { if (x.passage && x.passage.id === pid) delete x.passage; }); keepScroll(); },
        'pass-instr': el => { const ps = w.questions[+el.dataset.i].passage, pid = ps.id; w.instructions = ((w.instructions || '').trim() + '\n' + [ps.title, ps.text].filter(Boolean).join('\n')).trim(); w.questions.forEach(x => { if (x.passage && x.passage.id === pid) delete x.passage; }); keepScroll(); toast('Dipindahkan ke 📋 Petunjuk soal (di bagian atas).'); },
        'pass-off': el => { const q = w.questions[+el.dataset.i]; delete q.passage; keepScroll(); },
        'pass-img': async el => {
          const f = await pickFile('image/*'); if (!f) return;
          const url = await resizeImage(f, 1400), q = w.questions[+el.dataset.i], pid = q.passage.id;
          w.questions.forEach(x => { if (x.passage && x.passage.id === pid) x.passage.image = url; }); keepScroll();
        },
        'pass-rmimg': el => { const pid = w.questions[+el.dataset.i].passage.id; w.questions.forEach(x => { if (x.passage && x.passage.id === pid) delete x.passage.image; }); keepScroll(); },
        addpick: () => {
          const m = modal(`<h2>Pilih Jenis Soal</h2><p class="small muted" style="margin-top:0">Semua jenis bisa dipakai di Ujian. Yang bertanda 🎮 juga bisa dipakai di Kuis Seru mode Permainan. Bingung memilih? <a href="#/panduan-soal" data-close>📘 Lihat panduan & coba contohnya</a>.</p>
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
          const m = modal(`<h2>Pratinjau: ${esc(w.title)}</h2><p class="small muted" style="margin-top:0">Tampilan seperti di HP murid — boleh dicoba. Pilihan diacak saat murid mengerjakan.</p>${QT.instructionsHTML(w.instructions, w.questions.map(x => x.type))}${w.questions.map((x, k) => previewCard(x, k, w.questions)).join('')}
            <div class="foot"><button class="btn" data-close>Tutup</button></div>`, { wide: true, noFocus: true });
          mountPreviews(m, w.questions);
        },
        save: () => {
          const title = ($('#qs-title').value || '').trim() || 'Paket Soal';
          const questions = w.questions.map((q, i) => { const o = Object.assign({}, q, { num: i + 1 }); delete o.line; return o; });
          if (isDraft) {
            const obj = Object.assign({ id: src.id, title, source: src.source, instructions: (w.instructions || '').trim(), questions, created: Date.now() }, ownerStamp());
            st().questionSets.push(obj); importDraft = null; S.save();
            toast('Paket soal disimpan ke Bank Soal.');
            location.hash = '#/bank-soal';
            setTimeout(() => useQset(obj.id), 300);
          } else {
            src.title = title; src.questions = questions; src.instructions = (w.instructions || '').trim(); delete src._work; S.save();
            toast('Perubahan disimpan.'); location.hash = '#/bank-soal';
          }
        }
      }
    };
  }
  /** Tambah / atur teks bacaan untuk beberapa soal sekaligus. */
  function passageModal(w, i, done) {
    const q = w.questions[i];
    const existing = []; w.questions.forEach(x => { if (x.passage && !existing.some(e => e.id === x.passage.id)) existing.push(x.passage); });
    const cur = q.passage || null;
    const sel = new Set(cur ? passageNums(w.questions, q) : [i + 1]);
    const m = modal(`<h2>📖 Teks Bacaan</h2>
      <p class="small muted" style="margin-top:0">Satu teks bacaan bisa dipakai beberapa soal (mis. "Bacalah teks berikut untuk menjawab soal nomor 6–10"). Teks tampil di atas setiap soal yang memakainya; bila soal diacak, soal-soal ini tetap berdekatan.</p>
      ${!cur && existing.length ? `<label class="field"><span>Pakai teks yang sudah ada</span><select id="pz-pick"><option value="">— buat teks baru —</option>${existing.map(e => `<option value="${esc(e.id)}">${esc(e.title || (e.text || '').slice(0, 50) || 'Teks bacaan')}</option>`).join('')}</select></label>` : ''}
      <div id="pz-new" ${cur ? 'class="hidden"' : ''}><label class="field"><span>Judul (opsional)</span><input id="pz-title" placeholder="mis. Teks 2: Penerapan Nilai Pancasila di Sekolah"></label>
      <label class="field"><span>Isi teks bacaan</span><textarea id="pz-text" style="min-height:140px" placeholder="Tempel teks bacaan di sini"></textarea></label></div>
      <div class="field"><span>Dipakai untuk soal nomor</span><div class="pz-nums">${w.questions.map((x, k) => `<label class="pz-num ${x.passage && cur && x.passage.id !== cur.id ? 'other' : ''}"><input type="checkbox" value="${k + 1}" ${sel.has(k + 1) ? 'checked' : ''}><span>${k + 1}</span></label>`).join('')}</div>
        <div class="small muted">Nomor bergaris = sudah memakai teks bacaan lain (akan dipindahkan bila dicentang).</div></div>
      <div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="pz-ok">Simpan</button></div>`, { wide: true });
    const pick = $('#pz-pick', m); if (pick) pick.onchange = () => { $('#pz-new', m).classList.toggle('hidden', !!pick.value); };
    $('#pz-ok', m).onclick = () => {
      let ps = cur;
      if (!ps) {
        if (pick && pick.value) ps = existing.find(e => e.id === pick.value);
        else {
          const title = $('#pz-title', m).value.trim(), text = $('#pz-text', m).value.trim();
          if (!title && !text) return toast('Isi teks bacaannya dulu.', 'bad');
          ps = { id: S.uid('ps'), title, text };
        }
      }
      const nums = $$('.pz-num input:checked', m).map(x => +x.value);
      if (!nums.length) return toast('Pilih minimal satu soal.', 'bad');
      w.questions.forEach((x, k) => {
        if (nums.indexOf(k + 1) >= 0) x.passage = Object.assign({}, ps);
        else if (x.passage && x.passage.id === ps.id) delete x.passage;
      });
      closeModal(); done();
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
        <div class="card"><h2>✨ Efek Menu</h2>
          <p class="small muted" style="margin-top:0">Saat membuka menu, ikon menu muncul sekejap (±0,7 detik) disertai bunyi pendek. Hanya berlaku di perangkat ini.</p>
          <label class="switch-row"><input type="checkbox" id="fx-anim" ${window.MenuFx && MenuFx.prefs().anim ? 'checked' : ''}><span class="sw"></span><span><b>Animasi gambar saat membuka menu</b></span></label>
          <label class="switch-row" style="margin-top:8px"><input type="checkbox" id="fx-sound" ${window.MenuFx && MenuFx.prefs().sound ? 'checked' : ''}><span class="sw"></span><span><b>Bunyi saat membuka menu</b></span></label>
          <label class="field" style="margin-top:8px"><span>Volume bunyi</span><input type="range" min="0" max="1" step="0.05" id="fx-vol" value="${window.MenuFx ? MenuFx.prefs().vol : 0.5}"></label>
          <button class="btn soft sm" data-act="fx-try">▶ Coba efek</button>
        </div>
        <div class="card"><h2>💾 Data</h2>
          <p class="small muted">${S.mode === 'server' ? 'Data tersimpan di <b>database MySQL</b> server dan bisa dibuka dari perangkat mana pun setelah login. Tetap ekspor cadangan secara berkala.' : 'Semua data tersimpan di browser perangkat ini. Ekspor cadangan secara berkala atau untuk memindahkan ke perangkat lain.'}</p>
          <div class="btns"><button class="btn" data-act="export">⬇ Ekspor Cadangan (.json)</button>${isAdmin() ? '<button class="btn soft" data-act="import">⬆ Pulihkan dari Cadangan</button>' : ''}<button class="btn ghost" data-act="demo">Muat Data Contoh</button>${isAdmin() ? '<button class="btn danger" data-act="reset">Hapus Semua Data</button>' : ''}</div>
          ${S.mode === 'server' && localData() && isAdmin() ? `<div class="note" style="margin-top:12px">Ditemukan data lama yang tersimpan di browser ini (${localData().classes.length} kelas, ${localData().assessments.length} asesmen). <button class="btn sm" data-act="migrate">⬆ Pindahkan ke Server</button></div>` : ''}
        </div>
      </div></div>`,
      mount(v) {
        if (window.innerWidth < 1000) $('#set-grid', v).style.gridTemplateColumns = '1fr';
        if (window.MenuFx) {
          const upd = () => { const pr = MenuFx.prefs(); pr.anim = $('#fx-anim', v).checked; pr.sound = $('#fx-sound', v).checked; pr.vol = +$('#fx-vol', v).value; MenuFx.save(pr); };
          $('#fx-anim', v).onchange = upd; $('#fx-sound', v).onchange = upd; $('#fx-vol', v).onchange = () => { upd(); MenuFx.chime('coba'); };
        }
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
        'fx-try': () => window.MenuFx && MenuFx.play('pengaturan-' + Date.now(), '✨', 'Efek Menu'),
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
          <h3>📧 Email untuk Lupa Password</h3>
          ${me.email || /@/.test(me.username) ? `<p class="small" style="margin-top:0">Tautan atur ulang password dikirim ke <b>${esc(me.email || me.username)}</b>.</p>` : '<div class="note warn small" style="margin-bottom:10px">Akun ini belum punya email. Tambahkan agar Anda bisa memakai <b>Lupa password</b>.</div>'}
          <div class="row"><label class="field" style="flex:2"><span>Email</span><input type="email" id="em-new" value="${esc(me.email || '')}" placeholder="${esc(/@/.test(me.username) ? me.username : 'nama@email.com')}" autocomplete="email"></label>
          <label class="field" style="flex:1;min-width:140px"><span>Password saat ini</span><input type="password" id="em-pw" autocomplete="current-password"></label></div>
          <div class="btns" style="margin-bottom:6px"><button class="btn soft" data-act="em">Simpan Email</button></div>
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
          list.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Nama</th><th>Username</th><th>Email</th><th>Peran</th><th></th></tr></thead><tbody>${r.users.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.username)}</td><td class="small">${u.email ? esc(u.email) : /@/.test(u.username) ? '<span class="muted">(username)</span>' : '<span class="pill warn">belum ada</span>'}</td><td><span class="pill ${u.role === 'admin' ? 'pri' : ''}">${u.role}</span></td>
            <td class="btns"><button class="btn ghost sm" data-act="user-email" data-id="${u.id}" data-n="${esc(u.name)}" data-e="${esc(u.email || '')}" title="Atur email">✉️</button><button class="btn ghost sm" data-act="reset-pw" data-id="${u.id}" data-n="${esc(u.name)}" data-u="${esc(u.username)}" data-e="${esc(u.email || '')}" title="Atur ulang password">🔑</button>${u.id === me.id ? '' : `<button class="btn ghost sm" data-act="del-user" data-id="${u.id}" data-n="${esc(u.name)}">🗑</button>`}</td></tr>`).join('')}</tbody></table></div>`;
        } catch (e) { list.textContent = e.message; }
      },
      actions: {
        logout: () => S.logout(),
        em: async () => {
          try { const r = await S.api('me/email', { method: 'PUT', body: { email: $('#em-new').value.trim(), password: $('#em-pw').value } }); S.user = r.user; toast('Email disimpan.'); route(); }
          catch (e) { toast(e.message, 'bad'); }
        },
        pw: async () => {
          try { await S.api('me/password', { method: 'PUT', body: { oldPassword: $('#pw-old').value, newPassword: $('#pw-new').value } }); toast('Password diganti.'); $('#pw-old').value = $('#pw-new').value = ''; }
          catch (e) { toast(e.message, 'bad'); }
        },
        'user-email': async el => {
          const m = modal(`<h2>Email ${esc(el.dataset.n)}</h2><p class="small muted" style="margin-top:0">Dipakai untuk mengirim tautan <b>Lupa password</b> ke guru ini.</p><label class="field"><span>Email</span><input type="email" id="ue" value="${esc(el.dataset.e || '')}"></label><div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="ue-ok">Simpan</button></div>`);
          $('#ue-ok', m).onclick = async () => { try { await S.api('users/' + el.dataset.id + '/email', { method: 'PUT', body: { email: $('#ue', m).value.trim() } }); closeModal(); toast('Email disimpan.'); route(); } catch (e) { toast(e.message, 'bad'); } };
        },
        'add-user': () => {
          const m = modal(`<h2>Akun Guru Baru</h2>
            <label class="field"><span>Nama lengkap</span><input id="nu-name"></label>
            <div class="row"><label class="field"><span>Username</span><input id="nu-user" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="mis. hardi"></label><label class="field"><span>Password awal</span><input id="nu-pw" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="min. 6 karakter"></label></div>
            <p class="small muted" style="margin:-4px 0 8px">Username otomatis huruf kecil. Guru bisa masuk dengan username <b>atau</b> email di bawah.</p>
            <label class="field"><span>Email (untuk lupa password, opsional)</span><input id="nu-email" type="email" autocomplete="off" placeholder="guru@email.com"></label>
            <label class="field"><span>Peran</span><select id="nu-role"><option value="guru">Guru</option><option value="admin">Admin</option></select></label>
            <div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="nu-ok">Buat Akun</button></div>`);
          $('#nu-ok', m).onclick = async () => {
            const info = { name: $('#nu-name', m).value.trim(), username: $('#nu-user', m).value.trim().toLowerCase(), password: $('#nu-pw', m).value.trim(), role: $('#nu-role', m).value, email: $('#nu-email', m).value.trim() };
            try { await S.api('users', { body: info }); closeModal(); route(); credModal(info.name, info.username, info.password, info.email); }
            catch (e) { toast(e.message, 'bad'); }
          };
        },
        'reset-pw': el => {
          const m = modal(`<h2>Atur Password ${esc(el.dataset.n)}</h2><label class="field"><span>Password baru</span><input id="rp" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></label><div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="rp-ok">Simpan</button></div>`);
          $('#rp-ok', m).onclick = async () => { const pw = $('#rp', m).value.trim(); try { await S.api('users/' + el.dataset.id + '/password', { method: 'PUT', body: { password: pw } }); closeModal(); credModal(el.dataset.n, el.dataset.u, pw, el.dataset.e); } catch (e) { toast(e.message, 'bad'); } };
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

  /* ---- Lupa password & atur ulang lewat email ---- */
  function authShell(sub, inner) {
    document.body.classList.add('auth-mode');
    let el = $('#auth');
    if (!el) { el = document.createElement('div'); el.id = 'auth'; el.className = 'auth'; document.body.appendChild(el); }
    el.innerHTML = `<button class="mode-toggle auth-mode-btn" type="button" aria-label="Ganti mode">☀️</button><div class="card auth-card tilt"><div class="z1">
      ${window.Art ? `<div class="auth-mascot">${Art.kubi({ pose: 'wave', eyes: 'happy' })}</div>` : ''}
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px"><div class="logo-wrap"><div class="logo-cube"><span>A</span><span>M</span><span>A</span><span>M</span><span></span><span></span></div></div>
      <div><h2 style="margin:0">Asesmen Merdeka</h2><div class="small muted">${sub}</div></div></div>${inner}</div></div>`;
    setTimeout(() => window.ThemeMode && ThemeMode.paint(), 0);
    bindTilt(el);
    return el;
  }
  const pwEye = id => `<button type="button" class="pw-eye" data-eye="${id}" aria-label="Lihat password">👁</button>`;
  function bindEyes(el) { $$('[data-eye]', el).forEach(b => b.onclick = () => { const i = $('#' + b.dataset.eye, el); i.type = i.type === 'password' ? 'text' : 'password'; b.textContent = i.type === 'password' ? '👁' : '🙈'; }); }
  function forgotScreen(prefill) {
    history.replaceState(null, '', '#lupa');
    const el = authShell('Lupa password', `
      <p class="small muted" style="margin-top:0">Tulis <b>email atau username</b> akun Anda. Kami akan mengirim <b>tautan untuk membuat password baru</b> ke email yang terdaftar pada akun tersebut.</p>
      <form id="fg-form">
        <label class="field"><span>Email atau username</span><input id="fg-login" required autocapitalize="off" autocomplete="username" value="${esc(prefill || '')}"></label>
        <button class="btn lg" style="width:100%" type="submit">📧 Kirim Tautan ke Email</button>
      </form>
      <div id="fg-res"></div>
      <div class="small" style="margin-top:14px;text-align:center"><a href="#masuk" id="fg-back">← Kembali ke halaman masuk</a></div>`);
    $('#fg-login', el).focus();
    $('#fg-back', el).onclick = e => { e.preventDefault(); history.replaceState(null, '', '#masuk'); authScreen('login'); };
    $('#fg-form', el).onsubmit = async e => {
      e.preventDefault();
      const btn = $('button[type=submit]', el); btn.disabled = true; btn.textContent = 'Mengirim…';
      try {
        const r = await S.api('password/forgot', { body: { login: $('#fg-login', el).value.trim() }, noAuthEvent: true });
        $('#fg-form', el).classList.add('hidden');
        $('#fg-res', el).innerHTML = r.noEmail
          ? `<div class="note warn">${esc(r.message)}</div>`
          : `<div class="note ok" style="text-align:center"><div style="font-size:42px">📬</div><b>Periksa email Anda${r.sentTo ? ` (${esc(r.sentTo)})` : ''}</b><p class="small" style="margin:6px 0 0">${esc(r.message)}</p></div>
             <button class="btn ghost" style="width:100%;margin-top:10px" id="fg-again">Kirim ulang</button>`;
        const ag = $('#fg-again', el); if (ag) ag.onclick = () => forgotScreen($('#fg-login', el).value);
      } catch (err) { btn.disabled = false; btn.textContent = '📧 Kirim Tautan ke Email'; toast(err.message, 'bad'); }
    };
  }
  async function resetScreen(token) {
    const el = authShell('Buat password baru', '<p class="muted">Memeriksa tautan…</p>');
    let info;
    try { info = await S.api('password/check', { body: { token }, noAuthEvent: true }); }
    catch (err) {
      authShell('Buat password baru', `<div class="note warn">${esc(err.message)}</div><button class="btn lg" style="width:100%;margin-top:12px" id="rs-new">🔑 Minta Tautan Baru</button><div class="small" style="margin-top:14px;text-align:center"><a href="#masuk" id="rs-login">← Kembali ke halaman masuk</a></div>`);
      $('#rs-new').onclick = () => forgotScreen();
      $('#rs-login').onclick = e => { e.preventDefault(); history.replaceState(null, '', '#masuk'); authScreen('login'); };
      return;
    }
    const el2 = authShell('Buat password baru', `
      <p class="small" style="margin-top:0">Halo <b>${esc(info.name)}</b>, buat password baru untuk akun <span class="kbd">${esc(info.username)}</span>.</p>
      <form id="rs-form">
        <label class="field"><span>Password baru (min. 6 karakter)</span><div class="pw-wrap"><input id="rs-pw" type="password" required minlength="6" autocomplete="new-password">${pwEye('rs-pw')}</div></label>
        <label class="field"><span>Ulangi password baru</span><div class="pw-wrap"><input id="rs-pw2" type="password" required autocomplete="new-password">${pwEye('rs-pw2')}</div></label>
        <div class="small" id="rs-hint" style="min-height:1.2em;margin:-4px 0 8px"></div>
        <button class="btn lg" style="width:100%" type="submit">💾 Simpan Password Baru</button>
      </form>`);
    bindEyes(el2);
    const hint = () => { const a = $('#rs-pw', el2).value, b = $('#rs-pw2', el2).value, h = $('#rs-hint', el2); h.innerHTML = !a ? '' : a.length < 6 ? '<span style="color:var(--bad)">Minimal 6 karakter.</span>' : b && a !== b ? '<span style="color:var(--bad)">Password belum sama.</span>' : b ? '<span style="color:var(--ok)">✓ Password cocok.</span>' : ''; };
    $('#rs-pw', el2).oninput = hint; $('#rs-pw2', el2).oninput = hint; $('#rs-pw', el2).focus();
    $('#rs-form', el2).onsubmit = async e => {
      e.preventDefault();
      const a = $('#rs-pw', el2).value;
      if (a.length < 6) return toast('Password minimal 6 karakter.', 'bad');
      if (a !== $('#rs-pw2', el2).value) return toast('Ulangi password dengan sama persis.', 'bad');
      const btn = $('button[type=submit]', el2); btn.disabled = true;
      try {
        const r = await S.api('password/reset', { body: { token, password: a }, noAuthEvent: true });
        localStorage.removeItem('asesmen-token');
        history.replaceState(null, '', '#masuk');
        authScreen('login', null, { ok: 'Password berhasil diganti. Email konfirmasi sudah dikirim. Silakan masuk dengan password baru.', user: r.username });
      } catch (err) { btn.disabled = false; toast(err.message, 'bad'); }
    };
  }

  /* Layar login / daftar sekolah / pemasangan pertama */
  function authScreen(mode, msg, extra) {
    extra = extra || {};
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
      ${msg ? `<div class="note warn" style="margin-bottom:12px">${esc(msg)}</div>` : ''}${extra.ok ? `<div class="note ok" style="margin-bottom:12px">✅ ${esc(extra.ok)}</div>` : ''}
      ${mode === 'setup' && S.saas ? '<p class="small muted" style="margin-top:0">Akun ini adalah <b>pemilik platform</b>: bisa memakai aplikasi untuk sekolah Anda sendiri sekaligus mengelola sekolah lain yang berlangganan, pembayaran, dan harga.</p>' : ''}
      <form id="auth-form">
        ${mode === 'setup' || mode === 'register' ? '<label class="field"><span>Nama sekolah</span><input id="au-school" required placeholder="SMP Negeri 1 ..."></label><label class="field"><span>Nama Anda</span><input id="au-name" required autocomplete="name"></label>' : ''}
        <label class="field"><span>${mode === 'login' ? (S.saas ? 'Email atau username' : 'Username') : userLabel}</span><input id="au-user" required autocomplete="${mode === 'login' ? 'username' : 'email'}" autocapitalize="off" ${mode !== 'login' && S.saas ? 'type="email"' : ''}></label>
        ${mode === 'register' ? '<label class="field"><span>No. WhatsApp (opsional)</span><input id="au-phone" inputmode="tel" autocomplete="tel" placeholder="08…"></label>' : ''}
        <label class="field"><span>Password${mode !== 'login' ? ' (min. 6 karakter)' : ''}</span><input id="au-pw" type="password" required autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}"></label>
        <button class="btn lg" style="width:100%" type="submit">${mode === 'setup' ? 'Buat Akun & Mulai' : mode === 'register' ? 'Daftar & Mulai Coba Gratis' : 'Masuk'}</button>
      </form>
      ${mode === 'login' && S.mode === 'server' ? '<div style="margin-top:12px;text-align:center"><a href="#lupa" id="forgot-link" class="small" style="font-weight:700">🔑 Lupa password?</a></div>' : ''}
      <div class="small muted" style="margin-top:14px;text-align:center">${S.saas ? '<a href="index.html">← Halaman utama</a> · ' : ''}Murid? <a href="ujian.html">Masuk ke halaman ujian →</a></div>
      <div class="small muted" style="margin-top:8px;text-align:center;opacity:.6">versi ${esc(S.version || '?')}</div>
    </div></div>`;
    bindTilt(el);
    $$('[data-m]', el).forEach(b => b.onclick = () => { history.replaceState(null, '', b.dataset.m === 'register' ? '#daftar' : '#masuk'); authScreen(b.dataset.m); });
    const fl = $('#forgot-link', el); if (fl) fl.onclick = e => { e.preventDefault(); forgotScreen($('#au-user', el).value.trim()); };
    if (extra.user && $('#au-user', el)) { $('#au-user', el).value = extra.user; $('#au-pw', el).focus(); }
    else ($('#au-school', el) || $('#au-user', el)).focus();
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
        <details class="card" style="margin-top:18px"><summary style="cursor:pointer;font-weight:800">🧩 17 jenis soal yang bisa dipakai — klik untuk membuat soal baru</summary>
          <p class="small muted">Buat soalnya di sini (atau unggah PDF di Bank Soal), simpan, lalu pilih paketnya saat <b>Buat Permainan</b> / <b>Buat Ujian</b>. Jenis bertanda 🎮 bisa dipakai di mode Permainan; semua jenis bisa dipakai di mode Ujian. <a href="#/panduan-soal">📘 Baca panduan setiap jenis soal →</a></p>
          ${typeGallery('mk')}</details>
        <div id="games" class="muted" style="margin-top:18px">Memuat…</div>`,
      async mount(v) {
        let d; try { d = await S.api('games'); } catch (e) { $('#games', v).innerHTML = `<div class="card">${esc(e.message)}</div>`; return; }
        $('#games', v).innerHTML = d.games.length ? `<div class="grid auto">${d.games.map(g => `<div class="card tilt" style="margin:0"><div class="z1">
          <div class="card-head"><h3>${esc(g.title)}</h3><span class="pill ${GAME_STATUS[g.status][0]}">${GAME_STATUS[g.status][1]}</span></div>
          <p class="small muted" style="margin:0 0 8px"><span class="pill ${g.is_exam ? 'pri' : 'ok'}">${g.is_exam ? '📝 Ujian' : '🎮 Permainan'}</span> ${tgl(g.created_at)} · kode ${esc(g.code)} · ${g.players} ${g.is_exam ? 'peserta' : 'pemain'}${g.creator ? ' · 👤 ' + esc(g.creator) : ''}${!g.is_exam && g.answered ? ` · akurasi ${Math.round(g.correct / g.answered * 100)}%` : ''}${g.class_id && S.cls(g.class_id) ? ' · ' + esc(S.cls(g.class_id).name) : ''}</p>
          <div class="btns"><a class="btn sm" href="#/kuis/${g.id}">${g.status === 'ended' ? '📊 Hasil' : canGame(g) ? '▶ Buka Layar Kuis' : '👁 Lihat'}</a>${canGame(g) ? `<button class="btn ghost sm" data-act="del" data-id="${g.id}">🗑</button>` : ''}</div></div></div>`).join('')}</div>`
          : '<div class="card empty"><div class="big">🕹️</div>Belum ada kuis. Klik <b>Buat Kuis Seru</b> untuk memulai.</div>';
        bindTilt(v);
      },
      actions: {
        new: () => newGameModal(),
        'new-exam': () => newGameModal({ mode: 'exam' }),
        mk: el => startManual(el.dataset.t),
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
      <div class="row"><label class="field"><span>Peserta</span><select id="g-cls"><option value="">Bebas — murid mengetik nama panggilan</option>${s.classes.map(c => `<option value="${c.id}" ${(preset.classId || '') === c.id && !(preset.classIds && preset.classIds.length > 1) ? 'selected' : ''}>Kelas ${esc(c.name)} — pilih nama (nilai bisa disimpan)</option>`).join('')}${s.classes.length > 1 ? `<option value="__multi" ${preset.classIds && preset.classIds.length > 1 ? 'selected' : ''}>🏫 Beberapa kelas sekaligus…</option>` : ''}</select></label>
      <label class="field only-game" style="max-width:170px"><span>Waktu per soal</span><select id="g-time">${[10, 15, 20, 30, 45, 60, 90, 120].map(t => `<option value="${t}" ${(preset.time || 20) === t ? 'selected' : ''}>${t} detik</option>`).join('')}</select></label>
      <label class="field only-exam" style="max-width:170px"><span>Durasi ujian</span><select id="g-dur">${[[15, '15 menit'], [30, '30 menit'], [45, '45 menit'], [60, '60 menit'], [90, '90 menit'], [120, '120 menit'], [0, 'Tanpa batas']].map(([v, l]) => `<option value="${v}" ${(preset.duration == null ? 60 : preset.duration) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <div class="field hidden" id="g-multi"><span>Kelas peserta (centang semua yang ikut)</span><div class="pz-nums">${s.classes.map(c => `<label class="pz-num"><input type="checkbox" value="${c.id}" ${(preset.classIds || []).indexOf(c.id) >= 0 ? 'checked' : ''}><span style="padding:0 12px">${esc(c.name)} <small>(${c.students.length})</small></span></label>`).join('')}</div></div>
      <label class="field"><span>Mapel (untuk menyimpan nilai)</span><select id="g-subj">${s.subjects.map(x => `<option value="${x.id}" ${(preset.subjectId || s.ui.subjectId) === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
      <div class="grid g2 small" style="gap:6px">
        <label style="display:flex;gap:8px"><input type="checkbox" id="g-sq" checked> Acak urutan soal per murid</label>
        <label style="display:flex;gap:8px"><input type="checkbox" id="g-so" checked> Acak urutan pilihan jawaban</label>
        <label class="only-game" style="display:flex;gap:8px"><input type="checkbox" id="g-sa" checked> Tampilkan jawaban benar setelah menjawab</label>
        <label class="only-game" style="display:flex;gap:8px"><input type="checkbox" id="g-sb" checked> Bonus poin untuk jawaban cepat</label>
        <label class="only-game" style="display:flex;gap:8px"><input type="checkbox" id="g-pu" ${preset.powerups === false ? '' : 'checked'}> 🎁 Power-up (Poin Ganda, 50:50, Perisai, +10 Detik) — didapat tiap 3 jawaban benar beruntun</label>
        <label class="only-game" style="display:flex;gap:8px"><input type="checkbox" id="g-red" ${preset.redemption === false ? '' : 'checked'}> 🔁 Soal penebusan — soal yang salah muncul lagi di akhir untuk merebut kembali poin</label>
        <label class="field only-game" style="margin:4px 0 0"><span>👥 Mode tim</span><select id="g-teams"><option value="0">Sendiri-sendiri (tanpa tim)</option>${[2, 3, 4, 5, 6].map(n => `<option value="${n}" ${+preset.teams === n ? 'selected' : ''}>${n} tim — murid dibagi otomatis, juara = rata-rata poin tim</option>`).join('')}</select></label>
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
    let clsTouched = !!(preset.classId || (preset.classIds && preset.classIds.length));
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
      if (mode === 'exam' && !clsTouched && !$('#g-cls', m).value && s.classes[0]) $('#g-cls', m).value = s.classes[0].id;
      $('#g-multi', m).classList.toggle('hidden', $('#g-cls', m).value !== '__multi');
    };
    $$('.mode-card', m).forEach(c => c.onclick = () => { mode = c.dataset.mode; paint(); });
    $('#g-music-on', m).onchange = () => { paintMusic(); if (!$('#g-music-on', m).checked && window.Music) Music.stop(); };
    $('#g-music', m).onchange = e => { if (window.Music) { Music.unlock(); Music.setVolume(0.45); if (e.target.value) { Music.play(e.target.value); clearTimeout(window.__mp); window.__mp = setTimeout(() => Music.stop(), 6000); } else Music.stop(); } };
    $('#g-qs', m).onchange = paint;
    $('#g-cls', m).onchange = () => { clsTouched = true; paint(); };
    paint();
    $('#g-ok', m).onclick = async () => {
      if ($('#g-cls', m).value === '__multi' && $$('#g-multi input:checked', m).length < 1) return toast('Centang kelas yang ikut.', 'bad');
      const b = $('#g-ok', m); b.disabled = true;
      try {
        if (window.Music) Music.stop();
        const musicOn = $('#g-music-on', m).checked, track = $('#g-music', m).value, hostOn = $('#g-music-host', m).checked;
        localStorage.setItem('kuis-musik-def-' + mode, JSON.stringify({ on: musicOn, track, host: hostOn }));
        hostAutoMusic = hostOn ? track : null;
        const r = await S.api('games', { body: { mode, music: musicOn ? track : '', qsetId: $('#g-qs', m).value, title: $('#g-title', m).value.trim(), classId: $('#g-cls', m).value === '__multi' ? null : ($('#g-cls', m).value || null), classIds: $('#g-cls', m).value === '__multi' ? $$('#g-multi input:checked', m).map(x => x.value) : undefined, subjectId: $('#g-subj', m).value || null, time: +$('#g-time', m).value,
          duration: +$('#g-dur', m).value, showResult: $('#g-sr', m).checked, maxViolations: +$('#g-viol', m).value,
          shuffleQ: $('#g-sq', m).checked, shuffleOpt: $('#g-so', m).checked, showAnswer: $('#g-sa', m).checked, speedBonus: $('#g-sb', m).checked,
          powerups: $('#g-pu', m).checked, redemption: $('#g-red', m).checked, teams: +$('#g-teams', m).value } });
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
        again: () => { const g = out.data.game; newGameModal({ powerups: g.settings.powerups, redemption: g.settings.redemption, teams: g.settings.teams, music: g.settings.music, mode: g.settings.mode, qsetId: g.settings.qsetId, title: g.title, classId: g.classId, classIds: gameClassIds(g), subjectId: g.subjectId, time: g.settings.time, duration: g.settings.duration }); },
        reset: async el => { if (!await confirmBox(`Ulang ujian untuk <b>${esc(el.dataset.n)}</b>? Jawaban, nilai, dan catatan pelanggarannya dihapus sehingga ia bisa mengerjakan dari awal.`, 'Ulang Ujian')) return; try { await S.api('games/' + id + '/reset', { body: { playerId: +el.dataset.id } }); out.load(); } catch (e) { toast(e.message, 'bad'); } },
        review: el => examReviewModal(out, +el.dataset.id),
        fix: el => {
          const p = out.data.players.find(x => x.id === +el.dataset.id); if (!p) return;
          fixModal({
            name: p.nickname, finished: p.finished, violations: p.violations, timed: !!out.data.game.settings.duration,
            info: `${p.finished ? 'Sudah mengumpulkan' + (p.exam_score !== null ? ' (nilai ' + fmt(p.exam_score, 1) + ')' : '') : p.started_ms ? 'Sedang mengerjakan' : 'Belum mulai'}${p.violations ? ' · ' + p.violations + ' pelanggaran' : ''} · ${p.answeredCount || 0} soal dijawab`,
            onContinue: async (add, clearV) => { await S.api('games/' + id + '/reopen', { body: { playerId: p.id, addMinutes: add, clearViolations: clearV } }); },
            onRestart: async () => { await S.api('games/' + id + '/reset', { body: { playerId: p.id } }); },
            onKick: async () => { await S.api('games/' + id + '/kick', { body: { playerId: p.id } }); },
            done: () => out.load()
          });
        }
      }
    };
    return out;
  }

  function renderHost(d) {
    renderHost0(d);
    const box = $('#host'); if (!box || canGame(d.game)) return;
    $$('[data-act=start],[data-act=end],[data-act=kick],[data-act=reset]', box).forEach(b => b.remove());
    box.insertAdjacentHTML('afterbegin', `<div class="note warn" style="margin-bottom:12px">👁 <b>Hanya lihat.</b> Kuis ini dibuat oleh <b>${esc(d.game.creatorName || 'guru lain')}</b>. Hanya pembuatnya atau admin sekolah yang bisa memulai, mengakhiri, atau mengoreksi.</div>`);
  }
  const TEAMS = [{ n: 'Tim Merah', e: '🔴', c: '#ff5a5f' }, { n: 'Tim Biru', e: '🔵', c: '#3d8bff' }, { n: 'Tim Hijau', e: '🟢', c: '#22c55e' }, { n: 'Tim Kuning', e: '🟡', c: '#f5b800' }, { n: 'Tim Ungu', e: '🟣', c: '#a855f7' }, { n: 'Tim Oranye', e: '🟠', c: '#ff8a1f' }];
  /** Klasemen tim: rata-rata poin anggota. */
  function teamStand(g, ps) {
    const n = +(g.settings && g.settings.teams) || 0; if (!n) return [];
    const t = Array.from({ length: n }, (_, k) => ({ team: k, members: [], score: 0, correct: 0 }));
    ps.forEach(p => { if (p.team !== null && p.team !== undefined && t[p.team]) { t[p.team].members.push(p); t[p.team].score += p.score; t[p.team].correct += p.correct; } });
    t.forEach(x => { x.avg = x.members.length ? Math.round(x.score / x.members.length) : 0; });
    return t.sort((a, b) => b.avg - a.avg || b.correct - a.correct);
  }
  const teamBoardHTML = (g, ps, fin) => {
    const ts = teamStand(g, ps); if (!ts.length) return '';
    const max = Math.max(1, ...ts.map(x => x.avg));
    return `<div class="card team-board"><div class="card-head"><h3>${fin ? '🏆 Juara Tim' : '👥 Klasemen Tim'}</h3><span class="small muted">rata-rata poin anggota</span></div>
      ${ts.map((x, i) => { const T = TEAMS[x.team]; return `<div class="tb-row" style="--tc:${T.c}"><span class="tb-rk">${fin && i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><span class="tb-nm">${T.e} ${T.n}<small>${x.members.length} anggota: ${x.members.map(p => esc(p.nickname)).join(', ') || '–'}</small></span><div class="tb-bar"><i style="width:${Math.round(x.avg / max * 100)}%"></i></div><b class="tb-sc">${x.avg.toLocaleString('id-ID')}</b></div>`; }).join('')}</div>`;
  };
  const teamDot = p => p.team !== null && p.team !== undefined && TEAMS[p.team] ? `<span title="${TEAMS[p.team].n}">${TEAMS[p.team].e}</span> ` : '';
  const gameClassIds = g => (g.settings && g.settings.classIds && g.settings.classIds.length ? g.settings.classIds : g.classId ? [g.classId] : []);
  const gameClassNames = g => gameClassIds(g).map(id => S.cls(id)).filter(Boolean).map(c => c.name).join(', ');
  function renderHost0(d) {
    const g = d.game, ps = d.players, total = d.questions.length, box = $('#host');
    if (!box) return;
    if (g.settings.mode === 'exam') return renderExamHost(d, box);
    setTitle('🎮 ' + esc(g.title), `${total} soal · ${g.settings.time} detik/soal${gameClassNames(g) ? ' · Kelas ' + esc(gameClassNames(g)) : ' · nama bebas'}`);
    const link = playLink(g.code);
    const top = `<div class="btns no-print" style="margin-bottom:12px"><a class="btn ghost sm" href="#/kuis">← Semua Kuis</a><button class="btn ghost sm" data-act="fs">⛶ Layar Penuh</button><button class="btn ghost sm" data-act="music">${window.Music && Music.current() ? '🎵 Musik: ' + esc((Music.TRACKS.find(x => x.id === Music.current()) || {}).name || '') : '🎵 Musik'}</button><span class="pill ${GAME_STATUS[g.status][0]}">${GAME_STATUS[g.status][1]}</span></div>`;
    const finished = ps.filter(p => p.finished).length;
    const acc = p => p.answered ? Math.round(p.correct / p.answered * 100) : 0;
    if (g.status === 'lobby') {
      box.innerHTML = top + `<div class="card host-join">
        <div><div class="small muted">Buka di HP: <b>${esc(location.host + location.pathname.replace(/[^/]*$/, ''))}gabung</b> lalu tulis nama & kode</div>
          <div class="host-code">${esc(g.code)}</div>
          <div class="btns" style="margin-top:12px"><button class="btn soft sm" data-act="copy">🔗 Salin Link</button><button class="btn ok sm" data-act="wa">💬 Bagikan ke WhatsApp</button></div></div>
        <div style="text-align:center"><div style="font-size:3.4rem;font-weight:900">${ps.length}</div><div class="muted">pemain bergabung</div>
          <button class="btn lg" data-act="start" ${ps.length ? '' : 'disabled'} style="margin-top:14px">▶ Mulai Kuis</button></div></div>
        <div class="card"><h3>Pemain di ruang tunggu</h3><div class="host-players">${ps.map(p => `<span class="kz-chip" title="Klik untuk mengeluarkan" style="cursor:pointer" data-act="kick" data-id="${p.id}" data-n="${esc(p.nickname)}">${teamDot(p)}${esc(p.avatar || '🙂')} ${esc(p.nickname)}</span>`).join('') || '<span class="muted">Menunggu murid bergabung…</span>'}</div>
          ${[g.settings.teams ? `👥 ${g.settings.teams} tim` : '', g.settings.powerups ? '🎁 Power-up aktif' : '', g.settings.redemption ? '🔁 Soal penebusan aktif' : ''].filter(Boolean).map(x => `<span class="pill">${x}</span>`).join(' ')}</div>`;
      return;
    }
    if (g.status === 'running') {
      const avg = ps.length ? Math.round(ps.reduce((a, p) => a + acc(p), 0) / ps.length) : 0;
      box.innerHTML = top + `<div class="grid g4">
          <div class="card stat"><div class="blob"><span>🔑</span></div><div class="num">${esc(g.code)}</div><div class="lbl">Kode (masih bisa bergabung)</div></div>
          <div class="card stat"><div class="blob"><span>👥</span></div><div class="num">${ps.length}</div><div class="lbl">Pemain</div></div>
          <div class="card stat"><div class="blob"><span>🏁</span></div><div class="num">${finished}/${ps.length}</div><div class="lbl">Sudah selesai</div></div>
          <div class="card stat"><div class="blob"><span>🎯</span></div><div class="num">${avg}%</div><div class="lbl">Rata-rata akurasi</div></div></div>
        ${teamBoardHTML(g, ps) ? `<div style="margin-top:18px">${teamBoardHTML(g, ps)}</div>` : ''}
        <div class="card host-board" style="margin-top:18px"><div class="card-head"><h3>🏆 Papan Peringkat</h3>${finished === ps.length && ps.length ? '<span class="pill ok">Semua sudah selesai</span>' : ''}<button class="btn danger" data-act="end">■ Akhiri Kuis & Umumkan Juara</button></div>
          ${ps.map((p, i) => { const ans = Object.values(p.answers || {}); return `<div class="row-b"><span class="rk">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><span class="kz-av sm">${esc(p.avatar || '🙂')}</span><span class="nm">${teamDot(p)}${esc(p.nickname)}${p.streak > 1 ? ` <span class="kz-streak">🔥${p.streak}</span>` : ''}${p.redeemed ? ` <span class="pill" title="Soal berhasil ditebus">🔁${p.redeemed}</span>` : ''}</span>
            <div class="prog">${Array.from({ length: total }, (_, k) => `<i class="${ans[k] ? (ans[k].ok ? 'ok' : 'no') : ''}"></i>`).join('')}</div><span class="sc">${p.score.toLocaleString('id-ID')}</span><span class="acc">${acc(p)}%</span></div>`; }).join('') || '<p class="muted">Belum ada pemain.</p>'}</div>`;
      return;
    }
    // Selesai: podium & laporan
    const podium = [1, 0, 2].filter(k => ps[k]).map(k => `<div class="kz-pod p${k + 1}"><div class="kz-av lg">${esc(ps[k].avatar || '🙂')}</div><div class="kz-pod-name">${esc(ps[k].nickname)}</div><div class="kz-pod-box"><b>${k + 1}</b><small>${ps[k].score.toLocaleString('id-ID')}</small></div></div>`).join('');
    const linked = ps.filter(p => p.student_id).length;
    box.innerHTML = top + `<div class="card" style="text-align:center"><h2>🏆 Juara Kuis</h2><div class="kz-podium">${podium || '<p class="muted">Tidak ada pemain.</p>'}</div></div>
      ${teamBoardHTML(g, ps, true)}
      <div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(260px,1fr);align-items:start" id="res-grid">
        <div class="card"><div class="card-head"><h3>Hasil Pemain</h3><div class="btns">${g.classId ? `<button class="btn ok sm" data-act="save" ${linked ? '' : 'disabled'}>💾 Simpan sebagai Nilai</button>` : ''}<button class="btn soft sm" data-act="xls">⬇ Excel</button><button class="btn ghost sm" data-act="again">↻ Main Lagi</button></div></div>
          <div class="table-wrap"><table id="res-table"><thead><tr><th class="num">Rank</th><th>Nama</th><th class="num">Poin</th><th class="num">Benar</th><th class="num">Nilai (0–100)</th><th class="num">Beruntun</th></tr></thead><tbody>
          ${ps.map((p, i) => `<tr><td class="num">${i + 1}</td><td>${teamDot(p)}${esc(p.avatar || '')} ${esc(p.nickname)}</td><td class="num"><b>${p.score.toLocaleString('id-ID')}</b></td><td class="num">${p.correct}/${total}</td><td class="num">${Math.round(p.correct / total * 100)}</td><td class="num">🔥${p.best_streak}</td></tr>`).join('')}
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
    setTitle('📝 ' + esc(g.title), `Mode Ujian · ${total} soal · ${set.duration ? set.duration + ' menit' : 'tanpa batas waktu'}${gameClassNames(g) ? ' · Kelas ' + esc(gameClassNames(g)) : ''}`);
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
        <td class="btns">${p.finished ? `<button class="btn ${p.result && p.result.needsReview ? 'soft' : 'ghost'} sm" data-act="review" data-id="${p.id}">📝 Koreksi</button>` : ''}<button class="btn ghost sm" data-act="fix" data-id="${p.id}" title="Atasi masalah peserta ini">🛠</button></td></tr>`;
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
          ${QT.passageHTML(q, { closed: true })}<div class="q-text small">${QT.rich(q.text)}</div><div class="small" style="margin-top:6px">${ansHtml}</div></div>`;
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
    const classes = gameClassIds(g).map(id => S.cls(id)).filter(Boolean);
    if (!classes.length) return toast('Kelas kuis ini tidak ditemukan.', 'bad');
    const cls = classes[0];
    const m = modal(`<h2>Simpan sebagai Nilai</h2>${classes.length > 1 ? `<p class="small" style="margin-top:0">🏫 Nilai disimpan ke <b>${classes.length} kelas</b> (${classes.map(c => esc(c.name)).join(', ')}) — satu asesmen untuk tiap kelas.</p>` : ''}<p class="small muted">${g.settings.mode === 'exam' ? 'Nilai tiap murid = nilai ujian (poin diperoleh ÷ total poin × 100), termasuk hasil koreksi uraian.' : 'Nilai tiap murid = jumlah benar ÷ ' + total + ' soal × 100 (jawaban benar sebagian dihitung sebagian).'} Murid yang tidak ikut dibiarkan kosong.</p>
      <label class="field"><span>Jenis asesmen</span><select id="sv-type">${['formatif', 'slm', 'diagnostik', 'sts', 'sas', 'sat'].map(k => `<option value="${k}">${T[k].name} (${T[k].short})</option>`).join('')}</select></label>
      <label class="field"><span>Mapel</span><select id="sv-subj">${s.subjects.map(x => `<option value="${x.id}" ${(g.subjectId || s.ui.subjectId) === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Judul</span><input id="sv-title" value="${esc((g.settings.mode === 'exam' ? '' : 'Kuis Seru — ') + g.title)}"></label>
      <div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn ok" id="sv-ok">Simpan Nilai</button></div>`);
    $('#sv-ok', m).onclick = () => {
      const type = $('#sv-type', m).value;
      const made = [];
      let n = 0;
      const isExam = g.settings.mode === 'exam';
      classes.forEach(cls => {
      const a = Object.assign({ id: S.uid('a'), type, title: $('#sv-title', m).value.trim() || g.title, classId: cls.id, subjectId: $('#sv-subj', m).value, tpIds: [], date: new Date().toISOString().slice(0, 10), periode: S.periode(), created: Date.now() }, ownerStamp());
      s.assessments.push(a); made.push(a);
      d.players.forEach(p => {
        if (!p.student_id || !cls.students.some(x => x.id === p.student_id)) return;
        const v = isExam ? p.exam_score : total ? Math.round(graded.reduce((t, q) => { const a = (p.answers || {})[q.id]; return t + (a ? (a.f !== undefined ? +a.f : a.ok ? 1 : 0) : 0); }, 0) / total * 100) : 0;
        if (v === null || v === undefined) return;
        S.setScore(a.id, p.student_id, Math.round(v * 100) / 100); n++;
      });
      });
      S.save(); closeModal(); toast(n + ' nilai disimpan ke ' + T[type].name + (made.length > 1 ? ' (' + made.length + ' kelas)' : '') + '.');
      s.ui.classId = made[0].classId; s.ui.subjectId = made[0].subjectId;
      location.hash = '#/asesmen/' + type + '/' + made[0].id;
    };
  }

  /* ================= Menu kecil (popover) ================= */
  function popMenu(anchor, items) {
    closePop();
    const r = anchor.getBoundingClientRect();
    const el = document.createElement('div'); el.className = 'pop-menu'; el.id = 'pop-menu';
    el.innerHTML = items.filter(Boolean).map((it, k) => it === '-' ? '<hr>' : `<button data-k="${k}" class="${it.danger ? 'danger' : ''}"><span>${it.ic || ''}</span>${esc(it.label)}${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</button>`).join('');
    document.body.appendChild(el);
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
    el.style.top = (r.bottom + h + 8 > window.innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
    const list = items.filter(Boolean);
    $$('button[data-k]', el).forEach(b => b.onclick = e => { e.stopPropagation(); const it = list[+b.dataset.k]; closePop(); it.run && it.run(); });
    // tutup saat klik di luar; pendengar lama dilepas agar tidak menutup menu berikutnya
    const off = () => closePop();
    el._off = off;
    setTimeout(() => { if (el.isConnected) document.addEventListener('click', off, { once: true }); }, 0);
  }
  function closePop() { const p = $('#pop-menu'); if (p) { if (p._off) document.removeEventListener('click', p._off); p.remove(); } }
  window.addEventListener('hashchange', closePop);

  /* ================= Perpustakaan soal ================= */
  const lib = { q: '', owner: 'all', folder: '', sort: 'new', view: 'grid', usage: null, usageAt: 0 };
  const SUBJ_EMOJI = [[/matemat|mtk|hitung|bilangan|pecahan|geometri/i, '🔢'], [/ipa|sains|fisika|kimia|biologi|tumbuh|hewan|energi|listrik/i, '🔬'], [/ips|sejarah|geografi|ekonomi|peta/i, '🌏'], [/inggris|english/i, '🇬🇧'], [/arab/i, '🕌'], [/agama|fiqih|akidah|quran|islam|kristen|katolik|hindu|buddha/i, '🕌'],
    [/pancasila|pkn|ppkn|kewarga/i, '🦅'], [/bahasa|indonesia|teks|cerpen|puisi|membaca/i, '📖'], [/seni|budaya|musik|tari|rupa/i, '🎨'], [/pjok|olahraga|jasmani/i, '⚽'], [/informatika|tik|komputer|koding/i, '💻'], [/jawa|sunda|daerah|mulok/i, '🏮']];
  const coverEmoji = q => { const t = q.title + ' ' + (q.questions[0] ? q.questions[0].text : ''); const m = SUBJ_EMOJI.find(x => x[0].test(t)); return m ? m[1] : '📝'; };
  const coverHue = q => { let h = 0; for (const c of String(q.title)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; };
  const coverImg = q => { const x = q.questions.find(y => y.image) || q.questions.find(y => y.passage && y.passage.image); return x ? (x.image || x.passage.image) : null; };
  function coverHTML(q, big) {
    const img = coverImg(q), hue = coverHue(q);
    return `<div class="lib-cover ${big ? 'big' : ''}" style="--ch:${hue}">${img ? `<img src="${img}" alt="">` : `<span class="lib-em">${coverEmoji(q)}</span>`}<span class="lib-n">${q.questions.length} soal</span></div>`;
  }
  async function libUsage() {
    if (S.mode !== 'server') return {};
    if (lib.usage && Date.now() - lib.usageAt < 60000) return lib.usage;
    try { const d = await S.api('monitor'); const u = {}; d.games.forEach(g => { if (g.qsetId) { (u[g.qsetId] = u[g.qsetId] || { games: 0, players: 0, last: '' }); u[g.qsetId].games++; u[g.qsetId].players += g.players; if (String(g.createdAt) > u[g.qsetId].last) u[g.qsetId].last = g.createdAt; } }); lib.usage = u; lib.usageAt = Date.now(); return u; } catch (e) { return {}; }
  }
  const usedAsm = q => st().assessments.filter(a => a.qsetId === q.id);
  function startMenu(anchor, q) {
    popMenu(anchor, [
      { ic: '🎮', label: 'Kuis Permainan', sub: 'poin, peringkat, podium', run: () => gameAvailable() ? newGameModal({ qsetId: q.id, mode: 'game' }) : toast('Kuis Seru butuh versi server.', 'bad') },
      { ic: '📝', label: 'Ujian (Kuis Mode Ujian)', sub: 'timer, pengawasan, semua jenis soal', run: () => gameAvailable() ? newGameModal({ qsetId: q.id, mode: 'exam' }) : toast('Kuis Seru butuh versi server.', 'bad') },
      { ic: '🔑', label: 'Asesmen + Token', sub: 'SLM/STS/SAS… nilai masuk rapor', run: () => useQset(q.id) },
      '-',
      { ic: '👁', label: 'Pratinjau', run: () => previewQset(q) }
    ]);
  }
  function moreMenu(anchor, q, after) {
    const can = canEditQset(q);
    popMenu(anchor, [
      { ic: '📄', label: 'Buka detail', run: () => { location.hash = '#/perpustakaan/' + q.id; } },
      can && { ic: '✏️', label: 'Edit soal', run: () => { location.hash = '#/bank-soal/' + q.id; } },
      { ic: '⧉', label: 'Duplikat', sub: can ? '' : 'salinan jadi milik Anda', run: () => { const c = dupQset(q); toast('Salinan dibuat.'); location.hash = '#/perpustakaan/' + c.id; } },
      can && { ic: '📁', label: 'Pindahkan ke folder', run: () => folderModal(q, after) },
      { ic: '📊', label: 'Lihat hasil ujiannya', run: () => { location.hash = '#/hasil?qs=' + q.id; } },
      can && '-',
      can && { ic: '🗑', label: 'Hapus', danger: true, run: async () => {
        if (!await confirmBox(`Hapus paket soal <b>${esc(q.title)}</b>? Asesmen yang memakainya tetap ada, tetapi tidak bisa dikerjakan online lagi.`, 'Hapus')) return;
        st().questionSets = st().questionSets.filter(x => x !== q); st().assessments.forEach(a => { if (a.qsetId === q.id) a.qsetId = ''; }); S.save(); location.hash = '#/perpustakaan'; route();
      } }
    ]);
  }
  function folderModal(q, after) {
    const folders = [...new Set(st().questionSets.map(x => x.folder).filter(Boolean))].sort();
    const m = modal(`<h2>📁 Pindahkan ke folder</h2><p class="small muted" style="margin-top:0">"${esc(q.title)}"</p>
      <div class="pz-nums">${['', ...folders].map(f => `<label class="pz-num"><input type="radio" name="fd" value="${esc(f)}" ${(q.folder || '') === f ? 'checked' : ''}><span style="padding:0 12px">${f ? '📁 ' + esc(f) : 'Tanpa folder'}</span></label>`).join('')}</div>
      <label class="field" style="margin-top:12px"><span>…atau folder baru</span><input id="fd-new" placeholder="mis. Kelas 7 · Semester Genap"></label>
      <div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="fd-ok">Pindahkan</button></div>`);
    $('#fd-ok', m).onclick = () => { const nv = $('#fd-new', m).value.trim(); const pick = ($('input[name=fd]:checked', m) || {}).value || ''; q.folder = (nv || pick).slice(0, 60) || undefined; if (!q.folder) delete q.folder; S.save(); closeModal(); toast(q.folder ? 'Dipindahkan ke folder ' + q.folder + '.' : 'Dikeluarkan dari folder.'); after ? after() : route(); };
  }
  function viewLibrary(id) {
    if (id) return viewLibraryItem(id);
    setTitle('📚 Perpustakaan Soal', 'Semua paket soal sekolah — cari, pratinjau, mulai kuis/ujian, atau atur dalam folder');
    renderCtx(false);
    const s = st(), me = S.mode === 'server' && S.user ? S.user.id : null;
    const all = s.questionSets;
    const folders = [...new Set(all.map(x => x.folder).filter(Boolean))].sort();
    const cnt = f => all.filter(f).length;
    const side = `<div class="card lib-side">
        <button class="btn" style="width:100%" data-act="lib-new">＋ Buat Paket Soal</button>
        <a class="btn soft" style="width:100%;margin-top:8px" href="#/bank-soal">⬆ Unggah PDF / Teks</a>
        <div class="lib-nav">
          <button class="${lib.owner === 'all' && !lib.folder ? 'on' : ''}" data-act="lib-f" data-o="all" data-f="">📚 Semua <span>${all.length}</span></button>
          ${me ? `<button class="${lib.owner === 'mine' && !lib.folder ? 'on' : ''}" data-act="lib-f" data-o="mine" data-f="">👤 Milik saya <span>${cnt(q => q.ownerId === me)}</span></button>
          <button class="${lib.owner === 'others' && !lib.folder ? 'on' : ''}" data-act="lib-f" data-o="others" data-f="">👥 Guru lain <span>${cnt(q => q.ownerId !== me)}</span></button>` : ''}
          <div class="lib-nav-h">📁 Folder</div>
          ${folders.map(f => `<button class="${lib.folder === f ? 'on' : ''}" data-act="lib-f" data-o="all" data-f="${esc(f)}">📁 ${esc(f)} <span>${cnt(q => q.folder === f)}</span></button>`).join('') || '<div class="small muted" style="padding:4px 10px">Belum ada folder. Pakai menu ⋯ → Pindahkan ke folder.</div>'}
        </div></div>`;
    const html = `<div class="lib-wrap">${side}<div class="lib-main">
        <div class="lib-tools"><input id="lb-q" type="search" placeholder="🔎 Cari judul, isi soal, guru…" value="${esc(lib.q)}">
          <select id="lb-sort">${[['new', 'Terbaru'], ['az', 'Judul A–Z'], ['used', 'Paling sering dipakai'], ['many', 'Soal terbanyak']].map(([v, l]) => `<option value="${v}" ${lib.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <div class="tabs" style="margin:0"><button class="${lib.view === 'grid' ? 'on' : ''}" data-act="lib-v" data-v="grid" title="Kartu">▦</button><button class="${lib.view === 'list' ? 'on' : ''}" data-act="lib-v" data-v="list" title="Daftar">☰</button></div></div>
        <div id="lb-list"></div></div></div>`;
    const draw = (usage) => {
      const words = lib.q.toLowerCase().split(/\s+/).filter(Boolean);
      let list = all.filter(q => (lib.owner !== 'mine' || q.ownerId === me) && (lib.owner !== 'others' || q.ownerId !== me) && (!lib.folder || q.folder === lib.folder));
      if (words.length) list = list.filter(q => { const hay = [q.title, q.ownerName, q.folder].concat(q.questions.map(x => x.text)).join(' ').toLowerCase(); return words.every(w => hay.indexOf(w) >= 0); });
      const used = q => usedAsm(q).length + ((usage[q.id] || {}).games || 0);
      list = list.slice().sort((a, b) => lib.sort === 'az' ? a.title.localeCompare(b.title) : lib.sort === 'used' ? used(b) - used(a) : lib.sort === 'many' ? b.questions.length - a.questions.length : (b.created || 0) - (a.created || 0));
      const types = q => [...new Set(q.questions.map(x => x.type))];
      const box = $('#lb-list'); if (!box) return;
      if (!list.length) { box.innerHTML = `<div class="card empty"><div class="big">📭</div>${all.length ? 'Tidak ada paket soal yang cocok.' : 'Perpustakaan masih kosong. Buat paket soal baru atau unggah PDF soal.'}</div>`; return; }
      box.innerHTML = lib.view === 'grid'
        ? `<div class="lib-grid">${list.map(q => `<div class="lib-card" data-open="${q.id}">${coverHTML(q)}
            <div class="lib-body"><b class="lib-title">${esc(q.title)}</b>
              <div class="lib-meta">${types(q).slice(0, 5).map(t => `<span title="${esc(TYPE_LABEL[t])}">${QT.TYPES[t].icon}</span>`).join('')}${types(q).length > 5 ? `<span>+${types(q).length - 5}</span>` : ''}</div>
              <div class="lib-sub">${q.ownerName ? '👤 ' + esc(q.ownerName) + ' · ' : ''}${q.created ? new Date(q.created).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}${used(q) ? ` · ▶ ${used(q)}× dipakai` : ''}${q.folder ? ' · 📁 ' + esc(q.folder) : ''}</div>
              <div class="lib-act"><button class="btn sm" data-start="${q.id}">▶ Mulai</button><button class="btn ghost sm" data-prev="${q.id}" title="Pratinjau">👁</button><button class="btn ghost sm" data-more="${q.id}" title="Lainnya">⋯</button></div></div></div>`).join('')}</div>`
        : `<div class="card"><div class="lib-rows">${list.map(q => `<div class="lib-row" data-open="${q.id}">${coverHTML(q)}<div style="flex:1;min-width:0"><b class="lib-title">${esc(q.title)}</b><div class="lib-sub">${q.questions.length} soal · ${types(q).map(t => QT.TYPES[t].icon).join(' ')}${q.ownerName ? ' · 👤 ' + esc(q.ownerName) : ''}${used(q) ? ` · ▶ ${used(q)}×` : ''}${q.folder ? ' · 📁 ' + esc(q.folder) : ''}</div></div>
            <div class="lib-act"><button class="btn sm" data-start="${q.id}">▶ Mulai</button><button class="btn ghost sm" data-more="${q.id}">⋯</button></div></div>`).join('')}</div></div>`;
      $$('[data-open]', box).forEach(c => c.onclick = e => { if (e.target.closest('button')) return; location.hash = '#/perpustakaan/' + c.dataset.open; });
      $$('[data-start]', box).forEach(b => b.onclick = e => { e.stopPropagation(); startMenu(b, S.qset(b.dataset.start)); });
      $$('[data-prev]', box).forEach(b => b.onclick = e => { e.stopPropagation(); previewQset(S.qset(b.dataset.prev)); });
      $$('[data-more]', box).forEach(b => b.onclick = e => { e.stopPropagation(); moreMenu(b, S.qset(b.dataset.more)); });
    };
    return {
      html,
      async mount(v) {
        draw({});
        $('#lb-q', v).oninput = e => { lib.q = e.target.value; draw(lib.usage || {}); };
        $('#lb-sort', v).onchange = e => { lib.sort = e.target.value; draw(lib.usage || {}); };
        const u = await libUsage(); if ($('#lb-list')) draw(u);
      },
      actions: {
        'lib-f': el => { lib.owner = el.dataset.o; lib.folder = el.dataset.f; route(); },
        'lib-v': el => { lib.view = el.dataset.v; route(); },
        'lib-new': () => { location.hash = '#/bank-soal'; setTimeout(() => { const g = $('.qt-picker'); if (g) g.scrollIntoView({ behavior: 'smooth' }); }, 300); }
      }
    };
  }
  function viewLibraryItem(id) {
    const q = S.qset(id);
    if (!q) { location.hash = '#/perpustakaan'; return { html: '' }; }
    setTitle('📚 ' + esc(q.title), 'Perpustakaan Soal');
    renderCtx(false);
    const can = canEditQset(q), pts = q.questions.reduce((t, x) => t + (+x.points || 0), 0);
    const asms = usedAsm(q);
    return {
      html: `<div class="btns no-print" style="margin-bottom:12px"><a class="btn ghost sm" href="#/perpustakaan">← Perpustakaan</a></div>
        <div class="card lib-hero">${coverHTML(q, true)}<div style="flex:1;min-width:0">
          <h2 style="margin:0 0 6px">${esc(q.title)}</h2>
          <div class="btns" style="gap:6px">${[...new Set(q.questions.map(x => x.type))].map(t => `<span class="pill">${QT.TYPES[t].icon} ${TYPE_LABEL[t]} ${q.questions.filter(x => x.type === t).length}</span>`).join('')}</div>
          <p class="small muted" style="margin:8px 0">${q.questions.length} soal · ${fmt(pts)} poin${q.ownerName ? ' · 👤 ' + esc(q.ownerName) : ''}${q.created ? ' · dibuat ' + new Date(q.created).toLocaleDateString('id-ID') : ''}${q.folder ? ' · 📁 ' + esc(q.folder) : ''}${q.source ? ' · 📄 ' + esc(q.source) : ''}</p>
          <div class="btns"><button class="btn lg" data-act="li-start">▶ Mulai</button>${can ? `<a class="btn soft" href="#/bank-soal/${q.id}">✏️ Edit</a>` : ''}<button class="btn ghost" data-act="li-dup">⧉ Duplikat</button><button class="btn ghost" data-act="li-more">⋯</button></div>
        </div></div>
        <div class="grid" style="grid-template-columns:minmax(0,1fr) 320px;align-items:start" id="li-grid">
          <div><div class="card-head" style="margin:6px 0 10px"><h3 style="margin:0">❓ Daftar Soal</h3><label class="small" style="display:flex;gap:6px;align-items:center;margin-left:auto"><input type="checkbox" id="li-key" checked> Tampilkan kunci</label></div>
            ${q.instructions ? QT.instructionsHTML(q.instructions, []) : ''}
            <div id="li-qs">${q.questions.map((x, k) => previewCard(x, k, q.questions)).join('')}</div></div>
          <div><div class="card"><h3>📊 Riwayat pemakaian</h3><div id="li-use" class="small muted">Memuat…</div></div></div>
        </div>`,
      async mount(v) {
        if (window.innerWidth < 1000) $('#li-grid', v).style.gridTemplateColumns = '1fr';
        mountPreviews(v, q.questions);
        $('#li-key', v).onchange = e => v.classList.toggle('hide-keys', !e.target.checked);
        const usage = S.mode === 'server' ? await S.api('monitor').catch(() => null) : null;
        const games = usage ? usage.games.filter(g => g.qsetId === q.id) : [];
        const items = asms.map(a => ({ t: a.title, sub: (T[a.type] ? T[a.type].short : '') + ' · ' + ((S.cls(a.classId) || {}).name || '–'), when: a.date || '', href: '#/hasil/a/' + a.id }))
          .concat(games.map(g => ({ t: g.title, sub: (g.mode === 'exam' ? '📝 Mode Ujian' : '🎮 Permainan') + ' · ' + g.players + ' peserta', when: String(g.createdAt || '').slice(0, 10), href: '#/hasil/g/' + g.id })))
          .sort((a, b) => String(b.when).localeCompare(String(a.when)));
        const box = $('#li-use', v); if (!box) return;
        box.classList.remove('muted');
        box.innerHTML = items.length ? items.map(x => `<a class="lib-use" href="${x.href}"><b>${esc(x.t)}</b><span>${esc(x.sub)}${x.when ? ' · ' + esc(x.when) : ''}</span></a>`).join('') : '<p class="muted">Belum pernah dipakai. Tekan ▶ Mulai untuk memakainya.</p>';
      },
      actions: {
        'li-start': el => startMenu(el, q),
        'li-dup': () => { const c = dupQset(q); toast('Salinan dibuat.'); location.hash = '#/perpustakaan/' + c.id; },
        'li-more': el => moreMenu(el, q)
      }
    };
  }

  /* ================= Hasil ujian (laporan) ================= */
  const rep = { q: '', kind: '', cls: '', subj: '', days: '0', mine: false, qs: '' };
  const scoreClass2 = (v, kktp) => !C.isNum(v) ? '' : v >= 85 ? 'ok' : v >= kktp ? 'pri' : v >= kktp - 15 ? 'warn' : 'bad';
  function reportItems(d) {
    const s = st();
    if (d) {
      const tokGroups = [], seen = {};
      d.tokens.forEach(t => { const k = t.linkId ? 'L' + t.linkId : 'A' + t.id; if (seen[k]) { const g = seen[k]; g.classes = g.classes.concat(t.classes); g.classIds.push(t.classId); g.finished += t.finished; g.expected += t.expected; if (t.avg !== null) { g._s += t.avg * t.finished; g._n += t.finished; } if (String(t.lastAt || '') > String(g.lastAt || '')) g.lastAt = t.lastAt; return; } const g = Object.assign({}, t, { classIds: [t.classId], _s: t.avg !== null ? t.avg * t.finished : 0, _n: t.avg !== null ? t.finished : 0 }); seen[k] = g; tokGroups.push(g); });
      tokGroups.forEach(g => { g.avg = g._n ? Math.round(g._s / g._n * 10) / 10 : null; });
      return d.games.map(g => ({ kind: 'g', id: g.id, title: g.title, mode: g.mode, live: g.status !== 'ended', when: g.endedAt || g.startedAt || g.createdAt, classes: g.classes, classIds: g.classIds || [], subjectId: g.subjectId, qsetId: g.qsetId, n: g.players, done: g.finished, expected: g.expected, score: g.mode === 'exam' ? g.avg : g.acc, owner: g.owner, ownerId: g.ownerId, code: g.code }))
        .concat(tokGroups.filter(t => t.finished > 0 || t.open).map(t => ({ kind: 'a', id: t.id, title: t.title, mode: 'token', type: t.type, live: t.open, when: t.lastAt || t.date, classes: t.classes, classIds: t.classIds, subjectId: t.subjectId, qsetId: t.qsetId, n: t.finished, done: t.finished, expected: t.expected, score: t.avg, owner: t.owner, ownerId: t.ownerId, code: t.code })));
    }
    // mode lokal: dari data di browser
    return s.assessments.filter(a => Object.keys(s.submissions[a.id] || {}).length).map(a => { const sb = Object.values(s.submissions[a.id]); return { kind: 'a', id: a.id, title: a.title, mode: 'token', type: a.type, live: false, when: a.date, classes: [(S.cls(a.classId) || {}).name || ''], classIds: [a.classId], subjectId: a.subjectId, qsetId: a.qsetId, n: sb.length, done: sb.length, expected: (S.cls(a.classId) || { students: [] }).students.length, score: C.mean(sb.map(x => x.result.score)) }; });
  }
  function viewReports(sub, id) {
    if (sub === 'g' || sub === 'a') return viewReport(sub, id);
    const qsParam = (location.hash.match(/[?&]qs=([^&]+)/) || [])[1]; rep.qs = qsParam || '';
    setTitle('📊 Hasil Ujian', 'Laporan setiap ujian & kuis: nilai murid, peringkat, dan analisis tiap soal');
    renderCtx(false);
    const s = st();
    const html = `<div class="card rep-filters no-print">
        <input id="rp-q" type="search" placeholder="🔎 Cari judul…" value="${esc(rep.q)}">
        <select id="rp-kind"><option value="">Semua jenis</option><option value="token" ${rep.kind === 'token' ? 'selected' : ''}>🔑 Ujian token / asesmen</option><option value="exam" ${rep.kind === 'exam' ? 'selected' : ''}>📝 Kuis Mode Ujian</option><option value="game" ${rep.kind === 'game' ? 'selected' : ''}>🎮 Kuis Permainan</option></select>
        <select id="rp-cls"><option value="">Semua kelas</option>${s.classes.map(c => `<option value="${c.id}" ${rep.cls === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        <select id="rp-subj"><option value="">Semua mapel</option>${s.subjects.map(c => `<option value="${c.id}" ${rep.subj === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        <select id="rp-days">${[['0', 'Semua waktu'], ['7', '7 hari terakhir'], ['30', '30 hari terakhir'], ['90', '3 bulan terakhir']].map(([v, l]) => `<option value="${v}" ${rep.days === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        ${S.mode === 'server' ? `<label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="rp-mine" ${rep.mine ? 'checked' : ''}> Milik saya</label>` : ''}
        ${rep.qs && S.qset(rep.qs) ? `<span class="pill pri">📚 ${esc(S.qset(rep.qs).title)} <a href="#/hasil" style="margin-left:6px">✕</a></span>` : ''}
      </div><div id="rp-list" class="muted">Memuat…</div>`;
    let items = [];
    const draw = () => {
      const words = rep.q.toLowerCase().split(/\s+/).filter(Boolean), cut = +rep.days ? Date.now() - rep.days * 86400000 : 0;
      const list = items.filter(x => (!words.length || words.every(w => x.title.toLowerCase().indexOf(w) >= 0)) && (!rep.kind || x.mode === rep.kind) && (!rep.cls || x.classIds.indexOf(rep.cls) >= 0) && (!rep.subj || x.subjectId === rep.subj)
        && (!cut || new Date(String(x.when).replace(' ', 'T')).getTime() >= cut) && (!rep.mine || +x.ownerId === +(S.user || {}).id) && (!rep.qs || x.qsetId === rep.qs))
        .sort((a, b) => (b.live - a.live) || String(b.when || '').localeCompare(String(a.when || '')));
      const box = $('#rp-list'); if (!box) return;
      box.classList.remove('muted');
      const kktp = st().settings.kktp;
      box.innerHTML = list.length ? `<div class="small muted" style="margin:4px 0 8px">${list.length} laporan</div>` + list.map(x => {
        const sc = C.isNum(x.score) ? x.score : null;
        return `<a class="rep-row" href="#/hasil/${x.kind}/${x.id}">
          <div class="rep-ring ${scoreClass2(sc, kktp)}" style="--p:${sc || 0}"><span>${sc !== null ? Math.round(sc) + (x.mode === 'game' ? '%' : '') : '–'}</span></div>
          <div style="flex:1;min-width:0"><b class="ellipsis" style="display:block">${esc(x.title)}</b>
            <div class="small muted">${x.mode === 'token' ? '🔑 ' + (T[x.type] ? T[x.type].short : 'Token') : x.mode === 'exam' ? '📝 Mode Ujian' : '🎮 Permainan'} · ${x.when ? tgl(x.when) : '–'} · 🏫 ${esc(x.classes.filter(Boolean).join(', ') || 'nama bebas')}${x.owner ? ' · 👤 ' + esc(x.owner) : ''}</div></div>
          <div class="rep-cnt"><b>${x.done}${x.expected ? '/' + x.expected : ''}</b><small>${x.mode === 'game' ? 'selesai' : 'mengumpulkan'}</small></div>
          ${x.live ? '<span class="pill ok mon-live">● berjalan</span>' : ''}<span class="rep-go">›</span></a>`;
      }).join('') : `<div class="card empty"><div class="big">📭</div>${items.length ? 'Tidak ada laporan yang cocok dengan filter.' : 'Belum ada hasil ujian. Mulai ujian atau kuis dari menu <a href="#/perpustakaan">Perpustakaan</a>.'}</div>`;
    };
    return {
      html,
      async mount(v) {
        const d = S.mode === 'server' ? await S.api('monitor').catch(e => { toast(e.message, 'bad'); return null; }) : null;
        items = reportItems(d);
        draw();
        const bind = (sel, key, ev) => { const el = $(sel, v); if (el) el['on' + (ev || 'change')] = e => { rep[key] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; draw(); }; };
        bind('#rp-q', 'q', 'input'); bind('#rp-kind', 'kind'); bind('#rp-cls', 'cls'); bind('#rp-subj', 'subj'); bind('#rp-days', 'days'); bind('#rp-mine', 'mine');
      }
    };
  }

  /** Data laporan yang seragam untuk kuis & ujian token. */
  async function loadReport(kind, id) {
    const s = st(), kktp = s.settings.kktp;
    const clsOfStudent = sid => s.classes.find(c => c.students.some(m => m.id === sid));
    if (kind === 'g') {
      const d = await S.api('games/' + id);
      const g = d.game, isExam = g.settings.mode === 'exam', qs = d.questions;
      const graded = qs.filter(q => q.type !== 'slide' && q.type !== 'polling');
      const rows = d.players.map(p => {
        const ans = {}, det = {};
        Object.keys(p.answers || {}).forEach(k => { const v = p.answers[k]; ans[k] = v && typeof v === 'object' ? v.a : v; });
        if (isExam && p.result) p.result.detail.forEach(x => { det[x.id] = x; });
        else qs.forEach(q => { const v = (p.answers || {})[q.id]; if (!v || typeof v !== 'object') { det[q.id] = { status: 'kosong', got: 0, pts: 1 }; return; } const f = v.f !== undefined ? +v.f : v.ok ? 1 : 0; det[q.id] = { status: v.info ? 'tidak dinilai' : f >= 1 ? 'benar' : f > 0 ? 'sebagian' : (v.a ? 'salah' : 'kosong'), got: f, pts: 1 }; });
        const score = isExam ? p.exam_score : graded.length ? Math.round(graded.reduce((t, q) => t + (det[q.id] ? +det[q.id].got || 0 : 0), 0) / graded.length * 1000) / 10 : 0;
        const c = p.student_id ? clsOfStudent(p.student_id) : null;
        const secs = isExam ? (p.finished_at && p.started_ms ? Math.max(0, Math.round((new Date(String(p.finished_at).replace(' ', 'T')).getTime() - p.started_ms) / 1000)) : null) : Math.round(Object.values(p.answers || {}).reduce((t, v) => t + ((v && v.ms) || 0), 0) / 1000);
        return { id: p.id, name: p.nickname, cls: c ? c.name : '', sid: p.student_id, score: isExam && !p.finished ? null : score, points: isExam ? null : p.score, finished: p.finished, ans, det, secs, violations: p.violations, review: isExam && p.finished ? () => examReviewModal({ data: d, load: () => route() }, p.id) : null };
      });
      const cids = g.settings.classIds && g.settings.classIds.length ? g.settings.classIds : g.classId ? [g.classId] : [];
      const joined = new Set(d.players.map(p => p.student_id).filter(Boolean));
      const notDone = [].concat(...cids.map(cid => { const c = S.cls(cid); return c ? c.students.filter(m => !joined.has(m.id)).map(m => ({ name: m.name, cls: c.name })) : []; }));
      return { title: g.title, kind, mode: isExam ? 'exam' : 'game', when: g.endedAt || g.startedAt || g.createdAt, classes: cids.map(cid => (S.cls(cid) || {}).name).filter(Boolean), questions: qs, rows, notDone, kktp, live: g.status !== 'ended', link: '#/kuis/' + g.id, scoreLabel: isExam ? 'Nilai' : 'Akurasi', game: d };
    }
    await S.pull(true).catch(() => {});
    const a0 = S.asm(id); if (!a0) throw new Error('Asesmen tidak ditemukan.');
    const group = a0.linkId ? s.assessments.filter(x => x.linkId === a0.linkId) : [a0];
    const q = S.qset(a0.qsetId); const qs = q ? q.questions : [];
    const rows = [], notDone = [];
    group.forEach(a => {
      const c = S.cls(a.classId); if (!c) return;
      const subs = s.submissions[a.id] || {};
      c.students.forEach(m => {
        const sb = subs[m.id];
        if (!sb) { notDone.push({ name: m.name, cls: c.name }); return; }
        const det = {}; ((sb.result || {}).detail || []).forEach(x => { det[x.id] = x; });
        rows.push({ id: m.id, name: m.name, cls: c.name, sid: m.id, score: sb.result ? sb.result.score : null, finished: true, ans: sb.answers || {}, det, secs: sb.duration, review: () => reviewModal(a, m.id, () => route()) });
      });
    });
    return { title: a0.title, kind, mode: 'token', type: a0.type, when: a0.date, classes: group.map(a => (S.cls(a.classId) || {}).name).filter(Boolean), questions: qs, rows, notDone, kktp, live: !!a0.examOpen, link: '#/asesmen/' + a0.type + '/' + a0.id, scoreLabel: 'Nilai' };
  }
  let repTab = 'peserta', repSort = 'score';
  function viewReport(kind, id) {
    setTitle('📊 Laporan Hasil Ujian', 'Memuat…');
    renderCtx(false);
    const out = {
      html: `<div class="btns no-print" style="margin-bottom:12px"><a class="btn ghost sm" href="#/hasil">← Semua hasil</a><span id="rp-actions" class="btns" style="margin-left:auto"></span></div><div id="rp" class="muted">Memuat laporan…</div>`,
      async mount(v) {
        let R; try { R = await loadReport(kind, id); } catch (e) { $('#rp', v).innerHTML = `<div class="card">${esc(e.message)}</div>`; return; }
        out.R = R; drawReport(R);
      },
      actions: {
        'rp-tab': el => { repTab = el.dataset.t; drawReport(out.R); },
        'rp-sort': el => { repSort = el.dataset.s; drawReport(out.R); },
        'rp-xls': () => exportTable($('#rp-xls-table'), 'Hasil_' + out.R.title),
        'rp-print': () => window.print(),
        'rp-rev': el => { const r = out.R.rows.find(x => String(x.id) === el.dataset.id); if (r && r.review) r.review(); else if (r) answersModal(out.R, r); },
        'rp-save': () => saveGameScores(out.R.game)
      }
    };
    function drawReport(R) {
      const box = $('#rp'); if (!box) return;
      setTitle('📊 ' + esc(R.title), `${R.mode === 'token' ? '🔑 Asesmen/Token' : R.mode === 'exam' ? '📝 Kuis Mode Ujian' : '🎮 Kuis Permainan'} · ${R.when ? tgl(R.when) : ''}${R.classes.length ? ' · Kelas ' + esc(R.classes.join(', ')) : ''}`);
      const graded = R.questions.filter(q => q.type !== 'slide' && q.type !== 'polling');
      const done = R.rows.filter(r => C.isNum(r.score)), scores = done.map(r => r.score);
      const avg = C.mean(scores), tuntas = scores.filter(v => v >= R.kktp).length;
      const isOk = d => d && (d.status === 'benar' || d.status === 'dikoreksi' && +d.got >= +d.pts);
      const qstat = graded.map(q => {
        const ds = done.map(r => r.det[q.id]).filter(Boolean);
        const ok = ds.filter(isOk).length, part = ds.filter(d => d.status === 'sebagian' || (d.status === 'dikoreksi' && +d.got > 0 && +d.got < +d.pts)).length, emp = ds.filter(d => d.status === 'kosong').length, manual = ds.filter(d => d.status === 'perlu koreksi').length;
        const n = done.length, pct = n ? Math.round((ok + part * 0.5) / n * 100) : 0;
        const dist = {};
        if (['pg', 'pgk', 'bs', 'polling'].indexOf(q.type) >= 0) done.forEach(r => { const a = r.ans[q.id]; if (a === undefined || a === null || a === '') return; String(a).split(',').forEach(l => { const k = String(l).trim().toUpperCase(); if (k) dist[k] = (dist[k] || 0) + 1; }); });
        return { q, ok, part, emp, manual, n, pct, dist };
      });
      const hard = qstat.filter(x => x.n && x.pct < 40).length;
      $('#rp-actions').innerHTML = `${R.mode === 'game' || R.mode === 'exam' ? `<a class="btn ghost sm" href="${R.link}">${R.live ? '● Buka layar langsung' : '🖥 Layar kuis'}</a>` : `<a class="btn ghost sm" href="${R.link}">📋 Daftar nilai & token</a>`}${R.game && R.game.game.classId ? '<button class="btn ok sm" data-act="rp-save">💾 Simpan sebagai Nilai</button>' : ''}<button class="btn soft sm" data-act="rp-xls">⬇ Excel</button><button class="btn ghost sm" data-act="rp-print">🖨 Cetak</button>`;
      const tile = (n, l, cls) => `<div class="card stat rep-tile ${cls || ''}"><div class="num">${n}</div><div class="lbl">${l}</div></div>`;
      const rows = R.rows.slice().sort((a, b) => repSort === 'name' ? a.name.localeCompare(b.name) : (C.isNum(b.score) ? b.score : -1) - (C.isNum(a.score) ? a.score : -1));
      const mmss = sec => C.isNum(sec) ? Math.floor(sec / 60) + 'm ' + String(sec % 60).padStart(2, '0') + 'd' : '–';
      const cell = (r, q) => { const d = r.det[q.id]; const st0 = !d ? 'kosong' : isOk(d) ? 'ok' : d.status === 'sebagian' ? 'part' : d.status === 'perlu koreksi' ? 'man' : d.status === 'kosong' ? 'kosong' : d.status === 'tidak dinilai' ? 'na' : 'bad'; return `<i class="hm ${st0}" title="No. ${R.questions.indexOf(q) + 1}: ${esc(d ? d.status : 'kosong')}"></i>`; };
      const pesertaHTML = `<div class="card"><div class="card-head"><h3>👥 Peserta (${R.rows.length})</h3><div class="tabs" style="margin:0"><button class="${repSort === 'score' ? 'on' : ''}" data-act="rp-sort" data-s="score">Urut nilai</button><button class="${repSort === 'name' ? 'on' : ''}" data-act="rp-sort" data-s="name">Urut nama</button></div></div>
        <div class="table-wrap"><table class="rep-table"><thead><tr><th class="num">#</th><th>Nama</th>${R.classes.length > 1 ? '<th>Kelas</th>' : ''}<th class="num">${R.scoreLabel}</th><th class="num">✔</th><th class="num">✖</th><th class="num">○</th><th>Peta jawaban (per soal)</th><th class="num">Waktu</th><th></th></tr></thead><tbody>
        ${rows.map((r, k) => { const vals = graded.map(q => r.det[q.id]); const nOk = vals.filter(isOk).length, nEmp = vals.filter(d => !d || d.status === 'kosong').length; return `<tr>
          <td class="num">${repSort === 'score' && C.isNum(r.score) ? (k < 3 ? ['🥇', '🥈', '🥉'][k] : k + 1) : k + 1}</td><td><b>${esc(r.name)}</b>${r.violations ? ` <span class="pill bad" title="pelanggaran">⚠${r.violations}</span>` : ''}</td>${R.classes.length > 1 ? `<td class="small">${esc(r.cls)}</td>` : ''}
          <td class="num"><span class="pill ${scoreClass2(r.score, R.kktp)}">${C.isNum(r.score) ? fmt(r.score, 1) + (R.mode === 'game' ? '%' : '') : r.finished ? '–' : 'mengerjakan'}</span></td>
          <td class="num">${nOk}</td><td class="num">${graded.length - nOk - nEmp}</td><td class="num">${nEmp}</td>
          <td><div class="hm-row">${graded.map(q => cell(r, q)).join('')}</div></td><td class="num small">${mmss(r.secs)}</td>
          <td><button class="btn ghost sm" data-act="rp-rev" data-id="${esc(r.id)}">${r.review ? '📝 Jawaban' : '👁 Jawaban'}</button></td></tr>`; }).join('') || `<tr><td colspan="10" class="empty">Belum ada yang mengumpulkan.</td></tr>`}
        </tbody></table></div><div class="hm-legend small muted"><span><i class="hm ok"></i>benar</span><span><i class="hm part"></i>sebagian</span><span><i class="hm bad"></i>salah</span><span><i class="hm man"></i>perlu koreksi</span><span><i class="hm kosong"></i>kosong</span></div></div>`;
      const LET = 'ABCDEFGH';
      const soalHTML = `<div class="rep-qs">${qstat.map((x, k) => {
        const q = x.q, no = R.questions.indexOf(q) + 1;
        const keyL = String(q.answer || '').toUpperCase().split(',');
        const optsList = q.type === 'bs' ? [['B', 'Benar'], ['S', 'Salah']] : (q.options || []).map(o => [o.label, o.text]);
        const maxD = Math.max(1, ...Object.values(x.dist));
        return `<div class="card rep-q"><div class="card-head"><span class="qn">${no}</span><span class="pill">${QT.TYPES[q.type] ? QT.TYPES[q.type].icon + ' ' + TYPE_LABEL[q.type] : q.type}</span>
            <span class="pill ${x.pct >= 80 ? 'ok' : x.pct >= 40 ? 'warn' : 'bad'}">${x.pct >= 80 ? '😀 Mudah' : x.pct >= 40 ? '🙂 Sedang' : '😓 Sulit'}</span><b class="rep-pct" style="margin-left:auto">${x.n ? x.pct + '%' : '–'}</b></div>
          <div class="q-text small" style="max-height:4.8em;overflow:hidden">${QT.rich(q.text)}</div>
          <div class="bar" style="margin:8px 0"><i style="width:${x.pct}%"></i></div>
          <div class="small muted">✔ ${x.ok} benar${x.part ? ' · ◐ ' + x.part + ' sebagian' : ''} · ✖ ${Math.max(0, x.n - x.ok - x.part - x.emp - x.manual)} salah · ○ ${x.emp} kosong${x.manual ? ' · ✍ ' + x.manual + ' perlu koreksi' : ''}</div>
          ${optsList.length ? `<div class="rep-dist">${optsList.map(([l, t]) => `<div class="rep-opt ${keyL.indexOf(l) >= 0 ? 'key' : ''}"><span class="lab">${l}</span><span class="rep-ot">${QT.rich(t)}</span><div class="rep-ob"><i style="width:${(x.dist[l] || 0) / maxD * 100}%"></i></div><b>${x.dist[l] || 0}</b></div>`).join('')}</div>` : ''}
        </div>`; }).join('') || '<div class="card empty">Tidak ada soal yang dinilai.</div>'}</div>`;
      const belumHTML = `<div class="card"><h3>⏳ Belum mengerjakan (${R.notDone.length})</h3>${R.notDone.length ? `<div class="btns">${R.notDone.map(m => `<span class="pill">${esc(m.name)}${R.classes.length > 1 ? ' · ' + esc(m.cls) : ''}</span>`).join('')}</div>` : '<p class="muted">Semua murid sudah mengerjakan. 🎉</p>'}</div>`;
      box.classList.remove('muted');
      box.innerHTML = `<div class="grid g4 rep-tiles">
          ${tile(done.length + (R.notDone.length ? '<small>/' + (done.length + R.notDone.length) + '</small>' : ''), 'mengumpulkan')}
          ${tile(C.isNum(avg) ? fmt(avg, 1) + (R.mode === 'game' ? '%' : '') : '–', R.mode === 'game' ? 'akurasi rata-rata' : 'rata-rata nilai', scoreClass2(avg, R.kktp))}
          ${tile(scores.length ? fmt(Math.max(...scores), 1) + ' / ' + fmt(Math.min(...scores), 1) : '–', 'tertinggi / terendah')}
          ${tile(scores.length ? Math.round(tuntas / scores.length * 100) + '%' : '–', `tuntas (≥ KKTP ${R.kktp})`)}
        </div>
        ${hard ? `<div class="note warn" style="margin:0 0 12px">😓 <b>${hard} soal</b> dijawab benar oleh kurang dari 40% murid — pertimbangkan pembahasan ulang atau periksa kunci jawabannya (tab Analisis Soal).</div>` : ''}
        <div class="tabs no-print"><button class="${repTab === 'peserta' ? 'on' : ''}" data-act="rp-tab" data-t="peserta">👥 Peserta</button><button class="${repTab === 'soal' ? 'on' : ''}" data-act="rp-tab" data-t="soal">❓ Analisis Soal</button><button class="${repTab === 'belum' ? 'on' : ''}" data-act="rp-tab" data-t="belum">⏳ Belum mengerjakan <span class="pill">${R.notDone.length}</span></button></div>
        ${repTab === 'soal' ? soalHTML : repTab === 'belum' ? belumHTML : pesertaHTML}
        <table id="rp-xls-table" class="hidden"><thead><tr><th>No</th><th>Nama</th><th>Kelas</th><th>${R.scoreLabel}</th>${graded.map(q => `<th>Soal ${R.questions.indexOf(q) + 1}</th>`).join('')}</tr></thead><tbody>${rows.map((r, k) => `<tr><td>${k + 1}</td><td>${esc(r.name)}</td><td>${esc(r.cls)}</td><td>${C.isNum(r.score) ? r.score : ''}</td>${graded.map(q => { const d = r.det[q.id]; return `<td>${d ? (d.status === 'perlu koreksi' ? '?' : (+d.got || 0)) : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
    }
    return out;
  }
  /** Lihat jawaban satu pemain kuis permainan. */
  function answersModal(R, r) {
    modal(`<h2>${esc(r.name)}</h2><p class="small muted" style="margin-top:0">${R.scoreLabel}: ${C.isNum(r.score) ? fmt(r.score, 1) + (R.mode === 'game' ? '%' : '') : '–'}${r.points !== null && r.points !== undefined ? ' · ' + fmt(r.points) + ' poin' : ''}</p>
      ${R.questions.map((q, k) => { const d = r.det[q.id]; return `<div class="q-card"><div class="q-head"><span class="qn">${k + 1}</span><span class="pill">${TYPE_LABEL[q.type] || q.type}</span><span class="pill ${d && d.status === 'benar' ? 'ok' : d && d.status === 'sebagian' ? 'warn' : 'bad'}">${esc(d ? d.status : 'kosong')}</span></div><div class="q-text small">${QT.rich(q.text)}</div><div class="small" style="margin-top:6px">${QT.answerHTML(q, r.ans[q.id])}</div><div class="small muted">Kunci: ${esc(QT.keyText(q))}</div></div>`; }).join('')}
      <div class="foot"><button class="btn" data-close>Tutup</button></div>`, { wide: true, noFocus: true });
  }

  /* ================= Foto murid ================= */
  const photoCache = {};
  /** Ambil data foto (server: tabel media) → fungsi ref → dataURL. */
  async function photoResolver(refs) {
    const need = [...new Set(refs.filter(r => r && /^media:/.test(r) && !photoCache[r]))];
    if (need.length && S.mode === 'server') {
      for (let k = 0; k < need.length; k += 200) {
        try { const r = await S.api('media-batch', { body: { ids: need.slice(k, k + 200) } }); Object.keys(r.map || {}).forEach(id => { photoCache['media:' + id] = r.map[id]; }); } catch (e) { /* lewati */ }
      }
    }
    return ref => !ref ? null : /^data:/.test(ref) ? ref : (photoCache[ref] || null);
  }
  /** Potong foto 3×4 (wajah biasanya di sepertiga atas), 300×400 px. */
  function cropPhoto(file) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const W = 300, H = 400, r = W / H; let sw = img.width, sh = img.height, sx = 0, sy = 0;
        if (sw / sh > r) { sw = sh * r; sx = (img.width - sw) / 2; } else { sh = sw / r; sy = Math.max(0, (img.height - sh) * 0.25); }
        const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
        URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.84));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Berkas bukan gambar: ' + file.name)); };
      img.src = url;
    });
  }
  async function savePhoto(m, dataUrl) {
    if (S.mode === 'server') { const r = await S.api('photos', { body: { data: dataUrl, replace: m.photo && /^media:/.test(m.photo) ? m.photo : '' } }); m.photo = r.ref; photoCache[r.ref] = dataUrl; }
    else m.photo = dataUrl;
  }
  function pickFiles(accept) {
    return new Promise(res => { const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = accept; inp.onchange = () => res(Array.from(inp.files || [])); inp.click(); });
  }
  const normKey = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\.[a-z0-9]{2,5}$/, '').replace(/[^a-z0-9]/g, '');
  /** Unggah banyak foto sekaligus; dicocokkan otomatis dari nama file (NIS, NISN, atau nama murid). */
  async function photoBulk(classes, done, opt) {
    opt = opt || {};
    const files = (await pickFiles('image/*')).filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name));
    if (!files.length) return;
    const studs = [].concat(...classes.map(c => c.students.map(m => ({ m, c, keys: [m.nis, m.nisn, m.nip].filter(x => x && String(x).replace(/\D/g, '').length >= 4).map(x => String(x).replace(/\D/g, '')), nk: normKey(m.name) }))));
    const match = f => {
      const fk = normKey(f.name), digits = (f.name.match(/\d{4,}/g) || []);
      let hit = studs.find(x => x.keys.some(k => digits.indexOf(k) >= 0));
      if (!hit) hit = studs.find(x => x.nk && x.nk === fk);
      if (!hit) { const cand = studs.filter(x => x.nk && x.nk.length >= 4 && (fk.indexOf(x.nk) >= 0 || x.nk.indexOf(fk) >= 0 && fk.length >= 5)); if (cand.length === 1) hit = cand[0]; }
      return hit || null;
    };
    const rows = files.map(f => ({ f, hit: match(f), url: URL.createObjectURL(f) }));
    const opts = sel => `<option value="">— lewati —</option>${studs.map((x, k) => `<option value="${k}" ${sel === x ? 'selected' : ''}>${esc(x.m.name)}${classes.length > 1 ? ' · ' + esc(x.c.name) : ''}</option>`).join('')}`;
    const m = modal(`<h2>🖼 ${esc(opt.title || 'Pasang Foto Murid')}</h2>
      <p class="small muted" style="margin-top:0">${rows.filter(r => r.hit).length} dari ${rows.length} foto <b>otomatis cocok</b> dari nama file. Periksa, ubah bila perlu, lalu simpan. Foto dipotong otomatis ukuran 3×4.</p>
      <div class="ph-bulk">${rows.map((r, k) => `<div class="ph-item ${r.hit ? 'ok' : ''}"><img src="${r.url}" alt=""><div class="small ellipsis" title="${esc(r.f.name)}">${esc(r.f.name)}</div><select data-k="${k}">${opts(r.hit)}</select></div>`).join('')}</div>
      <div class="foot"><span class="small muted" style="margin-right:auto">${opt.tip || `Tips: beri nama file sesuai NIS/NISN atau nama murid, mis. <span class="kbd">0123456789.jpg</span> / <span class="kbd">Adinda Putri.jpg</span>`}</span><button class="btn ghost" data-close>Batal</button><button class="btn ok" id="ph-ok">💾 Pasang Foto</button></div>`, { wide: true, noFocus: true });
    $$('select[data-k]', m).forEach(sel => sel.onchange = () => { const r = rows[+sel.dataset.k]; r.hit = sel.value === '' ? null : studs[+sel.value]; sel.closest('.ph-item').classList.toggle('ok', !!r.hit); });
    $('#ph-ok', m).onclick = async () => {
      const todo = rows.filter(r => r.hit); if (!todo.length) return toast('Belum ada foto yang dipasangkan ke murid.', 'bad');
      const btn = $('#ph-ok', m); btn.disabled = true; let n = 0, fail = 0;
      for (const r of todo) { btn.textContent = `Menyimpan ${n + 1}/${todo.length}…`; try { await savePhoto(r.hit.m, await cropPhoto(r.f)); n++; } catch (e) { fail++; } }
      rows.forEach(r => URL.revokeObjectURL(r.url));
      S.save(); closeModal(); toast(`${n} foto terpasang${fail ? ', ' + fail + ' gagal' : ''}.`, fail ? 'bad' : 'ok'); done && done();
    };
  }
  /** Foto satu murid: ganti / hapus. */
  function photoOne(anchor, m, done) {
    popMenu(anchor, [
      { ic: '📷', label: m.photo ? 'Ganti foto' : 'Pasang foto', sub: 'dipotong otomatis 3×4', run: async () => { const f = (await pickFiles('image/*'))[0]; if (!f) return; try { await savePhoto(m, await cropPhoto(f)); S.save(); toast('Foto ' + m.name + ' terpasang.'); done(); } catch (e) { toast(e.message, 'bad'); } } },
      m.photo && { ic: '🗑', label: 'Hapus foto', danger: true, run: () => { delete m.photo; S.save(); done(); } }
    ]);
  }
  async function fillPhotos(root) {
    const els = $$('[data-ph]', root); if (!els.length) return;
    const get = await photoResolver(els.map(e => e.dataset.ph));
    els.forEach(e => { const u = get(e.dataset.ph); if (u) e.innerHTML = `<img src="${u}" alt="">`; });
  }

  /* ================= Kartu ujian ================= */
  let qrLoading = null;
  const loadQR = () => window.qrcode ? Promise.resolve(window.qrcode) : (qrLoading = qrLoading || new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'lib/qrcode/qrcode.js'; sc.onload = () => res(window.qrcode); sc.onerror = () => { qrLoading = null; rej(new Error('Gagal memuat pembuat QR.')); }; document.head.appendChild(sc); }));
  const qrSVG = text => { const q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 2, margin: 0, scalable: true }); };
  const kartuDefaults = s => ({ judul: 'KARTU PESERTA UJIAN', ujian: 'Sumatif Akhir Semester ' + (s.settings.semester === 'genap' ? 'Genap' : 'Ganjil'), prefix: 'UJ', kota: '', tanggal: new Date().toISOString().slice(0, 10), kepala: '', nip: '', logo: '', show: { photo: true, qr: true, nis: true, nisn: true, ttd: true, ruang: true }, ruang: {}, classIds: [] });
  function viewCards() {
    setTitle('🪪 Kartu Ujian', 'Cetak kartu peserta ujian: nama, kelas, NIS/NISN, foto, nomor peserta, dan QR untuk masuk ujian');
    renderCtx(false);
    const s = st();
    const K = s.settings.kartu = Object.assign(kartuDefaults(s), s.settings.kartu || {});
    K.show = Object.assign(kartuDefaults(s).show, K.show || {}); K.ruang = K.ruang || {};
    if (!K.classIds.length && s.ui.classId) K.classIds = [s.ui.classId];
    K.classIds = K.classIds.filter(id => S.cls(id));
    const save = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => S.save(), 600); }; })();
    const base = location.origin + location.pathname.replace(/[^/]*$/, '');
    const html = `<div class="card no-print kartu-form">
        <div class="field"><span>Kelas yang dicetak</span><div class="pz-nums">${s.classes.map(c => `<label class="pz-num"><input type="checkbox" value="${c.id}" ${K.classIds.indexOf(c.id) >= 0 ? 'checked' : ''} data-kc><span style="padding:0 12px">${esc(c.name)} <small>(${c.students.length})</small></span></label>`).join('') || '<span class="muted">Belum ada kelas.</span>'}</div></div>
        <div class="row"><label class="field"><span>Judul kartu</span><input data-k="judul" value="${esc(K.judul)}"></label><label class="field" style="flex:2"><span>Nama ujian</span><input data-k="ujian" value="${esc(K.ujian)}"></label>
          <label class="field" style="max-width:150px"><span>Awalan No. Peserta</span><input data-k="prefix" value="${esc(K.prefix)}"></label></div>
        <div class="row"><label class="field"><span>Kepala Sekolah</span><input data-k="kepala" value="${esc(K.kepala)}" placeholder="Nama & gelar"></label><label class="field"><span>NIP</span><input data-k="nip" value="${esc(K.nip)}"></label>
          <label class="field"><span>Kota</span><input data-k="kota" value="${esc(K.kota)}" placeholder="mis. Makassar"></label><label class="field" style="max-width:170px"><span>Tanggal</span><input type="date" data-k="tanggal" value="${esc(K.tanggal)}"></label></div>
        <div id="k-ruang"></div>
        <div class="btns" style="align-items:center">${[['photo', 'Foto'], ['nis', 'NIS'], ['nisn', 'NISN'], ['ruang', 'Ruang/Sesi'], ['qr', 'Kode QR masuk ujian'], ['ttd', 'Tanda tangan']].map(([k, l]) => `<label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-show="${k}" ${K.show[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div>
        <div class="btns" style="margin-top:10px"><button class="btn soft" data-act="k-logo">🏫 ${K.logo ? 'Ganti' : 'Pasang'} Logo Sekolah</button>${K.logo ? '<button class="btn ghost sm" data-act="k-nologo">Hapus logo</button>' : ''}<button class="btn soft" data-act="k-photos">🖼 Pasang Foto Murid (banyak sekaligus)</button><a class="btn ghost" href="#/absen">📋 Absensi Ujian</a><span style="margin-left:auto" class="btns"><button class="btn lg" data-act="k-print">🖨 Cetak Kartu</button></span></div>
        <p class="small muted" style="margin:8px 0 0">8 kartu per lembar A4. Untuk PDF: Cetak → pilih "Simpan sebagai PDF". Foto murid juga bisa dipasang satu per satu di menu <a href="#/data/kelas">Kelas & Murid</a> (klik kotak foto).</p>
      </div>
      <div id="k-sum" class="small muted no-print" style="margin:6px 0 10px"></div>
      <div id="kartu-print"></div>`;
    const drawRuang = () => {
      const box = $('#k-ruang'); if (!box) return;
      box.innerHTML = K.show.ruang && K.classIds.length ? `<div class="field"><span>Ruang & sesi per kelas</span><div class="k-ruang">${K.classIds.map(id => { const c = S.cls(id), r = K.ruang[id] || {}; return `<label><b>${esc(c.name)}</b><input data-rid="${id}" data-rk="ruang" value="${esc(r.ruang || '')}" placeholder="Ruang"><input data-rid="${id}" data-rk="sesi" value="${esc(r.sesi || '')}" placeholder="Sesi"></label>`; }).join('')}</div></div>` : '';
      $$('[data-rid]', box).forEach(inp => inp.oninput = () => { const r = K.ruang[inp.dataset.rid] = K.ruang[inp.dataset.rid] || {}; r[inp.dataset.rk] = inp.value; save(); drawCards(); });
    };
    const drawCards = async () => {
      const box = $('#kartu-print'); if (!box) return;
      const list = [].concat(...K.classIds.map(id => { const c = S.cls(id); return c.students.map((m, i) => ({ m, c, i })); }));
      $('#k-sum').textContent = list.length ? `${list.length} kartu · ${Math.ceil(list.length / 8)} lembar A4 · foto terpasang ${list.filter(x => x.m.photo).length}/${list.length}` : '';
      if (!list.length) { box.innerHTML = '<div class="card empty no-print">Pilih kelas yang akan dicetak kartunya.</div>'; return; }
      if (K.show.qr) { try { await loadQR(); } catch (e) { toast(e.message, 'bad'); } }
      const get = K.show.photo ? await photoResolver(list.map(x => x.m.photo)) : () => null;
      const tgl2 = K.tanggal ? new Date(K.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const short = c => String(c.name).toUpperCase().replace(/^KELAS\s*/, '').replace(/[^A-Z0-9]/g, '');
      const card = x => {
        const m = x.m, nisn = m.nisn || (/^\d{10}$/.test(String(m.nis || '')) ? m.nis : ''), r = K.ruang[x.c.id] || {}, foto = get(m.photo), no = `${K.prefix ? K.prefix + '-' : ''}${short(x.c)}-${String(x.i + 1).padStart(3, '0')}`;
        const rowsK = [['Nama', m.name], ['Kelas', x.c.name], K.show.nis && m.nis && m.nis !== nisn ? ['NIS', m.nis] : null, K.show.nisn ? ['NISN', nisn || '–'] : null, ['No. Peserta', no], K.show.ruang && (r.ruang || r.sesi) ? ['Ruang/Sesi', [r.ruang, r.sesi].filter(Boolean).join(' / ')] : null].filter(Boolean);
        return `<div class="kp-card">
          <div class="kp-head">${K.logo ? `<img src="${K.logo}" class="kp-logo" alt="">` : '<div class="kp-logo kp-logo-ph">🏫</div>'}<div class="kp-ht"><b>${esc(K.judul)}</b><span>${esc(K.ujian)}</span><small>${esc(s.settings.schoolName || '')}${s.settings.tahunAjaran ? ' · TP ' + esc(s.settings.tahunAjaran) : ''}</small></div></div>
          <div class="kp-body">${K.show.photo || K.show.qr ? `<div class="kp-left">${K.show.photo ? `<div class="kp-photo">${foto ? `<img src="${foto}" alt="">` : '<span>Foto<br>3×4</span>'}</div>` : ''}
              ${K.show.qr && window.qrcode ? `<div class="kp-qr">${qrSVG(base + 'gabung?nama=' + encodeURIComponent(m.name))}<small>Pindai untuk<br>masuk ujian</small></div>` : ''}</div>` : ''}
            <div class="kp-right"><table class="kp-tab">${rowsK.map(([a, b]) => `<tr><td>${a}</td><td>:</td><td><b>${esc(b)}</b></td></tr>`).join('')}</table>
              ${K.show.ttd ? `<div class="kp-ttd">${esc(K.kota ? K.kota + ', ' : '')}${esc(tgl2)}<br>Kepala Sekolah<div class="kp-sign"></div><b>${esc(K.kepala || '..............................')}</b>${K.nip ? `<br>NIP. ${esc(K.nip)}` : ''}</div>` : ''}</div></div>
        </div>`;
      };
      const pages = []; for (let k = 0; k < list.length; k += 8) pages.push(list.slice(k, k + 8));
      box.innerHTML = pages.map(pg => `<div class="kp-page">${pg.map(card).join('')}</div>`).join('');
    };
    return {
      html,
      mount(v) {
        $$('[data-kc]', v).forEach(c => c.onchange = () => { K.classIds = $$('[data-kc]:checked', v).map(x => x.value); save(); drawRuang(); drawCards(); });
        $$('[data-k]', v).forEach(inp => inp.oninput = () => { K[inp.dataset.k] = inp.value; save(); drawCards(); });
        $$('[data-show]', v).forEach(inp => inp.onchange = () => { K.show[inp.dataset.show] = inp.checked; save(); drawRuang(); drawCards(); });
        drawRuang(); drawCards();
        // lembar cetak diletakkan langsung di <body> agar hanya kartu yang tercetak
        const sheet = () => { let el = document.getElementById('print-sheet'); if (!el) { el = document.createElement('div'); el.id = 'print-sheet'; document.body.appendChild(el); } const src = $('#kartu-print'); el.innerHTML = src ? src.innerHTML : ''; document.body.classList.add('print-cards'); };
        const unsheet = () => { const el = document.getElementById('print-sheet'); if (el) el.remove(); document.body.classList.remove('print-cards'); };
        window.__kartuSheet = sheet;
        window.addEventListener('beforeprint', sheet); window.addEventListener('afterprint', unsheet);
        window.addEventListener('hashchange', () => { unsheet(); window.removeEventListener('beforeprint', sheet); window.removeEventListener('afterprint', unsheet); }, { once: true });
      },
      actions: {
        'k-print': () => { if (window.__kartuSheet) window.__kartuSheet(); window.print(); },
        'k-photos': () => { const cl = K.classIds.map(id => S.cls(id)); if (!cl.length) return toast('Pilih kelasnya dulu.', 'bad'); photoBulk(cl, () => route()); },
        'k-logo': async () => {
          const f = (await pickFiles('image/*'))[0]; if (!f) return;
          const img = new Image(), url = URL.createObjectURL(f);
          img.onload = () => { const k = Math.min(1, 160 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); K.logo = c.toDataURL('image/png'); S.save(); route(); };
          img.src = url;
        },
        'k-nologo': () => { K.logo = ''; S.save(); route(); }
      }
    };
  }

  /* ================= Absensi (daftar hadir) ujian ================= */
  function viewAbsen() {
    setTitle('📋 Absensi Ujian', 'Daftar hadir peserta ujian lengkap dengan kop sekolah, nama mapel, dan tanda tangan Kepala Sekolah');
    renderCtx(false);
    const s = st();
    // kop & penanda tangan dipakai bersama dengan Kartu Ujian (cukup diisi sekali)
    const K = s.settings.kartu = Object.assign(kartuDefaults(s), s.settings.kartu || {});
    const A = s.settings.absen = Object.assign({ classIds: [], subjectId: '', judul: 'DAFTAR HADIR PESERTA UJIAN', ujian: K.ujian, tanggal: new Date().toISOString().slice(0, 10), jam: '', ruang: '', pengawas: '', nipPengawas: '', perPage: 20, show: { nisn: true, ttd: true, pengawas: true, ket: true }, exam: '' }, s.settings.absen || {});
    A.show = Object.assign({ nis: false, nisn: true, ttd: true, pengawas: true, ket: true }, A.show || {});
    // angka 10 digit yang tersimpan di kolom NIS sebenarnya NISN
    const nisnOf = m => m.nisn || (/^\d{10}$/.test(String(m.nis || '').trim()) ? String(m.nis).trim() : '');
    const nisOf = m => (m.nis && String(m.nis).trim() !== nisnOf(m)) ? m.nis : '';
    // kop bebas diedit: baris-baris teks (ukuran & tebal), ukuran logo, garis bawah
    if (!K.kop || !Array.isArray(K.kop.lines)) K.kop = { lines: [K.instansi ? { t: K.instansi, s: 'm', b: true } : null, { t: s.settings.schoolName || 'NAMA SEKOLAH', s: 'xl', b: true }, K.alamat ? { t: K.alamat, s: 's', b: false } : null].filter(Boolean), logo: 24, garis: 'double' };
    const KOP = K.kop;
    const KSZ = { s: ['Kecil', 8.5], m: ['Sedang', 11], l: ['Besar', 13.5], xl: ['Sangat besar', 16], xxl: ['Judul', 19] };
    if (!A.classIds.length && s.ui.classId) A.classIds = [s.ui.classId];
    A.classIds = A.classIds.filter(id => S.cls(id));
    if (!A.subjectId && s.ui.subjectId && S.subj(s.ui.subjectId)) A.subjectId = s.ui.subjectId;
    const save = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => S.save(), 600); }; })();
    let present = null, examLabel = '', exams = [];
    const html = `<div class="card no-print kartu-form">
        <div class="field"><span>Kelas</span><div class="pz-nums">${s.classes.map(c => `<label class="pz-num"><input type="checkbox" value="${c.id}" ${A.classIds.indexOf(c.id) >= 0 ? 'checked' : ''} data-ac><span style="padding:0 12px">${esc(c.name)} <small>(${c.students.length})</small></span></label>`).join('') || '<span class="muted">Belum ada kelas.</span>'}</div></div>
        <div class="row"><label class="field"><span>Mata pelajaran (tampil di bawah kop)</span><select data-a="subjectId"><option value="">— pilih mapel —</option>${s.subjects.map(x => `<option value="${x.id}" ${A.subjectId === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
          <label class="field" style="flex:2"><span>Nama ujian</span><input data-a="ujian" value="${esc(A.ujian)}"></label></div>
        <div class="row"><label class="field" style="max-width:170px"><span>Hari/Tanggal</span><input type="date" data-a="tanggal" value="${esc(A.tanggal)}"></label><label class="field" style="max-width:170px"><span>Waktu</span><input data-a="jam" value="${esc(A.jam)}" placeholder="07.30 – 09.00"></label>
          <label class="field" style="max-width:150px"><span>Ruang</span><input data-a="ruang" value="${esc(A.ruang)}" placeholder="R-01"></label></div>
        <div class="row"><label class="field"><span>Nama Pengawas 1</span><input data-a="pengawas" value="${esc(A.pengawas)}"></label><label class="field"><span>NIP Pengawas 1</span><input data-a="nipPengawas" value="${esc(A.nipPengawas)}"></label>
          <label class="field"><span>Nama Pengawas 2 <small class="muted">(opsional)</small></span><input data-a="pengawas2" value="${esc(A.pengawas2 || '')}"></label><label class="field"><span>NIP Pengawas 2</span><input data-a="nipPengawas2" value="${esc(A.nipPengawas2 || '')}"></label></div>
        <details class="field" open><summary><b>🏫 Edit kop sekolah, logo & Kepala Sekolah</b> <span class="small muted">— logo & Kepala Sekolah dipakai juga di Kartu Ujian</span></summary>
          <div class="kop-ed-wrap"><div class="small muted" style="margin:8px 0 4px">Baris kop (atas → bawah). Ubah teks, ukuran, dan tebal; perubahan langsung terlihat di pratinjau.</div><div id="kop-ed"></div>
            <div class="btns" style="margin-top:6px;align-items:center"><button class="btn soft sm" data-act="kop-add">＋ Tambah baris</button>
              <label class="small" style="display:flex;gap:6px;align-items:center">Ukuran logo <input type="range" min="14" max="36" step="1" id="kop-logo" value="${+KOP.logo || 24}"></label>
              <label class="small" style="display:flex;gap:6px;align-items:center">Garis bawah <select id="kop-garis">${[['double', 'Ganda'], ['tebal', 'Tebal + tipis'], ['tipis', 'Tipis'], ['none', 'Tanpa garis']].map(([v, l]) => `<option value="${v}" ${KOP.garis === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
              <button class="btn ghost sm" data-act="kop-reset" title="Susun ulang dari nama sekolah di Pengaturan">↺ Kop bawaan</button></div></div>
          <div class="row"><label class="field"><span>Kepala Sekolah</span><input data-k="kepala" value="${esc(K.kepala)}" placeholder="Nama & gelar"></label><label class="field"><span>NIP Kepala Sekolah</span><input data-k="nip" value="${esc(K.nip)}"></label><label class="field"><span>Kota</span><input data-k="kota" value="${esc(K.kota)}" placeholder="mis. Makassar"></label></div>
          <div class="btns"><button class="btn soft sm" data-act="a-logo">🏫 ${K.logo ? 'Ganti' : 'Pasang'} Logo Sekolah</button>${K.logo ? `<img src="${K.logo}" alt="" style="height:38px;border-radius:6px;background:#fff;padding:2px"><button class="btn ghost sm" data-act="a-nologo">Hapus logo</button>` : ''}
          <button class="btn soft sm" data-act="a-logo2">🏛 ${K.logo2 ? 'Ganti' : 'Pasang'} Logo Kanan (opsional, mis. Tut Wuri / Pemda)</button>${K.logo2 ? `<img src="${K.logo2}" alt="" style="height:38px;border-radius:6px;background:#fff;padding:2px"><button class="btn ghost sm" data-act="a-nologo2">Hapus</button>` : ''}</div>
          <p class="small muted" style="margin:6px 0 0">Nama sekolah ditulis langsung di baris kop di atas. Tahun pelajaran diambil dari <a href="#/pengaturan">Pengaturan</a>.</p></details>
        ${S.mode === 'server' ? '<div class="row" style="align-items:flex-end"><label class="field" style="flex:3"><span>✅ Isi kehadiran otomatis dari ujian (opsional)</span><select id="a-exam"><option value="">— tidak, isi manual saat ujian —</option></select></label></div>' : ''}
        <div class="btns" style="align-items:center">${[['nis', 'Kolom NIS'], ['nisn', 'Kolom NISN'], ['ttd', 'Kolom tanda tangan'], ['ket', 'Kolom keterangan'], ['pengawas', 'Tanda tangan pengawas']].map(([k, l]) => `<label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-ash="${k}" ${A.show[k] ? 'checked' : ''}> ${l}</label>`).join('')}
          <label class="small" style="display:flex;gap:6px;align-items:center">Kepala Sekolah di <select data-a="ksPos"><option value="kiri" ${A.ksPos !== 'kanan' ? 'selected' : ''}>kiri</option><option value="kanan" ${A.ksPos === 'kanan' ? 'selected' : ''}>kanan</option></select></label>
          <span style="margin-left:auto" class="btns"><button class="btn ghost" data-act="ket-all" title="Isi atau kosongkan kolom keterangan sekaligus">✎ Keterangan</button><a class="btn ghost" href="#/kartu">🪪 Kartu Ujian</a><button class="btn lg" data-act="a-print">🖨 Cetak Absensi</button></span></div>
        <p class="small muted" style="margin:8px 0 0">Satu kelas dimulai di halaman baru (A4, ${A.perPage} murid per halaman). Untuk PDF: Cetak → "Simpan sebagai PDF".</p>
      </div>
      <div id="a-sum" class="small muted no-print" style="margin:6px 0 10px"></div>
      <div id="absen-print"></div>`;
    const draw = () => {
      const box = $('#absen-print'); if (!box) return;
      const cls = A.classIds.map(id => S.cls(id)).filter(Boolean);
      if (!cls.length) { box.innerHTML = '<div class="card empty no-print">Pilih kelas yang akan dibuatkan daftar hadirnya.</div>'; $('#a-sum').textContent = ''; return; }
      const subj = S.subj(A.subjectId);
      const hari = A.tanggal ? new Date(A.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const ttdTgl = A.tanggal ? new Date(A.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const lg = (+KOP.logo || 24) + 'mm';
      const kop = `<div class="ab-kop g-${esc(KOP.garis || 'double')}">${K.logo ? `<img src="${K.logo}" alt="" class="ab-logo" style="width:${lg};height:${lg}">` : `<div class="ab-logo" style="width:${lg};height:${lg}"></div>`}
        <div class="ab-kop-t">${KOP.lines.filter(l => l.t && l.t.trim()).map(l => `<div style="font-size:${(KSZ[l.s] || KSZ.m)[1]}pt;font-weight:${l.b ? 800 : 400}">${esc(l.t)}</div>`).join('')}</div>
        ${K.logo2 ? `<img src="${K.logo2}" alt="" class="ab-logo" style="width:${lg};height:${lg}">` : `<div class="ab-logo" style="width:${lg};height:${lg}"></div>`}</div>`;
      if (A.ketDate !== A.tanggal) { A.ket = {}; A.ketDate = A.tanggal; }
      if (!A.ket) A.ket = {};
      const ketOf = m => A.ket[m.id] !== undefined ? A.ket[m.id] : present ? (present[m.id] ? (present[m.id].done ? 'Hadir' : 'Hadir*') : 'Tidak hadir') : '';
      const isHadir = v => /^hadir/i.test(String(v).trim());
      const dots = '..............................';
      const signHTML = () => {
        const tglLine = esc(K.kota ? K.kota + ', ' : '') + esc(ttdTgl);
        const ks = top => `<div>${top}<br>Kepala Sekolah,<div class="ab-sp"></div><b>${esc(K.kepala || dots)}</b><br>NIP. ${esc(K.nip || dots)}</div>`;
        const pw = top => `<div>${top}<br>Pengawas,<div class="ab-sp"></div><b>${esc(A.pengawas || dots)}</b><br>NIP. ${esc(A.nipPengawas || dots)}</div>`;
        if (!A.show.pengawas) return A.ksPos === 'kanan' ? `<div></div>${ks(tglLine)}` : `${ks(tglLine)}<div></div>`;
        if ((A.pengawas2 || '').trim()) {
          // tiga kolom: Kepala Sekolah + Pengawas 1 + Pengawas 2; tanggal di atas, rata kanan
          const pwN = (n, nm, nip) => `<div>&nbsp;<br>Pengawas ${n},<div class="ab-sp"></div><b>${esc(nm || dots)}</b><br>NIP. ${esc(nip || dots)}</div>`;
          const p1 = pwN(1, A.pengawas, A.nipPengawas), p2 = pwN(2, A.pengawas2, A.nipPengawas2), k3 = ks(A.ksPos === 'kanan' ? '&nbsp;' : 'Mengetahui,');
          return `<div class="ab-sign-date">${tglLine}</div>` + (A.ksPos === 'kanan' ? p1 + p2 + k3 : k3 + p1 + p2);
        }
        return A.ksPos === 'kanan' ? pw('&nbsp;') + ks(tglLine) : ks('Mengetahui,') + pw(tglLine);
      };
      let tot = 0, hadir = 0, known = false;
      const pages = [];
      cls.forEach(c => {
        const list = c.students;
        const chunks = []; for (let k = 0; k < Math.max(1, list.length); k += A.perPage) chunks.push(list.slice(k, k + A.perPage));
        const filled = list.filter(m => ketOf(m) !== '').length;
        const nH = present || filled ? list.filter(m => isHadir(ketOf(m))).length : null;
        const rekap = {}; list.forEach(m => { const v = String(ketOf(m)).replace(/\*$/, '').trim(); if (v) rekap[v] = (rekap[v] || 0) + 1; });
        tot += list.length; if (nH !== null) { hadir += nH; known = true; }
        chunks.forEach((ch, pi) => {
          const last = pi === chunks.length - 1, base = pi * A.perPage;
          pages.push(`<div class="ab-page">${kop}
            <div class="ab-title"><b>${esc(A.judul)}</b><div>${esc(A.ujian || '')}${s.settings.tahunAjaran ? ' · Tahun Pelajaran ' + esc(s.settings.tahunAjaran) : ''}</div></div>
            <div class="ab-mapel">Mata Pelajaran: <b>${esc(subj ? subj.name : '..............................')}</b></div>
            <table class="ab-info"><tr><td>Kelas</td><td>: <b>${esc(c.name)}</b></td><td>Hari/Tanggal</td><td>: ${esc(hari || '..............................')}</td></tr>
              <tr><td>Ruang</td><td>: ${esc(A.ruang || '..........')}</td><td>Waktu</td><td>: ${esc(A.jam || '..............................')}</td></tr></table>
            <table class="ab-tab"><thead><tr><th style="width:9mm">No</th>${A.show.nis ? '<th style="width:22mm">NIS</th>' : ''}${A.show.nisn ? '<th style="width:28mm">NISN</th>' : ''}<th>Nama Peserta</th>${A.show.ttd ? '<th style="width:44mm" colspan="2">Tanda Tangan</th>' : ''}${A.show.ket ? '<th style="width:24mm">Ket.</th>' : ''}</tr></thead><tbody>
            ${ch.map((m, i) => { const n = base + i + 1, pr = present ? present[m.id] : undefined; return `<tr><td class="c">${n}</td>${A.show.nis ? `<td class="c">${esc(nisOf(m))}</td>` : ''}${A.show.nisn ? `<td class="c">${esc(nisnOf(m))}</td>` : ''}<td>${esc(m.name)}</td>${A.show.ttd ? (n % 2 ? `<td class="sig">${n}.</td><td class="sig"></td>` : `<td class="sig"></td><td class="sig">${n}.</td>`) : ''}${A.show.ket ? (() => { const v = ketOf(m); return `<td class="c ket-ed ${A.ket[m.id] !== undefined ? 'man' : ''}" data-ket="${esc(m.id)}" title="Klik untuk mengganti keterangan">${v && !isHadir(v) ? `<b>${esc(v)}</b>` : esc(v)}</td>`; })() : ''}</tr>`; }).join('')}
            </tbody></table>
            ${last ? `<div class="ab-rekap">Jumlah peserta: <b>${list.length}</b> · Hadir: <b>${nH !== null ? nH : '.....'}</b> · Tidak hadir: <b>${nH !== null ? list.length - nH : '.....'}</b>${Object.keys(rekap).filter(k => !/^(hadir|tidak hadir)$/i.test(k)).map(k => ` <span>(${esc(k)}: ${rekap[k]})</span>`).join('')}${list.some(m => /\*$/.test(ketOf(m))) ? ' <span>(* hadir, belum mengumpulkan)</span>' : ''}</div>
            <div class="ab-sign ${A.show.pengawas && (A.pengawas2 || '').trim() ? 'three' : ''}">${signHTML()}</div>` : '<div class="ab-cont small">bersambung ke halaman berikutnya…</div>'}
          </div>`);
        });
      });
      box.innerHTML = pages.join('');
      $('#a-sum').textContent = `${cls.length} kelas · ${tot} peserta · ${pages.length} halaman A4${present ? ` · ✅ kehadiran dari "${examLabel}"` : ''}${known ? ` · ${hadir} hadir, ${tot - hadir} tidak hadir` : ''}${A.show.ket ? ' · klik sel kolom Ket. untuk mengganti isinya' : ''}`;
    };
    const drawKopEd = () => {
      const box = $('#kop-ed'); if (!box) return;
      box.innerHTML = KOP.lines.map((l, i) => `<div class="kop-row"><input data-kl="${i}" value="${esc(l.t)}" placeholder="Teks baris kop, mis. SMP NEGERI …">
        <select data-ks="${i}">${Object.keys(KSZ).map(k => `<option value="${k}" ${l.s === k ? 'selected' : ''}>${KSZ[k][0]}</option>`).join('')}</select>
        <label class="kop-b" title="Huruf tebal"><input type="checkbox" data-kb="${i}" ${l.b ? 'checked' : ''}><b>B</b></label>
        <button class="btn ghost sm" data-kmv="${i}" data-d="-1" title="Naik" ${i ? '' : 'disabled'}>↑</button><button class="btn ghost sm" data-kmv="${i}" data-d="1" title="Turun" ${i < KOP.lines.length - 1 ? '' : 'disabled'}>↓</button><button class="btn ghost sm" data-kdel="${i}" title="Hapus baris">🗑</button></div>`).join('') || '<div class="small muted">Belum ada baris. Klik ＋ Tambah baris.</div>';
      $$('[data-kl]', box).forEach(x => x.oninput = () => { KOP.lines[+x.dataset.kl].t = x.value; save(); draw(); });
      $$('[data-ks]', box).forEach(x => x.onchange = () => { KOP.lines[+x.dataset.ks].s = x.value; save(); draw(); });
      $$('[data-kb]', box).forEach(x => x.onchange = () => { KOP.lines[+x.dataset.kb].b = x.checked; save(); draw(); });
      $$('[data-kmv]', box).forEach(x => x.onclick = () => { const i = +x.dataset.kmv, j = i + +x.dataset.d; if (j < 0 || j >= KOP.lines.length) return; const t = KOP.lines[i]; KOP.lines[i] = KOP.lines[j]; KOP.lines[j] = t; save(); drawKopEd(); draw(); });
      $$('[data-kdel]', box).forEach(x => x.onclick = () => { KOP.lines.splice(+x.dataset.kdel, 1); save(); drawKopEd(); draw(); });
    };
    const loadExams = async () => {
      const sel = $('#a-exam'); if (!sel) return;
      try {
        const d = await S.api('monitor');
        exams = [].concat(d.tokens.map(x => ({ v: 'token:' + x.id, label: `📝 ${x.title} · ${x.classes.filter(Boolean).join(', ')}${x.date ? ' · ' + tgl(x.date) : ''}`, cls: [x.classId], subj: x.subjectId })),
          d.games.filter(x => x.classIds.length).map(x => ({ v: 'game:' + x.id, label: `${x.mode === 'exam' ? '📝' : '🎮'} ${x.title} · ${x.classes.join(', ')} · ${tgl(x.createdAt)}`, cls: x.classIds, subj: x.subjectId })));
        const paint = () => {
          const rel = exams.filter(e => !A.classIds.length || e.cls.some(c => A.classIds.indexOf(c) >= 0));
          sel.innerHTML = '<option value="">— tidak, isi manual saat ujian —</option>' + rel.map(e => `<option value="${e.v}" ${A.exam === e.v ? 'selected' : ''}>${esc(e.label)}</option>`).join('');
        };
        paint(); sel._paint = paint;
        if (A.exam && exams.some(e => e.v === A.exam)) await pickExam(A.exam);
      } catch (e) { sel.innerHTML = '<option value="">Daftar ujian tidak bisa dimuat</option>'; }
    };
    const pickExam = async v => {
      A.exam = v; save(); present = null; examLabel = '';
      if (v) {
        const [kind, id] = [v.slice(0, v.indexOf(':')), v.slice(v.indexOf(':') + 1)];
        try { present = (await S.api('attendance?kind=' + kind + '&id=' + encodeURIComponent(id))).present || {}; const e = exams.find(x => x.v === v); examLabel = e ? e.label.replace(/^\S+\s/, '').split(' · ')[0] : ''; if (e && e.subj && !A.subjectId) { A.subjectId = e.subj; const ss = $('[data-a=subjectId]'); if (ss) ss.value = e.subj; } }
        catch (e) { toast(e.message, 'bad'); }
      }
      draw();
    };
    const setLogo = key => async () => {
      const f = (await pickFiles('image/*'))[0]; if (!f) return;
      const img = new Image(), url = URL.createObjectURL(f);
      img.onload = () => { const k = Math.min(1, 220 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); K[key] = c.toDataURL('image/png'); S.save(); route(); };
      img.src = url;
    };
    return {
      html,
      mount(v) {
        $$('[data-ac]', v).forEach(c => c.onchange = () => { A.classIds = $$('[data-ac]:checked', v).map(x => x.value); save(); const sel = $('#a-exam'); if (sel && sel._paint) sel._paint(); draw(); });
        $$('[data-a]', v).forEach(inp => inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => { A[inp.dataset.a] = inp.value; save(); draw(); }));
        $$('[data-k]', v).forEach(inp => inp.oninput = () => { K[inp.dataset.k] = inp.value; save(); draw(); });
        $$('[data-ash]', v).forEach(inp => inp.onchange = () => { A.show[inp.dataset.ash] = inp.checked; save(); draw(); });
        const sel = $('#a-exam', v); if (sel) sel.onchange = () => pickExam(sel.value);
        $('#kop-logo', v).oninput = e => { KOP.logo = +e.target.value; save(); draw(); };
        $('#kop-garis', v).onchange = e => { KOP.garis = e.target.value; save(); draw(); };
        drawKopEd(); draw(); loadExams();
        const setKet = (id, v) => { A.ketDate = A.tanggal; if (v === undefined) delete A.ket[id]; else A.ket[id] = v; save(); draw(); };
        $('#absen-print', v).addEventListener('click', e => {
          const td = e.target.closest('td[data-ket]'); if (!td) return;
          e.stopPropagation();
          const id = td.dataset.ket, m = [].concat(...A.classIds.map(c => (S.cls(c) || { students: [] }).students)).find(x => x.id === id);
          const opt = (ic, label) => ({ ic, label, run: () => setKet(id, label) });
          popMenu(td, [opt('✅', 'Hadir'), opt('🤒', 'Sakit'), opt('📝', 'Izin'), opt('❌', 'Alpa'), opt('🚫', 'Tidak hadir'), opt('⏰', 'Terlambat'), '-',
            { ic: '✏️', label: 'Tulis sendiri…', sub: m ? m.name : '', run: () => {
              const md = modal(`<h2>Keterangan ${esc(m ? m.name : '')}</h2><label class="field"><span>Isi keterangan</span><input id="ket-in" maxlength="40" value="${esc(A.ket[id] !== undefined ? A.ket[id] : td.textContent.trim())}" placeholder="mis. Dispensasi, Susulan"></label><div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="ket-ok">Simpan</button></div>`);
              const inp = $('#ket-in', md); inp.focus(); inp.select();
              const ok = () => { setKet(id, inp.value.trim()); closeModal(); };
              $('#ket-ok', md).onclick = ok; inp.onkeydown = ev => { if (ev.key === 'Enter') ok(); };
            } },
            { ic: '⬜', label: 'Kosongkan', run: () => setKet(id, '') },
            A.ket[id] !== undefined && present ? { ic: '↺', label: 'Kembalikan dari data ujian', run: () => setKet(id, undefined) } : null]);
        });
        const sheet = () => { let el = document.getElementById('print-sheet'); if (!el) { el = document.createElement('div'); el.id = 'print-sheet'; document.body.appendChild(el); } const src = $('#absen-print'); el.innerHTML = src ? src.innerHTML : ''; document.body.classList.add('print-cards'); };
        const unsheet = () => { const el = document.getElementById('print-sheet'); if (el) el.remove(); document.body.classList.remove('print-cards'); };
        window.__absenSheet = sheet;
        window.addEventListener('beforeprint', sheet); window.addEventListener('afterprint', unsheet);
        window.addEventListener('hashchange', () => { unsheet(); window.removeEventListener('beforeprint', sheet); window.removeEventListener('afterprint', unsheet); }, { once: true });
      },
      actions: {
        'a-print': () => { if (window.__absenSheet) window.__absenSheet(); window.print(); },
        'ket-all': el => {
          const ids = [].concat(...A.classIds.map(c => (S.cls(c) || { students: [] }).students.map(m => m.id)));
          const all = v => () => { A.ketDate = A.tanggal; ids.forEach(id => { A.ket[id] = v; }); save(); route(); };
          popMenu(el, [{ ic: '✅', label: 'Semua: Hadir', run: all('Hadir') }, { ic: '⬜', label: 'Kosongkan semua', run: all('') },
            { ic: '↺', label: 'Kembalikan semua ke otomatis', sub: present ? 'dari data ujian' : 'kosong', run: () => { A.ket = {}; save(); route(); } }]);
        },
        'kop-add': () => { KOP.lines.push({ t: '', s: 'm', b: false }); save(); drawKopEd(); draw(); const ins = $$('[data-kl]'); if (ins.length) ins[ins.length - 1].focus(); },
        'kop-reset': () => { KOP.lines = [{ t: s.settings.schoolName || 'NAMA SEKOLAH', s: 'xl', b: true }]; KOP.logo = 24; KOP.garis = 'double'; S.save(); route(); },
        'a-logo': setLogo('logo'), 'a-logo2': setLogo('logo2'),
        'a-nologo': () => { K.logo = ''; S.save(); route(); }, 'a-nologo2': () => { K.logo2 = ''; S.save(); route(); }
      }
    };
  }

  /* ================= Kartu panitia ujian ================= */
  const PANITIA_ROLES = ['Penanggung Jawab', 'Ketua Panitia', 'Wakil Ketua', 'Sekretaris', 'Bendahara', 'Koordinator Pengawas', 'Pengawas Ruang', 'Proktor', 'Teknisi', 'Seksi Konsumsi', 'Seksi Keamanan', 'Seksi Dokumentasi', 'Anggota'];
  function viewPanitia() {
    setTitle('🎫 Kartu Panitia Ujian', 'Kartu tanda pengenal panitia: pilih desain & ukuran, ganti teks, cetak, atau unduh JPG/PDF');
    renderCtx(false);
    const PC = window.PanitiaCard;
    if (!PC) return { html: '<div class="card">Memuat…</div>' };
    const s = st();
    const K = s.settings.kartu = Object.assign(kartuDefaults(s), s.settings.kartu || {});
    const P = s.settings.panitia = Object.assign({ theme: 'retro', size: 'id', w: 54, h: 86, accent: '', scale: 1, cut: true, showNip: true, members: [],
      texts: { school: s.settings.schoolName || 'Nama Sekolah', title: 'PANITIA|UJIAN', event: K.ujian || 'Sumatif Akhir Semester', greet: 'Halo, saya', footer: s.settings.tahunAjaran ? 'Tahun Pelajaran ' + s.settings.tahunAjaran : '' } }, s.settings.panitia || {});
    const save = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => S.save(), 600); }; })();
    const dims = () => { const z = PC.SIZES.find(x => x.id === P.size) || PC.SIZES[0]; return P.size === 'custom' ? { w: Math.max(30, Math.min(190, +P.w || 54)), h: Math.max(30, Math.min(277, +P.h || 86)) } : { w: z.w, h: z.h }; };
    const T = P.texts;
    const html = `<div class="grid pn-grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);align-items:start">
      <div class="card no-print kartu-form">
        <div class="field"><span>🎨 Pilih desain</span><div class="pn-themes" id="pn-themes"></div></div>
        <div class="row"><label class="field"><span>📐 Ukuran kartu</span><select id="pn-size">${PC.SIZES.map(z => `<option value="${z.id}" ${P.size === z.id ? 'selected' : ''}>${z.label}</option>`).join('')}</select></label>
          <label class="field pn-custom" style="max-width:110px"><span>Lebar (mm)</span><input type="number" min="30" max="190" id="pn-w" value="${+P.w || 54}"></label><label class="field pn-custom" style="max-width:110px"><span>Tinggi (mm)</span><input type="number" min="30" max="277" id="pn-h" value="${+P.h || 86}"></label></div>
        <div class="row" style="align-items:center"><label class="small" style="display:flex;gap:8px;align-items:center">🏷 Label jabatan <select id="pn-rpos">${[['auto', 'Otomatis'], ['antara', 'Di antara foto & nama'], ['pojok', 'Pojok kiri atas foto'], ['atas', 'Di atas foto'], ['bawah', 'Di bawah wajah (dada)'], ['none', 'Sembunyikan']].map(([v, l]) => `<option value="${v}" ${(P.rolePos || 'auto') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <button class="btn ghost sm" data-act="pn-offreset" title="Kembalikan semua elemen yang sudah digeser/diubah ukurannya">↺ Semua posisi</button></div>
        <div class="row" style="align-items:center"><label class="small" style="display:flex;gap:8px;align-items:center">🔠 Ukuran teks <input type="range" min="0.75" max="1.3" step="0.05" id="pn-scale" value="${+P.scale || 1}"></label>
          <label class="small" style="display:flex;gap:8px;align-items:center">🖼 Ukuran foto <input type="range" min="0.6" max="1.3" step="0.05" id="pn-pscale" value="${+P.photoScale || 1}"></label>
          <label class="small" style="display:flex;gap:8px;align-items:center">🎨 Warna utama <input type="color" id="pn-accent" value="${P.accent || (PC.THEMES[P.theme] || PC.THEMES.retro).accent}"></label><button class="btn ghost sm" data-act="pn-accent0">Warna bawaan</button></div>
        <details class="field" open><summary><b>✏️ Teks kartu</b></summary>
          <div class="row" style="margin-top:8px"><label class="field"><span>Nama sekolah</span><input data-pt="school" value="${esc(T.school)}"></label><label class="field"><span>Judul besar <small class="muted">(| = baris baru)</small></span><input data-pt="title" value="${esc(T.title)}"></label></div>
          <div class="row"><label class="field"><span>Nama kegiatan</span><input data-pt="event" value="${esc(T.event)}"></label><label class="field"><span>Sapaan <small class="muted">(desain Retro/Ceria)</small></span><input data-pt="greet" value="${esc(T.greet)}"></label><label class="field"><span>Teks bawah</span><input data-pt="footer" value="${esc(T.footer)}"></label></div>
          <div class="btns" style="align-items:center"><label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="pn-nip" ${P.showNip ? 'checked' : ''}> Tampilkan NIP</label>
            <button class="btn soft sm" data-act="pn-logo">🏫 ${K.logo ? 'Ganti' : 'Pasang'} logo</button>${K.logo ? `<img src="${K.logo}" alt="" style="height:30px;background:#fff;border-radius:6px;padding:2px">` : ''}</div></details>
        <div class="field"><span>👥 Anggota panitia <small class="muted">(centang yang dicetak)</small></span><div id="pn-members"></div>
          <datalist id="pn-roles">${PANITIA_ROLES.map(r => `<option value="${r}">`).join('')}</datalist>
          <div class="btns" style="margin-top:8px"><button class="btn soft sm" data-act="pn-add">＋ Tambah</button>${S.mode === 'server' ? '<button class="btn soft sm" data-act="pn-teachers">👩‍🏫 Ambil dari akun guru</button>' : ''}<button class="btn soft sm" data-act="pn-paste">📋 Tempel daftar</button><button class="btn soft sm" data-act="pn-photos">🖼 Unggah banyak foto</button></div></div>
      </div>
      <div>
        <div class="card no-print"><div class="btns" style="align-items:center"><button class="btn lg" data-act="pn-print">🖨 Cetak</button><button class="btn soft" data-act="pn-pdf">⬇ PDF lembar A4</button><button class="btn soft" data-act="pn-pdf1">⬇ PDF per kartu</button><button class="btn soft" data-act="pn-jpg">⬇ JPG per kartu</button><button class="btn ghost" data-act="pn-jpga4">⬇ JPG lembar A4</button></div>
          <div class="btns" style="margin-top:6px;align-items:center"><label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="pn-cut" ${P.cut ? 'checked' : ''}> Garis potong di lembar A4</label><span class="small muted" id="pn-sum"></span></div></div>
        <div id="pn-sel" class="card pn-sel no-print"></div>
        <div id="pn-preview" class="pn-preview"></div>
      </div></div>
      <div id="pn-print" class="hidden"></div>`;
    let photoGet = r => (r && /^data:/.test(r) ? r : null);
    const card = (m, extra) => PC.svg(Object.assign({ school: T.school, title: T.title, event: T.event, greet: T.greet, footer: T.footer, name: m.name, role: m.role, nip: m.nip, photo: photoGet(m.photo), logo: K.logo, showNip: P.showNip }), Object.assign({ theme: P.theme, accent: P.accent, scale: +P.scale || 1, photoScale: +P.photoScale || 1, id: m.id, rolePos: P.rolePos || 'auto', off: P.off || {} }, dims(), extra || {}));
    const chosen = () => P.members.filter(m => m.on !== false);
    const drawThemes = () => {
      const box = $('#pn-themes'); if (!box) return;
      const sample = chosen()[0] || P.members[0] || { id: 'x', name: 'Nama Panitia', role: 'Ketua Panitia' };
      box.innerHTML = Object.keys(PC.THEMES).map(k => `<button class="pn-theme ${P.theme === k ? 'on' : ''}" data-th="${k}" title="${esc(PC.THEMES[k].desc)}"><div class="pn-th-img">${PC.svg({ school: T.school, title: T.title, event: T.event, greet: T.greet, footer: T.footer, name: sample.name, role: sample.role, photo: photoGet(sample.photo), logo: K.logo }, { theme: k, w: 54, h: 86, id: 't' + k })}</div><b>${esc(PC.THEMES[k].name)}</b></button>`).join('');
      $$('[data-th]', box).forEach(b => b.onclick = () => { P.theme = b.dataset.th; P.accent = ''; const ac = $('#pn-accent'); if (ac) ac.value = PC.THEMES[P.theme].accent; save(); drawThemes(); drawPreview(); });
    };
    let selKey = '';
    const drawSel = () => {
      const box = $('#pn-sel'); if (!box) return;
      $$('#pn-preview [data-drag]').forEach(g => g.classList.toggle('sel', g.dataset.drag === selKey));
      if (!selKey) { box.innerHTML = '<span class="small muted">✋ <b>Klik</b> teks, foto, atau logo di kartu untuk memilihnya, lalu <b>geser</b> atau atur ukurannya. Perubahan berlaku untuk semua kartu.</span>'; return; }
      const v = Object.assign({ x: 0, y: 0, s: 1 }, (P.off || {})[selKey]);
      box.innerHTML = `<div class="btns" style="align-items:center"><b>✏️ ${esc(PC.PARTS[selKey] || selKey)}</b><span class="small muted">geser 1 mm:</span>
        <button class="btn soft sm" data-nd="-1,0" title="Kiri">←</button><button class="btn soft sm" data-nd="0,-1" title="Atas">↑</button><button class="btn soft sm" data-nd="0,1" title="Bawah">↓</button><button class="btn soft sm" data-nd="1,0" title="Kanan">→</button>
        <span class="small muted" style="margin-left:6px">ukuran:</span><button class="btn soft sm" data-ns="-0.1" title="Perkecil">A−</button><b class="small">${Math.round((+v.s || 1) * 100)}%</b><button class="btn soft sm" data-ns="0.1" title="Perbesar">A+</button>
        <button class="btn ghost sm" data-nr title="Kembalikan posisi & ukuran elemen ini">↺</button><button class="btn ghost sm" data-nx title="Selesai">✕</button></div>`;
      const put = f => { const cur = Object.assign({ x: 0, y: 0, s: 1 }, (P.off || {})[selKey]); f(cur); P.off = Object.assign({}, P.off, { [selKey]: cur }); save(); drawPreview(); };
      $$('[data-nd]', box).forEach(b => b.onclick = () => put(c => { const [a, d2] = b.dataset.nd.split(',').map(Number); c.x = +(c.x + a).toFixed(2); c.y = +(c.y + d2).toFixed(2); }));
      $$('[data-ns]', box).forEach(b => b.onclick = () => put(c => { c.s = Math.max(0.4, Math.min(2.5, +((+c.s || 1) + +b.dataset.ns).toFixed(2))); }));
      $('[data-nr]', box).onclick = () => { const o2 = Object.assign({}, P.off); delete o2[selKey]; P.off = o2; save(); drawPreview(); };
      $('[data-nx]', box).onclick = () => { selKey = ''; drawSel(); };
    };
    const drawPreview = () => {
      const box = $('#pn-preview'); if (!box) return;
      const d = dims(), list = chosen(), sc = Math.min(3.4, 300 / Math.max(d.w, d.h * 0.7));
      $$('.pn-custom').forEach(x => x.classList.toggle('hidden', P.size !== 'custom'));
      const lay = PC.layoutA4(list.length, d.w, d.h);
      $('#pn-sum').textContent = list.length ? `${list.length} kartu · ${d.w}×${d.h} mm · ${lay.per} kartu per A4 → ${lay.pages.length} lembar` : '';
      box.innerHTML = list.length ? list.map(m => `<div class="pn-card"><div class="pn-svg" style="width:${(d.w * sc).toFixed(0)}px">${card(m)}</div><div class="btns"><span class="small ellipsis" style="max-width:${(d.w * sc - 60).toFixed(0)}px">${esc(m.name || '–')}</span><button class="btn ghost sm" data-act="pn-jpg1" data-id="${m.id}" title="Unduh JPG kartu ini">⬇ JPG</button></div></div>`).join('')
        : '<div class="card empty">Tambahkan anggota panitia di kiri: ketik manual, ambil dari akun guru, atau tempel daftar nama.</div>';
      drawSel();
    };
    const drawMembers = () => {
      const box = $('#pn-members'); if (!box) return;
      box.innerHTML = P.members.length ? P.members.map((m, i) => `<div class="pn-mem">
          <input type="checkbox" data-mon="${i}" ${m.on !== false ? 'checked' : ''} title="Ikut dicetak">
          <button class="ph-btn" data-act="pn-photo" data-i="${i}" title="Foto" ${m.photo ? `data-ph="${esc(m.photo)}"` : ''}>📷</button>
          <div class="pn-mem-f"><input data-mf="name" data-i="${i}" value="${esc(m.name)}" placeholder="Nama lengkap"><div class="row" style="gap:6px;margin:0"><input data-mf="role" data-i="${i}" value="${esc(m.role)}" placeholder="Jabatan" list="pn-roles"><input data-mf="nip" data-i="${i}" value="${esc(m.nip || '')}" placeholder="NIP (opsional)"></div></div>
          <div class="pn-mem-b"><button class="btn ghost sm" data-mv="${i}" data-d="-1" ${i ? '' : 'disabled'}>↑</button><button class="btn ghost sm" data-mv="${i}" data-d="1" ${i < P.members.length - 1 ? '' : 'disabled'}>↓</button><button class="btn ghost sm" data-mdel="${i}">🗑</button></div></div>`).join('')
        : '<p class="small muted" style="margin:4px 0">Belum ada anggota.</p>';
      $$('[data-mf]', box).forEach(x => x.oninput = () => { P.members[+x.dataset.i][x.dataset.mf] = x.value; save(); drawPreview(); });
      $$('[data-mon]', box).forEach(x => x.onchange = () => { P.members[+x.dataset.mon].on = x.checked; save(); drawPreview(); });
      $$('[data-mv]', box).forEach(x => x.onclick = () => { const i = +x.dataset.mv, j = i + +x.dataset.d; const t = P.members[i]; P.members[i] = P.members[j]; P.members[j] = t; save(); drawMembers(); drawPreview(); });
      $$('[data-mdel]', box).forEach(x => x.onclick = () => { P.members.splice(+x.dataset.mdel, 1); save(); drawMembers(); drawPreview(); drawThemes(); });
      fillPhotos(box);
    };
    const refreshPhotos = async () => { photoGet = await photoResolver(P.members.map(m => m.photo)); };
    const exportSvgs = async list => { const css = await PC.fontCss(''); return list.map(m => card(m, { fontCss: css })); };
    const busy = async (label, fn) => { const tt = toast(label + '…'); try { await fn(); } catch (e) { toast(e.message || String(e), 'bad'); } };
    const fname = s2 => String(s2 || 'kartu').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'kartu';
    const needList = () => { const l = chosen(); if (!l.length) { toast('Belum ada anggota panitia yang dicentang.', 'bad'); return null; } return l; };
    return {
      html,
      async mount(v) {
        await refreshPhotos();
        drawThemes(); drawMembers(); drawPreview();
        $('#pn-rpos', v).onchange = e => { P.rolePos = e.target.value; P.off = Object.assign({}, P.off, { role: { x: 0, y: 0 } }); save(); drawPreview(); };
        const pv = $('#pn-preview', v);
        pv.addEventListener('pointerdown', e => {
          const g = e.target.closest('[data-drag]'); if (!g) return;
          const sv = g.ownerSVGElement; if (!sv) return;
          e.preventDefault();
          const k = g.dataset.drag, vb = sv.viewBox.baseVal, r = sv.getBoundingClientRect(), sc = vb.width / r.width;
          const base = Object.assign({ x: 0, y: 0 }, (P.off || {})[k]);
          const x0 = e.clientX, y0 = e.clientY;
          // semua kartu ikut bergeser bersamaan agar posisinya seragam
          const groups = $$(`#pn-preview [data-drag="${k}"]`);
          g.setPointerCapture && g.setPointerCapture(e.pointerId);
          document.body.classList.add('pn-dragging');
          const move = ev => { const dx = (ev.clientX - x0) * sc, dy = (ev.clientY - y0) * sc; groups.forEach(gg => gg.setAttribute('transform', `translate(${(base.x * 10 + dx).toFixed(1)} ${(base.y * 10 + dy).toFixed(1)}) ${gg.dataset.sc || ''}`)); };
          const up = ev => {
            window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
            document.body.classList.remove('pn-dragging');
            const dx = (ev.clientX - x0) * sc / 10, dy = (ev.clientY - y0) * sc / 10;
            selKey = k;
            if (Math.abs(dx) + Math.abs(dy) < 0.2) { drawSel(); return; }
            P.off = Object.assign({}, P.off, { [k]: Object.assign({}, base, { x: +(base.x + dx).toFixed(2), y: +(base.y + dy).toFixed(2) }) }); save(); drawPreview();
          };
          window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
        });
        $('#pn-size', v).onchange = e => { P.size = e.target.value; const z = PC.SIZES.find(x => x.id === P.size); if (P.size === 'custom' && z) { $('#pn-w', v).value = P.w = P.w || z.w; $('#pn-h', v).value = P.h = P.h || z.h; } save(); drawPreview(); };
        $('#pn-w', v).oninput = e => { P.w = +e.target.value; save(); drawPreview(); };
        $('#pn-h', v).oninput = e => { P.h = +e.target.value; save(); drawPreview(); };
        $('#pn-scale', v).oninput = e => { P.scale = +e.target.value; save(); drawPreview(); };
        $('#pn-pscale', v).oninput = e => { P.photoScale = +e.target.value; save(); drawPreview(); };
        $('#pn-accent', v).oninput = e => { P.accent = e.target.value; save(); drawPreview(); };
        $('#pn-nip', v).onchange = e => { P.showNip = e.target.checked; save(); drawPreview(); };
        $('#pn-cut', v).onchange = e => { P.cut = e.target.checked; save(); };
        $$('[data-pt]', v).forEach(x => x.oninput = () => { T[x.dataset.pt] = x.value; save(); drawPreview(); clearTimeout(x._t); x._t = setTimeout(drawThemes, 500); });
        const sheet = () => {
          const d = dims(), list = chosen(), lay = PC.layoutA4(list.length, d.w, d.h);
          let el = document.getElementById('print-sheet'); if (!el) { el = document.createElement('div'); el.id = 'print-sheet'; document.body.appendChild(el); }
          el.innerHTML = lay.pages.map(pg => `<div class="pn-page">${pg.map(sl => `<div class="pn-slot ${P.cut ? 'cut' : ''}" style="left:${sl.x}mm;top:${sl.y}mm;width:${d.w}mm;height:${d.h}mm">${card(list[sl.i])}</div>`).join('')}</div>`).join('');
          document.body.classList.add('print-cards');
        };
        const unsheet = () => { const el = document.getElementById('print-sheet'); if (el) el.remove(); document.body.classList.remove('print-cards'); };
        window.__panitiaSheet = sheet;
        window.addEventListener('beforeprint', sheet); window.addEventListener('afterprint', unsheet);
        window.addEventListener('hashchange', () => { unsheet(); window.removeEventListener('beforeprint', sheet); window.removeEventListener('afterprint', unsheet); }, { once: true });
      },
      actions: {
        'pn-offreset': () => { P.off = {}; selKey = ''; save(); drawPreview(); toast('Posisi & ukuran semua elemen dikembalikan.'); },
        'pn-accent0': () => { P.accent = ''; $('#pn-accent').value = PC.THEMES[P.theme].accent; save(); drawPreview(); },
        'pn-add': () => { P.members.push({ id: S.uid('pn'), name: '', role: 'Anggota', nip: '', on: true }); save(); drawMembers(); drawPreview(); const ins = $$('[data-mf=name]'); if (ins.length) ins[ins.length - 1].focus(); },
        'pn-paste': () => {
          const m = modal(`<h2>📋 Tempel Daftar Panitia</h2><p class="small muted" style="margin-top:0">Satu orang per baris: <span class="kbd">Nama | Jabatan | NIP</span> (jabatan & NIP boleh kosong). Bisa juga disalin langsung dari Excel (kolom dipisah tab).</p>
            <textarea id="pn-txt" style="min-height:200px" placeholder="Aco Yaqub, S.Pd. | Ketua Panitia | 199411012024211007\nSiti Aminah, S.Pd | Sekretaris\nMuh. Rais | Pengawas Ruang"></textarea><div class="foot"><button class="btn ghost" data-close>Batal</button><button class="btn" id="pn-ok">Tambahkan</button></div>`);
          $('#pn-ok', m).onclick = () => {
            const rows = $('#pn-txt', m).value.split('\n').map(l => l.split(/\s*[|\t;]\s*/).map(x => x.trim())).filter(r => r[0]);
            rows.forEach(r => P.members.push({ id: S.uid('pn'), name: r[0], role: r[1] || 'Anggota', nip: (r[2] || '').replace(/^NIP\.?\s*/i, ''), on: true }));
            S.save(); closeModal(); toast(rows.length + ' anggota ditambahkan.'); drawMembers(); drawPreview(); drawThemes();
          };
        },
        'pn-teachers': async () => {
          try {
            const r = await S.api('users'); const have = new Set(P.members.map(m => (m.name || '').toLowerCase()));
            const add = r.users.filter(u => !have.has((u.name || '').toLowerCase()));
            add.forEach(u => P.members.push({ id: S.uid('pn'), name: u.name, role: 'Pengawas Ruang', nip: '', on: true }));
            S.save(); toast(add.length ? add.length + ' guru ditambahkan. Atur jabatannya masing-masing.' : 'Semua akun guru sudah ada di daftar.'); drawMembers(); drawPreview(); drawThemes();
          } catch (e) { toast(e.message, 'bad'); }
        },
        'pn-photos': () => {
          if (!P.members.length) return toast('Tambahkan anggota panitia dulu, baru pasang fotonya.', 'bad');
          photoBulk([{ name: 'Panitia', students: P.members }], async () => { await refreshPhotos(); drawMembers(); drawPreview(); drawThemes(); },
            { title: 'Pasang Foto Panitia', tip: 'Tips: beri nama file sesuai nama atau NIP, mis. <span class="kbd">Aco Yaqub.jpg</span> / <span class="kbd">199411012024211007.jpg</span>. Yang belum cocok bisa dipilih manual.' });
        },
        'pn-photo': el => {
          const m = P.members[+el.dataset.i]; if (!m) return;
          photoOne(el, m, async () => { await refreshPhotos(); drawMembers(); drawPreview(); drawThemes(); });
        },
        'pn-logo': async () => {
          const f = (await pickFiles('image/*'))[0]; if (!f) return;
          const img = new Image(), url = URL.createObjectURL(f);
          img.onload = () => { const k = Math.min(1, 240 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); K.logo = c.toDataURL('image/png'); S.save(); route(); };
          img.src = url;
        },
        'pn-print': () => { if (!needList()) return; window.__panitiaSheet(); window.print(); },
        'pn-jpg1': el => busy('Membuat JPG', async () => { const m = P.members.find(x => x.id === el.dataset.id); const d = dims(); const [sv] = await exportSvgs([m]); const c = await PC.cardCanvas(sv, d.w, d.h, 12); PC.saveBlob(await PC.canvasBlob(c), 'Kartu Panitia - ' + fname(m.name) + '.jpg'); }),
        'pn-jpg': () => { const l = needList(); if (!l) return; busy('Membuat ' + l.length + ' JPG', async () => { const d = dims(), svgs = await exportSvgs(l); for (let i = 0; i < l.length; i++) { const c = await PC.cardCanvas(svgs[i], d.w, d.h, 12); PC.saveBlob(await PC.canvasBlob(c), 'Kartu Panitia - ' + fname(l[i].name) + '.jpg'); await new Promise(r => setTimeout(r, 350)); } toast(l.length + ' file JPG diunduh.'); }); },
        'pn-jpga4': () => { const l = needList(); if (!l) return; busy('Membuat lembar A4', async () => { const d = dims(), svgs = await exportSvgs(l), lay = PC.layoutA4(l.length, d.w, d.h); for (let p = 0; p < lay.pages.length; p++) { const c = await PC.sheetCanvas(svgs, d.w, d.h, lay.pages[p], 8, P.cut); PC.saveBlob(await PC.canvasBlob(c), `Kartu Panitia - lembar ${p + 1}.jpg`); await new Promise(r => setTimeout(r, 350)); } toast(lay.pages.length + ' lembar JPG diunduh.'); }); },
        'pn-pdf': () => { const l = needList(); if (!l) return; busy('Membuat PDF', async () => { const d = dims(), svgs = await exportSvgs(l), lay = PC.layoutA4(l.length, d.w, d.h), pages = []; for (const pg of lay.pages) pages.push({ canvas: await PC.sheetCanvas(svgs, d.w, d.h, pg, 8, P.cut), wmm: 210, hmm: 297 }); PC.saveBlob(PC.pdfFromCanvases(pages), 'Kartu Panitia Ujian (A4).pdf'); toast('PDF siap: ' + pages.length + ' halaman A4.'); }); },
        'pn-pdf1': () => { const l = needList(); if (!l) return; busy('Membuat PDF', async () => { const d = dims(), svgs = await exportSvgs(l), pages = []; for (const sv of svgs) pages.push({ canvas: await PC.cardCanvas(sv, d.w, d.h, 12), wmm: d.w, hmm: d.h }); PC.saveBlob(PC.pdfFromCanvases(pages), 'Kartu Panitia Ujian (per kartu).pdf'); toast('PDF siap: ' + pages.length + ' kartu.'); }); }
      }
    };
  }

  /* ================= Ujian berjalan & riwayat ================= */
  let monitorPoll = null, monitorFilter = 'all';
  const sinceText = t => { if (!t) return ''; const d = (Date.now() - new Date(String(t).replace(' ', 'T')).getTime()) / 60000; return d < 1 ? 'baru saja' : d < 60 ? Math.floor(d) + ' menit lalu' : d < 1440 ? Math.floor(d / 60) + ' jam lalu' : tgl(t); };
  function viewMonitor() {
    setTitle('📡 Ujian Berjalan & Riwayat', 'Pantau semua ujian & kuis yang sedang berlangsung di sekolah — diperbarui otomatis');
    renderCtx(false);
    const out = {
      html: `<div class="btns no-print" style="margin-bottom:12px"><div class="tabs" style="margin:0"><button class="${monitorFilter === 'all' ? 'on' : ''}" data-act="mf" data-f="all">Semua guru</button><button class="${monitorFilter === 'mine' ? 'on' : ''}" data-act="mf" data-f="mine">Milik saya</button></div>
        <span class="small muted" id="mon-upd" style="margin-left:auto"></span><button class="btn ghost sm" data-act="mrefresh">🔄 Muat ulang</button></div><div id="mon" class="muted">Memuat…</div>`,
      async mount(v) {
        const load = async () => {
          const box = $('#mon'); if (!box) return;
          let d; try { d = await S.api('monitor'); } catch (e) { box.innerHTML = `<div class="card">${esc(e.message)}</div>`; return; }
          out.data = d; draw(d);
          const u = $('#mon-upd'); if (u) u.textContent = 'Diperbarui ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        };
        out.load = load;
        await load();
        clearInterval(monitorPoll); monitorPoll = setInterval(load, 8000);
      },
      actions: {
        mf: el => { monitorFilter = el.dataset.f; route(); },
        mrefresh: () => out.load && out.load(),
        'mon-end': async el => {
          if (!await confirmBox('Akhiri kuis/ujian ini sekarang? Lembar yang belum dikumpulkan akan dikumpulkan otomatis.', 'Akhiri')) return;
          try { await S.api('games/' + el.dataset.id + '/end', { body: {} }); toast('Diakhiri.'); out.load(); } catch (e) { toast(e.message, 'bad'); }
        },
        'mon-close': async el => {
          const a = S.asm(el.dataset.id); if (!a) return toast('Asesmen tidak ditemukan. Muat ulang halaman.', 'bad');
          if (!canEditAsm(a)) return toast('Hanya pembuat atau admin sekolah yang bisa menutup ujian ini.', 'bad');
          if (!await confirmBox(`Tutup ujian token <b>${esc(a.examCode)}</b>? Murid yang belum mengumpulkan tidak bisa masuk lagi.`, 'Tutup')) return;
          linkedAsm(a).forEach(x => { if (canEditAsm(x)) x.examOpen = false; }); S.save(); await S.flush(); toast('Ujian ditutup.'); out.load();
        }
      }
    };
    function draw(d) {
      const mine = x => monitorFilter !== 'mine' || +x.ownerId === +S.user.id;
      const games = d.games.filter(mine), tokens = d.tokens.filter(mine);
      // ujian token yang berbagi token digabung jadi satu kartu
      const tokGroups = []; const seen = {};
      tokens.forEach(t => { const k = t.open && t.linkId ? 'L' + t.linkId : 'A' + t.id; if (seen[k]) { const g = seen[k]; g.classes = g.classes.concat(t.classes); g.expected += t.expected; g.finished += t.finished; g.ids.push(t.id); if (t.firstAt && (!g.firstAt || t.firstAt < g.firstAt)) g.firstAt = t.firstAt; if (t.lastAt && (!g.lastAt || t.lastAt > g.lastAt)) g.lastAt = t.lastAt; if (t.avg !== null) { g._s += t.avg * t.finished; g._n += t.finished; } return; } const g = Object.assign({}, t, { ids: [t.id], _s: t.avg !== null ? t.avg * t.finished : 0, _n: t.avg !== null ? t.finished : 0 }); seen[k] = g; tokGroups.push(g); });
      tokGroups.forEach(g => { g.avg = g._n ? Math.round(g._s / g._n * 10) / 10 : null; });
      const live = games.filter(g => g.status !== 'ended').concat(tokGroups.filter(t => t.open));
      const hist = games.filter(g => g.status === 'ended').concat(tokGroups.filter(t => !t.open)).sort((a, b) => String(b.endedAt || b.lastAt || b.createdAt).localeCompare(String(a.endedAt || a.lastAt || a.createdAt)));
      const kindPill = x => x.kind === 'token' ? '<span class="pill pri">🔑 Ujian Token</span>' : x.mode === 'exam' ? '<span class="pill pri">📝 Mode Ujian</span>' : '<span class="pill ok">🎮 Permainan</span>';
      const card = x => {
        const total = x.expected || x.players || 0, done = x.finished, pct = total ? Math.min(100, Math.round(done / total * 100)) : 0;
        const status = x.kind === 'token' ? '● Token dibuka' : x.status === 'lobby' ? '⏳ Menunggu dimulai' : '● Berlangsung';
        const stale = x.kind !== 'token' && (Date.now() - new Date(String(x.startedAt || x.createdAt).replace(' ', 'T')).getTime()) > 86400000;
        return `<div class="card mon-card"><div class="card-head"><h3>${esc(x.title)}</h3><span class="pill ${x.status === 'lobby' ? 'warn' : 'ok'} mon-live">${status}</span></div>
          <div class="btns" style="gap:6px;margin-bottom:8px">${stale ? '<span class="pill warn" title="Mungkin lupa diakhiri">⚠ lebih dari sehari</span>' : ''}${kindPill(x)}${x.classes.length ? `<span class="pill">🏫 ${x.classes.map(esc).join(', ')}</span>` : '<span class="pill">nama bebas</span>'}<span class="pill">${x.kind === 'token' ? 'Token' : 'Kode'} <b>${esc(x.code)}</b></span>${x.owner ? `<span class="pill">👤 ${esc(x.owner)}</span>` : ''}</div>
          <div class="mon-stats"><div><b>${x.kind === 'token' ? done : x.players}</b><small>${x.kind === 'token' ? 'mengumpulkan' : 'bergabung'}</small></div>${x.kind === 'token' ? '' : `<div><b>${x.working}</b><small>${x.mode === 'exam' ? 'sedang mengerjakan' : 'bermain'}</small></div><div><b>${done}</b><small>selesai</small></div>`}<div><b>${total || '–'}</b><small>${x.expected ? 'murid di kelas' : 'peserta'}</small></div>${x.violations ? `<div><b style="color:var(--bad)">${x.violations}</b><small>pelanggaran</small></div>` : ''}${x.avg !== null && x.avg !== undefined ? `<div><b>${fmt(x.avg, x.kind !== 'token' && x.mode === 'game' ? 0 : 1)}</b><small>${x.kind !== 'token' && x.mode === 'game' ? 'rata-rata poin' : 'rata-rata nilai'}</small></div>` : ''}</div>
          <div class="bar" style="margin:8px 0"><i style="width:${pct}%"></i></div>
          <div class="small muted">${x.kind === 'token' ? (x.firstAt ? 'Pengumpulan pertama ' + sinceText(x.firstAt) : 'Belum ada yang mengumpulkan') : x.startedAt ? 'Dimulai ' + sinceText(x.startedAt) : 'Dibuat ' + sinceText(x.createdAt)}${x.duration ? ' · durasi ' + x.duration + ' menit' : ''}</div>
          <div class="btns" style="margin-top:10px">${x.kind === 'token' ? `<a class="btn sm" href="#/asesmen/${x.type}/${x.id}">👁 Buka Nilai & Token</a><button class="btn danger sm" data-act="mon-close" data-id="${esc(x.id)}">■ Tutup Ujian</button>` : `<a class="btn sm" href="#/kuis/${x.id}">👁 Buka Layar ${x.mode === 'exam' ? 'Pengawas' : 'Kuis'}</a>${+x.ownerId === +S.user.id || S.user.role === 'admin' ? `<button class="btn danger sm" data-act="mon-end" data-id="${x.id}">■ Akhiri</button>` : ''}`}</div></div>`;
      };
      const row = x => `<tr><td class="small">${x.kind === 'token' ? (x.lastAt ? tgl(x.lastAt) : '–') : tgl(x.endedAt || x.createdAt)}</td><td><b>${esc(x.title)}</b></td><td>${kindPill(x)}</td><td>${x.classes.map(esc).join(', ') || '<span class="muted">nama bebas</span>'}</td>
        <td class="num">${x.finished}${x.expected ? '/' + x.expected : ''}</td><td class="num">${x.avg !== null && x.avg !== undefined ? fmt(x.avg, x.kind !== 'token' && x.mode === 'game' ? 0 : 1) + (x.kind !== 'token' && x.mode === 'game' ? ' poin' : '') : '–'}</td><td class="small">${esc(x.owner || '')}</td>
        <td><a class="btn ghost sm" href="#/hasil/${x.kind === 'token' ? 'a' : 'g'}/${x.id}">📊 Laporan</a></td></tr>`;
      $('#mon').innerHTML = `<div class="grid g4 mon-top">
          <div class="card stat"><div class="num">${live.length}</div><div class="lbl">ujian/kuis berjalan</div></div>
          <div class="card stat"><div class="num">${live.reduce((t, x) => t + (x.kind === 'token' ? 0 : x.working || 0), 0)}</div><div class="lbl">murid sedang mengerjakan</div></div>
          <div class="card stat"><div class="num">${live.reduce((t, x) => t + (x.finished || 0), 0)}</div><div class="lbl">sudah selesai</div></div>
          <div class="card stat"><div class="num">${hist.length}</div><div class="lbl">riwayat</div></div></div>
        <h2 style="margin:18px 0 10px">● Sedang berjalan</h2>
        ${live.length ? `<div class="grid auto">${live.map(card).join('')}</div>` : '<div class="card empty"><div class="big">😴</div>Tidak ada ujian atau kuis yang sedang berjalan. Buat dari menu <a href="#/kuis">Kuis Seru</a> atau buka token di halaman asesmen.</div>'}
        <h2 style="margin:22px 0 10px">🕘 Riwayat</h2>
        ${hist.length ? `<div class="card"><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Judul</th><th>Jenis</th><th>Kelas</th><th class="num">Selesai</th><th class="num">Rata-rata</th><th>Guru</th><th></th></tr></thead><tbody>${hist.map(row).join('')}</tbody></table></div></div>` : '<div class="card empty">Belum ada riwayat ujian.</div>'}`;
    }
    return out;
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
            <div class="btns"><button class="btn lg" data-act="save-config">💾 Simpan Pengaturan</button></div>
            <div class="card" style="margin-top:18px"><div class="card-head"><h3>📧 Pengiriman Email (Lupa Password)</h3></div>
              <p class="small muted" style="margin-top:0">Tanpa SMTP, email dikirim dengan fungsi bawaan hosting dari <b>${esc(d.mail.defaultFrom)}</b> — sering masuk Spam. Lebih andal: buat akun email di <b>cPanel → Email Accounts</b> (mis. <span class="kbd">no-reply@${esc(d.mail.defaultFrom.split('@')[1])}</span>), lalu isi SMTP di bawah (lihat <b>Connect Devices</b> di cPanel untuk host & port).</p>
              <div class="row"><label class="field"><span>Nama pengirim</span><input id="ml-name" value="${esc(d.mail.fromName)}" placeholder="${esc(p.brand)}"></label><label class="field"><span>Email pengirim</span><input id="ml-from" value="${esc(d.mail.fromEmail)}" placeholder="${esc(d.mail.defaultFrom)}"></label></div>
              <div class="row"><label class="field" style="flex:2"><span>SMTP host (kosongkan = fungsi bawaan hosting)</span><input id="ml-host" value="${esc(d.mail.smtpHost)}" placeholder="mail.${esc(d.mail.defaultFrom.split('@')[1])}"></label>
                <label class="field" style="max-width:110px"><span>Port</span><input id="ml-port" inputmode="numeric" value="${d.mail.smtpPort}"></label>
                <label class="field" style="max-width:150px"><span>Keamanan</span><select id="ml-sec">${[['ssl', 'SSL (465)'], ['tls', 'STARTTLS (587)'], ['none', 'Tanpa']].map(([v, l]) => `<option value="${v}" ${d.mail.smtpSecure === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
              <div class="row"><label class="field"><span>Username SMTP (alamat email)</span><input id="ml-user" value="${esc(d.mail.smtpUser)}" autocomplete="off"></label>
                <label class="field"><span>Password SMTP</span><input id="ml-pass" type="password" autocomplete="new-password" placeholder="${d.mail.hasPass ? '•••••• (tersimpan — isi untuk mengganti)' : ''}"></label></div>
              <div class="btns"><button class="btn" data-act="save-mail">💾 Simpan Pengaturan Email</button><input id="ml-to" type="email" placeholder="email tujuan uji" style="max-width:240px" value="${esc(S.user.email || (/@/.test(S.user.username) ? S.user.username : ''))}"><button class="btn soft" data-act="test-mail">📨 Kirim Email Uji</button></div></div>`;
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
        'save-mail': async () => {
          try {
            await S.api('owner/mail', { method: 'PUT', body: { fromName: $('#ml-name').value.trim(), fromEmail: $('#ml-from').value.trim(), smtpHost: $('#ml-host').value.trim(), smtpPort: +$('#ml-port').value || 465, smtpSecure: $('#ml-sec').value, smtpUser: $('#ml-user').value.trim(), smtpPass: $('#ml-pass').value } });
            toast('Pengaturan email tersimpan. Coba tombol Kirim Email Uji.'); $('#ml-pass').value = '';
          } catch (e) { toast(e.message, 'bad'); }
        },
        'test-mail': async el => {
          el.disabled = true; el.textContent = 'Mengirim…';
          try { await S.api('owner/mail-test', { body: { to: $('#ml-to').value.trim() } }); toast('Email uji terkirim. Periksa kotak masuk / Spam.'); }
          catch (e) { modal(`<h2>Email uji gagal</h2><div class="note warn">${esc(e.message)}</div><p class="small muted">Periksa host, port, keamanan, username & password SMTP (sama dengan pengaturan aplikasi email di cPanel → Email Accounts → Connect Devices).</p><div class="foot"><button class="btn" data-close>Tutup</button></div>`); }
          el.disabled = false; el.textContent = '📨 Kirim Email Uji';
        },
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
  const resetTok = (location.hash.match(/^#reset=([a-f0-9]{64})$/) || [])[1];
  S.init().then(r => {
    if (r.needsConfig) configScreen();
    else if (resetTok) resetScreen(resetTok);
    else if (location.hash === '#lupa') forgotScreen();
    else if (r.needsSetup) authScreen(true);
    else if (r.needLogin) authScreen(location.hash === '#daftar' ? 'register' : 'login');
    else startApp();
  }).catch(e => {
    $('#view').innerHTML = `<div class="card"><h2>Tidak bisa memuat data</h2><p>${esc(e.message)}</p><p class="small muted">${S.backend === 'php' ? 'Periksa database di cPanel → MySQL® Databases. Untuk mengisi ulang pengaturan database, hapus file <b>api/config.php</b> lewat File Manager lalu muat ulang halaman ini.' : 'Periksa pengaturan database di cPanel → Setup Node.js App → Environment variables (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD), lalu Restart. Detail juga tercatat di file log-aplikasi.txt di folder aplikasi.'}</p><button class="btn" onclick="location.reload()">Coba Lagi</button></div>`;
  });
  // :active di layar sentuh iOS langsung terasa
  document.addEventListener('touchstart', () => {}, { passive: true });
})();
