/* Mode Siang / Malam / Otomatis — dipasang di <head> agar tidak berkedip saat halaman dibuka. */
(function () {
  'use strict';
  var KEY = 'tema-mode';
  var mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  function get() { try { return localStorage.getItem(KEY) || 'dark'; } catch (e) { return 'dark'; } }
  function resolve(m) { return m === 'auto' ? (mql && mql.matches ? 'light' : 'dark') : (m === 'light' ? 'light' : 'dark'); }
  function paint() {
    var r = resolve(get()), root = document.documentElement;
    root.setAttribute('data-mode', r);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', r === 'light' ? '#cfe6ff' : '#16125a');
    var btns = document.querySelectorAll('.mode-toggle');
    for (var i = 0; i < btns.length; i++) {
      btns[i].textContent = r === 'light' ? '🌙' : '☀️';
      btns[i].setAttribute('title', r === 'light' ? 'Ganti ke Mode Malam' : 'Ganti ke Mode Siang');
      btns[i].setAttribute('aria-label', btns[i].getAttribute('title'));
    }
    return r;
  }
  function set(m, silent) {
    try { localStorage.setItem(KEY, m); } catch (e) { /* */ }
    var r = paint();
    if (!silent) window.dispatchEvent(new CustomEvent('modechange', { detail: { mode: m, resolved: r } }));
  }
  paint();
  if (mql && mql.addEventListener) mql.addEventListener('change', function () { if (get() === 'auto') set('auto'); });
  document.addEventListener('DOMContentLoaded', paint);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.mode-toggle');
    if (!b) return;
    e.preventDefault();
    set(resolve(get()) === 'dark' ? 'light' : 'dark');
  });
  window.ThemeMode = { get: get, set: set, resolve: resolve, paint: paint };
})();
