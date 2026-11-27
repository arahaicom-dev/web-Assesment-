/* Halaman ujian murid: token → pilih nama → NIS → kerjakan → kumpulkan */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const QT = window.QT;
  const TYPE = {}; QT.ORDER.forEach(k => { TYPE[k] = QT.TYPES[k].icon + ' ' + QT.TYPES[k].label; });
  function isAns(v) { if (v === undefined || v === null || !String(v).trim()) return false; try { const j = JSON.parse(v); if (Array.isArray(j)) return j.some(x => x !== null && x !== ''); if (j && typeof j === 'object') return Object.keys(j).length > 0; } catch (e) { /* teks */ } return true; }
  const view = $('#view');
  const S = { token: '', info: null, student: null, nis: '', questions: [], answers: {}, idx: 0, startedAt: 0, duration: 0, timer: null };

  function toast(msg, kind) {
    const el = document.createElement('div'); el.className = 'toast ' + (kind || 'ok'); el.textContent = msg;
    $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3500);
  }
  async function api(path, body) {
    const r = await fetch('api/' + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    let d = {}; try { d = await r.json(); } catch (e) { /* */ }
    if (!r.ok) { const e = new Error(d.error || 'Gagal terhubung ke server.'); e.status = r.status; throw e; }
    return d;
  }
  function confirmBox(msg) {
    return new Promise(res => {
      const root = $('#modal-root');
      root.innerHTML = `<div class="modal-bg"><div class="modal" style="width:min(440px,100%)"><h2>Konfirmasi</h2><p>${msg}</p><div class="foot"><button class="btn ghost" id="cf-no">Batal</button><button class="btn ok" id="cf-ok">Ya, kumpulkan</button></div></div></div>`;
      $('#cf-ok').onclick = () => { root.innerHTML = ''; res(true); };
      $('#cf-no').onclick = () => { root.innerHTML = ''; res(false); };
    });
  }
  const saveKey = () => 'ujian:' + S.token + ':' + (S.student && S.student.id);
  let syncT = null;
  function persist() {
    try { localStorage.setItem(saveKey(), JSON.stringify({ answers: S.answers, idx: S.idx, startedAt: S.startedAt })); } catch (e) { /* */ }
    if (!S.student || !S.startedAt) return;
    clearTimeout(syncT);
    syncT = setTimeout(() => { api('exam/' + encodeURIComponent(S.token) + '/save', { studentId: S.student.id, nis: S.nis, answers: S.answers, startedAt: S.startedAt }).catch(() => {}); }, 2500);
  }
  function restore() { try { const d = JSON.parse(localStorage.getItem(saveKey()) || 'null'); if (d) { S.answers = d.answers || {}; S.idx = d.idx || 0; S.startedAt = d.startedAt || 0; } } catch (e) { /* */ } }

  /* 1. Token */
  function stepToken(msg) {
    clearInterval(S.timer);
    view.innerHTML = `<div class="card tilt" style="max-width:480px;margin:30px auto;text-align:center"><div style="font-size:52px">🔑</div>
      <h2>Masukkan Token Ujian</h2><p class="muted small">Token diberikan oleh guru.</p>
      ${msg ? `<div class="note warn" style="margin-bottom:12px;text-align:left">${esc(msg)}</div>` : ''}
      <form id="f"><input class="token-input" id="tok" maxlength="12" autocomplete="off" autocapitalize="characters" value="${esc(S.token)}">
      <button class="btn lg" style="width:100%;margin-top:14px" type="submit">Lanjut →</button></form></div>`;
    $('#tok').focus();
    $('#f').onsubmit = async e => {
      e.preventDefault();
      S.token = $('#tok').value.trim().toUpperCase();
      if (!S.token) return;
      try { S.info = await api('exam/' + encodeURIComponent(S.token)); stepName(); }
      catch (err) { stepToken(err.message); }
    };
  }

  /* 2. Pilih nama */
  function stepName() {
    const i = S.info;
    const clsList = []; i.students.forEach(s => { if (s.cls && clsList.indexOf(s.cls) < 0) clsList.push(s.cls); });
    let pickCls = '';
    $('#school').textContent = i.schoolName || 'Asesmen Merdeka';
    view.innerHTML = `<div class="card"><h2>${esc(i.assessment.title)}</h2>
      <p class="muted">${esc(i.subjectName)} · Kelas ${esc(i.className)} · ${i.assessment.questionCount} soal${i.assessment.duration ? ' · ' + i.assessment.duration + ' menit' : ''}</p>
      ${clsList.length > 1 ? `<div class="field"><span>Pilih kelasmu</span><div class="btns" id="cls-pick">${clsList.map(c => `<button class="btn soft sm" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>` : ''}
      <label class="field"><span>Cari nama kamu</span><input id="q" placeholder="Ketik nama..."></label>
      <div class="student-list" id="list"></div>
      <div class="btns" style="margin-top:14px"><button class="btn ghost" id="back">← Ganti token</button></div></div>`;
    const draw = () => {
      const f = $('#q').value.trim().toLowerCase();
      $('#list').innerHTML = i.students.filter(s => (!f || s.name.toLowerCase().includes(f)) && (!pickCls || s.cls === pickCls)).map(s =>
        `<button class="btn ${s.done ? 'ghost' : 'soft'}" data-id="${esc(s.id)}"><span>${esc(s.name)}${s.cls && !pickCls ? ` <small class="muted">· ${esc(s.cls)}</small>` : ''}</span>${s.done ? '<span class="pill ok">✔ selesai</span>' : ''}</button>`).join('') || '<p class="muted small">Nama tidak ditemukan.</p>';
      $$('#list button').forEach(b => b.onclick = () => stepNis(i.students.find(s => s.id === b.dataset.id)));
    };
    $('#q').oninput = draw; draw();
    $$('#cls-pick button').forEach(b => b.onclick = () => { pickCls = pickCls === b.dataset.c ? '' : b.dataset.c; $$('#cls-pick button').forEach(x => { x.className = 'btn sm ' + (x.dataset.c === pickCls ? '' : 'soft'); }); draw(); });
    $('#back').onclick = () => stepToken();
  }

  /* 3. Verifikasi NIS */
  async function stepNis(st, msg) {
    if (!st.needNis && !msg) return start(st, '');
    view.innerHTML = `<div class="card" style="max-width:460px;margin:20px auto"><h2>Halo, ${esc(st.name)} 👋</h2>
      <p class="muted small">Masukkan NIS kamu untuk memastikan ini benar kamu.</p>
      ${msg ? `<div class="note warn" style="margin-bottom:12px">${esc(msg)}</div>` : ''}
      <form id="f"><label class="field"><span>NIS</span><input id="nis" inputmode="numeric" autocomplete="off"></label>
      <div class="btns"><button type="button" class="btn ghost" id="back">← Bukan saya</button><button class="btn" type="submit">Masuk</button></div></form></div>`;
    $('#nis').focus();
    $('#back').onclick = stepName;
    $('#f').onsubmit = e => { e.preventDefault(); start(st, $('#nis').value.trim()); };
  }

  async function start(st, nis) {
    try {
      const r = await api('exam/' + encodeURIComponent(S.token) + '/start', { studentId: st.id, nis });
      S.student = st; S.nis = nis;
      if (r.submitted) return showResult(r.result, true);
      S.questions = r.questions; S.duration = r.duration; S.instructions = r.instructions || ''; S.answers = {}; S.idx = 0; S.startedAt = 0;
      restore();
      const rs = r.resume;
      if (rs) {
        if (rs.reopenedAt && (!S.startedAt || S.startedAt < rs.reopenedAt)) {
          // guru membuka kembali ujian untuk murid ini: pakai jawaban dari server, waktu mulai lagi dari awal
          S.answers = Object.assign({}, rs.answers || {}); S.startedAt = 0; S.idx = 0; S.reopened = true; persist();
        } else if (!Object.keys(S.answers).length && rs.answers && Object.keys(rs.answers).length) {
          // pindah perangkat: lanjutkan jawaban & waktu yang tersimpan di server
          S.answers = Object.assign({}, rs.answers); if (!S.startedAt && rs.startedAt) S.startedAt = rs.startedAt;
        }
      }
      if (S.startedAt) return renderQ();
      view.innerHTML = `<div class="card tilt" style="max-width:600px;margin:20px auto;text-align:center"><div style="font-size:52px">📝</div>
        <h2>${esc(S.info.assessment.title)}</h2><p>Halo <b>${esc(st.name)}</b>! Ada <b>${S.questions.length} soal</b>.</p>
        <p class="muted small">${QT.ORDER.map(t => { const n = S.questions.filter(q => q.type === t).length; return n ? n + ' ' + TYPE[t] : ''; }).filter(Boolean).join(' · ')}${S.duration ? ' · Waktu ' + S.duration + ' menit' : ''}</p>
        ${S.reopened ? `<div class="note ok" style="text-align:left;margin-bottom:10px">✅ Guru membuka kembali ujianmu.${Object.keys(S.answers).length ? ` <b>${Object.keys(S.answers).length} jawabanmu sebelumnya</b> masih tersimpan — lanjutkan mengerjakan.` : ' Silakan mengerjakan dari awal.'}</div>` : ''}
        <div style="text-align:left">${QT.instructionsHTML(S.instructions, S.questions.map(q => q.type))}</div>
        <p class="small muted">Jawaban tersimpan otomatis di perangkat ini. Jangan lupa tekan <b>Kumpulkan</b> di akhir.</p>
        <label class="ins-ok"><input type="checkbox" id="ins-ok"> Saya sudah membaca petunjuk</label>
        <p class="small muted">⏱ Waktu${S.duration ? ' ' + S.duration + ' menit' : ''} baru mulai dihitung setelah tombol <b>Mulai</b> ditekan.</p>
        <button class="btn lg" id="go" disabled>Mulai Mengerjakan ▶</button></div>`;
      $('#ins-ok').onchange = e => { $('#go').disabled = !e.target.checked; };
      $('#go').onclick = () => { S.startedAt = Date.now(); persist(); renderQ(); };
    } catch (err) {
      if (err.status === 401) stepNis(st, err.message);
      else if (err.status === 404) stepToken(err.message);
      else toast(err.message, 'bad');
    }
  }

  /* 4. Mengerjakan */
  function answered(q) { return isAns(S.answers[q.id]); }
  async function uploadMedia(dataUrl) { const r = await api('exam/' + encodeURIComponent(S.token) + '/media', { studentId: S.student.id, nis: S.nis, data: dataUrl }); return 'media:' + r.id; }
  function renderQ() {
    clearInterval(S.timer);
    const qs = S.questions, q = qs[S.idx], ans = S.answers[q.id];
    const done = qs.filter(answered).length;
    view.innerHTML = `
      <div class="card" style="margin-bottom:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <b style="flex:1">${esc(S.student.name)}</b>
        ${S.duration ? '<span class="pill warn" style="font-size:1rem">⏱ <span id="timer">--:--</span></span>' : ''}
        <span class="small muted" id="done-n">Terjawab ${done}/${qs.length}</span>
        <div class="bar" style="flex-basis:100%"><i style="width:${done / qs.length * 100}%"></i></div>
      </div>
      <div class="card">
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px"><span class="grade">${S.idx + 1}</span><span class="pill">${TYPE[q.type]}</span><span class="muted small" style="margin-left:auto">Soal ${S.idx + 1} dari ${qs.length}</span></div>
        ${QT.passageHTML(q)}
        ${q.image && ['titik', 'label', 'gambar'].indexOf(q.type) < 0 ? `<img src="${q.image}" alt="" class="q-img zoomable">` : ''}
        ${q.type === 'seret' || q.type === 'dropdown' ? '' : `<div class="q-text" style="font-size:1.1rem;margin-bottom:14px">${QT.rich(q.text)}</div>`}
        <div id="qt-host"></div>
        <div class="btns" style="justify-content:space-between;margin-top:16px">
          <button class="btn ghost" id="prev" ${S.idx === 0 ? 'disabled' : ''}>← Sebelumnya</button>
          ${S.idx < qs.length - 1 ? '<button class="btn" id="next">Berikutnya →</button>' : '<button class="btn ok" id="sub">✔ Kumpulkan</button>'}
        </div>
      </div>
      <div class="card"><div class="qnav">${qs.map((x, i) => `<button class="${i === S.idx ? 'cur' : answered(x) ? 'done' : ''}" data-i="${i}">${i + 1}</button>`).join('')}</div>
        <button class="btn ok" style="width:100%;margin-top:14px" id="sub2">✔ Kumpulkan Jawaban</button></div>`;
    const go = i => { S.idx = i; persist(); renderQ(); window.scrollTo(0, 0); };
    QT.mount($('#qt-host'), q, ans, {
      media: uploadMedia,
      onChange: v => {
        S.answers[q.id] = v; persist();
        const b = $$('.qnav button')[S.idx]; if (b) b.classList.toggle('done', answered(q));
        const dn = $('#done-n'); if (dn) dn.textContent = 'Terjawab ' + qs.filter(answered).length + '/' + qs.length;
      }
    });
    if ($('#prev')) $('#prev').onclick = () => go(S.idx - 1);
    if ($('#next')) $('#next').onclick = () => go(S.idx + 1);
    $$('.qnav button').forEach(b => b.onclick = () => go(+b.dataset.i));
    [$('#sub'), $('#sub2')].forEach(b => b && (b.onclick = () => submit(false)));
    if (S.duration) {
      const tick = () => {
        const left = S.duration * 60 - Math.floor((Date.now() - S.startedAt) / 1000);
        const el = $('#timer'); if (!el) return clearInterval(S.timer);
        if (left <= 0) { clearInterval(S.timer); toast('Waktu habis! Jawaban dikumpulkan otomatis.', 'bad'); return submit(true); }
        el.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
      };
      tick(); S.timer = setInterval(tick, 1000);
    }
  }

  let sending = false;
  async function submit(force) {
    if (sending) return;
    const left = S.questions.filter(q => q.type !== 'slide' && !answered(q)).length;
    if (!force && !await confirmBox(left ? `Masih ada <b>${left} soal</b> yang belum dijawab. Tetap kumpulkan?` : 'Kumpulkan jawaban sekarang? Jawaban tidak bisa diubah lagi.')) return;
    sending = true; clearInterval(S.timer);
    try {
      const r = await api('exam/' + encodeURIComponent(S.token) + '/submit', { studentId: S.student.id, nis: S.nis, answers: S.answers, startedAt: S.startedAt });
      localStorage.removeItem(saveKey());
      showResult(r.result, false);
    } catch (err) {
      if (err.status === 409) { localStorage.removeItem(saveKey()); showResult(null, true); }
      else { toast(err.message + ' — coba tekan Kumpulkan lagi.', 'bad'); renderQ(); }
    } finally { sending = false; }
  }

  function showResult(res, already) {
    clearInterval(S.timer);
    const sc = res && typeof res.score === 'number' ? res.score : null;
    view.innerHTML = `<div class="card tilt" style="max-width:560px;margin:20px auto;text-align:center"><div style="font-size:56px">🎉</div>
      <h2>${already ? 'Kamu sudah mengumpulkan' : 'Jawaban terkirim!'}</h2>
      <p>${esc(S.student ? S.student.name : '')}</p>
      ${sc !== null ? `<div class="score-big">${sc.toLocaleString('id-ID', { maximumFractionDigits: 1 })}</div>${res.needsReview ? '<p class="note warn">Soal uraian/gambar/rekaman akan dikoreksi guru, nilai bisa berubah.</p>' : ''}` : '<p class="muted">Nilai akan diumumkan oleh guru.</p>'}
      <button class="btn ghost" id="again" style="margin-top:12px">Selesai</button></div>`;
    $('#again').onclick = () => { S.student = null; stepName(); api('exam/' + encodeURIComponent(S.token)).then(i => { S.info = i; stepName(); }).catch(() => stepToken()); };
  }

  document.addEventListener('click', e => {
    const im = e.target.closest && e.target.closest('img.zoomable'); if (!im) return;
    const ov = document.createElement('div'); ov.className = 'img-zoom';
    ov.innerHTML = '<img alt=""><button class="btn ghost sm">✕ Tutup</button>'; ov.querySelector('img').src = im.src;
    ov.onclick = () => ov.remove(); document.body.appendChild(ov);
  });
  // Tema dari pengaturan guru di perangkat ini (bila ada)
  try {
    const t = JSON.parse(localStorage.getItem('asesmen-merdeka-v1') || '{}').theme;
    if (t) { document.documentElement.style.setProperty('--h', t.h); document.documentElement.style.setProperty('--s', t.s); }
  } catch (e) { /* */ }
  window.addEventListener('beforeunload', e => { if (S.startedAt && S.questions.length && !sending && $('#timer, .qnav')) { e.preventDefault(); e.returnValue = ''; } });

  S.token = (new URLSearchParams(location.search).get('token') || '').toUpperCase();
  if (S.token) api('exam/' + encodeURIComponent(S.token)).then(i => { S.info = i; stepName(); }).catch(e => stepToken(e.message));
  else stepToken();
  // :active di layar sentuh iOS langsung terasa
  document.addEventListener('touchstart', () => {}, { passive: true });
})();
