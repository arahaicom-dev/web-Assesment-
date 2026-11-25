/* Kuis Seru — halaman pemain (murid). Gabung dengan kode, jawab cepat, kumpulkan poin. */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const view = $('#view'), hud = $('#hud');
  const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🐧', '🐨', '🐙', '🦄', '🐳', '🦉', '🐢', '🦋', '🐝', '🐬', '🦖', '🐰', '🐻', '🐲'];
  const RIGHT = ['Mantap!', 'Keren!', 'Hebat!', 'Tepat sekali!', 'Luar biasa!', 'Jenius!'];
  const WRONG = ['Tetap semangat!', 'Ayo, soal berikutnya pasti bisa!', 'Tidak apa-apa, lanjut!', 'Hampir! Coba lagi di soal berikut.'];
  const G = { code: '', info: null, token: '', me: null, q: null, timer: null, deadline: 0, poll: null, busy: false, avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)] };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const isExam = () => G.info && G.info.mode === 'exam';
  const fmt = n => (+n || 0).toLocaleString('id-ID');

  /* ---------- suara sederhana (dibuat langsung, tanpa file) ---------- */
  let muted = localStorage.getItem('kuis-mute') === '1', actx = null;
  const muteBtn = $('#mute');
  /* ---------- musik latar (dipilih guru, bisa diganti/dimatikan murid) ---------- */
  const SND = {
    // pilihan musik berlaku per kuis (kode); kuis baru kembali mengikuti pengaturan guru. Volume diingat.
    key() { return 'kuis-musik:' + (G.code || ''); },
    pref() { let p = { set: false, track: '' }; try { p = Object.assign(p, JSON.parse(localStorage.getItem(this.key()) || '{}')); } catch (e) { /* */ } p.vol = +(localStorage.getItem('kuis-vol') || 0.5); return p; },
    save(p) { localStorage.setItem(this.key(), JSON.stringify({ set: p.set, track: p.track })); localStorage.setItem('kuis-vol', p.vol); },
    told: false,
    want() { const p = this.pref(); return p.set ? p.track : ((G.info && G.info.music) || ''); },
    start() {
      if (!window.Music) return; const p = this.pref(), id = this.want(); Music.setVolume(p.vol);
      if (id) { const was = Music.current(); Music.play(id); if (!was && !this.told) { this.told = true; toast('🎵 Musik menyala. Ketuk 🎵 di atas untuk mengganti atau mematikan.'); } } else Music.stop();
      paintMute();
    },
    stop() { if (window.Music) Music.stop(); paintMute(); }
  };
  const paintMute = () => { const on = window.Music && Music.current(); muteBtn.textContent = on ? '🎵' : (muted ? '🔇' : '🔈'); muteBtn.classList.toggle('playing', !!on); };
  paintMute();
  document.addEventListener('pointerdown', () => { if (window.Music && Music.current()) Music.unlock(); }, { passive: true });
  muteBtn.onclick = () => soundPanel();
  function soundPanel() {
    const exam = G.info && G.info.mode === 'exam';
    const p = SND.pref(), cur = SND.want(), list = (window.Music ? Music.TRACKS : []).slice().sort((a, b) => (a.kind === (exam ? 'ujian' : 'main') ? -1 : 1) - (b.kind === (exam ? 'ujian' : 'main') ? -1 : 1));
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    const row = t => `<button class="snd-item ${t.id === cur ? 'on' : ''}" data-t="${t.id}"><span class="snd-e">${t.emoji}</span><span class="snd-n"><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></span><span class="snd-k ${t.kind}">${t.kind === 'ujian' ? 'Ujian' : 'Main'}</span></button>`;
    bg.innerHTML = `<div class="sheet snd-sheet"><div class="sheet-grip"></div><h3 class="sheet-title">🎵 Musik & Suara</h3>
      <button class="snd-item ${!cur ? 'on' : ''}" data-t=""><span class="snd-e">🔇</span><span class="snd-n"><b>Tanpa musik</b><small>Hening</small></span></button>
      <div class="sheet-group">${exam ? 'Cocok untuk ujian' : 'Untuk permainan'}</div>${list.filter(t => t.kind === (exam ? 'ujian' : 'main')).map(row).join('')}
      <div class="sheet-group">${exam ? 'Lainnya' : 'Tenang / fokus'}</div>${list.filter(t => t.kind !== (exam ? 'ujian' : 'main')).map(row).join('')}
      <label class="snd-vol">🔈 <input type="range" min="0" max="1" step="0.05" value="${p.vol}" id="snd-v"> 🔊</label>
      ${exam ? '' : `<label class="snd-fx"><input type="checkbox" id="snd-fx" ${muted ? '' : 'checked'}> Efek suara benar/salah</label>`}
      <button class="btn lg" style="width:100%;margin-top:12px" id="snd-ok">Selesai</button></div>`;
    document.body.appendChild(bg);
    const close = () => bg.remove();
    bg.addEventListener('click', e => { if (e.target === bg) close(); });
    bg.querySelectorAll('.snd-item').forEach(b => b.onclick = () => {
      const q = SND.pref(); q.set = true; q.track = b.dataset.t; SND.save(q);
      bg.querySelectorAll('.snd-item').forEach(x => x.classList.toggle('on', x === b));
      if (window.Music) { Music.unlock(); Music.setVolume(q.vol); if (q.track) Music.play(q.track); else Music.stop(); }
      paintMute();
    });
    bg.querySelector('#snd-v').oninput = e => { const q = SND.pref(); q.vol = +e.target.value; SND.save(q); if (window.Music) Music.setVolume(q.vol); };
    const fx = bg.querySelector('#snd-fx'); if (fx) fx.onchange = () => { muted = !fx.checked; localStorage.setItem('kuis-mute', muted ? '1' : '0'); };
    bg.querySelector('#snd-ok').onclick = close;
  }
  function tone(freqs, dur, type) {
    if (muted || (G.info && G.info.mode === 'exam')) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      freqs.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * dur;
        o.type = type || 'sine'; o.frequency.value = f; o.connect(g); g.connect(actx.destination);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.start(t); o.stop(t + dur + 0.02);
      });
    } catch (e) { /* abaikan */ }
  }
  const sfx = { ok: () => tone([660, 880, 1175], 0.11), bad: () => tone([300, 220], 0.16, 'triangle'), tick: () => tone([880], 0.05, 'square'), go: () => tone([523, 659, 784, 1047], 0.12) };

  function toast(msg, kind) { const el = document.createElement('div'); el.className = 'toast ' + (kind || 'ok'); el.textContent = msg; $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3200); }
  async function api(path, body) {
    const r = await fetch('api/play/' + encodeURIComponent(G.code) + (path ? '/' + path : '') + (!body && G.token ? '?token=' + G.token : ''), {
      method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      body: body ? JSON.stringify(Object.assign({ token: G.token }, body)) : undefined
    });
    let d = {}; try { d = await r.json(); } catch (e) { /* */ }
    if (!r.ok) { const e = new Error(d.error || 'Koneksi bermasalah.'); e.status = r.status; throw e; }
    return d;
  }
  const saveKey = () => 'kuis:' + G.code;
  const QT = window.QT;
  const typeLabel = t => QT && QT.TYPES[t] ? QT.TYPES[t].icon + ' ' + QT.TYPES[t].label : t;
  /** Sudah dijawab? (sama dengan SoalParser.isAnswered) */
  function isAns(v) { if (v === undefined || v === null || !String(v).trim()) return false; try { const j = JSON.parse(v); if (Array.isArray(j)) return j.some(x => x !== null && x !== ''); if (j && typeof j === 'object') return Object.keys(j).length > 0; } catch (e) { /* teks biasa */ } return true; }
  /** Unggah gambar/rekaman suara jawaban -> "media:ID" */
  async function uploadMedia(dataUrl) { const r = await api('media', { data: dataUrl }); return 'media:' + r.id; }
  const hideText = t => t === 'seret' || t === 'dropdown';
  const ownImg = t => t === 'titik' || t === 'label' || t === 'gambar';
  function setHud() {
    if (!G.me) { hud.innerHTML = ''; return; }
    if (isExam()) { hud.innerHTML = `<span class="kz-av sm">${esc(G.me.avatar || '🙂')}</span><b>${esc(G.me.nickname)}</b>`; return; }
    hud.innerHTML = `<span class="kz-av sm">${esc(G.me.avatar || '🙂')}</span><b>${esc(G.me.nickname)}</b><span class="kz-pts">⭐ ${fmt(G.me.score)}</span>${G.me.streak > 1 ? `<span class="kz-streak">🔥${G.me.streak}</span>` : ''}`;
  }
  function stopAll() { clearInterval(G.timer); clearInterval(G.poll); G.timer = G.poll = null; }

  /* ---------- 1. Masukkan kode ---------- */
  function stepCode(msg) {
    stopAll();
    SND.stop(); G.me = null; setHud();
    view.innerHTML = `<div class="kz-card pop" style="max-width:460px;margin:6vh auto 0;text-align:center">
      <div class="kz-mascot">${window.Art ? Art.kubi({ pose: 'wave', eyes: 'happy' }) : '🎮'}</div><h1 class="kz-title">Gabung Kuis</h1><p class="muted">Masukkan kode yang ditampilkan guru di layar.</p>
      ${msg ? `<div class="note warn" style="text-align:left;margin-bottom:12px">${esc(msg)}</div>` : ''}
      <form id="f"><input id="code" class="kz-code" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="123456" value="${esc(G.code)}">
      <button class="btn lg kz-go" type="submit">Masuk ▶</button></form></div>`;
    const inp = $('#code'); inp.focus();
    $('#f').onsubmit = async e => {
      e.preventDefault();
      G.code = inp.value.replace(/\D/g, '');
      if (G.code.length < 6) return toast('Kode terdiri dari 6 angka.', 'bad');
      try { G.info = await api(''); } catch (err) { return stepCode(err.message); }
      const saved = JSON.parse(localStorage.getItem(saveKey()) || 'null');
      if (saved && saved.token) { G.token = saved.token; try { const s = await api('state'); G.me = s.me; return resume(s); } catch (er) { G.token = ''; localStorage.removeItem(saveKey()); } }
      stepName();
    };
  }

  /* ---------- 2. Nama & avatar ---------- */
  function stepName(msg) {
    const i = G.info;
    if (i.status === 'ended') return stepCode('Kuis ini sudah selesai.');
    const avatars = `<div class="kz-avatars">${AVATARS.map(a => `<button type="button" class="kz-av ${a === G.avatar ? 'on' : ''}" data-a="${a}">${a}</button>`).join('')}</div>`;
    view.innerHTML = `<div class="kz-card pop" style="max-width:560px;margin:3vh auto 0">
      <div class="small muted">${esc(i.schoolName || '')}</div><h2 style="margin-top:2px">${esc(i.title)}</h2>
      <p class="muted small">${i.mode === 'exam' ? `📝 Ujian · ${i.count} soal · ${i.duration ? i.duration + ' menit' : 'tanpa batas waktu'} · ${i.players} peserta` : `${i.count} soal · ${i.time} detik per soal · ${i.players} pemain sudah bergabung`}</p>
      ${msg ? `<div class="note warn" style="margin-bottom:12px">${esc(msg)}</div>` : ''}
      <div class="small" style="font-weight:700;margin-bottom:6px">Pilih avatar</div>${avatars}
      <form id="f">
        ${i.needName ? '<label class="field"><span>Nama panggilan</span><input id="nick" maxlength="30" autocomplete="off" placeholder="mis. Budi"></label>'
          : `<label class="field"><span>Cari nama kamu</span><input id="q" placeholder="Ketik nama..."></label><div class="kz-names" id="names"></div>
             <label class="field hidden" id="nis-wrap"><span>NIS</span><input id="nis" inputmode="numeric" autocomplete="off"></label>`}
        <button class="btn lg kz-go" type="submit">Siap! ▶</button>
      </form></div>`;
    let chosen = null;
    $$('.kz-av[data-a]').forEach(b => b.onclick = () => { G.avatar = b.dataset.a; $$('.kz-av[data-a]').forEach(x => x.classList.toggle('on', x === b)); });
    if (!i.needName) {
      const draw = () => {
        const f = $('#q').value.trim().toLowerCase();
        $('#names').innerHTML = i.students.filter(s => !f || s.name.toLowerCase().includes(f)).map(s => `<button type="button" class="btn ${chosen && chosen.id === s.id ? '' : 'soft'} sm" data-id="${esc(s.id)}">${esc(s.name)}${s.taken ? ' ✓' : ''}</button>`).join('') || '<span class="muted small">Nama tidak ditemukan.</span>';
        $$('#names button').forEach(b => b.onclick = () => { chosen = i.students.find(s => s.id === b.dataset.id); $('#nis-wrap').classList.toggle('hidden', !chosen.needNis); draw(); if (chosen.needNis) $('#nis').focus(); });
      };
      $('#q').oninput = draw; draw();
    } else $('#nick').focus();
    $('#f').onsubmit = async e => {
      e.preventDefault();
      const body = { avatar: G.avatar };
      if (i.needName) body.nickname = $('#nick').value.trim();
      else { if (!chosen) return toast('Pilih nama kamu dulu.', 'bad'); body.studentId = chosen.id; body.nis = $('#nis').value.trim(); }
      try {
        const r = await fetch('api/play/' + G.code + '/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const d = await r.json();
        if (!r.ok) return toast(d.error || 'Gagal bergabung.', 'bad');
        G.token = d.token; G.me = d.me; localStorage.setItem(saveKey(), JSON.stringify({ token: d.token }));
        const s = await api('state'); resume(s);
      } catch (err) { toast(err.message, 'bad'); }
    };
  }

  function resume(s) {
    G.me = s.me; setHud();
    if (isExam()) {
      if (s.me.finished) return examDone(s.me);
      if (s.status === 'lobby') return lobby(s);
      if (s.status === 'ended') return examStart();
      return s.me.started ? examStart() : examRules();
    }
    if (s.status === 'ended') return final(s);
    if (s.me.finished) return waitEnd();
    if (s.status === 'lobby') return lobby(s);
    nextQ();
  }

  /* ---------- 3. Ruang tunggu ---------- */
  function lobby(s) {
    stopAll();
    SND.start();
    const draw = st => {
      view.innerHTML = `<div class="kz-card pop" style="text-align:center;max-width:720px;margin:3vh auto 0">
        <div class="kz-big-ico bounce">${esc(G.me.avatar || '🙂')}</div>
        <h2>Halo, ${esc(G.me.nickname)}!</h2><p class="muted">Kamu sudah masuk. Tunggu guru memulai ${isExam() ? 'ujian' : 'kuis'}…</p>
        <div class="kz-dots"><i></i><i></i><i></i></div>
        <div class="kz-lobby">${(st.lobby || []).map(p => `<span class="kz-chip">${esc(p.avatar || '🙂')} ${esc(p.nickname)}</span>`).join('')}</div>
        <div class="small muted" style="margin-top:10px">${st.players} pemain bergabung</div></div>`;
    };
    draw(s);
    G.poll = setInterval(async () => {
      try { const st = await api('state'); G.me = st.me; if (st.status === 'running') { stopAll(); isExam() ? examRules() : countdown(); } else if (st.status === 'ended') { stopAll(); isExam() ? examStart() : final(st); } else draw(st); }
      catch (e) { if (e.status === 401 || e.status === 404) { stopAll(); localStorage.removeItem(saveKey()); stepCode(e.message); } }
    }, 2000);
  }

  function countdown() {
    SND.start();
    let n = 3;
    const show = () => { view.innerHTML = `<div class="kz-count"><div class="kz-count-n">${n}</div><div class="muted">Bersiap…</div></div>`; sfx.tick(); };
    show();
    const t = setInterval(() => { n--; if (n > 0) show(); else { clearInterval(t); sfx.go(); nextQ(); } }, 800);
  }

  /* ---------- 4. Soal ---------- */
  async function nextQ() {
    stopAll();
    let d;
    try { d = await api('next', {}); } catch (e) { return toast(e.message + ' — mencoba lagi…', 'bad'), setTimeout(nextQ, 2000); }
    if (d.me) { G.me = d.me; setHud(); }
    if (d.waiting) return lobby({ players: 0, lobby: [] });
    if (isExam()) return examStart();
    if (d.ended) { const s = await api('state'); return final(s); }
    if (d.finished) return waitEnd();
    G.q = d.question; G.busy = false;
    const q = d.question;
    let body;
    if (q.type === 'pg') body = `<div class="kz-opts n${q.options.length}">${q.options.map((o, k) => `<button class="kz-opt c${k % 6}" data-v="${esc(o.label)}"><span class="kz-opt-l">${'ABCDEF'[k]}</span><span>${esc(o.text)}</span></button>`).join('')}</div>`;
    else if (q.type === 'bs') body = `<div class="kz-opts n2"><button class="kz-opt c3" data-v="B"><span class="kz-opt-l">✓</span><span>Benar</span></button><button class="kz-opt c0" data-v="S"><span class="kz-opt-l">✗</span><span>Salah</span></button></div>`;
    else if (q.type === 'isian') body = `<form id="isian" class="kz-isian"><input id="ans" autocomplete="off" placeholder="Ketik jawabanmu…"><button class="btn lg kz-go" type="submit">Kirim</button></form>`;
    else body = `<div class="kz-card kz-qt" id="qt-host"></div><div style="text-align:center;margin-top:12px"><button class="btn lg kz-go" id="qt-send">${q.type === 'slide' ? 'Lanjut ▶' : 'Kirim ✔'}</button></div>`;
    view.innerHTML = `<div class="kz-q pop">
      <div class="kz-q-head"><span class="kz-pill">${d.index} / ${d.total}</span><div class="kz-timebar"><i id="tb"></i></div><span class="kz-sec" id="sec">${d.time}</span></div>
      ${q.type === 'pg' || q.type === 'bs' || q.type === 'isian' ? '' : `<div class="kz-type">${typeLabel(q.type)}</div>`}
      <div class="kz-card kz-q-card">${q.image && !ownImg(q.type) ? `<img src="${q.image}" alt="" class="kz-img zoomable">` : ''}${hideText(q.type) ? '<div class="kz-q-text small">Lengkapi kalimat berikut.</div>' : `<div class="kz-q-text">${esc(q.text)}</div>`}</div>
      ${body}</div>`;
    const host = $('#qt-host');
    if (host) { const h = QT.mount(host, q, '', {}); $('#qt-send').onclick = () => send(h.get() || ''); }
    const total = d.time * 1000;
    G.deadline = Date.now() + d.remainingMs;
    const tick = () => {
      const left = Math.max(0, G.deadline - Date.now());
      const tb = $('#tb'); if (!tb) return clearInterval(G.timer);
      tb.style.width = (left / total * 100) + '%';
      tb.classList.toggle('low', left < total * 0.25);
      const sec = Math.ceil(left / 1000); const el = $('#sec'); if (el.textContent !== String(sec)) { el.textContent = sec; if (sec <= 3 && sec > 0) sfx.tick(); }
      if (left <= 0) { clearInterval(G.timer); send(''); }
    };
    tick(); G.timer = setInterval(tick, 100);
    $$('.kz-opt').forEach(b => b.onclick = () => { $$('.kz-opt').forEach(x => x.classList.add(x === b ? 'picked' : 'dim')); send(b.dataset.v, b); });
    const f = $('#isian'); if (f) { $('#ans').focus(); f.onsubmit = e => { e.preventDefault(); send($('#ans').value.trim()); }; }
  }

  async function send(answer) {
    if (G.busy) return; G.busy = true; clearInterval(G.timer);
    let r;
    try { r = await api('answer', { qid: G.q.id, answer }); }
    catch (e) { if (e.status === 409) return nextQ(); toast(e.message, 'bad'); G.busy = false; return; }
    G.me = r.me; setHud();
    if (r.info) {
      const fi = document.createElement('div'); fi.className = 'kz-feedback info';
      fi.innerHTML = `<div class="kz-fb-ico">${G.q.type === 'polling' ? '📊' : '📖'}</div><div class="kz-fb-title">${G.q.type === 'polling' ? 'Pilihanmu tercatat!' : 'Lanjut!'}</div><div class="kz-fb-rank">⭐ ${fmt(r.me.score)}</div>`;
      document.body.appendChild(fi);
      setTimeout(() => { fi.classList.add('out'); setTimeout(() => fi.remove(), 300); nextQ(); }, 1100);
      return;
    }
    if (r.correctLabel) $$('.kz-opt').forEach(b => { if (b.dataset.v === r.correctLabel) b.classList.add('right'); });
    (r.correct ? sfx.ok : sfx.bad)();
    const fb = document.createElement('div');
    fb.className = 'kz-feedback ' + (r.correct ? 'ok' : 'bad');
    fb.innerHTML = `<div class="kz-fb-ico">${r.correct ? '🎉' : (r.late ? '⏰' : '💪')}</div>
      <div class="kz-fb-title">${r.correct ? pick(RIGHT) : (r.late || answer === '' ? 'Waktu habis!' : r.partial ? 'Hampir!' : pick(WRONG))}</div>
      ${r.correct ? `<div class="kz-fb-pts">+${fmt(r.points)}</div>` : r.partial ? `<div class="kz-fb-pts">+${fmt(r.points)}</div><div class="kz-fb-streak">Benar sebagian (${Math.round(r.partial * 100)}%)</div>` : ''}
      ${r.streak > 1 ? `<div class="kz-fb-streak">🔥 Beruntun ${r.streak}!</div>` : ''}
      ${!r.correct && r.correctText ? `<div class="kz-fb-key">Jawaban benar: <b>${esc(r.correctText)}</b></div>` : ''}
      <div class="kz-fb-rank">Peringkat #${r.me.rank} dari ${r.players} · ⭐ ${fmt(r.me.score)}</div>`;
    document.body.appendChild(fb);
    setTimeout(() => { fb.classList.add('out'); setTimeout(() => fb.remove(), 300); nextQ(); }, r.correct ? 1600 : 2400);
  }

  /* ---------- 5. Selesai ---------- */
  function waitEnd() {
    stopAll();
    const draw = me => {
      view.innerHTML = `<div class="kz-card pop" style="text-align:center;max-width:520px;margin:5vh auto 0">
        <div class="kz-big-ico bounce">🏁</div><h2>Kamu sudah selesai!</h2>
        <div class="kz-final-score">${fmt(me.score)}</div><div class="muted">poin · peringkat sementara #${me.rank}</div>
        <div class="kz-stats"><div><b>${me.correct}/${me.total}</b><small>Benar</small></div><div><b>${me.total ? Math.round(me.correct / me.total * 100) : 0}%</b><small>Akurasi</small></div><div><b>🔥${me.bestStreak}</b><small>Beruntun terbaik</small></div></div>
        <p class="small muted">Tunggu teman-teman selesai dan guru mengumumkan juara…</p></div>`;
    };
    draw(G.me);
    G.poll = setInterval(async () => { try { const s = await api('state'); G.me = s.me; setHud(); if (s.status === 'ended') { stopAll(); final(s); } else draw(s.me); } catch (e) { /* */ } }, 3000);
  }
  function final(s) {
    stopAll();
    SND.stop(); const me = s.me; G.me = me; setHud();
    const top = s.top || [];
    const podium = [1, 0, 2].filter(k => top[k]).map(k => `<div class="kz-pod p${k + 1}"><div class="kz-av lg">${esc(top[k].avatar || '🙂')}</div><div class="kz-pod-name">${esc(top[k].nickname)}</div><div class="kz-pod-box"><b>${k + 1}</b><small>${fmt(top[k].score)}</small></div></div>`).join('');
    view.innerHTML = `<div class="kz-card pop" style="text-align:center;max-width:640px;margin:3vh auto 0">
      <h2>🏆 Kuis selesai!</h2>
      <div class="kz-podium">${podium}</div>
      <div class="kz-mine"><span class="kz-av">${esc(me.avatar || '🙂')}</span><div style="text-align:left"><b>${esc(me.nickname)}</b><div class="small muted">Peringkat #${me.rank} · ${me.correct}/${me.total} benar</div></div><div class="kz-final-score sm">${fmt(me.score)}</div></div>
      <button class="btn ghost" id="again" style="margin-top:14px">Gabung kuis lain</button></div>`;
    if (me.rank <= 3) confetti();
    $('#again').onclick = () => { localStorage.removeItem(saveKey()); G.code = ''; G.token = ''; stepCode(); };
  }
  function confetti() {
    const box = document.createElement('div'); box.className = 'kz-confetti';
    for (let i = 0; i < 80; i++) { const c = document.createElement('i'); c.style.left = Math.random() * 100 + '%'; c.style.background = `hsl(${Math.random() * 360} 85% 60%)`; c.style.animationDelay = Math.random() * 1.5 + 's'; c.style.animationDuration = 2.5 + Math.random() * 2 + 's'; box.appendChild(c); }
    document.body.appendChild(box); setTimeout(() => box.remove(), 6000);
  }

  /* ================= MODE UJIAN ================= */
  const E = { qs: [], ans: {}, flags: {}, idx: 0, deadline: 0, saveT: null, dirty: false, lastViol: 0, active: false, submitting: false };
  const ebKey = () => 'ujian-jawab:' + G.code + ':' + G.token;

  function examRules() {
    stopAll();
    const i = G.info;
    view.innerHTML = `<div class="kz-card pop exam-rules">
      <div class="kz-big-ico">📝</div><h2>${esc(i.title)}</h2>
      <div class="exam-facts"><div><b>${i.count}</b><small>soal</small></div><div><b>${i.duration ? i.duration : '∞'}</b><small>${i.duration ? 'menit' : 'tanpa batas'}</small></div><div><b>${i.maxViolations || '–'}</b><small>batas pelanggaran</small></div></div>
      <h3>Peraturan ujian</h3>
      <ol class="small" style="text-align:left;line-height:1.7">
        <li>Waktu mulai dihitung saat kamu menekan <b>Mulai Ujian</b>${i.duration ? ` dan berakhir otomatis setelah ${i.duration} menit` : ''}.</li>
        <li>Kamu bisa pindah soal, mengganti jawaban, dan menandai <b>Ragu-ragu</b>.</li>
        <li>Jawaban <b>tersimpan otomatis</b>. Jika HP mati, buka lagi tautan yang sama untuk melanjutkan.</li>
        <li><b>Jangan keluar dari halaman ini</b> (pindah aplikasi/tab). Setiap kali keluar tercatat sebagai pelanggaran${i.maxViolations ? ` dan setelah ${i.maxViolations} kali ujian <b>dikumpulkan otomatis</b>` : ''}.</li>
        <li>Tekan <b>Selesai</b> jika sudah yakin dengan semua jawaban.</li>
      </ol>
      <button class="btn lg kz-go" id="go">Mulai Ujian ▶</button></div>`;
    $('#go').onclick = () => { const el = document.documentElement; if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); examStart(); };
  }

  async function examStart() {
    stopAll();
    SND.start();
    let d;
    try { d = await api('exam-start', {}); } catch (e) { if (e.status === 409) return lobby({ players: 0, lobby: [] }); return toast(e.message, 'bad'); }
    if (d.finished) return examDone(d.me);
    G.me = d.me; setHud();
    E.qs = d.questions; E.ans = Object.assign({}, d.answers); E.flags = Object.assign({}, d.flags); E.idx = 0;
    // pulihkan cadangan lokal yang lebih baru (mis. saat koneksi putus)
    try { const b = JSON.parse(localStorage.getItem(ebKey()) || 'null'); if (b) { Object.assign(E.ans, b.ans || {}); Object.assign(E.flags, b.flags || {}); E.idx = b.idx || 0; E.dirty = true; } } catch (e) { /* */ }
    E.deadline = d.me.remainingMs !== null ? Date.now() + d.me.remainingMs : 0;
    E.active = true; E.submitting = false;
    examRender();
    G.timer = setInterval(examTick, 500); examTick();
    // Cek berkala: bila guru mengakhiri ujian, tampilkan hasil
    G.poll = setInterval(async () => {
      if (!E.active) return;
      try { const st = await api('state'); if (st.me && st.me.finished) { E.active = false; examDone(st.me); } else if (st.status === 'ended') { E.active = false; const r = await api('submit', { answers: E.ans, flags: E.flags }); examDone(r.me); } } catch (e) { /* */ }
    }, 10000);
    if (E.dirty) scheduleSave(0);
  }
  const answered = q => isAns(E.ans[q.id]);
  function examTick() {
    if (!E.deadline) return;
    const left = E.deadline - Date.now();
    const el = $('#ex-time'); if (el) { el.textContent = '⏱ ' + (left > 0 ? String(Math.floor(left / 60000)).padStart(2, '0') + ':' + String(Math.floor(left / 1000) % 60).padStart(2, '0') : '00:00'); el.classList.toggle('low', left < 5 * 60000); }
    if (left <= 0 && E.active) { toast('Waktu habis! Jawaban dikumpulkan otomatis.', 'bad'); examSubmit(true); }
  }
  function examRender() {
    const q = E.qs[E.idx], n = E.qs.length, a = E.ans[q.id];
    const done = E.qs.filter(answered).length;
    view.innerHTML = `<div class="exam-wrap">
      <div class="kz-card exam-bar"><b id="ex-time" class="ex-time">${E.deadline ? '⏱ --:--' : '⏱ bebas'}</b><span class="small muted" id="ex-done">${done}/${n} dijawab</span><span class="small muted" id="ex-save">✓ Tersimpan</span><button class="btn ok sm" id="ex-finish">Selesai</button></div>
      <div class="exam-grid">
        <div class="kz-card">
          <div class="exam-qhead"><span class="grade">${E.idx + 1}</span><span class="pill">${typeLabel(q.type)}</span><span class="small muted" style="margin-left:auto">Soal ${E.idx + 1} dari ${n}</span></div>
          ${q.image && !ownImg(q.type) ? `<img src="${q.image}" alt="" class="kz-img zoomable">` : ''}
          ${hideText(q.type) ? '' : `<div class="q-text" style="font-size:1.1rem;margin-bottom:14px">${esc(q.text)}</div>`}
          <div id="qt-host"></div>
          <div class="btns" style="justify-content:space-between;margin-top:16px">
            <button class="btn ghost" id="ex-prev" ${E.idx === 0 ? 'disabled' : ''}>← Sebelumnya</button>
            <label class="ragu ${E.flags[q.id] ? 'on' : ''}"><input type="checkbox" id="ex-flag" ${E.flags[q.id] ? 'checked' : ''}> Ragu-ragu</label>
            ${E.idx < n - 1 ? '<button class="btn" id="ex-next">Berikutnya →</button>' : '<button class="btn ok" id="ex-last">Selesai ✔</button>'}
          </div>
        </div>
        <div class="kz-card"><div class="small" style="font-weight:700;margin-bottom:8px">Nomor soal</div>
          <div class="qnav">${E.qs.map((x, k) => `<button class="${k === E.idx ? 'cur' : E.flags[x.id] ? 'flag' : answered(x) ? 'done' : ''}" data-i="${k}">${k + 1}</button>`).join('')}</div>
          <div class="ex-legend small muted"><span><i class="done"></i>dijawab</span><span><i class="flag"></i>ragu-ragu</span><span><i></i>belum</span></div></div>
      </div></div>`;
    const go = k => { E.idx = k; backup(); examRender(); window.scrollTo(0, 0); };
    QT.mount($('#qt-host'), q, a, {
      media: uploadMedia,
      onChange: v => {
        E.ans[q.id] = v; changed();
        const b = $$('.qnav button')[E.idx]; if (b && !E.flags[q.id]) b.classList.toggle('done', answered(q));
        const dn = $('#ex-done'); if (dn) dn.textContent = E.qs.filter(answered).length + '/' + n + ' dijawab';
      }
    });
    $('#ex-flag').onchange = e => { if (e.target.checked) E.flags[q.id] = true; else delete E.flags[q.id]; changed(); examRender(); };
    if ($('#ex-prev')) $('#ex-prev').onclick = () => go(E.idx - 1);
    if ($('#ex-next')) $('#ex-next').onclick = () => go(E.idx + 1);
    $$('.qnav button').forEach(b => b.onclick = () => go(+b.dataset.i));
    [$('#ex-finish'), $('#ex-last')].forEach(b => b && (b.onclick = () => examSubmit(false)));
    examTick();
  }
  function backup() { try { localStorage.setItem(ebKey(), JSON.stringify({ ans: E.ans, flags: E.flags, idx: E.idx })); } catch (e) { /* */ } }
  function changed() { E.dirty = true; backup(); const s = $('#ex-save'); if (s) s.textContent = '… menyimpan'; scheduleSave(900); }
  function scheduleSave(ms) { clearTimeout(E.saveT); E.saveT = setTimeout(saveNow, ms); }
  async function saveNow() {
    if (!E.dirty || !E.active) return;
    E.dirty = false;
    try {
      const r = await api('save', { answers: E.ans, flags: E.flags });
      if (r.finished) { E.active = false; return examDone(r.me); }
      const s = $('#ex-save'); if (s) s.textContent = '✓ Tersimpan';
    } catch (e) { E.dirty = true; const s = $('#ex-save'); if (s) s.textContent = '⚠ Belum tersimpan (dicoba lagi)'; scheduleSave(4000); }
  }
  async function examSubmit(force) {
    if (E.submitting) return;
    if (!force) {
      const left = E.qs.filter(q => q.type !== 'slide' && !answered(q)).length, ragu = Object.keys(E.flags).length;
      const ok = await confirmDlg(`${left ? `Masih ada <b>${left} soal</b> belum dijawab.<br>` : ''}${ragu ? `Ada <b>${ragu} soal</b> ditandai ragu-ragu.<br>` : ''}Kumpulkan jawaban sekarang? Setelah dikumpulkan jawaban tidak bisa diubah.`);
      if (!ok) return;
    }
    E.submitting = true; E.active = false; clearTimeout(E.saveT); clearInterval(G.timer);
    try { const r = await api('submit', { answers: E.ans, flags: E.flags }); localStorage.removeItem(ebKey()); examDone(r.me); }
    catch (e) { E.submitting = false; E.active = true; toast(e.message + ' — tekan Selesai lagi.', 'bad'); G.timer = setInterval(examTick, 500); }
  }
  function confirmDlg(html) {
    return new Promise(res => {
      const bg = document.createElement('div'); bg.className = 'modal-bg';
      bg.innerHTML = `<div class="modal" style="width:min(460px,100%)"><h2>Kumpulkan Jawaban?</h2><p>${html}</p><div class="foot"><button class="btn ghost" id="c-no">Periksa lagi</button><button class="btn ok" id="c-ok">Ya, kumpulkan</button></div></div>`;
      document.body.appendChild(bg);
      $('#c-ok', bg).onclick = () => { bg.remove(); res(true); };
      $('#c-no', bg).onclick = () => { bg.remove(); res(false); };
    });
  }
  function examDone(me) {
    stopAll();
    SND.stop(); E.active = false; G.me = me; setHud();
    try { localStorage.removeItem(ebKey()); } catch (e) { /* */ }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    const r = me.result;
    view.innerHTML = `<div class="kz-card pop" style="text-align:center;max-width:520px;margin:5vh auto 0">
      <div class="kz-big-ico">✅</div><h2>Jawaban terkirim</h2><p>${esc(me.nickname)}</p>
      ${r ? `<div class="kz-final-score">${(+r.score).toLocaleString('id-ID', { maximumFractionDigits: 1 })}</div><div class="muted">nilai ujian</div>${r.needsReview ? '<p class="note warn" style="margin-top:12px">Soal uraian/gambar/rekaman akan dikoreksi guru, nilai bisa berubah.</p>' : ''}` : '<p class="muted">Nilai akan diumumkan oleh guru.</p>'}
      ${me.violations ? `<p class="small" style="color:var(--bad)">Tercatat ${me.violations} kali keluar dari halaman ujian.</p>` : ''}
      <p class="small muted">Kamu boleh menutup halaman ini.</p></div>`;
  }
  // Pengawasan: keluar dari halaman ujian
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') return showWarn();
    if (!E.active || E.unloading) return;
    if (Date.now() - E.lastViol < 2000) return;
    E.lastViol = Date.now();
    saveNow();
    try {
      const r = await api('violation', {});
      if (r.locked) { E.active = false; examDone(r.me); toast('Ujian dikumpulkan otomatis karena terlalu sering keluar dari halaman.', 'bad'); return; }
      E.warn = r;
      if (document.visibilityState === 'visible') showWarn();
    } catch (e) { /* */ }
  });
  window.addEventListener('focus', showWarn);
  function showWarn() {
    if (!E.active || !E.warn || $('.kz-feedback.bad')) return;
    const r = E.warn; E.warn = null;
    const ov = document.createElement('div'); ov.className = 'kz-feedback bad';
    ov.innerHTML = `<div class="kz-fb-ico">⚠️</div><div class="kz-fb-title">Kamu keluar dari halaman ujian!</div><div class="kz-fb-key">Pelanggaran ke-${r.violations}${r.max ? ` dari ${r.max}. Jika mencapai ${r.max}, ujian dikumpulkan otomatis.` : '. Guru dapat melihat catatan ini.'}</div><button class="btn ghost lg" style="margin-top:18px" id="ov-ok">Kembali ke Ujian</button>`;
    document.body.appendChild(ov); $('#ov-ok', ov).onclick = () => ov.remove();
  }
  document.addEventListener('contextmenu', e => { if (E.active) e.preventDefault(); });
  document.addEventListener('copy', e => { if (E.active) e.preventDefault(); });
  // Memuat ulang/menutup halaman tidak dihitung pelanggaran
  const markUnload = () => { E.unloading = true; clearTimeout(E.unT); E.unT = setTimeout(() => { E.unloading = false; }, 4000); };
  window.addEventListener('beforeunload', e => { markUnload(); if (E.active) { saveNow(); e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('pagehide', markUnload);

  document.addEventListener('click', e => {
    const im = e.target.closest && e.target.closest('img.zoomable'); if (!im) return;
    const ov = document.createElement('div'); ov.className = 'img-zoom';
    ov.innerHTML = '<img alt=""><button class="btn ghost sm">✕ Tutup</button>'; ov.querySelector('img').src = im.src;
    ov.onclick = () => ov.remove(); document.body.appendChild(ov);
  });
  // Tema mengikuti pengaturan perangkat (bila pernah dipakai guru)
  try { const t = JSON.parse(localStorage.getItem('asesmen-merdeka-v1') || '{}').theme; if (t) { document.documentElement.style.setProperty('--h', t.h); document.documentElement.style.setProperty('--s', t.s); } } catch (e) { /* */ }

  G.code = (new URLSearchParams(location.search).get('kode') || '').replace(/\D/g, '');
  if (G.code.length === 6) { $('#view').innerHTML = ''; (async () => { try { G.info = await api(''); const saved = JSON.parse(localStorage.getItem(saveKey()) || 'null'); if (saved && saved.token) { G.token = saved.token; try { return resume(await api('state')); } catch (e) { G.token = ''; localStorage.removeItem(saveKey()); } } stepName(); } catch (e) { stepCode(e.message); } })(); }
  else stepCode();
})();
