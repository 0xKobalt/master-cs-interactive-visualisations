# Master CS — Interactive Course Notebook

A lightweight, zero-build multi-page website where each Master's CS course has its own dedicated page for small interactive visualizations and study notes.

## Opening the Website

- **Directly in a browser (recommended):** Double-click `index.html` (or open it in Chrome, Edge, or Firefox). Everything runs as static HTML, CSS, and JavaScript with no build step or server required.
- **Optional local server (Node.js):**
  ```powershell
  npx serve .
  ```

## Structure

- `index.html` — Course Hub with category filtering and search.
- `guide.html` — Copy-paste instructions for adding new courses and `VizKit` visualizations.
- `courses/_template.html` — Starter template for creating a new course page.
- `courses/*.html` — Individual course pages:
  - `algorithms.html` — Pathfinding (BFS, DFS, Dijkstra, A\*) & Binary Search Tree Traversals
  - `machine-learning.html` — Gradient Descent / L2 Regression & K-Means Clustering
  - `mdl.html` — DSAIT 4005 Lecture 1a: Bayes' Rule, Bayes Error `ε*`, and Misclassification Costs
  - `distributed-systems.html` — Lamport / Vector Clocks & Consistent Hashing Ring
  - `systems-architecture.html` — CPU Cache Simulator & IEEE 754 32-Bit Float Explorer
- `js/courses-data.js` — Central registry of all courses (controls both the Home Hub and sidebar).
- `js/layout.js` — Shared sidebar, breadcrumbs, dark/light theme switcher, and per-course local study notes.
- `js/viz-kit.js` — HiDPI canvas setup, pointer coordinate mapping, and theme-aware colors.
- `styles/main.css` — Shared design tokens, responsive layout, and `.viz-card` styles.
