/*
 * Runs from <head> so the saved theme is applied before first paint (no flash).
 * The toggle button itself is in custom.js. Default theme is dark.
 */
(function () {
  "use strict";

  const KEY = "dufs-theme";

  function getTheme() {
    try {
      return localStorage.getItem(KEY) === "light" ? "light" : "dark";
    } catch (e) {
      return "dark";
    }
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch (e) { /* storage blocked: the choice just won't persist */ }
  }

  document.documentElement.dataset.theme = getTheme();

  window.dufsTheme = { getTheme, setTheme };
})();
