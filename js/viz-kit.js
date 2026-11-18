/**
 * Master CS — VizKit
 *
 * Lightweight helper utilities so adding a new interactive visualization
 * takes minimal boilerplate while remaining crisp on HiDPI displays and
 * theme-aware in both light and dark modes.
 */
(function () {
  function getThemeColors() {
    const styles = getComputedStyle(document.documentElement);
    const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";

    return {
      isDark,
      bg: read("--canvas-bg", isDark ? "#11141c" : "#fcfcfb"),
      grid: read("--canvas-grid", isDark ? "#212636" : "#e8e8e2"),
      surface: read("--surface", isDark ? "#151821" : "#ffffff"),
      surfaceMuted: read("--surface-muted", isDark ? "#1c202b" : "#f1f1ee"),
      border: read("--border", isDark ? "#272c3a" : "#e3e3de"),
      borderStrong: read("--border-strong", isDark ? "#373e52" : "#cfcfc7"),
      text: read("--text", isDark ? "#eceef4" : "#18181b"),
      textMuted: read("--text-muted", isDark ? "#a1a7b8" : "#52525b"),
      textSubtle: read("--text-subtle", isDark ? "#788096" : "#71717a"),
      accent: read("--accent", "#2563eb"),
      success: read("--success", "#16a34a"),
      warning: read("--warning", "#d97706"),
      danger: read("--danger", "#dc2626"),
      purple: read("--purple", "#7c3aed")
    };
  }

  /**
   * Configures a canvas with logical CSS dimensions (width x height)
   * and crisp devicePixelRatio backing store scaling.
   */
  function setupCanvas(canvas, logicalWidth, logicalHeight) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(logicalWidth * dpr);
    canvas.height = Math.round(logicalHeight * dpr);
    canvas.style.width = "100%";
    canvas.style.aspectRatio = `${logicalWidth} / ${logicalHeight}`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width: logicalWidth, height: logicalHeight, dpr };
  }

  /**
   * Converts a Mouse/Pointer event to logical canvas coordinates
   * matching (logicalWidth, logicalHeight) regardless of responsive CSS scaling.
   */
  function getCanvasPoint(canvas, event, logicalWidth, logicalHeight) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = logicalWidth / rect.width;
    const scaleY = logicalHeight / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function onThemeChange(callback) {
    window.addEventListener("mastercs:themechange", callback);
  }

  window.VizKit = {
    getThemeColors,
    setupCanvas,
    getCanvasPoint,
    clamp,
    onThemeChange
  };
})();
