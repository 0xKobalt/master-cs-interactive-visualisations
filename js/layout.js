/**
 * Master CS — Shared Page Layout, Theme Switcher, and Course Notes
 *
 * Expects <body data-root="." data-page="home"> (or data-root=".." inside courses/).
 * Works seamlessly both over file:// and http(s):// without a build step.
 */
(function () {
  const THEME_KEY = "master_cs_theme";
  const NOTES_PREFIX = "master_cs_notes_";
  const ARCHIVE_KEY = "master_cs_archived_overrides";

  function safeStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeStorageSet(key, val) {
    try {
      window.localStorage.setItem(key, val);
    } catch (_) {
      /* Ignore storage restrictions on strict file:// contexts */
    }
  }

  function getArchiveOverrides() {
    const raw = safeStorageGet(ARCHIVE_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function isArchived(course) {
    if (!course) return false;
    const overrides = getArchiveOverrides();
    if (Object.prototype.hasOwnProperty.call(overrides, course.id)) {
      return Boolean(overrides[course.id]);
    }
    return Boolean(course.archived);
  }

  function setArchived(courseId, archived) {
    const overrides = getArchiveOverrides();
    overrides[courseId] = Boolean(archived);
    safeStorageSet(ARCHIVE_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new CustomEvent("mastercs:archivechange", { detail: { courseId, archived: Boolean(archived) } }));
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getPreferredTheme() {
    const saved = safeStorageGet(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    safeStorageSet(THEME_KEY, theme);
    const btn = document.getElementById("theme-toggle-btn");
    if (btn) {
      btn.textContent = theme === "dark" ? "☀ Light" : "☾ Dark";
      btn.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
    }
    window.dispatchEvent(new CustomEvent("mastercs:themechange", { detail: { theme } }));
  }

  function resolveUrl(root, path) {
    const cleanRoot = root.replace(/\/+$/, "");
    return cleanRoot ? `${cleanRoot}/${path}` : path;
  }

  function initLayout() {
    const body = document.body;
    const root = body.dataset.root || ".";
    const pageId = body.dataset.page || "home";
    const courses = window.MASTER_CS_COURSES || [];
    const currentCourse = courses.find((c) => c.id === pageId) || null;

    applyTheme(getPreferredTheme());

    const mainContent = document.getElementById("page-content");
    if (!mainContent) return;

    const shell = document.createElement("div");
    shell.className = "app-shell";

    const backdrop = document.createElement("div");
    backdrop.className = "sidebar-backdrop";
    backdrop.id = "sidebar-backdrop";

    const sidebar = document.createElement("aside");
    sidebar.className = "sidebar";
    sidebar.id = "app-sidebar";

    function renderCourseLinks(list) {
      return list
        .map((course) => {
          const isActive = pageId === course.id ? "active" : "";
          return `
            <li class="nav-item">
              <a href="${resolveUrl(root, course.page)}" class="${isActive}">
                <span class="nav-dot" style="background:${escapeHtml(course.color)}"></span>
                <span>${escapeHtml(course.title)}</span>
                <span class="nav-code">${escapeHtml(course.code)}</span>
              </a>
            </li>`;
        })
        .join("");
    }

    function renderSidebar() {
      const activeCourses = courses.filter((c) => !isArchived(c));
      const archivedCourses = courses.filter((c) => isArchived(c));
      const viewingArchived = currentCourse && isArchived(currentCourse);

      const archivedSection = archivedCourses.length
        ? `
          <div class="sidebar-section">
            <details class="sidebar-archive-group" ${viewingArchived ? "open" : ""}>
              <summary class="sidebar-label">
                <span>Archived (${archivedCourses.length})</span>
                <span>▾</span>
              </summary>
              <ul class="nav-list">
                ${renderCourseLinks(archivedCourses)}
              </ul>
            </details>
          </div>`
        : "";

      sidebar.innerHTML = `
        <div class="sidebar-brand">
          <a href="${resolveUrl(root, "index.html")}" class="brand-link">
            <span class="brand-logo">CS</span>
            <span>
              Master CS
              <span class="brand-sub">Interactive Study Lab</span>
            </span>
          </a>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-label">Workspace</div>
          <ul class="nav-list">
            <li class="nav-item">
              <a href="${resolveUrl(root, "index.html")}" class="${pageId === "home" ? "active" : ""}">
                <span>All Courses</span>
              </a>
            </li>
            <li class="nav-item">
              <a href="${resolveUrl(root, "guide.html")}" class="${pageId === "guide" ? "active" : ""}">
                <span>Add Course / Viz Guide</span>
              </a>
            </li>
          </ul>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-label">Courses (${activeCourses.length})</div>
          <ul class="nav-list">
            ${activeCourses.length ? renderCourseLinks(activeCourses) : '<li class="nav-item"><span style="padding:0.4rem 0.65rem;font-size:0.82rem;color:var(--text-subtle);">No active courses</span></li>'}
          </ul>
        </div>

        ${archivedSection}

        <div class="sidebar-section">
          <div class="sidebar-label">Templates</div>
          <ul class="nav-list">
            <li class="nav-item">
              <a href="${resolveUrl(root, "courses/_template.html")}" class="${pageId === "template" ? "active" : ""}">
                <span>Blank Course Template</span>
              </a>
            </li>
          </ul>
        </div>

        <div class="sidebar-footer">
          <span>Zero-build static site</span>
          <span class="mono">v1.0</span>
        </div>
      `;
    }

    renderSidebar();

    const mainCol = document.createElement("div");
    mainCol.className = "main-column";

    let breadcrumbCurrent = "All Courses";
    if (currentCourse) {
      breadcrumbCurrent = `${currentCourse.code} · ${currentCourse.title}`;
    } else if (pageId === "guide") {
      breadcrumbCurrent = "Add Course / Viz Guide";
    } else if (pageId === "template") {
      breadcrumbCurrent = "Blank Course Template";
    }

    const archiveButtonHtml = currentCourse
      ? `<button id="course-archive-btn" class="btn btn-sm" type="button"></button>`
      : "";

    const topbar = document.createElement("header");
    topbar.className = "topbar";
    topbar.innerHTML = `
      <div class="topbar-left">
        <button class="menu-toggle" id="menu-toggle-btn" type="button" aria-label="Toggle navigation">☰</button>
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="${resolveUrl(root, "index.html")}">Master CS</a>
          <span>/</span>
          <span class="current">${escapeHtml(breadcrumbCurrent)}</span>
        </nav>
      </div>
      <div class="topbar-actions">
        ${archiveButtonHtml}
        <a href="${resolveUrl(root, "guide.html")}" class="btn btn-sm">+ Add Visualization</a>
        <button id="theme-toggle-btn" class="btn btn-sm" type="button"></button>
      </div>
    `;

    const wrap = document.createElement("main");
    wrap.className = "content-wrap";
    while (mainContent.firstChild) {
      wrap.appendChild(mainContent.firstChild);
    }
    mainContent.remove();

    mainCol.appendChild(topbar);
    mainCol.appendChild(wrap);

    shell.appendChild(backdrop);
    shell.appendChild(sidebar);
    shell.appendChild(mainCol);
    body.prepend(shell);

    // Re-sync theme label now that button is in DOM
    applyTheme(document.documentElement.getAttribute("data-theme") || "light");

    function syncArchiveButton() {
      const btn = document.getElementById("course-archive-btn");
      if (!btn || !currentCourse) return;
      const arch = isArchived(currentCourse);
      btn.textContent = arch ? "Restore Course" : "Archive Course";
      btn.classList.toggle("is-active", arch);
    }

    syncArchiveButton();
    const courseArchiveBtn = document.getElementById("course-archive-btn");
    if (courseArchiveBtn && currentCourse) {
      courseArchiveBtn.addEventListener("click", () => {
        setArchived(currentCourse.id, !isArchived(currentCourse));
      });
    }

    window.addEventListener("mastercs:archivechange", () => {
      renderSidebar();
      syncArchiveButton();
    });

    document.getElementById("theme-toggle-btn").addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });

    const toggleBtn = document.getElementById("menu-toggle-btn");
    function setMenuOpen(open) {
      sidebar.classList.toggle("open", open);
      backdrop.classList.toggle("open", open);
    }
    toggleBtn.addEventListener("click", () => setMenuOpen(!sidebar.classList.contains("open")));
    backdrop.addEventListener("click", () => setMenuOpen(false));

    initCourseScratchpad(pageId);
  }

  function initCourseScratchpad(pageId) {
    const slot = document.getElementById("course-notes");
    if (!slot) return;

    const storageKey = `${NOTES_PREFIX}${pageId}`;
    const saved = safeStorageGet(storageKey) || "";

    slot.className = "notes-card";
    slot.innerHTML = `
      <div class="notes-card-header">
        <h3>Personal Study Notes</h3>
        <span class="notes-status" id="notes-status-text">Saved locally in browser</span>
      </div>
      <textarea
        id="course-notes-textarea"
        class="textarea"
        rows="4"
        placeholder="Jot down formulas, edge cases, exam reminders, or observations from the visualizations..."
      ></textarea>
    `;

    const textarea = document.getElementById("course-notes-textarea");
    const status = document.getElementById("notes-status-text");
    textarea.value = saved;

    let timer = null;
    textarea.addEventListener("input", () => {
      status.textContent = "Saving...";
      clearTimeout(timer);
      timer = setTimeout(() => {
        safeStorageSet(storageKey, textarea.value);
        status.textContent = "Saved locally";
      }, 250);
    });
  }

  window.MasterCSLayout = { escapeHtml, resolveUrl, isArchived, setArchived };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLayout);
  } else {
    initLayout();
  }
})();
