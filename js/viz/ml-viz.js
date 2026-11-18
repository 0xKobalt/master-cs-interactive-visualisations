/**
 * CS-520: Machine Learning Visualizations
 * 1) Gradient Descent & L2 Regularization (Linear / Quadratic)
 * 2) K-Means Clustering & Voronoi Regions
 */
(function () {
  /* ========================================================================
     1. Gradient Descent & Loss Curve Playground
     ======================================================================== */
  function initGradientDescent() {
    const plotCanvas = document.getElementById("gd-plot");
    const lossCanvas = document.getElementById("gd-loss");
    if (!plotCanvas || !lossCanvas) return;

    const degSelect = document.getElementById("gd-deg");
    const presetSelect = document.getElementById("gd-preset");
    const lrInput = document.getElementById("gd-lr");
    const l2Input = document.getElementById("gd-l2");
    const lrValEl = document.getElementById("gd-lr-val");
    const l2ValEl = document.getElementById("gd-l2-val");

    const playBtn = document.getElementById("gd-play");
    const stepBtn = document.getElementById("gd-step");
    const resetWBtn = document.getElementById("gd-reset-w");
    const clearBtn = document.getElementById("gd-clear");

    const epochEl = document.getElementById("gd-epoch");
    const mseEl = document.getElementById("gd-mse");
    const gradEl = document.getElementById("gd-grad");
    const eqEl = document.getElementById("gd-eq");

    const PW = 480;
    const PH = 320;
    const LW = 360;
    const LH = 320;
    const DOMAIN = 1.1;

    let points = [];
    let weights = [0, 0, 0]; // [w0, w1, w2]
    let stepCount = 0;
    let lossHistory = [];
    let lastGradNorm = 0;
    let diverged = false;
    let timerId = null;

    function toCanvas(x, y) {
      return {
        cx: ((x + DOMAIN) / (2 * DOMAIN)) * PW,
        cy: ((DOMAIN - y) / (2 * DOMAIN)) * PH
      };
    }

    function toDomain(cx, cy) {
      return {
        x: (cx / PW) * (2 * DOMAIN) - DOMAIN,
        y: DOMAIN - (cy / PH) * (2 * DOMAIN)
      };
    }

    function predict(x) {
      const deg = Number(degSelect.value);
      return weights[0] + weights[1] * x + (deg === 2 ? weights[2] * x * x : 0);
    }

    function computeLossAndGrad() {
      if (points.length === 0) return { loss: 0, g: [0, 0, 0], gradNorm: 0 };
      const deg = Number(degSelect.value);
      const lambda = parseFloat(l2Input.value);
      const n = points.length;

      let sse = 0;
      let g0 = 0;
      let g1 = 0;
      let g2 = 0;

      for (const p of points) {
        const err = predict(p.x) - p.y;
        sse += err * err;
        g0 += err;
        g1 += err * p.x;
        if (deg === 2) g2 += err * p.x * p.x;
      }

      const mse = sse / n;
      const regTerm = lambda * (weights[1] * weights[1] + (deg === 2 ? weights[2] * weights[2] : 0));
      const loss = mse + regTerm;

      g0 = (2 / n) * g0;
      g1 = (2 / n) * g1 + 2 * lambda * weights[1];
      g2 = deg === 2 ? (2 / n) * g2 + 2 * lambda * weights[2] : 0;

      const gradNorm = Math.sqrt(g0 * g0 + g1 * g1 + g2 * g2);
      return { loss, g: [g0, g1, g2], gradNorm };
    }

    function resetWeights() {
      stopPlay();
      weights = [0, 0, 0];
      stepCount = 0;
      diverged = false;
      const { loss, gradNorm } = computeLossAndGrad();
      lossHistory = points.length ? [loss] : [];
      lastGradNorm = gradNorm;
      draw();
    }

    function stepOnce() {
      if (points.length === 0 || diverged) return false;
      const lr = parseFloat(lrInput.value);
      const deg = Number(degSelect.value);
      const { g } = computeLossAndGrad();

      weights[0] -= lr * g[0];
      weights[1] -= lr * g[1];
      if (deg === 2) weights[2] -= lr * g[2];
      else weights[2] = 0;

      stepCount++;
      const after = computeLossAndGrad();
      lastGradNorm = after.gradNorm;

      if (!Number.isFinite(after.loss) || after.loss > 500) {
        diverged = true;
        stopPlay();
        draw();
        return false;
      }

      lossHistory.push(after.loss);
      if (lossHistory.length > 220) lossHistory.shift();
      draw();
      return true;
    }

    function stopPlay() {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
      playBtn.textContent = "Play";
    }

    function togglePlay() {
      if (timerId !== null) {
        stopPlay();
        return;
      }
      if (diverged) resetWeights();
      playBtn.textContent = "Pause";
      timerId = setInterval(() => {
        if (!stepOnce()) stopPlay();
      }, 40);
    }

    function loadPreset(name) {
      stopPlay();
      points = [];
      // Deterministic pseudo-noise so presets are repeatable
      const jitter = (i) => Math.sin(i * 12.9898) * 0.08;
      if (name === "linear") {
        degSelect.value = "1";
        for (let i = 0; i < 16; i++) {
          const x = -0.88 + (i / 15) * 1.76;
          const y = 0.65 * x - 0.1 + jitter(i);
          points.push({ x, y: VizKit.clamp(y, -1, 1) });
        }
      } else if (name === "outliers") {
        degSelect.value = "1";
        for (let i = 0; i < 14; i++) {
          const x = -0.85 + (i / 13) * 1.7;
          const y = 0.45 * x - 0.15 + jitter(i) * 0.7;
          points.push({ x, y });
        }
        points.push({ x: 0.7, y: -0.85 }, { x: 0.85, y: -0.75 });
      } else {
        degSelect.value = "2";
        for (let i = 0; i < 18; i++) {
          const x = -0.9 + (i / 17) * 1.8;
          const y = 0.85 * x * x - 0.25 * x - 0.35 + jitter(i);
          points.push({ x, y: VizKit.clamp(y, -1, 1) });
        }
      }
      resetWeights();
    }

    function drawPlot() {
      const { ctx } = VizKit.setupCanvas(plotCanvas, PW, PH);
      const colors = VizKit.getThemeColors();

      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, PW, PH);

      // Subtle grid lines
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      for (let v = -1; v <= 1; v += 0.5) {
        const p1 = toCanvas(v, -DOMAIN);
        const p2 = toCanvas(v, DOMAIN);
        ctx.beginPath();
        ctx.moveTo(p1.cx, p1.cy);
        ctx.lineTo(p2.cx, p2.cy);
        ctx.stroke();

        const h1 = toCanvas(-DOMAIN, v);
        const h2 = toCanvas(DOMAIN, v);
        ctx.beginPath();
        ctx.moveTo(h1.cx, h1.cy);
        ctx.lineTo(h2.cx, h2.cy);
        ctx.stroke();
      }

      // Origin axes
      ctx.strokeStyle = colors.borderStrong;
      ctx.lineWidth = 1.25;
      const origin = toCanvas(0, 0);
      ctx.beginPath();
      ctx.moveTo(origin.cx, 0);
      ctx.lineTo(origin.cx, PH);
      ctx.moveTo(0, origin.cy);
      ctx.lineTo(PW, origin.cy);
      ctx.stroke();

      // Residual lines
      if (points.length > 0 && !diverged) {
        ctx.strokeStyle = colors.isDark ? "rgba(248, 113, 113, 0.38)" : "rgba(220, 38, 38, 0.28)";
        ctx.lineWidth = 1.2;
        for (const p of points) {
          const pt = toCanvas(p.x, p.y);
          const pred = toCanvas(p.x, predict(p.x));
          ctx.beginPath();
          ctx.moveTo(pt.cx, pt.cy);
          ctx.lineTo(pred.cx, pred.cy);
          ctx.stroke();
        }
      }

      // Fitted curve
      if (!diverged) {
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        for (let px = 0; px <= PW; px += 3) {
          const x = toDomain(px, 0).x;
          const y = predict(x);
          const pt = toCanvas(x, y);
          if (px === 0) ctx.moveTo(pt.cx, pt.cy);
          else ctx.lineTo(pt.cx, pt.cy);
        }
        ctx.stroke();
      }

      // Data points
      for (const p of points) {
        const pt = toCanvas(p.x, p.y);
        ctx.fillStyle = colors.purple;
        ctx.beginPath();
        ctx.arc(pt.cx, pt.cy, 4.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colors.surface;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = colors.textSubtle;
      ctx.font = "600 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Data Space (click to add points)", 10, 18);
    }

    function drawLoss() {
      const { ctx } = VizKit.setupCanvas(lossCanvas, LW, LH);
      const colors = VizKit.getThemeColors();

      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, LW, LH);

      const padL = 44;
      const padR = 16;
      const padT = 28;
      const padB = 28;
      const plotW = LW - padL - padR;
      const plotH = LH - padT - padB;

      ctx.fillStyle = colors.textSubtle;
      ctx.font = "600 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Loss Curve (MSE + L2)", padL, 18);

      // Axes
      ctx.strokeStyle = colors.borderStrong;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(padL, padT);
      ctx.lineTo(padL, padT + plotH);
      ctx.lineTo(padL + plotW, padT + plotH);
      ctx.stroke();

      if (lossHistory.length === 0) return;

      const maxLoss = Math.max(0.25, ...lossHistory);
      ctx.fillStyle = colors.textSubtle;
      ctx.font = "500 10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(maxLoss.toFixed(2), padL - 5, padT + 6);
      ctx.fillText("0.00", padL - 5, padT + plotH);

      ctx.strokeStyle = diverged ? colors.danger : colors.success;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      lossHistory.forEach((val, idx) => {
        const x = padL + (lossHistory.length === 1 ? 0 : (idx / (lossHistory.length - 1)) * plotW);
        const y = padT + plotH - VizKit.clamp(val / maxLoss, 0, 1) * plotH;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      if (diverged) {
        ctx.fillStyle = colors.danger;
        ctx.font = "700 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Diverged! Lower η and reset.", padL + plotW / 2, padT + plotH / 2);
      }
    }

    function draw() {
      lrValEl.textContent = parseFloat(lrInput.value).toFixed(2);
      l2ValEl.textContent = parseFloat(l2Input.value).toFixed(2);

      const deg = Number(degSelect.value);
      const stats = computeLossAndGrad();
      epochEl.textContent = String(stepCount);
      mseEl.textContent = diverged ? "∞ (diverged)" : points.length ? stats.loss.toFixed(4) : "—";
      gradEl.textContent = diverged ? "∞" : points.length ? lastGradNorm.toFixed(4) : "—";

      const w0 = weights[0].toFixed(2);
      const w1 = weights[1].toFixed(2);
      const w2 = weights[2].toFixed(2);
      eqEl.textContent =
        deg === 2 ? `ŷ = ${w0} + ${w1}x + ${w2}x²` : `ŷ = ${w0} + ${w1}x`;

      drawPlot();
      drawLoss();
    }

    plotCanvas.addEventListener("pointerdown", (e) => {
      const pt = VizKit.getCanvasPoint(plotCanvas, e, PW, PH);
      const d = toDomain(pt.x, pt.y);
      points.push({ x: VizKit.clamp(d.x, -1, 1), y: VizKit.clamp(d.y, -1, 1) });
      if (lossHistory.length === 0) {
        lossHistory = [computeLossAndGrad().loss];
      }
      draw();
    });

    lrInput.addEventListener("input", draw);
    l2Input.addEventListener("input", draw);
    degSelect.addEventListener("change", resetWeights);
    presetSelect.addEventListener("change", () => loadPreset(presetSelect.value));
    playBtn.addEventListener("click", togglePlay);
    stepBtn.addEventListener("click", () => {
      stopPlay();
      stepOnce();
    });
    resetWBtn.addEventListener("click", resetWeights);
    clearBtn.addEventListener("click", () => {
      stopPlay();
      points = [];
      resetWeights();
    });

    VizKit.onThemeChange(draw);
    loadPreset("quadratic");
  }

  /* ========================================================================
     2. K-Means Clustering & Voronoi Sandbox
     ======================================================================== */
  function initKMeans() {
    const canvas = document.getElementById("km-canvas");
    if (!canvas) return;

    const kSelect = document.getElementById("km-k");
    const presetSelect = document.getElementById("km-preset");
    const initBtn = document.getElementById("km-init");
    const stepBtn = document.getElementById("km-step");
    const runBtn = document.getElementById("km-run");
    const clearBtn = document.getElementById("km-clear");

    const iterEl = document.getElementById("km-iter");
    const phaseEl = document.getElementById("km-phase");
    const sseEl = document.getElementById("km-sse");
    const countEl = document.getElementById("km-count");

    const W = 840;
    const H = 360;
    const PAD = 24;
    const PALETTE = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed"];

    let points = []; // { x, y, cluster }
    let centroids = []; // { x, y, trail: [{x,y}] }
    let nextPhase = "assign"; // "assign" | "update" | "converged"
    let iteration = 0;
    let runTimer = null;

    function toCanvas(x, y) {
      return {
        cx: PAD + x * (W - PAD * 2),
        cy: PAD + y * (H - PAD * 2)
      };
    }

    function toNorm(cx, cy) {
      return {
        x: VizKit.clamp((cx - PAD) / (W - PAD * 2), 0.02, 0.98),
        y: VizKit.clamp((cy - PAD) / (H - PAD * 2), 0.02, 0.98)
      };
    }

    function dist2(a, b) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return dx * dx + dy * dy;
    }

    function computeSSE() {
      if (centroids.length === 0 || points.some((p) => p.cluster === -1)) return null;
      return points.reduce((sum, p) => sum + dist2(p, centroids[p.cluster]), 0);
    }

    function initCentroids() {
      stopAuto();
      const k = Number(kSelect.value);
      centroids = [];
      points.forEach((p) => {
        p.cluster = -1;
      });
      iteration = 0;
      nextPhase = "assign";

      if (points.length >= k) {
        const chosen = new Set();
        while (chosen.size < k) {
          chosen.add(Math.floor(Math.random() * points.length));
        }
        for (const idx of chosen) {
          const p = points[idx];
          centroids.push({ x: p.x, y: p.y, trail: [{ x: p.x, y: p.y }] });
        }
      } else {
        for (let i = 0; i < k; i++) {
          const x = 0.15 + Math.random() * 0.7;
          const y = 0.15 + Math.random() * 0.7;
          centroids.push({ x, y, trail: [{ x, y }] });
        }
      }
      draw();
    }

    function stepAssign() {
      if (centroids.length === 0 || points.length === 0) return false;
      let changed = false;
      for (const p of points) {
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < centroids.length; i++) {
          const d = dist2(p, centroids[i]);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }
        if (p.cluster !== bestIdx) {
          p.cluster = bestIdx;
          changed = true;
        }
      }
      nextPhase = changed ? "update" : "converged";
      draw();
      return changed;
    }

    function stepUpdate() {
      if (centroids.length === 0 || points.length === 0) return false;
      let moved = false;
      for (let i = 0; i < centroids.length; i++) {
        const members = points.filter((p) => p.cluster === i);
        if (members.length === 0) continue;
        const mx = members.reduce((s, p) => s + p.x, 0) / members.length;
        const my = members.reduce((s, p) => s + p.y, 0) / members.length;
        if (Math.hypot(mx - centroids[i].x, my - centroids[i].y) > 1e-4) {
          moved = true;
        }
        centroids[i].x = mx;
        centroids[i].y = my;
        centroids[i].trail.push({ x: mx, y: my });
      }
      iteration++;
      nextPhase = moved ? "assign" : "converged";
      draw();
      return moved;
    }

    function nextHalfStep() {
      if (centroids.length === 0) initCentroids();
      if (nextPhase === "converged") return false;
      if (nextPhase === "assign") {
        stepAssign();
        return nextPhase !== "converged";
      }
      stepUpdate();
      return nextPhase !== "converged";
    }

    function stopAuto() {
      if (runTimer !== null) {
        clearInterval(runTimer);
        runTimer = null;
      }
      runBtn.textContent = "Auto Converge";
    }

    function toggleAuto() {
      if (runTimer !== null) {
        stopAuto();
        return;
      }
      if (nextPhase === "converged") initCentroids();
      runBtn.textContent = "Pause";
      runTimer = setInterval(() => {
        const cont = nextHalfStep();
        if (!cont) stopAuto();
      }, 360);
    }

    function seededRandom(seed) {
      let s = seed;
      return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
      };
    }

    function loadPreset(name) {
      stopAuto();
      const rand = seededRandom(42);
      points = [];
      if (name === "blobs") {
        const centers = [
          { x: 0.23, y: 0.32 },
          { x: 0.52, y: 0.72 },
          { x: 0.78, y: 0.3 }
        ];
        for (const c of centers) {
          for (let i = 0; i < 20; i++) {
            const angle = rand() * Math.PI * 2;
            const r = (rand() + rand()) * 0.08;
            points.push({
              x: VizKit.clamp(c.x + Math.cos(angle) * r, 0.04, 0.96),
              y: VizKit.clamp(c.y + Math.sin(angle) * r * 1.3, 0.04, 0.96),
              cluster: -1
            });
          }
        }
      } else if (name === "bands") {
        const centers = [
          { x: 0.2, y: 0.25 },
          { x: 0.22, y: 0.76 },
          { x: 0.78, y: 0.25 },
          { x: 0.8, y: 0.76 }
        ];
        for (const c of centers) {
          for (let i = 0; i < 15; i++) {
            points.push({
              x: VizKit.clamp(c.x + (rand() - 0.5) * 0.18, 0.04, 0.96),
              y: VizKit.clamp(c.y + (rand() - 0.5) * 0.18, 0.04, 0.96),
              cluster: -1
            });
          }
        }
      } else {
        for (let i = 0; i < 65; i++) {
          points.push({
            x: 0.05 + rand() * 0.9,
            y: 0.05 + rand() * 0.9,
            cluster: -1
          });
        }
      }
      initCentroids();
    }

    function draw() {
      const { ctx } = VizKit.setupCanvas(canvas, W, H);
      const colors = VizKit.getThemeColors();

      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, W, H);

      // Subtle Voronoi background shading
      if (centroids.length > 0) {
        const step = 12;
        for (let cy = 0; cy < H; cy += step) {
          for (let cx = 0; cx < W; cx += step) {
            const norm = toNorm(cx + step / 2, cy + step / 2);
            let best = 0;
            let bestD = Infinity;
            for (let i = 0; i < centroids.length; i++) {
              const d = dist2(norm, centroids[i]);
              if (d < bestD) {
                bestD = d;
                best = i;
              }
            }
            ctx.fillStyle = PALETTE[best % PALETTE.length];
            ctx.globalAlpha = colors.isDark ? 0.09 : 0.065;
            ctx.fillRect(cx, cy, step, step);
          }
        }
        ctx.globalAlpha = 1;
      }

      // Assignment tethers
      ctx.lineWidth = 1;
      for (const p of points) {
        if (p.cluster < 0 || !centroids[p.cluster]) continue;
        const a = toCanvas(p.x, p.y);
        const b = toCanvas(centroids[p.cluster].x, centroids[p.cluster].y);
        ctx.strokeStyle = PALETTE[p.cluster % PALETTE.length];
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.moveTo(a.cx, a.cy);
        ctx.lineTo(b.cx, b.cy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Data points
      for (const p of points) {
        const pt = toCanvas(p.x, p.y);
        ctx.fillStyle = p.cluster >= 0 ? PALETTE[p.cluster % PALETTE.length] : colors.textMuted;
        ctx.beginPath();
        ctx.arc(pt.cx, pt.cy, 4.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colors.surface;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Centroid trails & markers
      centroids.forEach((c, idx) => {
        const color = PALETTE[idx % PALETTE.length];
        if (c.trail.length > 1) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.8;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          c.trail.forEach((t, ti) => {
            const p = toCanvas(t.x, t.y);
            if (ti === 0) ctx.moveTo(p.cx, p.cy);
            else ctx.lineTo(p.cx, p.cy);
          });
          ctx.stroke();
          ctx.setLineDash([]);
        }

        const pt = toCanvas(c.x, c.y);
        ctx.fillStyle = color;
        ctx.strokeStyle = colors.surface;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.rect(pt.cx - 8, pt.cy - 8, 16, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "700 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`C${idx + 1}`, pt.cx, pt.cy + 0.5);
      });

      iterEl.textContent = String(iteration);
      countEl.textContent = String(points.length);
      const phaseLabel =
        nextPhase === "assign" ? "Assign Points" : nextPhase === "update" ? "Update Centroids" : "Converged";
      phaseEl.textContent = phaseLabel;
      const sse = computeSSE();
      sseEl.textContent = sse !== null ? sse.toFixed(4) : "—";
    }

    canvas.addEventListener("pointerdown", (e) => {
      stopAuto();
      const pt = VizKit.getCanvasPoint(canvas, e, W, H);
      const norm = toNorm(pt.x, pt.y);
      points.push({ x: norm.x, y: norm.y, cluster: -1 });
      if (centroids.length > 0 && nextPhase === "converged") {
        nextPhase = "assign";
      }
      draw();
    });

    kSelect.addEventListener("change", initCentroids);
    presetSelect.addEventListener("change", () => loadPreset(presetSelect.value));
    initBtn.addEventListener("click", initCentroids);
    stepBtn.addEventListener("click", () => {
      stopAuto();
      nextHalfStep();
    });
    runBtn.addEventListener("click", toggleAuto);
    clearBtn.addEventListener("click", () => {
      stopAuto();
      points = [];
      centroids = [];
      iteration = 0;
      nextPhase = "assign";
      draw();
    });

    VizKit.onThemeChange(draw);
    loadPreset("blobs");
  }

  document.addEventListener("DOMContentLoaded", () => {
    initGradientDescent();
    initKMeans();
  });
})();
