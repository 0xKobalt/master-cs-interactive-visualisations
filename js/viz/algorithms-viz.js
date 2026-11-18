/**
 * CS-501: Algorithms & Graph Theory Visualizations
 * 1) Interactive Grid Pathfinding (BFS, DFS, Dijkstra, A*)
 * 2) Binary Search Tree & Animated Traversals
 */
(function () {
  /* ========================================================================
     1. Grid Pathfinding Visualizer
     ======================================================================== */
  function initPathfinding() {
    const canvas = document.getElementById("pf-canvas");
    if (!canvas) return;

    const algoSelect = document.getElementById("pf-algo");
    const brushSelect = document.getElementById("pf-brush");
    const speedInput = document.getElementById("pf-speed");
    const runBtn = document.getElementById("pf-run");
    const stepBtn = document.getElementById("pf-step");
    const clearPathBtn = document.getElementById("pf-clear-path");
    const mazeBtn = document.getElementById("pf-maze");
    const resetBtn = document.getElementById("pf-reset");

    const statusEl = document.getElementById("pf-status");
    const visitedEl = document.getElementById("pf-visited");
    const frontierEl = document.getElementById("pf-frontier");
    const hopsEl = document.getElementById("pf-hops");
    const costEl = document.getElementById("pf-cost");

    const COLS = 24;
    const ROWS = 12;
    const CELL = 35;
    const W = COLS * CELL; // 840
    const H = ROWS * CELL; // 420

    const EMPTY = 0;
    const WALL = 1;
    const WEIGHT = 2;

    let grid = [];
    let start = { r: 5, c: 3 };
    let goal = { r: 5, c: 20 };

    // Search runtime state
    let search = null;
    let timerId = null;
    let isDrawing = false;
    let paintMode = WALL;

    function makeEmptyGrid() {
      grid = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
    }

    function placeSampleObstacles() {
      stopAuto();
      makeEmptyGrid();
      start = { r: 5, c: 3 };
      goal = { r: 5, c: 20 };
      for (let r = 1; r <= 9; r++) {
        if (r !== 5) grid[r][9] = WALL;
      }
      grid[5][9] = WEIGHT;
      for (let r = 2; r <= 10; r++) {
        if (r !== 3) grid[r][15] = WALL;
      }
      for (let r = 3; r <= 8; r++) {
        for (let c = 11; c <= 13; c++) {
          grid[r][c] = WEIGHT;
        }
      }
      clearSearchState();
    }

    function keyOf(r, c) {
      return `${r},${c}`;
    }

    function isSame(a, b) {
      return a.r === b.r && a.c === b.c;
    }

    function clearSearchState() {
      stopAuto();
      search = null;
      statusEl.textContent = "Ready";
      visitedEl.textContent = "0";
      frontierEl.textContent = "0";
      hopsEl.textContent = "—";
      costEl.textContent = "—";
      draw();
    }

    function initSearch() {
      const algo = algoSelect.value;
      const startKey = keyOf(start.r, start.c);
      const dist = new Map([[startKey, 0]]);
      const parent = new Map();
      const closed = new Set();
      const frontierSet = new Set([startKey]);
      const queue = [{ r: start.r, c: start.c, g: 0, h: heuristic(start, goal), f: heuristic(start, goal) }];

      search = {
        algo,
        dist,
        parent,
        closed,
        frontierSet,
        queue,
        path: [],
        done: false,
        found: false,
        currentKey: null
      };
      statusEl.textContent = "Searching...";
      updateMetrics();
    }

    function heuristic(a, b) {
      return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
    }

    function cellCost(r, c) {
      if (algoSelect.value === "bfs" || algoSelect.value === "dfs") return 1;
      return grid[r][c] === WEIGHT ? 5 : 1;
    }

    function neighbors(r, c) {
      const dirs = [
        [-1, 0],
        [0, 1],
        [1, 0],
        [0, -1]
      ];
      const out = [];
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] !== WALL) {
          out.push({ r: nr, c: nc });
        }
      }
      return out;
    }

    function reconstructPath() {
      const path = [];
      let curKey = keyOf(goal.r, goal.c);
      const startKey = keyOf(start.r, start.c);
      let totalCost = 0;

      while (curKey && curKey !== startKey) {
        const [r, c] = curKey.split(",").map(Number);
        path.push({ r, c });
        totalCost += grid[r][c] === WEIGHT && (search.algo === "dijkstra" || search.algo === "astar") ? 5 : 1;
        curKey = search.parent.get(curKey);
      }
      path.push({ r: start.r, c: start.c });
      path.reverse();
      search.path = path;
      hopsEl.textContent = String(Math.max(0, path.length - 1));
      costEl.textContent = String(
        search.algo === "bfs" || search.algo === "dfs"
          ? path.slice(1).reduce((sum, p) => sum + (grid[p.r][p.c] === WEIGHT ? 5 : 1), 0)
          : search.dist.get(keyOf(goal.r, goal.c))
      );
    }

    function stepSearch() {
      if (!search) initSearch();
      if (search.done) return false;

      const { algo, queue, closed, frontierSet, dist, parent } = search;

      // Pop next node depending on strategy
      let current = null;
      while (queue.length > 0) {
        let candidate;
        if (algo === "bfs") {
          candidate = queue.shift();
        } else if (algo === "dfs") {
          candidate = queue.pop();
        } else {
          // Dijkstra or A*: pick lowest priority (f = g for Dijkstra, f = g + h for A*)
          let bestIdx = 0;
          for (let i = 1; i < queue.length; i++) {
            const a = queue[i];
            const b = queue[bestIdx];
            if (a.f < b.f || (a.f === b.f && a.h < b.h)) {
              bestIdx = i;
            }
          }
          candidate = queue.splice(bestIdx, 1)[0];
        }

        const cKey = keyOf(candidate.r, candidate.c);
        if (!closed.has(cKey)) {
          current = candidate;
          break;
        }
      }

      if (!current) {
        search.done = true;
        search.found = false;
        search.currentKey = null;
        statusEl.textContent = "No Path Found";
        updateMetrics();
        draw();
        return false;
      }

      const curKey = keyOf(current.r, current.c);
      frontierSet.delete(curKey);
      closed.add(curKey);
      search.currentKey = curKey;

      if (isSame(current, goal)) {
        search.done = true;
        search.found = true;
        reconstructPath();
        statusEl.textContent = "Path Found";
        updateMetrics();
        draw();
        return false;
      }

      const nextList = neighbors(current.r, current.c);
      // Reverse for DFS so top/right expand naturally first
      const ordered = algo === "dfs" ? nextList.slice().reverse() : nextList;

      for (const nb of ordered) {
        const nbKey = keyOf(nb.r, nb.c);
        if (closed.has(nbKey)) continue;

        if (algo === "bfs" || algo === "dfs") {
          if (algo === "bfs" && frontierSet.has(nbKey)) continue;
          if (!parent.has(nbKey)) parent.set(nbKey, curKey);
          const stepCost = cellCost(nb.r, nb.c);
          dist.set(nbKey, (dist.get(curKey) || 0) + stepCost);
          frontierSet.add(nbKey);
          queue.push({ r: nb.r, c: nb.c, g: dist.get(nbKey), h: 0, f: 0 });
        } else {
          const newG = (dist.get(curKey) ?? Infinity) + cellCost(nb.r, nb.c);
          if (newG < (dist.get(nbKey) ?? Infinity)) {
            dist.set(nbKey, newG);
            parent.set(nbKey, curKey);
            const h = algo === "astar" ? heuristic(nb, goal) : 0;
            frontierSet.add(nbKey);
            queue.push({ r: nb.r, c: nb.c, g: newG, h, f: newG + h });
          }
        }
      }

      updateMetrics();
      draw();
      return true;
    }

    function updateMetrics() {
      if (!search) return;
      visitedEl.textContent = String(search.closed.size);
      frontierEl.textContent = String(search.frontierSet.size);
    }

    function stopAuto() {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
      runBtn.textContent = "Run";
    }

    function startAuto() {
      if (search && search.done) clearSearchState();
      if (timerId !== null) {
        stopAuto();
        return;
      }
      const delays = [140, 75, 35, 14, 2];
      const delay = delays[Number(speedInput.value) - 1] ?? 35;
      runBtn.textContent = "Pause";
      timerId = setInterval(() => {
        const cont = stepSearch();
        if (!cont) stopAuto();
      }, delay);
    }

    function draw() {
      const { ctx } = VizKit.setupCanvas(canvas, W, H);
      const colors = VizKit.getThemeColors();

      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, W, H);

      const pathSet = new Set(search ? search.path.map((p) => keyOf(p.r, p.c)) : []);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = c * CELL;
          const y = r * CELL;
          const k = keyOf(r, c);
          const cell = grid[r][c];

          if (cell === WALL) {
            ctx.fillStyle = colors.isDark ? "#353b4d" : "#3f3f46";
            ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
          } else {
            if (cell === WEIGHT) {
              ctx.fillStyle = colors.isDark ? "rgba(251, 191, 36, 0.2)" : "rgba(217, 119, 6, 0.2)";
              ctx.fillRect(x, y, CELL, CELL);
            }

            if (search && search.closed.has(k)) {
              ctx.fillStyle = colors.isDark ? "rgba(79, 134, 255, 0.25)" : "rgba(37, 99, 235, 0.2)";
              ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
            } else if (search && search.frontierSet.has(k)) {
              ctx.fillStyle = colors.isDark ? "rgba(167, 139, 250, 0.32)" : "rgba(124, 58, 237, 0.26)";
              ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
            }

            if (pathSet.has(k)) {
              ctx.fillStyle = "#f59e0b";
              ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
            }

            if (cell === WEIGHT) {
              ctx.fillStyle = colors.warning;
              ctx.font = "600 11px monospace";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText("5", x + CELL / 2, y + CELL / 2);
            }
          }

          if (search && search.currentKey === k && !search.done) {
            ctx.strokeStyle = colors.accent;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
          }

          ctx.strokeStyle = colors.grid;
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, CELL, CELL);
        }
      }

      // Draw Start and Goal badges cleanly on top
      drawMarker(ctx, start.r, start.c, colors.success, "S");
      drawMarker(ctx, goal.r, goal.c, colors.danger, "T");
    }

    function drawMarker(ctx, r, c, fill, label) {
      const x = c * CELL + CELL / 2;
      const y = r * CELL + CELL / 2;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x, y, CELL * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x, y + 0.5);
    }

    function cellFromPointer(evt) {
      const pt = VizKit.getCanvasPoint(canvas, evt, W, H);
      const c = Math.floor(pt.x / CELL);
      const r = Math.floor(pt.y / CELL);
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
      return { r, c };
    }

    function applyBrush(cell, isInitialDown) {
      if (!cell) return;
      const mode = brushSelect.value;
      if (mode === "start") {
        if (!isSame(cell, goal)) {
          grid[cell.r][cell.c] = EMPTY;
          start = cell;
          clearSearchState();
        }
        return;
      }
      if (mode === "goal") {
        if (!isSame(cell, start)) {
          grid[cell.r][cell.c] = EMPTY;
          goal = cell;
          clearSearchState();
        }
        return;
      }
      if (isSame(cell, start) || isSame(cell, goal)) return;

      const targetType = mode === "weight" ? WEIGHT : WALL;
      if (isInitialDown) {
        paintMode = grid[cell.r][cell.c] === targetType ? EMPTY : targetType;
      }
      if (grid[cell.r][cell.c] !== paintMode) {
        grid[cell.r][cell.c] = paintMode;
        clearSearchState();
      }
    }

    canvas.addEventListener("pointerdown", (e) => {
      isDrawing = true;
      applyBrush(cellFromPointer(e), true);
    });
    window.addEventListener("pointermove", (e) => {
      if (!isDrawing) return;
      applyBrush(cellFromPointer(e), false);
    });
    window.addEventListener("pointerup", () => {
      isDrawing = false;
    });

    runBtn.addEventListener("click", startAuto);
    stepBtn.addEventListener("click", () => {
      stopAuto();
      if (search && search.done) clearSearchState();
      stepSearch();
    });
    clearPathBtn.addEventListener("click", clearSearchState);
    mazeBtn.addEventListener("click", placeSampleObstacles);
    resetBtn.addEventListener("click", () => {
      stopAuto();
      makeEmptyGrid();
      clearSearchState();
    });
    algoSelect.addEventListener("change", clearSearchState);
    speedInput.addEventListener("input", () => {
      if (timerId !== null) {
        stopAuto();
        startAuto();
      }
    });

    VizKit.onThemeChange(draw);
    placeSampleObstacles();
  }

  /* ========================================================================
     2. Binary Search Tree & Animated Traversals
     ======================================================================== */
  function initBST() {
    const canvas = document.getElementById("bst-canvas");
    if (!canvas) return;

    const inputEl = document.getElementById("bst-input");
    const insertBtn = document.getElementById("bst-insert");
    const deleteBtn = document.getElementById("bst-delete");
    const randomBtn = document.getElementById("bst-random");
    const clearBtn = document.getElementById("bst-clear");
    const travBtns = document.querySelectorAll(".bst-trav-btn");

    const countEl = document.getElementById("bst-count");
    const heightEl = document.getElementById("bst-height");
    const outputEl = document.getElementById("bst-output");

    const W = 840;
    const H = 310;

    let root = null;
    let animTimer = null;
    let visitedSet = new Set();
    let activeKey = null;

    function createNode(val) {
      return { val, left: null, right: null };
    }

    function insertNode(node, val) {
      if (!node) return createNode(val);
      if (val < node.val) node.left = insertNode(node.left, val);
      else if (val > node.val) node.right = insertNode(node.right, val);
      return node;
    }

    function deleteNode(node, val) {
      if (!node) return null;
      if (val < node.val) {
        node.left = deleteNode(node.left, val);
      } else if (val > node.val) {
        node.right = deleteNode(node.right, val);
      } else {
        if (!node.left) return node.right;
        if (!node.right) return node.left;
        let succ = node.right;
        while (succ.left) succ = succ.left;
        node.val = succ.val;
        node.right = deleteNode(node.right, succ.val);
      }
      return node;
    }

    function countNodes(node) {
      return node ? 1 + countNodes(node.left) + countNodes(node.right) : 0;
    }

    function treeHeight(node) {
      return node ? 1 + Math.max(treeHeight(node.left), treeHeight(node.right)) : 0;
    }

    function stopTraversal() {
      if (animTimer !== null) {
        clearInterval(animTimer);
        animTimer = null;
      }
      visitedSet = new Set();
      activeKey = null;
    }

    function collectOrder(type) {
      const seq = [];
      function dfs(n) {
        if (!n) return;
        if (type === "preorder") seq.push(n.val);
        dfs(n.left);
        if (type === "inorder") seq.push(n.val);
        dfs(n.right);
        if (type === "postorder") seq.push(n.val);
      }
      if (type === "level") {
        if (root) {
          const q = [root];
          while (q.length) {
            const cur = q.shift();
            seq.push(cur.val);
            if (cur.left) q.push(cur.left);
            if (cur.right) q.push(cur.right);
          }
        }
      } else {
        dfs(root);
      }
      return seq;
    }

    function computePositions() {
      const coords = new Map();
      const total = countNodes(root);
      const h = Math.max(1, treeHeight(root));
      let rank = 0;

      const padX = 48;
      const padY = 42;
      const usableW = W - padX * 2;
      const levelStep = h > 1 ? Math.min(54, (H - padY * 2) / (h - 1)) : 0;

      function assign(node, depth) {
        if (!node) return;
        assign(node.left, depth + 1);
        const x = total === 1 ? W / 2 : padX + (rank / (total - 1)) * usableW;
        const y = padY + depth * levelStep;
        coords.set(node.val, { x, y, node });
        rank++;
        assign(node.right, depth + 1);
      }
      assign(root, 0);
      return coords;
    }

    function draw() {
      const { ctx } = VizKit.setupCanvas(canvas, W, H);
      const colors = VizKit.getThemeColors();

      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, W, H);

      const nCount = countNodes(root);
      const height = treeHeight(root);
      countEl.textContent = String(nCount);
      heightEl.textContent = String(height);

      if (!root) {
        ctx.fillStyle = colors.textSubtle;
        ctx.font = "500 14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Tree is empty — insert a key or click Sample Tree", W / 2, H / 2);
        return;
      }

      const coords = computePositions();

      // Draw edges first
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.borderStrong;
      for (const { x, y, node } of coords.values()) {
        if (node.left && coords.has(node.left.val)) {
          const child = coords.get(node.left.val);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(child.x, child.y);
          ctx.stroke();
        }
        if (node.right && coords.has(node.right.val)) {
          const child = coords.get(node.right.val);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(child.x, child.y);
          ctx.stroke();
        }
      }

      // Draw nodes
      const radius = nCount > 15 ? 16 : 20;
      for (const { x, y, node } of coords.values()) {
        const isActive = activeKey === node.val;
        const isVisited = visitedSet.has(node.val);

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        if (isActive) {
          ctx.fillStyle = colors.accent;
          ctx.strokeStyle = colors.accent;
        } else if (isVisited) {
          ctx.fillStyle = colors.success;
          ctx.strokeStyle = colors.success;
        } else {
          ctx.fillStyle = colors.surface;
          ctx.strokeStyle = colors.borderStrong;
        }
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = isActive || isVisited ? "#ffffff" : colors.text;
        ctx.font = "700 13px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(node.val), x, y + 0.5);
      }
    }

    function loadSampleTree() {
      stopTraversal();
      root = null;
      [50, 30, 70, 20, 40, 60, 80, 15, 25, 35, 65].forEach((v) => {
        root = insertNode(root, v);
      });
      outputEl.textContent = "—";
      draw();
    }

    insertBtn.addEventListener("click", () => {
      const val = parseInt(inputEl.value, 10);
      if (Number.isNaN(val)) return;
      if (countNodes(root) >= 21) {
        outputEl.textContent = "Limit reached (21 nodes max for clear display)";
        return;
      }
      stopTraversal();
      root = insertNode(root, VizKit.clamp(val, 1, 99));
      outputEl.textContent = `Inserted ${val}`;
      draw();
    });

    deleteBtn.addEventListener("click", () => {
      const val = parseInt(inputEl.value, 10);
      if (Number.isNaN(val)) return;
      stopTraversal();
      root = deleteNode(root, val);
      outputEl.textContent = `Deleted ${val} (if present)`;
      draw();
    });

    randomBtn.addEventListener("click", loadSampleTree);
    clearBtn.addEventListener("click", () => {
      stopTraversal();
      root = null;
      outputEl.textContent = "—";
      draw();
    });

    travBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        stopTraversal();
        const seq = collectOrder(btn.dataset.order);
        if (seq.length === 0) {
          outputEl.textContent = "(empty)";
          return;
        }
        let idx = 0;
        const shown = [];
        outputEl.textContent = "Running...";
        animTimer = setInterval(() => {
          if (idx >= seq.length) {
            clearInterval(animTimer);
            animTimer = null;
            activeKey = null;
            draw();
            return;
          }
          activeKey = seq[idx];
          visitedSet.add(activeKey);
          shown.push(activeKey);
          outputEl.textContent = `[${shown.join(", ")}]`;
          idx++;
          draw();
        }, 420);
      });
    });

    VizKit.onThemeChange(draw);
    loadSampleTree();
  }

  document.addEventListener("DOMContentLoaded", () => {
    initPathfinding();
    initBST();
  });
})();
