/*
 * Your own UI additions live here so index.html / index.js can stay identical
 * to upstream dufs. Loaded after index.js (see the extra <script> line in
 * index.html). Relies on upstream's `.toolbox` / `.toolbox-right` containers
 * and the `DATA` global. Theme state itself lives in theme-init.js.
 */
(function () {
  "use strict";

  // Only set while the script is executing; used to find files next to it.
  const scriptUrl = document.currentScript && document.currentScript.src;

  /**
   * Add an icon button to the top bar, styled like the built-in ones.
   * @param {object} opts
   * @param {string} opts.id       unique id, used as the element class
   * @param {string} opts.title    tooltip text
   * @param {string} opts.icon     inline <svg> markup (16x16, fill is themed)
   * @param {() => void} opts.onClick
   * @param {() => boolean} [opts.show]  return false to keep it hidden
   * @param {string} [opts.container]    ".toolbox" (default, left) or ".toolbox-right"
   * @returns {HTMLElement|null}
   */
  function addToolboxButton({ id, title, icon, onClick, show, container = ".toolbox" }) {
    const $container = document.querySelector(container);
    if (!$container) return null;
    const btn = document.createElement("div");
    btn.className = `control custom-btn ${id}`;
    btn.title = title;
    btn.innerHTML = icon;
    btn.addEventListener("click", onClick);
    if (show && !show()) btn.classList.add("hidden");
    $container.appendChild(btn);
    return btn;
  }

  window.dufsTheme = Object.assign(window.dufsTheme || {}, { addToolboxButton });

  // Bootstrap Icons "moon" / "sun". The button shows the theme you'd switch to.
  const ICON_MOON = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278zM4.858 1.311A7.269 7.269 0 0 0 1.025 7.71c0 4.02 3.279 7.276 7.319 7.276a7.316 7.316 0 0 0 5.205-2.162c-.337.042-.68.063-1.029.063-4.61 0-8.343-3.714-8.343-8.29 0-1.167.242-2.278.681-3.286z"/></svg>';
  const ICON_SUN = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/></svg>';

  const themeBtn = addToolboxButton({
    id: "theme-toggle",
    container: ".toolbox-right",
    title: "Switch theme",
    icon: ICON_SUN,
    onClick: () => {
      window.dufsTheme.setTheme(window.dufsTheme.getTheme() === "dark" ? "light" : "dark");
      syncThemeBtn();
    },
  });

  function syncThemeBtn() {
    if (!themeBtn) return;
    const dark = window.dufsTheme.getTheme() === "dark";
    themeBtn.innerHTML = dark ? ICON_SUN : ICON_MOON;
    themeBtn.title = dark ? "Switch to light theme" : "Switch to dark theme";
  }

  syncThemeBtn();

  /** Format bytes like the file list does (1024-based). */
  function formatSize(bytes) {
    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  /**
   * Show free disk space in the top bar. The numbers come from disk.json, which
   * scripts/disk-usage.sh writes next to this file on the server. Without that
   * file the indicator simply stays hidden.
   */
  async function showDiskUsage() {
    const $right = document.querySelector(".toolbox-right");
    if (!$right || !scriptUrl) return;
    try {
      const res = await fetch(new URL("disk.json", scriptUrl), { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      if (!(d.size > 0) || !(d.free >= 0)) return;

      const used = d.used >= 0 ? d.used : d.size - d.free;
      const usedPct = Math.min(100, Math.round((used / (used + d.free)) * 100));

      const $el = document.createElement("span");
      $el.className = "disk-usage" + (usedPct >= 90 ? " low" : "");
      $el.title = `${formatSize(d.free)} free of ${formatSize(d.size)} (${usedPct}% used)`;

      const $label = document.createElement("span");
      $label.className = "disk-label";
      $label.textContent = `${formatSize(d.free)} free`;

      const $bar = document.createElement("span");
      $bar.className = "disk-bar";
      const $fill = document.createElement("span");
      $fill.style.width = `${usedPct}%`;
      $bar.appendChild($fill);

      $el.append($label, $bar);
      $right.prepend($el);
    } catch (e) { /* no disk.json or bad data: leave the indicator out */ }
  }

  showDiskUsage();
})();
