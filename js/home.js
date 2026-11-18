/**
 * Master CS — Home Course Hub
 * Renders searchable/filterable course cards with active/archived views.
 */
(function () {
  function initHome() {
    const courses = window.MASTER_CS_COURSES || [];
    const grid = document.getElementById("course-grid");
    const filterContainer = document.getElementById("category-filters");
    const searchInput = document.getElementById("course-search");
    const statsEl = document.getElementById("hub-stats");
    if (!grid || !filterContainer || !searchInput) return;

    const { escapeHtml, isArchived, setArchived } = window.MasterCSLayout;
    const categories = ["All", ...Array.from(new Set(courses.map((c) => c.category)))];
    let activeCategory = "All";
    let showArchived = false;
    let query = "";

    function updateStats() {
      if (!statsEl) return;
      const activeCourses = courses.filter((c) => !isArchived(c));
      const archivedCount = courses.length - activeCourses.length;
      const activeViz = activeCourses.reduce((acc, c) => acc + (c.vizCount || 0), 0);
      statsEl.textContent = `${activeCourses.length} active course${activeCourses.length === 1 ? "" : "s"} · ${activeViz} visualizations · ${archivedCount} archived`;
    }

    function renderFilters() {
      const activeCount = courses.filter((c) => !isArchived(c)).length;
      const archivedCount = courses.length - activeCount;

      const viewTabsHtml = `
        <button type="button" id="view-active-btn" class="btn btn-sm ${!showArchived ? "is-active" : ""}">Active (${activeCount})</button>
        <button type="button" id="view-archived-btn" class="btn btn-sm ${showArchived ? "is-active" : ""}">Archived (${archivedCount})</button>
        <span style="width:1px;height:20px;background:var(--border-strong);margin:0 0.15rem;"></span>
      `;

      const catPillsHtml = categories
        .map((cat) => {
          const active = cat === activeCategory ? "is-active" : "";
          return `<button type="button" class="btn btn-sm ${active}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
        })
        .join("");

      filterContainer.innerHTML = viewTabsHtml + catPillsHtml;

      document.getElementById("view-active-btn").addEventListener("click", () => {
        showArchived = false;
        renderFilters();
        renderGrid();
      });

      document.getElementById("view-archived-btn").addEventListener("click", () => {
        showArchived = true;
        renderFilters();
        renderGrid();
      });

      filterContainer.querySelectorAll("button[data-cat]").forEach((btn) => {
        btn.addEventListener("click", () => {
          activeCategory = btn.dataset.cat;
          renderFilters();
          renderGrid();
        });
      });
    }

    function renderGrid() {
      updateStats();
      const q = query.trim().toLowerCase();
      const filtered = courses.filter((course) => {
        if (isArchived(course) !== showArchived) return false;
        const matchesCat = activeCategory === "All" || course.category === activeCategory;
        if (!matchesCat) return false;
        if (!q) return true;
        const haystack = [course.code, course.title, course.category, course.description, ...(course.topics || [])]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });

      if (filtered.length === 0) {
        const emptyMsg = q
          ? `No ${showArchived ? "archived" : "active"} courses match "<strong>${escapeHtml(query)}</strong>".`
          : showArchived
            ? "No archived courses right now."
            : "No active courses match this filter. Check the Archived tab or add a course in <code>js/courses-data.js</code>.";

        grid.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            ${emptyMsg}
          </div>
        `;
        return;
      }

      grid.innerHTML = filtered
        .map((course) => {
          const archived = isArchived(course);
          const topicsHtml = (course.topics || [])
            .map((t) => `<span class="topic-pill">${escapeHtml(t)}</span>`)
            .join("");

          return `
            <article class="course-card ${archived ? "is-archived" : ""}">
              <div class="course-card-top">
                <span class="course-code-pill">
                  <span class="nav-dot" style="background:${escapeHtml(course.color)}"></span>
                  ${escapeHtml(course.code)}
                </span>
                <span class="badge">${escapeHtml(course.category)}</span>
              </div>
              <a class="course-card-title-link" href="${escapeHtml(course.page)}">
                <h3>${escapeHtml(course.title)}</h3>
              </a>
              <p>${escapeHtml(course.description)}</p>
              <div class="topic-pills">${topicsHtml}</div>
              <div class="course-card-footer">
                <span>${course.vizCount || 0} visualizations</span>
                <div class="course-card-actions">
                  <button type="button" class="btn btn-sm archive-btn" data-id="${escapeHtml(course.id)}">
                    ${archived ? "Unarchive" : "Archive"}
                  </button>
                  <a href="${escapeHtml(course.page)}" class="btn btn-sm btn-primary">Open →</a>
                </div>
              </div>
            </article>
          `;
        })
        .join("");

      grid.querySelectorAll(".archive-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.id;
          const course = courses.find((c) => c.id === id);
          if (!course) return;
          setArchived(id, !isArchived(course));
        });
      });
    }

    searchInput.addEventListener("input", (e) => {
      query = e.target.value;
      renderGrid();
    });

    window.addEventListener("mastercs:archivechange", () => {
      renderFilters();
      renderGrid();
    });

    renderFilters();
    renderGrid();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHome);
  } else {
    initHome();
  }
})();
