// Applies the saved theme before React loads (no light/dark flash). External file so the
// Content-Security-Policy can forbid inline scripts entirely.
(function () {
  try {
    var t = localStorage.getItem('mfp-theme');
    var dark = t === 'dark' || ((!t || t === 'system') && matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {
    /* storage blocked: fall back to light */
  }
})();
