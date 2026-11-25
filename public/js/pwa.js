/* Dukungan aplikasi HP (PWA): daftar service worker & ajakan "Pasang Aplikasi". */
(function () {
  'use strict';
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
  const mq = q => window.matchMedia && window.matchMedia(q).matches;
  const standalone = mq('(display-mode: standalone)') || mq('(display-mode: minimal-ui)') || window.navigator.standalone === true;
  document.documentElement.classList.toggle('standalone', !!standalone);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobile = () => mq('(max-width: 860px)') || /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  const KEY = 'pwa-later';
  let deferred = null;

  function iosSheet() {
    const bg = document.createElement('div'); bg.className = 'pwa-sheet-bg';
    bg.innerHTML = `<div class="pwa-sheet"><div class="pwa-grip"></div>
      <img src="icons/${document.body.classList.contains('kuis-body') ? 'kuis' : 'icon'}-192.png" alt="" class="pwa-ic">
      <h3>Pasang di iPhone / iPad</h3>
      <ol><li>Ketuk tombol <b>Bagikan</b> <span class="pwa-share">⬆︎</span> di bawah layar Safari.</li><li>Gulir lalu pilih <b>Tambah ke Layar Utama</b>.</li><li>Ketuk <b>Tambah</b>. Ikon aplikasi muncul di layar HP.</li></ol>
      <button class="pwa-btn">Mengerti</button></div>`;
    bg.onclick = e => { if (e.target === bg || e.target.classList.contains('pwa-btn')) bg.remove(); };
    document.body.appendChild(bg);
  }
  async function install() {
    if (deferred) { deferred.prompt(); const r = await deferred.userChoice.catch(() => null); deferred = null; hide(); return r && r.outcome === 'accepted'; }
    if (isIOS) { iosSheet(); return false; }
    return false;
  }
  function hide() { const b = document.getElementById('pwa-bar'); if (b) b.remove(); }
  function show() {
    if (standalone || document.getElementById('pwa-bar') || !isMobile()) return;
    if (+localStorage.getItem(KEY) > Date.now()) return;
    if (!deferred && !isIOS) return;
    const kuis = document.body.classList.contains('kuis-body');
    const bar = document.createElement('div'); bar.id = 'pwa-bar'; bar.className = 'pwa-bar';
    bar.innerHTML = `<img src="icons/${kuis ? 'kuis' : 'icon'}-192.png" alt=""><div><b>Pasang ${kuis ? 'Kuis Seru' : 'aplikasi'} di HP</b><small>Buka lebih cepat, layar penuh seperti aplikasi</small></div><button class="pwa-btn">Pasang</button><button class="pwa-x" aria-label="Nanti">✕</button>`;
    bar.querySelector('.pwa-btn').onclick = install;
    bar.querySelector('.pwa-x').onclick = () => { localStorage.setItem(KEY, Date.now() + 7 * 864e5); hide(); };
    document.body.appendChild(bar);
  }
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; setTimeout(show, 1500); });
  window.addEventListener('appinstalled', hide);
  if (isIOS && !standalone) setTimeout(show, 2500);
  window.PWA = { install, standalone, canInstall: () => !standalone && (!!deferred || isIOS), isIOS };
})();
