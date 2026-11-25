/* Jenis-jenis soal: tampilan untuk murid (dioptimalkan untuk layar sentuh), editor guru, dan tampilan jawaban.
   Jawaban selalu berupa teks (struktur kompleks disimpan sebagai JSON). Penilaian ada di parser.js (SoalParser.gradeOne). */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const P = () => (typeof window !== 'undefined' && window.SoalParser) || require('./parser.js');
  const LET = 'ABCDEFGH';
  const pj = v => { if (v && typeof v === 'object') return v; try { return JSON.parse(v); } catch (e) { return null; } };

  const TYPES = {
    pg: { label: 'Pilihan Ganda', icon: '🔘', desc: 'Satu jawaban benar', game: true },
    pgk: { label: 'Pilihan Ganda Kompleks', icon: '☑️', desc: 'Jawaban benar lebih dari satu', game: true },
    bs: { label: 'Benar / Salah', icon: '✅', desc: 'Tentukan benar atau salah', game: true },
    isian: { label: 'Isian Singkat', icon: '✏️', desc: 'Jawaban berupa kata/kalimat singkat', game: true },
    angka: { label: 'Jawaban Angka', icon: '🔢', desc: 'Jawaban berupa bilangan (bisa ada toleransi)', game: true },
    jodoh: { label: 'Menjodohkan', icon: '🔗', desc: 'Pasangkan kiri dengan kanan', game: true },
    urut: { label: 'Mengurutkan', icon: '↕️', desc: 'Susun urutan yang benar', game: true },
    kelompok: { label: 'Mengelompokkan', icon: '🗂️', desc: 'Masukkan item ke kategori yang tepat', game: true },
    seret: { label: 'Seret ke Kalimat', icon: '🧩', desc: 'Isi bagian kosong dengan kata yang tersedia', game: true },
    dropdown: { label: 'Pilihan dalam Kalimat', icon: '🔽', desc: 'Pilih kata yang tepat di dalam kalimat', game: true },
    titik: { label: 'Titik pada Gambar', icon: '🎯', desc: 'Ketuk bagian gambar yang tepat', game: true },
    label: { label: 'Label Gambar', icon: '🏷️', desc: 'Beri label pada penanda di gambar', game: true },
    uraian: { label: 'Uraian', icon: '📝', desc: 'Jawaban panjang, dikoreksi guru', game: false },
    gambar: { label: 'Menggambar', icon: '🎨', desc: 'Murid menggambar/menulis tangan, dikoreksi guru', game: false },
    suara: { label: 'Rekam Suara', icon: '🎙️', desc: 'Murid merekam jawaban lisan, dikoreksi guru', game: false },
    polling: { label: 'Polling / Survei', icon: '📊', desc: 'Tanpa jawaban benar, tidak dinilai', game: true },
    slide: { label: 'Slide Materi', icon: '📖', desc: 'Teks/gambar penjelasan, tanpa jawaban', game: true }
  };
  const ORDER = ['pg', 'pgk', 'bs', 'isian', 'angka', 'jodoh', 'urut', 'kelompok', 'seret', 'dropdown', 'titik', 'label', 'uraian', 'gambar', 'suara', 'polling', 'slide'];

  /* ---------- acak deterministik ---------- */
  function rng(seed) { let h = 2166136261; for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; }
  function shuffle(a, seed) { const r = rng(seed), o = a.slice(); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; }
  function segs(text, mapBlank) { const out = []; let last = 0; String(text || '').replace(/\[\[(.+?)\]\]/g, (m, x, idx) => { out.push(text.slice(last, idx)); out.push({ b: out.filter(z => typeof z === 'object').length, raw: x }); last = idx + m.length; return m; }); out.push(String(text || '').slice(last)); return out.map(z => typeof z === 'object' && mapBlank ? { html: mapBlank(z) } : z); }

  /** Versi soal untuk murid (tanpa kunci). Sama dengan public_q() di server PHP. */
  function publicView(q, seed) {
    const v = { id: q.id, type: q.type, text: q.text || '', image: q.image || null, points: q.points };
    seed = seed || q.id;
    if (q.type === 'pg' || q.type === 'pgk' || q.type === 'polling') v.options = (q.options || []).map(o => ({ label: o.label, text: o.text }));
    if (q.type === 'pgk') v.multi = true;
    if (q.type === 'jodoh') { v.lefts = (q.pairs || []).map(p => p.l); v.rights = shuffle((q.pairs || []).map((p, i) => ({ id: i, text: p.r })), seed + 'r'); }
    if (q.type === 'urut') v.items = shuffle((q.items || []).map((t, i) => ({ id: i, text: t })), seed + 'u');
    if (q.type === 'kelompok') { v.cats = (q.cats || []).map(c => c.name); const it = []; (q.cats || []).forEach((c, ci) => (c.items || []).forEach((t, ii) => it.push({ id: ci + '-' + ii, text: t }))); v.items = shuffle(it, seed + 'k'); }
    if (q.type === 'seret') { const bl = P().blanksOf(q.text); v.text = q.text.replace(/\[\[(.+?)\]\]/g, '[[ ]]'); v.chips = shuffle(bl.map(b => b.split('/')[0].trim()).concat(String(q.extra || '').split(',').map(x => x.trim()).filter(Boolean)), seed + 's'); }
    if (q.type === 'dropdown') { const bl = P().blanksOf(q.text); v.text = q.text.replace(/\[\[(.+?)\]\]/g, '[[ ]]'); v.drops = bl.map((b, i) => shuffle(b.split('|').map(x => x.trim()).filter(Boolean), seed + 'd' + i)); }
    if (q.type === 'label') { v.marks = (q.marks || []).map(m => ({ x: m.x, y: m.y })); v.labels = shuffle((q.marks || []).map(m => m.label), seed + 'l'); }
    if (q.type === 'suara') v.maxSec = +q.maxSec || 60;
    return v;
  }

  /* ================= TAMPILAN MURID ================= */
  const HINT = { pgk: 'Pilih semua jawaban yang benar.', jodoh: 'Ketuk item kiri, lalu ketuk pasangannya di kanan.', urut: 'Gunakan tombol ▲ ▼ untuk menyusun urutan yang benar.', kelompok: 'Ketuk item, lalu ketuk kotak kategorinya.', seret: 'Ketuk kata, lalu ketuk bagian kosong. Ketuk lagi untuk menghapus.', dropdown: 'Pilih kata yang tepat pada setiap kotak.', titik: 'Ketuk bagian gambar yang tepat.', label: 'Pilih label untuk setiap penanda bernomor.', gambar: 'Gambar atau tulis jawabanmu di kanvas.', suara: 'Tekan rekam lalu ucapkan jawabanmu.', polling: 'Pilih salah satu. Tidak ada jawaban salah.', angka: 'Tulis jawaban berupa angka.' };

  /**
   * Pasang tampilan soal ke elemen `el`.
   * ctx: { onChange(ansString), media(dataURL) → Promise<string> (opsional: unggah gambar/suara), readonly }
   */
  function mount(el, v, ans, ctx) {
    ctx = ctx || {};
    let st = { ans: ans == null ? '' : String(ans), sel: null };
    const set = a => { st.ans = a; if (ctx.onChange) ctx.onChange(a); draw(); };
    const draw = () => { el.innerHTML = `<div class="qt qt-${v.type}">${HINT[v.type] ? `<div class="qt-hint">${HINT[v.type]}</div>` : ''}${body()}</div>`; bind(); };
    const body = () => {
      const a = st.ans, t = v.type;
      if (t === 'pg' || t === 'polling') return (v.options || []).map((o, k) => `<div class="exam-opt ${a === o.label ? 'sel' : ''}" data-v="${esc(o.label)}"><span class="lab">${LET[k]}</span><span>${esc(o.text)}</span></div>`).join('');
      if (t === 'pgk') { const s = a.split(',').filter(Boolean); return (v.options || []).map((o, k) => `<div class="exam-opt chk ${s.indexOf(o.label) >= 0 ? 'sel' : ''}" data-m="${esc(o.label)}"><span class="lab">${s.indexOf(o.label) >= 0 ? '✓' : LET[k]}</span><span>${esc(o.text)}</span></div>`).join(''); }
      if (t === 'bs') return [['B', 'Benar'], ['S', 'Salah']].map(([x, l]) => `<div class="exam-opt ${a === x ? 'sel' : ''}" data-v="${x}"><span class="lab">${x}</span><span>${l}</span></div>`).join('');
      if (t === 'isian') return `<input class="ex-input qt-in" autocomplete="off" placeholder="Tulis jawaban singkat…" value="${esc(a)}">`;
      if (t === 'angka') return `<input class="ex-input qt-in" inputmode="decimal" autocomplete="off" placeholder="Contoh: 12,5" value="${esc(a)}">`;
      if (t === 'uraian') return `<textarea class="ex-input qt-in" style="min-height:170px" placeholder="Tulis jawabanmu…">${esc(a)}</textarea>`;
      if (t === 'slide') return '';
      if (t === 'jodoh') {
        const m = pj(a) || v.lefts.map(() => null);
        const used = {}; m.forEach((r, i) => { if (r !== null && r !== undefined) used[r] = i; });
        return `<div class="qt-match"><div class="qt-col">${v.lefts.map((l, i) => `<button class="qt-card ${st.sel === i ? 'pick' : ''} ${m[i] !== null && m[i] !== undefined ? 'paired c' + (i % 6) : ''}" data-l="${i}">${m[i] !== null && m[i] !== undefined ? `<span class="qt-badge">${i + 1}</span>` : `<span class="qt-num">${i + 1}</span>`}${esc(l)}</button>`).join('')}</div>
          <div class="qt-col">${v.rights.map(r => `<button class="qt-card ${used[r.id] !== undefined ? 'paired c' + (used[r.id] % 6) : ''}" data-r="${r.id}">${used[r.id] !== undefined ? `<span class="qt-badge">${used[r.id] + 1}</span>` : ''}${esc(r.text)}</button>`).join('')}</div></div>`;
      }
      if (t === 'urut') {
        const ord = pj(a) || v.items.map(x => x.id), byId = {}; v.items.forEach(x => { byId[x.id] = x.text; });
        return `<div class="qt-order">${ord.map((id, k) => `<div class="qt-orow"><span class="qt-num">${k + 1}</span><span class="qt-otext">${esc(byId[id])}</span><button class="qt-mv" data-up="${k}" ${k === 0 ? 'disabled' : ''}>▲</button><button class="qt-mv" data-dn="${k}" ${k === ord.length - 1 ? 'disabled' : ''}>▼</button></div>`).join('')}</div>${a ? '' : '<div class="qt-hint small">Urutan belum diubah — ketuk ▲▼ untuk menyusun.</div>'}`;
      }
      if (t === 'kelompok') {
        const m = pj(a) || {};
        const chip = it => `<button class="qt-chip ${st.sel === it.id ? 'pick' : ''}" data-i="${esc(it.id)}">${esc(it.text)}</button>`;
        return `<div class="qt-pool">${v.items.filter(it => m[it.id] === undefined).map(chip).join('') || '<span class="muted small">Semua item sudah dikelompokkan ✓</span>'}</div>
          <div class="qt-cats">${v.cats.map((c, ci) => `<div class="qt-cat ${st.sel !== null ? 'drop' : ''}" data-c="${ci}"><b>${esc(c)}</b><div>${v.items.filter(it => m[it.id] === ci).map(chip).join('')}</div></div>`).join('')}</div>`;
      }
      if (t === 'seret') {
        const m = pj(a) || []; const usedCount = {}; m.forEach(w => { if (w) usedCount[w] = (usedCount[w] || 0) + 1; });
        const avail = []; const cnt = Object.assign({}, usedCount); v.chips.forEach((w, k) => { if (cnt[w]) cnt[w]--; else avail.push({ w, k }); });
        const sentence = segs(v.text, z => `<button class="qt-blank ${m[z.b] ? 'filled' : ''} ${st.sel !== null ? 'drop' : ''}" data-b="${z.b}">${m[z.b] ? esc(m[z.b]) : '&nbsp;'}</button>`).map(x => typeof x === 'string' ? esc(x) : x.html).join('');
        return `<div class="qt-sentence">${sentence}</div><div class="qt-pool">${avail.map(c => `<button class="qt-chip ${st.sel === c.k ? 'pick' : ''}" data-k="${c.k}">${esc(c.w)}</button>`).join('')}</div>`;
      }
      if (t === 'dropdown') {
        const m = pj(a) || [];
        return `<div class="qt-sentence">${segs(v.text, z => `<select class="qt-drop" data-b="${z.b}"><option value="">— pilih —</option>${(v.drops[z.b] || []).map(o => `<option ${m[z.b] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`).map(x => typeof x === 'string' ? esc(x) : x.html).join('')}</div>`;
      }
      if (t === 'titik') {
        const p = a ? a.split(',').map(Number) : null;
        return v.image ? `<div class="qt-imgbox" data-hot="1"><img src="${v.image}" alt="">${p ? `<i class="qt-dot" style="left:${p[0] * 100}%;top:${p[1] * 100}%"></i>` : ''}</div>` : '<p class="muted">Gambar soal belum ada.</p>';
      }
      if (t === 'label') {
        const m = pj(a) || [];
        return `${v.image ? `<div class="qt-imgbox"><img src="${v.image}" alt="">${v.marks.map((mk, i) => `<i class="qt-mark" style="left:${mk.x * 100}%;top:${mk.y * 100}%">${i + 1}</i>`).join('')}</div>` : ''}
          <div class="qt-labels">${v.marks.map((mk, i) => `<label><span class="qt-num">${i + 1}</span><select class="qt-lab" data-b="${i}"><option value="">— pilih label —</option>${v.labels.map(l => `<option ${m[i] === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`).join('')}</div>`;
      }
      if (t === 'gambar') {
        return `<div class="qt-draw"><div class="qt-tools"><button class="qt-pen on" data-c="#1b1663">✏️</button><button class="qt-pen" data-c="#e9475f" style="color:#e9475f">●</button><button class="qt-pen" data-c="#2f8be0" style="color:#2f8be0">●</button><button class="qt-pen" data-c="#20b37a" style="color:#20b37a">●</button><button class="qt-pen" data-c="erase">🧽</button><button class="qt-clear">🗑 Hapus</button></div>
          <canvas class="qt-canvas" width="900" height="600"></canvas>${/^media:/.test(a) ? '<div class="small muted">✓ Gambar tersimpan. Menggambar lagi akan menggantinya.</div>' : ''}</div>`;
      }
      if (t === 'suara') {
        const has = a && (/^data:audio/.test(a) || /^media:/.test(a));
        return `<div class="qt-rec"><button class="btn lg qt-recbtn">🎙️ ${has ? 'Rekam Ulang' : 'Mulai Rekam'}</button><div class="qt-rectime small muted">Maksimal ${v.maxSec || 60} detik</div>${/^data:audio/.test(a) ? `<audio controls src="${a}"></audio>` : has ? '<div class="small">✓ Rekaman tersimpan.</div>' : ''}</div>`;
      }
      return '';
    };
    function bind() {
      const $$ = s => Array.from(el.querySelectorAll(s)), t = v.type;
      if (ctx.readonly) return;
      $$('[data-v]').forEach(b => b.onclick = () => set(b.dataset.v));
      $$('[data-m]').forEach(b => b.onclick = () => { const s = st.ans.split(',').filter(Boolean), x = b.dataset.m, i = s.indexOf(x); if (i >= 0) s.splice(i, 1); else s.push(x); set(s.sort().join(',')); });
      $$('.qt-in').forEach(inp => { inp.oninput = () => { st.ans = inp.value; if (ctx.onChange) ctx.onChange(inp.value); }; });
      if (t === 'jodoh') {
        $$('[data-l]').forEach(b => b.onclick = () => {
          const i = +b.dataset.l, m = pj(st.ans) || v.lefts.map(() => null);
          if (m[i] !== null && m[i] !== undefined) { m[i] = null; st.sel = null; return set(JSON.stringify(m)); }
          st.sel = st.sel === i ? null : i; draw();
        });
        $$('[data-r]').forEach(b => b.onclick = () => {
          if (st.sel === null) { const m = pj(st.ans) || []; const k = m.indexOf(+b.dataset.r); if (k >= 0) { m[k] = null; set(JSON.stringify(m)); } return; }
          const m = pj(st.ans) || v.lefts.map(() => null), r = +b.dataset.r, k = m.indexOf(r); if (k >= 0) m[k] = null;
          m[st.sel] = r; st.sel = null; set(JSON.stringify(m));
        });
      }
      if (t === 'urut') {
        const mv = (k, d) => { const o = pj(st.ans) || v.items.map(x => x.id); const j = k + d; [o[k], o[j]] = [o[j], o[k]]; set(JSON.stringify(o)); };
        $$('[data-up]').forEach(b => b.onclick = () => mv(+b.dataset.up, -1));
        $$('[data-dn]').forEach(b => b.onclick = () => mv(+b.dataset.dn, 1));
      }
      if (t === 'kelompok') {
        $$('[data-i]').forEach(b => b.onclick = e => {
          e.stopPropagation(); const id = b.dataset.i, m = pj(st.ans) || {};
          if (m[id] !== undefined && st.sel === null) { delete m[id]; return set(JSON.stringify(m)); }
          st.sel = st.sel === id ? null : id; draw();
        });
        $$('[data-c]').forEach(c => c.onclick = () => { if (st.sel === null) return; const m = pj(st.ans) || {}; m[st.sel] = +c.dataset.c; st.sel = null; set(JSON.stringify(m)); });
      }
      if (t === 'seret') {
        $$('[data-k]').forEach(b => b.onclick = () => { st.sel = st.sel === +b.dataset.k ? null : +b.dataset.k; draw(); });
        $$('[data-b]').forEach(b => b.onclick = () => {
          const m = pj(st.ans) || [], i = +b.dataset.b;
          if (st.sel !== null) { m[i] = v.chips[st.sel]; st.sel = null; return set(JSON.stringify(m)); }
          if (m[i]) { m[i] = null; set(JSON.stringify(m)); }
        });
      }
      if (t === 'dropdown' || t === 'label') $$('select[data-b]').forEach(sel => sel.onchange = () => { const m = pj(st.ans) || []; m[+sel.dataset.b] = sel.value || null; set(JSON.stringify(m)); });
      if (t === 'titik') { const box = el.querySelector('[data-hot]'); if (box) box.onclick = e => { const r = box.getBoundingClientRect(); set(((e.clientX - r.left) / r.width).toFixed(4) + ',' + ((e.clientY - r.top) / r.height).toFixed(4)); }; }
      if (t === 'gambar') drawPad();
      if (t === 'suara') recorder();
    }
    function drawPad() {
      const cv = el.querySelector('.qt-canvas'), g = cv.getContext('2d');
      let color = '#1b1663', drawing = false, last = null, dirty = false, timer = null;
      const paintBg = () => { g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); };
      paintBg();
      const prev = st.ans;
      const bg = v.image ? new Image() : null;
      if (bg) { bg.onload = () => { const k = Math.min(cv.width / bg.width, cv.height / bg.height); g.drawImage(bg, (cv.width - bg.width * k) / 2, (cv.height - bg.height * k) / 2, bg.width * k, bg.height * k); if (/^data:image/.test(prev)) restore(); }; bg.src = v.image; }
      const restore = () => { const im = new Image(); im.onload = () => g.drawImage(im, 0, 0, cv.width, cv.height); im.src = prev; };
      if (!bg && /^data:image/.test(prev)) restore();
      const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
      const save = () => { clearTimeout(timer); timer = setTimeout(async () => { if (!dirty) return; dirty = false; let url = cv.toDataURL('image/jpeg', 0.72); if (ctx.media) { try { url = await ctx.media(url); } catch (e) { /* simpan lokal */ } } st.ans = url; if (ctx.onChange) ctx.onChange(url); }, 700); };
      cv.onpointerdown = e => { drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); e.preventDefault(); };
      cv.onpointermove = e => { if (!drawing) return; const p = pos(e); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = color === 'erase' ? '#fff' : color; g.lineWidth = color === 'erase' ? 28 : 5; g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(p.x, p.y); g.stroke(); last = p; dirty = true; };
      cv.onpointerup = cv.onpointercancel = () => { drawing = false; save(); };
      el.querySelectorAll('.qt-pen').forEach(b => b.onclick = () => { color = b.dataset.c; el.querySelectorAll('.qt-pen').forEach(x => x.classList.toggle('on', x === b)); });
      el.querySelector('.qt-clear').onclick = () => { paintBg(); if (bg && bg.complete) { const k = Math.min(cv.width / bg.width, cv.height / bg.height); g.drawImage(bg, (cv.width - bg.width * k) / 2, (cv.height - bg.height * k) / 2, bg.width * k, bg.height * k); } dirty = true; save(); };
    }
    function recorder() {
      const btn = el.querySelector('.qt-recbtn'), info = el.querySelector('.qt-rectime');
      btn.onclick = async () => {
        if (btn.dataset.rec) { btn.__stop && btn.__stop(); return; }
        if (!navigator.mediaDevices || !window.MediaRecorder) { info.textContent = 'Perekam suara tidak didukung di browser ini.'; return; }
        let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { info.textContent = 'Izin mikrofon ditolak. Izinkan mikrofon lalu coba lagi.'; return; }
        const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', ''].find(m => !m || (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)));
        const rec = new MediaRecorder(stream, Object.assign({ audioBitsPerSecond: 32000 }, mime ? { mimeType: mime } : {})), parts = [];
        rec.ondataavailable = e => parts.push(e.data);
        rec.onstop = async () => {
          stream.getTracks().forEach(x => x.stop()); clearInterval(tm);
          const blob = new Blob(parts, { type: rec.mimeType || 'audio/webm' });
          let url = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
          const local = url;
          if (ctx.media) { info.textContent = 'Menyimpan rekaman…'; try { url = await ctx.media(url); } catch (e) { /* */ } }
          st.ans = url; if (ctx.onChange) ctx.onChange(url);
          draw(); const au = el.querySelector('.qt-rec'); if (au && !au.querySelector('audio')) au.insertAdjacentHTML('beforeend', `<audio controls src="${local}"></audio>`);
        };
        rec.start(); btn.dataset.rec = '1'; btn.textContent = '⏹ Berhenti'; btn.classList.add('danger');
        let s0 = Date.now(); const max = (v.maxSec || 60) * 1000;
        const tm = setInterval(() => { const d = Date.now() - s0; info.textContent = '● Merekam ' + Math.floor(d / 1000) + ' / ' + (v.maxSec || 60) + ' detik'; if (d >= max) btn.__stop(); }, 250);
        btn.__stop = () => { if (rec.state !== 'inactive') rec.stop(); delete btn.dataset.rec; };
      };
    }
    draw();
    return { get: () => st.ans || (v.type === 'urut' ? JSON.stringify(v.items.map(x => x.id)) : '') };
  }

  /* ================= EDITOR GURU ================= */
  function editor(q) {
    const t = q.type, list = (arr, ph, cls) => (arr || []).map((x, k) => `<div class="opt-row"><span class="lab">${k + 1}</span><input type="text" data-${cls}="${k}" value="${esc(x)}" placeholder="${ph}"><button class="btn ghost sm" data-del-${cls}="${k}">✕</button></div>`).join('');
    if (t === 'pg' || t === 'pgk' || t === 'polling') {
      const keys = String(q.answer || '').split(',');
      return `<div style="margin-top:8px">${(q.options || []).map((o, j) => `<div class="opt-row"><span class="lab ${t !== 'polling' && keys.indexOf(o.label) >= 0 ? 'key' : ''}" data-qkey="${o.label}" title="${t === 'polling' ? '' : 'Klik untuk jadikan kunci'}">${o.label}</span><input type="text" data-opt="${j}" value="${esc(o.text)}"><button class="btn ghost sm" data-del-opt="${j}">✕</button></div>`).join('')}
        <button class="btn soft sm" data-add-opt>+ Pilihan</button> <span class="small muted">${t === 'pg' ? 'Klik huruf untuk menandai kunci (satu).' : t === 'pgk' ? 'Klik huruf untuk menandai SEMUA jawaban benar.' : 'Polling tidak punya kunci dan tidak dinilai.'}</span></div>`;
    }
    if (t === 'bs') return `<div class="btns" style="margin-top:8px"><span class="small muted">Kunci:</span><button class="btn sm ${q.answer === 'B' ? 'ok' : 'ghost'}" data-qkey="B">Benar</button><button class="btn sm ${q.answer === 'S' ? 'danger' : 'ghost'}" data-qkey="S">Salah</button></div>`;
    if (t === 'isian') return `<label class="field" style="margin:8px 0 0"><span>Kunci jawaban (alternatif pisahkan dengan / )</span><input data-qf="answer" value="${esc(q.answer || '')}"></label>`;
    if (t === 'angka') return `<div class="row" style="margin-top:8px"><label class="field"><span>Jawaban angka</span><input data-qf="answer" inputmode="decimal" value="${esc(q.answer || '')}" placeholder="mis. 12,5"></label><label class="field" style="max-width:160px"><span>Toleransi (±)</span><input data-qf="tol" inputmode="decimal" value="${esc(q.tol || '')}" placeholder="0"></label></div>`;
    if (t === 'uraian') return `<label class="field" style="margin:8px 0 0"><span>Kunci / pedoman penskoran (kata kunci dipakai untuk saran skor)</span><textarea data-qf="answer" style="min-height:50px">${esc(q.answer || '')}</textarea></label>`;
    if (t === 'jodoh') return `<div style="margin-top:8px"><div class="small muted" style="margin-bottom:6px">Tulis pasangan yang benar. Saat dikerjakan, kolom kanan diacak.</div>${(q.pairs || []).map((p, k) => `<div class="opt-row"><span class="lab">${k + 1}</span><input type="text" data-pl="${k}" value="${esc(p.l)}" placeholder="Kiri"><span>↔</span><input type="text" data-pr="${k}" value="${esc(p.r)}" placeholder="Kanan (pasangan)"><button class="btn ghost sm" data-del-pair="${k}">✕</button></div>`).join('')}<button class="btn soft sm" data-add-pair>+ Pasangan</button></div>`;
    if (t === 'urut') return `<div style="margin-top:8px"><div class="small muted" style="margin-bottom:6px">Tulis item dalam URUTAN YANG BENAR. Saat dikerjakan, urutan diacak.</div>${list(q.items, 'Item', 'item')}<button class="btn soft sm" data-add-item>+ Item</button></div>`;
    if (t === 'kelompok') return `<div style="margin-top:8px"><div class="small muted" style="margin-bottom:6px">Setiap kategori berisi item-item miliknya (satu per baris).</div><div class="grid g2" style="gap:10px">${(q.cats || []).map((c, k) => `<div class="qt-ecat"><div class="btns"><input type="text" data-cn="${k}" value="${esc(c.name)}" placeholder="Nama kategori" style="flex:1"><button class="btn ghost sm" data-del-cat="${k}">✕</button></div><textarea data-ci="${k}" placeholder="Item 1&#10;Item 2" style="min-height:80px;margin-top:6px">${esc((c.items || []).join('\n'))}</textarea></div>`).join('')}</div><button class="btn soft sm" data-add-cat style="margin-top:8px">+ Kategori</button></div>`;
    if (t === 'seret') return `<div class="note small" style="margin-top:8px">Tulis kalimat di kolom pertanyaan dan tandai bagian kosong dengan <b>[[jawaban]]</b>, mis. <span class="kbd">Ibu kota Indonesia adalah [[Jakarta]].</span> Alternatif jawaban: <span class="kbd">[[Jakarta/Nusantara]]</span>.</div>
      <label class="field" style="margin:8px 0 0"><span>Kata pengecoh (pisahkan dengan koma)</span><input data-qf="extra" value="${esc(q.extra || '')}" placeholder="mis. Bandung, Surabaya"></label><div class="small muted">${P().blanksOf(q.text).length} bagian kosong terdeteksi.</div>`;
    if (t === 'dropdown') return `<div class="note small" style="margin-top:8px">Tulis kalimat di kolom pertanyaan dan tandai pilihan dengan <b>[[benar|salah1|salah2]]</b> — pilihan <b>pertama</b> adalah jawaban benar (urutan diacak saat dikerjakan). Contoh: <span class="kbd">Air [[mendidih|membeku|menguap]] pada suhu 100°C.</span></div><div class="small muted">${P().blanksOf(q.text).length} kotak pilihan terdeteksi.</div>`;
    if (t === 'titik') return `<div style="margin-top:8px">${q.image ? `<div class="small muted" style="margin-bottom:6px">Klik gambar untuk menandai bagian yang benar.</div><div class="qt-imgbox" data-eh="1"><img src="${q.image}" alt="">${q.spot ? `<i class="qt-area" style="left:${q.spot.x * 100}%;top:${q.spot.y * 100}%;width:${q.spot.r * 200}%;height:${q.spot.r * 200 / (q.spot.ar || 1)}%"></i>` : ''}</div>
      <label class="field" style="margin-top:8px"><span>Besar area benar</span><input type="range" min="0.03" max="0.3" step="0.01" data-qr value="${q.spot ? q.spot.r : 0.08}"></label>` : '<div class="note warn small">Tambahkan gambar dulu (tombol 🖼 atau ✂️ Dari PDF di atas).</div>'}</div>`;
    if (t === 'label') return `<div style="margin-top:8px">${q.image ? `<div class="small muted" style="margin-bottom:6px">Klik gambar untuk menambah penanda, lalu isi labelnya.</div><div class="qt-imgbox" data-el="1"><img src="${q.image}" alt="">${(q.marks || []).map((m, i) => `<i class="qt-mark" style="left:${m.x * 100}%;top:${m.y * 100}%">${i + 1}</i>`).join('')}</div>
      ${(q.marks || []).map((m, k) => `<div class="opt-row"><span class="lab">${k + 1}</span><input type="text" data-ml="${k}" value="${esc(m.label)}" placeholder="Label untuk penanda ${k + 1}"><button class="btn ghost sm" data-del-mark="${k}">✕</button></div>`).join('')}` : '<div class="note warn small">Tambahkan gambar dulu (tombol 🖼 atau ✂️ Dari PDF di atas).</div>'}</div>`;
    if (t === 'gambar') return `<div class="small muted" style="margin-top:8px">Murid menggambar/menulis di kanvas. Gambar soal (bila ada) menjadi latar kanvas. Dinilai guru lewat Koreksi.</div><label class="field" style="margin:8px 0 0"><span>Pedoman penilaian (opsional)</span><input data-qf="answer" value="${esc(q.answer || '')}"></label>`;
    if (t === 'suara') return `<div class="row" style="margin-top:8px"><label class="field" style="max-width:200px"><span>Durasi rekaman maksimal</span><select data-qf="maxSec">${[30, 60, 90, 120].map(x => `<option value="${x}" ${(+q.maxSec || 60) === x ? 'selected' : ''}>${x} detik</option>`).join('')}</select></label><label class="field"><span>Pedoman penilaian (opsional)</span><input data-qf="answer" value="${esc(q.answer || '')}"></label></div>`;
    if (t === 'slide') return `<div class="small muted" style="margin-top:8px">Slide berisi penjelasan/materi (teks dan gambar) tanpa jawaban dan tidak dinilai.</div>`;
    return '';
  }
  /** Pasang interaksi editor. refresh() menggambar ulang kartu soal. */
  function bindEditor(card, q, refresh) {
    const $$ = s => Array.from(card.querySelectorAll(s));
    const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
    $$('[data-qkey]').forEach(b => b.onclick = () => {
      const k = b.dataset.qkey;
      if (q.type === 'polling') return;
      if (q.type === 'pgk') { const s = String(q.answer || '').split(',').filter(Boolean), i = s.indexOf(k); if (i >= 0) s.splice(i, 1); else s.push(k); q.answer = s.sort().join(',') || null; }
      else q.answer = q.answer === k ? null : k;
      refresh();
    });
    $$('[data-opt]').forEach(inp => inp.oninput = () => { q.options[+inp.dataset.opt].text = inp.value; });
    $$('[data-add-opt]').forEach(b => b.onclick = () => { q.options = q.options || []; q.options.push({ label: LET[q.options.length] || '?', text: '' }); refresh(); });
    $$('[data-del-opt]').forEach(b => b.onclick = () => {
      const keys = String(q.answer || '').split(',').filter(Boolean), rem = q.options.splice(+b.dataset.delOpt, 1)[0];
      const map = {}; q.options.forEach((o, k) => { map[o.label] = LET[k]; o.label = LET[k]; });
      q.answer = keys.filter(x => x !== rem.label).map(x => map[x] || x).sort().join(',') || null; refresh();
    });
    $$('[data-qf]').forEach(inp => inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => { const f = inp.dataset.qf; q[f] = (f === 'tol' || f === 'maxSec') ? num(inp.value) : inp.value; }));
    $$('[data-pl]').forEach(inp => inp.oninput = () => { q.pairs[+inp.dataset.pl].l = inp.value; });
    $$('[data-pr]').forEach(inp => inp.oninput = () => { q.pairs[+inp.dataset.pr].r = inp.value; });
    $$('[data-add-pair]').forEach(b => b.onclick = () => { (q.pairs = q.pairs || []).push({ l: '', r: '' }); refresh(); });
    $$('[data-del-pair]').forEach(b => b.onclick = () => { q.pairs.splice(+b.dataset.delPair, 1); refresh(); });
    $$('[data-item]').forEach(inp => inp.oninput = () => { q.items[+inp.dataset.item] = inp.value; });
    $$('[data-add-item]').forEach(b => b.onclick = () => { (q.items = q.items || []).push(''); refresh(); });
    $$('[data-del-item]').forEach(b => b.onclick = () => { q.items.splice(+b.dataset.delItem, 1); refresh(); });
    $$('[data-cn]').forEach(inp => inp.oninput = () => { q.cats[+inp.dataset.cn].name = inp.value; });
    $$('[data-ci]').forEach(inp => inp.oninput = () => { q.cats[+inp.dataset.ci].items = inp.value.split('\n').map(x => x.trim()).filter(Boolean); });
    $$('[data-add-cat]').forEach(b => b.onclick = () => { (q.cats = q.cats || []).push({ name: '', items: [] }); refresh(); });
    $$('[data-del-cat]').forEach(b => b.onclick = () => { q.cats.splice(+b.dataset.delCat, 1); refresh(); });
    const eh = card.querySelector('[data-eh]');
    if (eh) eh.onclick = e => { const r = eh.getBoundingClientRect(); q.spot = { x: +((e.clientX - r.left) / r.width).toFixed(4), y: +((e.clientY - r.top) / r.height).toFixed(4), r: q.spot ? q.spot.r : 0.08, ar: +(r.height / r.width).toFixed(4) }; refresh(); };
    $$('[data-qr]').forEach(inp => inp.oninput = () => { const img = card.querySelector('[data-eh]'); const r = img ? img.getBoundingClientRect() : { width: 1, height: 1 }; q.spot = Object.assign(q.spot || { x: 0.5, y: 0.5 }, { r: +inp.value, ar: +(r.height / r.width).toFixed(4) }); refresh(); });
    const el2 = card.querySelector('[data-el]');
    if (el2) el2.onclick = e => { const r = el2.getBoundingClientRect(); (q.marks = q.marks || []).push({ x: +((e.clientX - r.left) / r.width).toFixed(4), y: +((e.clientY - r.top) / r.height).toFixed(4), label: '' }); refresh(); };
    $$('[data-ml]').forEach(inp => inp.oninput = () => { q.marks[+inp.dataset.ml].label = inp.value; });
    $$('[data-del-mark]').forEach(b => b.onclick = () => { q.marks.splice(+b.dataset.delMark, 1); refresh(); });
  }
  /** Siapkan data saat jenis soal diganti. */
  function convert(q, t) {
    const old = q.type; q.type = t;
    if ((t === 'pg' || t === 'pgk' || t === 'polling') && (!q.options || q.options.length < 2)) q.options = ['A', 'B', 'C', 'D'].map(l => ({ label: l, text: '' }));
    if (t === 'pg' && old === 'pgk') q.answer = String(q.answer || '').split(',')[0] || null;
    else if (!(t === 'pgk' && old === 'pg') && old !== t) q.answer = (['isian', 'uraian', 'angka'].indexOf(t) >= 0 && ['isian', 'uraian', 'angka'].indexOf(old) >= 0) ? q.answer : null;
    if (t === 'jodoh' && !(q.pairs && q.pairs.length)) q.pairs = [{ l: '', r: '' }, { l: '', r: '' }, { l: '', r: '' }];
    if (t === 'urut' && !(q.items && q.items.length)) q.items = ['', '', ''];
    if (t === 'kelompok' && !(q.cats && q.cats.length)) q.cats = [{ name: '', items: [] }, { name: '', items: [] }];
    if (t === 'suara' && !q.maxSec) q.maxSec = 60;
    q.points = P().DEFAULT_POINTS[t];
    return q;
  }
  function blank(t, id) { return convert({ id, type: 'pg', text: '', options: [], answer: null, points: 1 }, t); }

  /** Apakah soal sudah lengkap kuncinya (boleh dipakai)? */
  function hasKey(q) {
    const t = q.type, bl = () => P().blanksOf(q.text).length;
    if (['uraian', 'gambar', 'suara', 'polling', 'slide'].indexOf(t) >= 0) return true;
    if (t === 'pg' || t === 'pgk' || t === 'bs' || t === 'isian' || t === 'angka') return !!q.answer;
    if (t === 'jodoh') return (q.pairs || []).filter(p => p.l && p.r).length >= 2;
    if (t === 'urut') return (q.items || []).filter(Boolean).length >= 2;
    if (t === 'kelompok') return (q.cats || []).filter(c => c.name && c.items && c.items.length).length >= 2;
    if (t === 'seret' || t === 'dropdown') return bl() > 0;
    if (t === 'titik') return !!(q.image && q.spot);
    if (t === 'label') return !!(q.image && (q.marks || []).length && q.marks.every(m => m.label));
    return false;
  }

  /* ================= TAMPILAN JAWABAN (koreksi guru) ================= */
  function keyText(q) {
    const t = q.type;
    if (t === 'pg' || t === 'pgk') return String(q.answer || '–').split(',').map(l => { const o = (q.options || []).find(x => x.label === l); return l + (o ? '. ' + o.text : ''); }).join('; ');
    if (t === 'bs') return q.answer === 'B' ? 'Benar' : q.answer === 'S' ? 'Salah' : '–';
    if (t === 'angka') return (q.answer || '–') + (+q.tol ? ' (±' + q.tol + ')' : '');
    if (t === 'jodoh') return (q.pairs || []).map(p => p.l + ' ↔ ' + p.r).join('; ');
    if (t === 'urut') return (q.items || []).map((x, i) => (i + 1) + '. ' + x).join('  ');
    if (t === 'kelompok') return (q.cats || []).map(c => c.name + ': ' + (c.items || []).join(', ')).join(' | ');
    if (t === 'seret') return P().blanksOf(q.text).join(' · ');
    if (t === 'dropdown') return P().blanksOf(q.text).map(b => b.split('|')[0]).join(' · ');
    if (t === 'label') return (q.marks || []).map((m, i) => (i + 1) + '. ' + m.label).join('  ');
    if (t === 'titik') return 'Area yang ditandai guru';
    return q.answer || '–';
  }
  function answerHTML(q, ans) {
    const t = q.type, a = ans == null ? '' : String(ans), j = pj(a);
    if (!P().isAnswered(q, a)) return '<i class="muted">(kosong)</i>';
    if (t === 'pg' || t === 'polling' || t === 'pgk') return esc(a.split(',').map(l => { const o = (q.options || []).find(x => x.label === l); return l + (o ? '. ' + o.text : ''); }).join('; '));
    if (t === 'bs') return a === 'B' ? 'Benar' : a === 'S' ? 'Salah' : esc(a);
    if (t === 'jodoh' && Array.isArray(j)) return (q.pairs || []).map((p, i) => `<div>${esc(p.l)} ↔ <b style="color:${+j[i] === i ? 'var(--ok)' : 'var(--bad)'}">${j[i] !== null && j[i] !== undefined && q.pairs[j[i]] ? esc(q.pairs[j[i]].r) : '–'}</b></div>`).join('');
    if (t === 'urut' && Array.isArray(j)) return j.map((id, k) => `<span class="pill ${+id === k ? 'ok' : 'bad'}">${k + 1}. ${esc((q.items || [])[id])}</span>`).join(' ');
    if (t === 'kelompok' && j) return Object.keys(j).map(id => { const [ci, ii] = id.split('-').map(Number); const it = ((q.cats[ci] || {}).items || [])[ii]; return `<span class="pill ${+j[id] === ci ? 'ok' : 'bad'}">${esc(it)} → ${esc((q.cats[j[id]] || {}).name)}</span>`; }).join(' ');
    if ((t === 'seret' || t === 'dropdown' || t === 'label') && Array.isArray(j)) return j.map((x, i) => `<span class="pill">${i + 1}. ${esc(x || '–')}</span>`).join(' ');
    if (t === 'titik') { const p = a.split(',').map(Number); return q.image ? `<div class="qt-imgbox sm"><img src="${q.image}" alt="">${q.spot ? `<i class="qt-area" style="left:${q.spot.x * 100}%;top:${q.spot.y * 100}%;width:${q.spot.r * 200}%;height:${q.spot.r * 200 / (q.spot.ar || 1)}%"></i>` : ''}<i class="qt-dot" style="left:${p[0] * 100}%;top:${p[1] * 100}%"></i></div>` : esc(a); }
    if (t === 'gambar') return /^media:/.test(a) ? `<div class="qt-media" data-media="${esc(a.slice(6))}" data-kind="img">memuat gambar…</div>` : `<img src="${esc(a)}" class="zoomable" style="max-width:100%;border-radius:10px;border:1px solid var(--border)">`;
    if (t === 'suara') return /^media:/.test(a) ? `<div class="qt-media" data-media="${esc(a.slice(6))}" data-kind="audio">memuat rekaman…</div>` : `<audio controls src="${esc(a)}"></audio>`;
    return `<div style="white-space:pre-wrap">${esc(a)}</div>`;
  }

  const QT = { TYPES, ORDER, publicView, mount, editor, bindEditor, convert, blank, hasKey, keyText, answerHTML, segs };
  if (typeof window !== 'undefined') window.QT = QT;
  if (typeof module !== 'undefined' && module.exports) module.exports = QT;
})();
