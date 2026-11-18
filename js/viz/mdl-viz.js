/**
 * DSAIT 4005 Machine and Deep Learning — Lecture 1a (week1a_introduction.pdf)
 * 1) Bayes' Rule: Class Conditionals + Priors -> Evidence & Posteriors
 * 2) Classification Error & Irreducible Bayes' Error (ε*)
 * 3) Misclassification Costs (λ_ji) & Minimum Total Risk
 */
(function () {
  const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);

  function gaussianPdf(x, mu, sigma) {
    const z = (x - mu) / sigma;
    return (INV_SQRT_2PI / sigma) * Math.exp(-0.5 * z * z);
  }

  function fracHtml(num, den) {
    return `<span class="frac"><span class="frac-num">${num}</span><span class="frac-den">${den}</span></span>`;
  }

  function findCrossings(xMin, xMax, steps, diffFn) {
    const xs = [];
    const dx = (xMax - xMin) / steps;
    let prevX = xMin;
    let prevD = diffFn(prevX);
    for (let i = 1; i <= steps; i++) {
      const curX = xMin + i * dx;
      const curD = diffFn(curX);
      if ((prevD <= 0 && curD > 0) || (prevD >= 0 && curD < 0)) {
        const frac = Math.abs(prevD) / (Math.abs(prevD) + Math.abs(curD) || 1);
        xs.push(prevX + frac * dx);
      }
      prevX = curX;
      prevD = curD;
    }
    return xs;
  }

  /* ========================================================================
     1. Bayes' Rule & Posteriors (Slides 30-39, 53)
     ======================================================================== */
  function initBayesRule() {
    const jointCanvas = document.getElementById("mdl-b-joint-canvas");
    const postCanvas = document.getElementById("mdl-b-post-canvas");
    if (!jointCanvas || !postCanvas) return;

    const p1Input = document.getElementById("mdl-b-prior1");
    const mu1Input = document.getElementById("mdl-b-mu1");
    const mu2Input = document.getElementById("mdl-b-mu2");
    const sig1Input = document.getElementById("mdl-b-sig1");
    const sig2Input = document.getElementById("mdl-b-sig2");

    const p1Val = document.getElementById("mdl-b-prior1-val");
    const mu1Val = document.getElementById("mdl-b-mu1-val");
    const mu2Val = document.getElementById("mdl-b-mu2-val");
    const sig1Val = document.getElementById("mdl-b-sig1-val");
    const sig2Val = document.getElementById("mdl-b-sig2-val");

    const doubleP1Btn = document.getElementById("mdl-b-double-p1");
    const resetBtn = document.getElementById("mdl-b-reset");

    const probeXEl = document.getElementById("mdl-b-x");
    const j1El = document.getElementById("mdl-b-j1");
    const j2El = document.getElementById("mdl-b-j2");
    const post1El = document.getElementById("mdl-b-post1");
    const post2El = document.getElementById("mdl-b-post2");
    const decEl = document.getElementById("mdl-b-dec");

    const fCondEl = document.getElementById("mdl-b-f-cond");
    const fTotalEl = document.getElementById("mdl-b-f-total");
    const fBayesEl = document.getElementById("mdl-b-f-bayes");
    const fWinnerEl = document.getElementById("mdl-b-f-winner");
    const eq1El = document.getElementById("mdl-b-eq-1");
    const eq2El = document.getElementById("mdl-b-eq-2");
    const eq3El = document.getElementById("mdl-b-eq-3");
    const eq4El = document.getElementById("mdl-b-eq-4");

    const W = 480;
    const H = 195;
    const X_MIN = -3.0;
    const X_MAX = 6.0;
    const PAD = { l: 42, r: 14, t: 24, b: 28 };
    let probeX = 1.2;
    let focusStep = null; // null | "cond" | "total" | "bayes"

    function getParams() {
      const p1 = parseFloat(p1Input.value);
      return {
        p1,
        p2: 1 - p1,
        mu1: parseFloat(mu1Input.value),
        mu2: parseFloat(mu2Input.value),
        sig1: parseFloat(sig1Input.value),
        sig2: parseFloat(sig2Input.value)
      };
    }

    function evalAt(x, prm) {
      const c1 = gaussianPdf(x, prm.mu1, prm.sig1);
      const c2 = gaussianPdf(x, prm.mu2, prm.sig2);
      const j1 = c1 * prm.p1;
      const j2 = c2 * prm.p2;
      const px = j1 + j2;
      const post1 = px > 1e-300 ? j1 / px : 0.5;
      const post2 = 1 - post1;
      return { c1, c2, j1, j2, px, post1, post2 };
    }

    function toCanvasX(x) {
      return PAD.l + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - PAD.l - PAD.r);
    }

    function toCanvasY(val, maxVal) {
      const plotH = H - PAD.t - PAD.b;
      return PAD.t + plotH - (val / maxVal) * plotH;
    }

    function drawAxes(ctx, colors, title, maxY, yTicks) {
      const plotW = W - PAD.l - PAD.r;
      const plotH = H - PAD.t - PAD.b;

      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = colors.textSubtle;
      ctx.font = "600 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(title, PAD.l, 17);

      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      for (const yt of yTicks) {
        const py = toCanvasY(yt, maxY);
        ctx.beginPath();
        ctx.moveTo(PAD.l, py);
        ctx.lineTo(PAD.l + plotW, py);
        ctx.stroke();

        ctx.fillStyle = colors.textSubtle;
        ctx.font = "500 10px monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(yt.toFixed(yt === 0 || yt === 1 ? 0 : 1), PAD.l - 6, py);
      }

      for (let x = -2; x <= 6; x += 2) {
        const px = toCanvasX(x);
        ctx.fillStyle = colors.textSubtle;
        ctx.font = "500 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(String(x), px, PAD.t + plotH + 13);
      }

      ctx.strokeStyle = colors.borderStrong;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(PAD.l, PAD.t);
      ctx.lineTo(PAD.l, PAD.t + plotH);
      ctx.lineTo(PAD.l + plotW, PAD.t + plotH);
      ctx.stroke();
    }

    function drawCurve(ctx, maxY, color, width, dashed, fn) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (dashed) ctx.setLineDash([5, 4]);
      ctx.beginPath();
      const samples = 240;
      for (let i = 0; i <= samples; i++) {
        const x = X_MIN + (i / samples) * (X_MAX - X_MIN);
        const px = toCanvasX(x);
        const py = toCanvasY(fn(x), maxY);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    function draw() {
      const colors = VizKit.getThemeColors();
      const prm = getParams();

      p1Val.textContent = prm.p1.toFixed(2);
      mu1Val.textContent = prm.mu1.toFixed(1);
      mu2Val.textContent = prm.mu2.toFixed(1);
      sig1Val.textContent = prm.sig1.toFixed(2);
      sig2Val.textContent = prm.sig2.toFixed(2);

      const boundaries = findCrossings(X_MIN, X_MAX, 500, (x) => {
        const e = evalAt(x, prm);
        return e.j1 - e.j2;
      });

      // Left Canvas: Class Conditionals & Prior-Scaled Joint Curves
      const maxJointY = 0.85;
      const { ctx: jctx } = VizKit.setupCanvas(jointCanvas, W, H);
      drawAxes(jctx, colors, "Class Conditionals & Priors: p(x|yᵢ)p(yᵢ)", maxJointY, [0, 0.2, 0.4, 0.6, 0.8]);

      const condW = focusStep === "cond" ? 2.8 : 1.4;
      const totalW = focusStep === "total" ? 2.8 : 1.4;
      const jointAlpha = focusStep === "cond" || focusStep === "total" ? 0.45 : 1.0;

      drawCurve(jctx, maxJointY, colors.accent, condW, true, (x) => evalAt(x, prm).c1);
      drawCurve(jctx, maxJointY, colors.danger, condW, true, (x) => evalAt(x, prm).c2);
      drawCurve(
        jctx,
        maxJointY,
        focusStep === "total" ? colors.purple : colors.textSubtle,
        totalW,
        focusStep !== "total",
        (x) => evalAt(x, prm).px
      );
      jctx.save();
      jctx.globalAlpha = jointAlpha;
      drawCurve(jctx, maxJointY, colors.accent, 2.5, false, (x) => evalAt(x, prm).j1);
      drawCurve(jctx, maxJointY, colors.danger, 2.5, false, (x) => evalAt(x, prm).j2);
      jctx.restore();

      // Right Canvas: Class Posteriors + Decision Regions Ω1 / Ω2
      const { ctx: pctx } = VizKit.setupCanvas(postCanvas, W, H);
      drawAxes(pctx, colors, "Posterior Probabilities: p(yᵢ|x) = p(x|yᵢ)p(yᵢ) / p(x)", 1.05, [0, 0.5, 1.0]);

      // Region bar along bottom (Slide 35)
      const plotH = H - PAD.t - PAD.b;
      const regionY = PAD.t + plotH + 2;
      const samples = 180;
      for (let i = 0; i < samples; i++) {
        const xA = X_MIN + (i / samples) * (X_MAX - X_MIN);
        const xB = X_MIN + ((i + 1) / samples) * (X_MAX - X_MIN);
        const mid = evalAt((xA + xB) / 2, prm);
        pctx.fillStyle = mid.post1 >= mid.post2
          ? (colors.isDark ? "rgba(79,134,255,0.45)" : "rgba(37,99,235,0.35)")
          : (colors.isDark ? "rgba(248,113,113,0.45)" : "rgba(220,38,38,0.35)");
        pctx.fillRect(toCanvasX(xA), regionY, toCanvasX(xB) - toCanvasX(xA) + 0.5, 9);
      }

      const postW = focusStep === "bayes" ? 3.4 : 2.5;
      drawCurve(pctx, 1.05, colors.accent, postW, false, (x) => evalAt(x, prm).post1);
      drawCurve(pctx, 1.05, colors.danger, postW, false, (x) => evalAt(x, prm).post2);

      // Draw Green Decision Boundary Lines on both plots
      for (const bx of boundaries) {
        const px = toCanvasX(bx);
        [jctx, pctx].forEach((c) => {
          c.save();
          c.strokeStyle = colors.success;
          c.lineWidth = 2.2;
          c.beginPath();
          c.moveTo(px, PAD.t);
          c.lineTo(px, PAD.t + plotH);
          c.stroke();
          c.restore();
        });
      }

      // Draw Probe X marker on both plots
      const probe = evalAt(probeX, prm);
      const probePx = toCanvasX(probeX);
      [
        { ctx: jctx, maxY: maxJointY, y1: probe.j1, y2: probe.j2 },
        { ctx: pctx, maxY: 1.05, y1: probe.post1, y2: probe.post2 }
      ].forEach(({ ctx, maxY, y1, y2 }) => {
        ctx.save();
        ctx.strokeStyle = colors.textMuted;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(probePx, PAD.t);
        ctx.lineTo(probePx, PAD.t + plotH);
        ctx.stroke();
        ctx.restore();

        [
          { y: y1, col: colors.accent },
          { y: y2, col: colors.danger }
        ].forEach((pt) => {
          ctx.fillStyle = pt.col;
          ctx.beginPath();
          ctx.arc(probePx, toCanvasY(pt.y, maxY), 4.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = colors.surface;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        });
      });

      if (focusStep === "total") {
        jctx.fillStyle = colors.purple;
        jctx.beginPath();
        jctx.arc(probePx, toCanvasY(probe.px, maxJointY), 4.5, 0, Math.PI * 2);
        jctx.fill();
      }

      probeXEl.textContent = probeX.toFixed(2);
      j1El.textContent = probe.j1.toFixed(4);
      j2El.textContent = probe.j2.toFixed(4);
      post1El.textContent = `${(probe.post1 * 100).toFixed(1)}%`;
      post2El.textContent = `${(probe.post2 * 100).toFixed(1)}%`;
      decEl.textContent = probe.post1 >= probe.post2 ? "Class y₁ (Ω₁)" : "Class y₂ (Ω₂)";

      // Live mathematical formulas with values directly substituted in place
      const xStr = probeX.toFixed(2);
      const mu1Str = prm.mu1 < 0 ? `(${prm.mu1.toFixed(1)})` : prm.mu1.toFixed(1);
      const mu2Str = prm.mu2 < 0 ? `(${prm.mu2.toFixed(1)})` : prm.mu2.toFixed(1);

      fCondEl.innerHTML =
        `<span style="display:flex;flex-wrap:wrap;align-items:center;gap:0.25rem;width:100%;">` +
        `<span class="term-c1"><i>p</i>(${xStr}|<i>y</i><sub>1</sub>)</span> = ` +
        fracHtml("1", `${prm.sig1.toFixed(2)}√(2π)`) +
        `exp(−` +
        fracHtml(`(${xStr} − ${mu1Str})<sup>2</sup>`, `2·${prm.sig1.toFixed(2)}<sup>2</sup>`) +
        `) = <span class="formula-result term-c1">${probe.c1.toFixed(4)}</span>` +
        `</span>` +
        `<span style="display:flex;flex-wrap:wrap;align-items:center;gap:0.25rem;width:100%;margin-top:0.2rem;">` +
        `<span class="term-c2"><i>p</i>(${xStr}|<i>y</i><sub>2</sub>)</span> = ` +
        fracHtml("1", `${prm.sig2.toFixed(2)}√(2π)`) +
        `exp(−` +
        fracHtml(`(${xStr} − ${mu2Str})<sup>2</sup>`, `2·${prm.sig2.toFixed(2)}<sup>2</sup>`) +
        `) = <span class="formula-result term-c2">${probe.c2.toFixed(4)}</span>` +
        `</span>`;

      fTotalEl.innerHTML =
        `<span><i>p</i>(${xStr}) = ` +
        `<span class="term-c1"><i>p</i>(<i>x</i>|<i>y</i><sub>1</sub>)<i>p</i>(<i>y</i><sub>1</sub>)</span> + ` +
        `<span class="term-c2"><i>p</i>(<i>x</i>|<i>y</i><sub>2</sub>)<i>p</i>(<i>y</i><sub>2</sub>)</span> = ` +
        `<span class="term-c1">(${probe.c1.toFixed(4)})(${prm.p1.toFixed(2)})</span> + ` +
        `<span class="term-c2">(${probe.c2.toFixed(4)})(${prm.p2.toFixed(2)})</span> = ` +
        `<span class="term-c1">${probe.j1.toFixed(4)}</span> + ` +
        `<span class="term-c2">${probe.j2.toFixed(4)}</span> = ` +
        `<span class="formula-result term-purple">${probe.px.toFixed(4)}</span></span>`;

      fBayesEl.innerHTML =
        `<span style="display:flex;flex-wrap:wrap;align-items:center;gap:0.35rem;width:100%;">` +
        `<span class="term-c1"><i>p</i>(<i>y</i><sub>1</sub>|${xStr})</span> = ` +
        fracHtml(`<span class="term-c1"><i>p</i>(<i>x</i>|<i>y</i><sub>1</sub>)<i>p</i>(<i>y</i><sub>1</sub>)</span>`, `<span class="term-purple"><i>p</i>(<i>x</i>)</span>`) +
        ` = ` +
        fracHtml(`<span class="term-c1">${probe.j1.toFixed(4)}</span>`, `<span class="term-purple">${probe.px.toFixed(4)}</span>`) +
        ` = <span class="formula-result term-c1">${probe.post1.toFixed(3)}</span>` +
        `<span style="margin:0 0.5rem;color:var(--border-strong);">|</span>` +
        `<span class="term-c2"><i>p</i>(<i>y</i><sub>2</sub>|${xStr})</span> = ` +
        fracHtml(`<span class="term-c2">${probe.j2.toFixed(4)}</span>`, `<span class="term-purple">${probe.px.toFixed(4)}</span>`) +
        ` = <span class="formula-result term-c2">${probe.post2.toFixed(3)}</span>` +
        `</span>`;

      const choose1 = probe.post1 >= probe.post2;
      fWinnerEl.textContent = choose1 ? "True → Classify as y₁ (Ω₁)" : "False → Classify as y₂ (Ω₂)";

      const p1Fmt = `<span class="term-c1">${probe.post1.toFixed(3)}</span>`;
      const p2Fmt = `<span class="term-c2">${probe.post2.toFixed(3)}</span>`;
      eq1El.innerHTML =
        `<span class="term-c1"><i>p</i>(<i>y</i><sub>1</sub>|<i>x</i>)</span> &gt; <span class="term-c2"><i>p</i>(<i>y</i><sub>2</sub>|<i>x</i>)</span>` +
        ` &nbsp;⇒&nbsp; ${p1Fmt} &gt; ${p2Fmt}`;

      const diff = probe.post1 - probe.post2;
      eq2El.innerHTML =
        `<span class="term-c1"><i>p</i>(<i>y</i><sub>1</sub>|<i>x</i>)</span> − <span class="term-c2"><i>p</i>(<i>y</i><sub>2</sub>|<i>x</i>)</span> = ` +
        `<span class="formula-result">${diff >= 0 ? "+" : ""}${diff.toFixed(3)}</span> &gt; 0`;

      if (probe.post2 > 1e-6 && probe.post1 > 1e-6) {
        const ratio = probe.post1 / probe.post2;
        const logDiff = Math.log(probe.post1) - Math.log(probe.post2);
        eq3El.innerHTML =
          fracHtml(p1Fmt, p2Fmt) + ` = <span class="formula-result">${ratio.toFixed(2)}</span> &gt; 1`;
        eq4El.innerHTML =
          `log(${p1Fmt}) − log(${p2Fmt}) = <span class="formula-result">${logDiff >= 0 ? "+" : ""}${logDiff.toFixed(2)}</span> &gt; 0`;
      } else {
        eq3El.innerHTML =
          fracHtml(p1Fmt, p2Fmt) + ` = <span class="formula-result">${choose1 ? "≫ 1" : "≪ 1"}</span>`;
        eq4El.innerHTML =
          `log(${p1Fmt}) − log(${p2Fmt}) = <span class="formula-result">${choose1 ? "≫ 0" : "≪ 0"}</span>`;
      }
    }

    function handleProbe(canvas, evt) {
      const pt = VizKit.getCanvasPoint(canvas, evt, W, H);
      const frac = (pt.x - PAD.l) / (W - PAD.l - PAD.r);
      probeX = VizKit.clamp(X_MIN + frac * (X_MAX - X_MIN), X_MIN, X_MAX);
      draw();
    }

    [jointCanvas, postCanvas].forEach((cvs) => {
      cvs.addEventListener("pointermove", (e) => handleProbe(cvs, e));
      cvs.addEventListener("pointerdown", (e) => handleProbe(cvs, e));
    });

    [p1Input, mu1Input, mu2Input, sig1Input, sig2Input].forEach((el) => {
      el.addEventListener("input", draw);
    });

    doubleP1Btn.addEventListener("click", () => {
      p1Input.value = "0.67";
      draw();
    });

    resetBtn.addEventListener("click", () => {
      p1Input.value = "0.50";
      mu1Input.value = "-0.3";
      mu2Input.value = "2.8";
      sig1Input.value = "1.05";
      sig2Input.value = "1.15";
      probeX = 1.2;
      draw();
    });

    document.querySelectorAll(".formula-card").forEach((card) => {
      const target = card.dataset && card.dataset.bFocus;
      if (!target) return;
      card.addEventListener("pointerenter", () => {
        focusStep = target;
        draw();
      });
      card.addEventListener("pointerleave", () => {
        focusStep = null;
        draw();
      });
    });

    VizKit.onThemeChange(draw);
    draw();
  }

  /* ========================================================================
     2. Classification Error & Bayes' Error (Slides 40-44)
     ======================================================================== */
  function initBayesError() {
    const distCanvas = document.getElementById("mdl-e-dist-canvas");
    const curveCanvas = document.getElementById("mdl-e-curve-canvas");
    if (!distCanvas || !curveCanvas) return;

    const threshInput = document.getElementById("mdl-e-thresh");
    const sepInput = document.getElementById("mdl-e-sep");
    const p1Input = document.getElementById("mdl-e-prior1");
    const threshVal = document.getElementById("mdl-e-thresh-val");
    const sepVal = document.getElementById("mdl-e-sep-val");
    const p1Val = document.getElementById("mdl-e-prior1-val");
    const snapBtn = document.getElementById("mdl-e-snap");

    const curErrEl = document.getElementById("mdl-e-cur");
    const bayesErrEl = document.getElementById("mdl-e-bayes");
    const excessErrEl = document.getElementById("mdl-e-excess");
    const splitEl = document.getElementById("mdl-e-split");
    const fErrEl = document.getElementById("mdl-e-f-err");
    const fOptEl = document.getElementById("mdl-e-f-opt");

    const W = 480;
    const H = 195;
    const X_MIN = -3.0;
    const X_MAX = 6.0;
    const INT_MIN = -6.0;
    const INT_MAX = 10.0;
    const PAD = { l: 44, r: 14, t: 24, b: 28 };
    let dragging = false;
    let errFocus = null; // null | "error-split" | "bayes-opt"

    function getParams() {
      const sep = parseFloat(sepInput.value);
      const p1 = parseFloat(p1Input.value);
      return {
        mu1: 0.0,
        mu2: sep,
        sig: 1.05,
        p1,
        p2: 1 - p1,
        thresh: parseFloat(threshInput.value)
      };
    }

    function computeErrorForThreshold(t, prm) {
      const steps = 900;
      const dx = (INT_MAX - INT_MIN) / steps;
      let err12 = 0; // true y1, x >= t (classified y2)
      let err21 = 0; // true y2, x < t (classified y1)
      let bayes = 0;

      for (let i = 0; i < steps; i++) {
        const x = INT_MIN + (i + 0.5) * dx;
        const j1 = gaussianPdf(x, prm.mu1, prm.sig) * prm.p1;
        const j2 = gaussianPdf(x, prm.mu2, prm.sig) * prm.p2;
        bayes += Math.min(j1, j2) * dx;
        if (x >= t) err12 += j1 * dx;
        else err21 += j2 * dx;
      }

      return { total: err12 + err21, err12, err21, bayes };
    }

    function findOptimalThreshold(prm) {
      // Exact intersection for equal-variance Gaussians:
      // ln(p1/p2) = ((t - mu1)^2 - (t - mu2)^2) / (2 * sig^2)
      const mid = (prm.mu1 + prm.mu2) / 2;
      const diff = prm.mu2 - prm.mu1;
      if (Math.abs(diff) < 1e-6) return mid;
      return mid + (prm.sig * prm.sig * Math.log(prm.p1 / prm.p2)) / diff;
    }

    function toCanvasX(x) {
      return PAD.l + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - PAD.l - PAD.r);
    }

    function toCanvasY(val, maxVal) {
      const plotH = H - PAD.t - PAD.b;
      return PAD.t + plotH - (val / maxVal) * plotH;
    }

    function draw() {
      const colors = VizKit.getThemeColors();
      const prm = getParams();

      threshVal.textContent = prm.thresh.toFixed(2);
      sepVal.textContent = prm.mu2.toFixed(1);
      p1Val.textContent = prm.p1.toFixed(2);

      const res = computeErrorForThreshold(prm.thresh, prm);
      const tOpt = findOptimalThreshold(prm);

      curErrEl.textContent = `${(res.total * 100).toFixed(2)}%`;
      bayesErrEl.textContent = `${(res.bayes * 100).toFixed(2)}%`;
      const excess = Math.max(0, res.total - res.bayes);
      excessErrEl.textContent = `+${(excess * 100).toFixed(2)}%`;
      splitEl.textContent = `${(res.err12 * 100).toFixed(1)}% / ${(res.err21 * 100).toFixed(1)}%`;

      const tStr = prm.thresh.toFixed(2);
      fErrEl.innerHTML =
        `<span style="display:flex;flex-wrap:wrap;align-items:center;gap:0.28rem;width:100%;">` +
        `<span><i>p</i>(error) =</span>` +
        `<span>∫<sub>${tStr}</sub><sup>∞</sup> <span class="term-c1"><i>p</i>(<i>x</i>|<i>y</i><sub>1</sub>)<i>p</i>(<i>y</i><sub>1</sub>)</span> <i>dx</i> +</span>` +
        `<span>∫<sub>−∞</sub><sup>${tStr}</sup> <span class="term-c2"><i>p</i>(<i>x</i>|<i>y</i><sub>2</sub>)<i>p</i>(<i>y</i><sub>2</sub>)</span> <i>dx</i> =</span>` +
        `<span class="term-c1">${res.err12.toFixed(4)}</span> + ` +
        `<span class="term-c2">${res.err21.toFixed(4)}</span> = ` +
        `<span class="formula-result term-warn">${(res.total * 100).toFixed(2)}%</span>` +
        `</span>`;

      const sig2 = prm.sig * prm.sig;
      fOptEl.innerHTML =
        `<span style="display:flex;flex-wrap:wrap;align-items:center;gap:0.28rem;width:100%;">` +
        `<span class="term-purple">ε*</span> = ∫ min(<span class="term-c1"><i>p</i>(<i>x</i>|<i>y</i><sub>1</sub>)<i>p</i>(<i>y</i><sub>1</sub>)</span>, <span class="term-c2"><i>p</i>(<i>x</i>|<i>y</i><sub>2</sub>)<i>p</i>(<i>y</i><sub>2</sub>)</span>) <i>dx</i> = ` +
        `<span class="formula-result term-purple">${(res.bayes * 100).toFixed(2)}%</span>` +
        `</span>` +
        `<span style="display:flex;flex-wrap:wrap;align-items:center;gap:0.25rem;width:100%;margin-top:0.25rem;">` +
        `<span class="term-opt"><i>t</i>*</span> = ` +
        fracHtml(`${prm.mu1.toFixed(1)} + ${prm.mu2.toFixed(1)}`, "2") +
        ` + ` +
        fracHtml(`${prm.sig.toFixed(2)}<sup>2</sup>`, `${prm.mu2.toFixed(1)} − ${prm.mu1.toFixed(1)}`) +
        ` ln` +
        fracHtml(`<span class="term-c1">${prm.p1.toFixed(2)}</span>`, `<span class="term-c2">${prm.p2.toFixed(2)}</span>`) +
        ` = ` +
        fracHtml(prm.mu2.toFixed(1), "2") +
        ` + ` +
        fracHtml(sig2.toFixed(2), prm.mu2.toFixed(1)) +
        ` · (${Math.log(prm.p1 / prm.p2).toFixed(2)})` +
        ` = <span class="formula-result term-opt">${tOpt.toFixed(2)}</span>` +
        `</span>`;

      // Left Canvas: Joint Distributions + Shaded Error Area
      const maxY = 0.42;
      const plotW = W - PAD.l - PAD.r;
      const plotH = H - PAD.t - PAD.b;
      const { ctx: dctx } = VizKit.setupCanvas(distCanvas, W, H);
      dctx.fillStyle = colors.bg;
      dctx.fillRect(0, 0, W, H);

      dctx.fillStyle = colors.textSubtle;
      dctx.font = "600 11px sans-serif";
      dctx.textAlign = "left";
      dctx.fillText("Shaded Error Area (drag green boundary)", PAD.l, 17);

      // Grid & Axes
      dctx.strokeStyle = colors.grid;
      dctx.lineWidth = 1;
      [0, 0.1, 0.2, 0.3, 0.4].forEach((yt) => {
        const py = toCanvasY(yt, maxY);
        dctx.beginPath();
        dctx.moveTo(PAD.l, py);
        dctx.lineTo(PAD.l + plotW, py);
        dctx.stroke();
        dctx.fillStyle = colors.textSubtle;
        dctx.font = "500 10px monospace";
        dctx.textAlign = "right";
        dctx.textBaseline = "middle";
        dctx.fillText(yt.toFixed(1), PAD.l - 5, py);
      });

      // Shaded misclassification regions (Slides 40-43)
      const shadeSamples = 260;
      const dx = (X_MAX - X_MIN) / shadeSamples;
      const shadeAlpha = errFocus === "error-split" ? 0.58 : 0.42;
      for (let i = 0; i < shadeSamples; i++) {
        const x = X_MIN + (i + 0.5) * dx;
        const j1 = gaussianPdf(x, prm.mu1, prm.sig) * prm.p1;
        const j2 = gaussianPdf(x, prm.mu2, prm.sig) * prm.p2;
        const errH = x >= prm.thresh ? j1 : j2;
        if (x >= prm.thresh) {
          dctx.fillStyle = colors.isDark ? `rgba(251, 191, 36, ${shadeAlpha})` : `rgba(245, 158, 11, ${shadeAlpha})`;
        } else {
          dctx.fillStyle = colors.isDark ? `rgba(245, 158, 11, ${shadeAlpha})` : `rgba(217, 119, 6, ${shadeAlpha})`;
        }
        const px = toCanvasX(X_MIN + i * dx);
        const pw = toCanvasX(X_MIN + (i + 1) * dx) - px + 0.5;
        const topY = toCanvasY(errH, maxY);
        const botY = toCanvasY(0, maxY);
        dctx.fillRect(px, topY, pw, botY - topY);
      }

      // Draw p(x|y1)p(y1) and p(x|y2)p(y2)
      [
        { mu: prm.mu1, p: prm.p1, col: colors.accent },
        { mu: prm.mu2, p: prm.p2, col: colors.danger }
      ].forEach((cls) => {
        dctx.strokeStyle = cls.col;
        dctx.lineWidth = 2.4;
        dctx.beginPath();
        for (let i = 0; i <= 220; i++) {
          const x = X_MIN + (i / 220) * (X_MAX - X_MIN);
          const y = gaussianPdf(x, cls.mu, prm.sig) * cls.p;
          const px = toCanvasX(x);
          const py = toCanvasY(y, maxY);
          if (i === 0) dctx.moveTo(px, py);
          else dctx.lineTo(px, py);
        }
        dctx.stroke();
      });

      // Axes frame & x ticks
      dctx.strokeStyle = colors.borderStrong;
      dctx.lineWidth = 1.2;
      dctx.beginPath();
      dctx.moveTo(PAD.l, PAD.t);
      dctx.lineTo(PAD.l, PAD.t + plotH);
      dctx.lineTo(PAD.l + plotW, PAD.t + plotH);
      dctx.stroke();
      for (let x = -2; x <= 6; x += 2) {
        dctx.fillStyle = colors.textSubtle;
        dctx.font = "500 10px monospace";
        dctx.textAlign = "center";
        dctx.textBaseline = "top";
        dctx.fillText(String(x), toCanvasX(x), PAD.t + plotH + 8);
      }

      // Optimal dashed boundary marker
      if (tOpt >= X_MIN && tOpt <= X_MAX) {
        const optPx = toCanvasX(tOpt);
        dctx.save();
        dctx.strokeStyle = errFocus === "bayes-opt" ? colors.purple : colors.textSubtle;
        dctx.lineWidth = errFocus === "bayes-opt" ? 2.4 : 1.3;
        dctx.setLineDash([4, 4]);
        dctx.beginPath();
        dctx.moveTo(optPx, PAD.t);
        dctx.lineTo(optPx, PAD.t + plotH);
        dctx.stroke();
        dctx.restore();
      }

      // Draggable Green Threshold Line
      const tPx = toCanvasX(prm.thresh);
      dctx.strokeStyle = colors.success;
      dctx.lineWidth = 2.6;
      dctx.beginPath();
      dctx.moveTo(tPx, PAD.t);
      dctx.lineTo(tPx, PAD.t + plotH);
      dctx.stroke();
      dctx.fillStyle = colors.success;
      dctx.beginPath();
      dctx.arc(tPx, PAD.t + 6, 5.5, 0, Math.PI * 2);
      dctx.fill();

      // Right Canvas: Error p(error) as function of threshold t
      const { ctx: cctx } = VizKit.setupCanvas(curveCanvas, W, H);
      cctx.fillStyle = colors.bg;
      cctx.fillRect(0, 0, W, H);

      cctx.fillStyle = colors.textSubtle;
      cctx.font = "600 11px sans-serif";
      cctx.textAlign = "left";
      cctx.fillText("Total Error vs. Threshold t", PAD.l, 17);

      const maxErrY = 0.65;
      cctx.strokeStyle = colors.grid;
      cctx.lineWidth = 1;
      [0, 0.2, 0.4, 0.6].forEach((yt) => {
        const py = toCanvasY(yt, maxErrY);
        cctx.beginPath();
        cctx.moveTo(PAD.l, py);
        cctx.lineTo(PAD.l + plotW, py);
        cctx.stroke();
        cctx.fillStyle = colors.textSubtle;
        cctx.font = "500 10px monospace";
        cctx.textAlign = "right";
        cctx.textBaseline = "middle";
        cctx.fillText(`${Math.round(yt * 100)}%`, PAD.l - 5, py);
      });

      // Bayes Error floor dashed line
      const bY = toCanvasY(res.bayes, maxErrY);
      cctx.save();
      cctx.strokeStyle = colors.purple;
      cctx.lineWidth = errFocus === "bayes-opt" ? 2.6 : 1.5;
      cctx.setLineDash([5, 4]);
      cctx.beginPath();
      cctx.moveTo(PAD.l, bY);
      cctx.lineTo(PAD.l + plotW, bY);
      cctx.stroke();
      cctx.restore();

      cctx.fillStyle = colors.purple;
      cctx.font = "600 10px monospace";
      cctx.textAlign = "right";
      cctx.fillText(`ε* = ${(res.bayes * 100).toFixed(1)}%`, PAD.l + plotW - 4, bY - 8);

      // Error curve across t in [-2, 5]
      cctx.strokeStyle = colors.warning;
      cctx.lineWidth = 2.4;
      cctx.beginPath();
      const curveSteps = 90;
      for (let i = 0; i <= curveSteps; i++) {
        const t = -2.0 + (i / curveSteps) * 7.0;
        // Fast analytical/coarse eval with 200 steps for smooth curve
        let e = 0;
        const s = 180;
        const ddx = (INT_MAX - INT_MIN) / s;
        for (let k = 0; k < s; k++) {
          const x = INT_MIN + (k + 0.5) * ddx;
          if (x >= t) e += gaussianPdf(x, prm.mu1, prm.sig) * prm.p1 * ddx;
          else e += gaussianPdf(x, prm.mu2, prm.sig) * prm.p2 * ddx;
        }
        const px = PAD.l + ((t - -2.0) / 7.0) * plotW;
        const py = toCanvasY(Math.min(maxErrY, e), maxErrY);
        if (i === 0) cctx.moveTo(px, py);
        else cctx.lineTo(px, py);
      }
      cctx.stroke();

      // Current threshold dot on error curve
      const dotX = PAD.l + ((prm.thresh - -2.0) / 7.0) * plotW;
      const dotY = toCanvasY(Math.min(maxErrY, res.total), maxErrY);
      cctx.fillStyle = colors.success;
      cctx.beginPath();
      cctx.arc(dotX, dotY, 5.5, 0, Math.PI * 2);
      cctx.fill();
      cctx.strokeStyle = colors.surface;
      cctx.lineWidth = 1.6;
      cctx.stroke();

      // Axes frame & x ticks
      cctx.strokeStyle = colors.borderStrong;
      cctx.lineWidth = 1.2;
      cctx.beginPath();
      cctx.moveTo(PAD.l, PAD.t);
      cctx.lineTo(PAD.l, PAD.t + plotH);
      cctx.lineTo(PAD.l + plotW, PAD.t + plotH);
      cctx.stroke();
      for (let t = -2; t <= 5; t += 1) {
        const px = PAD.l + ((t - -2.0) / 7.0) * plotW;
        cctx.fillStyle = colors.textSubtle;
        cctx.font = "500 10px monospace";
        cctx.textAlign = "center";
        cctx.textBaseline = "top";
        cctx.fillText(String(t), px, PAD.t + plotH + 8);
      }
    }

    function updateThreshFromPointer(e) {
      const pt = VizKit.getCanvasPoint(distCanvas, e, W, H);
      const frac = (pt.x - PAD.l) / (W - PAD.l - PAD.r);
      const val = VizKit.clamp(X_MIN + frac * (X_MAX - X_MIN), -2.0, 5.0);
      threshInput.value = val.toFixed(2);
      draw();
    }

    distCanvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      updateThreshFromPointer(e);
    });
    window.addEventListener("pointermove", (e) => {
      if (dragging) updateThreshFromPointer(e);
    });
    window.addEventListener("pointerup", () => {
      dragging = false;
    });

    [threshInput, sepInput, p1Input].forEach((el) => el.addEventListener("input", draw));
    snapBtn.addEventListener("click", () => {
      const opt = VizKit.clamp(findOptimalThreshold(getParams()), -2.0, 5.0);
      threshInput.value = opt.toFixed(2);
      draw();
    });

    document.querySelectorAll(".formula-card").forEach((card) => {
      const target = card.dataset && card.dataset.eFocus;
      if (!target) return;
      card.addEventListener("pointerenter", () => {
        errFocus = target;
        draw();
      });
      card.addEventListener("pointerleave", () => {
        errFocus = null;
        draw();
      });
    });

    VizKit.onThemeChange(draw);
    draw();
  }

  /* ========================================================================
     3. Misclassification Costs & Minimum Risk (Slides 45-52, 54)
     ======================================================================== */
  function initMisclassificationCost() {
    const canvas = document.getElementById("mdl-c-risk-canvas");
    if (!canvas) return;

    const presetSelect = document.getElementById("mdl-c-preset");
    const l12Input = document.getElementById("mdl-c-l12");
    const l21Input = document.getElementById("mdl-c-l21");
    const p1Input = document.getElementById("mdl-c-prior1");
    const l12Val = document.getElementById("mdl-c-l12-val");
    const l21Val = document.getElementById("mdl-c-l21-val");
    const p1Val = document.getElementById("mdl-c-prior1-val");

    const col1El = document.getElementById("mdl-c-col1");
    const col2El = document.getElementById("mdl-c-col2");
    const row1El = document.getElementById("mdl-c-row1");
    const row2El = document.getElementById("mdl-c-row2");
    const cell12El = document.getElementById("mdl-c-cell12");
    const cell21El = document.getElementById("mdl-c-cell21");
    const ruleTextEl = document.getElementById("mdl-c-rule-text");

    const probeXEl = document.getElementById("mdl-c-x");
    const toptEl = document.getElementById("mdl-c-topt");
    const t01El = document.getElementById("mdl-c-t01");
    const rminEl = document.getElementById("mdl-c-rmin");
    const r01El = document.getElementById("mdl-c-r01");
    const fCondEl = document.getElementById("mdl-c-f-cond");
    const fTotalEl = document.getElementById("mdl-c-f-total");

    const W = 480;
    const H = 250;
    const X_MIN = -3.0;
    const X_MAX = 6.0;
    const PAD = { l: 48, r: 16, t: 24, b: 32 };
    const MU1 = 0.2;
    const MU2 = 2.6;
    const SIG = 1.0;
    let probeX = 1.2;
    let costFocus = null; // null | "cond-risk" | "total-risk"

    function getState() {
      const p1 = parseFloat(p1Input.value);
      return {
        l12: parseFloat(l12Input.value),
        l21: parseFloat(l21Input.value),
        p1,
        p2: 1 - p1
      };
    }

    function evalRisks(x, st) {
      const j1 = gaussianPdf(x, MU1, SIG) * st.p1;
      const j2 = gaussianPdf(x, MU2, SIG) * st.p2;
      const px = j1 + j2;
      const post1 = px > 1e-300 ? j1 / px : 0.5;
      const post2 = 1 - post1;
      const riskChoose2 = st.l12 * post1; // l^2(x) = λ_12 * p(y1|x)
      const riskChoose1 = st.l21 * post2; // l^1(x) = λ_21 * p(y2|x)
      return { j1, j2, post1, post2, riskChoose1, riskChoose2 };
    }

    function draw() {
      const colors = VizKit.getThemeColors();
      const st = getState();

      l12Val.textContent = String(st.l12);
      l21Val.textContent = String(st.l21);
      p1Val.textContent = st.p1.toFixed(2);
      cell12El.textContent = `λ₁₂ = ${st.l12}`;
      cell21El.textContent = `λ₂₁ = ${st.l21}`;

      const pctThreshold = (st.l12 / (st.l12 + st.l21)) * 100;
      ruleTextEl.textContent =
        `Assign y₁ iff ${st.l21}·p(y₂|x) < ${st.l12}·p(y₁|x)  (equivalently p(y₂|x) < ${pctThreshold.toFixed(1)}%)`;

      // Exact thresholds for equal-variance Gaussians
      const mid = (MU1 + MU2) / 2;
      const diff = MU2 - MU1;
      const t01 = mid + (SIG * SIG * Math.log(st.p1 / st.p2)) / diff;
      const tRisk = mid + (SIG * SIG * Math.log((st.l12 * st.p1) / (st.l21 * st.p2))) / diff;

      // Integrate expected risk over [-6, 10]
      const steps = 900;
      const dx = 16 / steps;
      let r1 = 0; // risk accumulated in Ω1
      let r2 = 0; // risk accumulated in Ω2
      let r01 = 0;
      for (let i = 0; i < steps; i++) {
        const x = -6 + (i + 0.5) * dx;
        const j1 = gaussianPdf(x, MU1, SIG) * st.p1;
        const j2 = gaussianPdf(x, MU2, SIG) * st.p2;
        if (st.l21 * j2 < st.l12 * j1) r1 += st.l21 * j2 * dx;
        else r2 += st.l12 * j1 * dx;
        r01 += (x < t01 ? st.l21 * j2 : st.l12 * j1) * dx;
      }
      const rMin = r1 + r2;

      probeXEl.textContent = probeX.toFixed(2);
      toptEl.textContent = tRisk.toFixed(2);
      t01El.textContent = t01.toFixed(2);
      rminEl.textContent = rMin.toFixed(2);
      r01El.textContent = r01.toFixed(2);

      const probed = evalRisks(probeX, st);
      const xStr = probeX.toFixed(2);
      const pick = probed.riskChoose1 < probed.riskChoose2
        ? `<span class="term-c1">Pick <i>y</i><sub>1</sub></span> (<i>l</i><sup>1</sup> &lt; <i>l</i><sup>2</sup>)`
        : `<span class="term-c2">Pick <i>y</i><sub>2</sub></span> (<i>l</i><sup>2</sup> ≤ <i>l</i><sup>1</sup>)`;

      fCondEl.innerHTML =
        `<span style="display:flex;flex-wrap:wrap;align-items:center;gap:0.35rem;width:100%;">` +
        `<span class="term-c2"><i>l</i><sup>1</sup>(${xStr})</span> = <span class="term-c2">${st.l21}</span> · ${probed.post2.toFixed(3)} = <span class="formula-result term-c2">${probed.riskChoose1.toFixed(2)}</span>` +
        `<span style="margin:0 0.45rem;color:var(--border-strong);">vs.</span>` +
        `<span class="term-c1"><i>l</i><sup>2</sup>(${xStr})</span> = <span class="term-c1">${st.l12}</span> · ${probed.post1.toFixed(3)} = <span class="formula-result term-c1">${probed.riskChoose2.toFixed(2)}</span>` +
        `<span style="margin-left:0.45rem;">⇒ ${pick}</span>` +
        `</span>`;

      const shift = ((SIG * SIG) / diff) * Math.log(st.l12 / st.l21);
      fTotalEl.innerHTML =
        `<span style="display:flex;flex-wrap:wrap;align-items:center;gap:0.28rem;width:100%;">` +
        `<span><i>r</i>* = ∫<sub>Ω₁</sub> <span class="term-c2"><i>l</i><sup>1</sup>(<i>x</i>)</span><i>p</i>(<i>x</i>)<i>dx</i> + ∫<sub>Ω₂</sub> <span class="term-c1"><i>l</i><sup>2</sup>(<i>x</i>)</span><i>p</i>(<i>x</i>)<i>dx</i> =</span>` +
        `<span class="term-c2">${r1.toFixed(2)}</span> + <span class="term-c1">${r2.toFixed(2)}</span> = ` +
        `<span class="formula-result">${rMin.toFixed(2)}</span>` +
        `</span>` +
        `<span style="display:flex;flex-wrap:wrap;align-items:center;gap:0.25rem;width:100%;margin-top:0.25rem;">` +
        `<span class="term-opt"><i>t</i><sub>risk</sub></span> = <i>t</i><sub>0-1</sub> + ` +
        fracHtml(`${SIG.toFixed(1)}<sup>2</sup>`, `${MU2.toFixed(1)} − ${MU1.toFixed(1)}`) +
        ` ln` +
        fracHtml(`<span class="term-c1">${st.l12}</span>`, `<span class="term-c2">${st.l21}</span>`) +
        ` = ${t01.toFixed(2)} ${shift >= 0 ? "+" : "−"} ${Math.abs(shift).toFixed(2)} = ` +
        `<span class="formula-result term-opt">${tRisk.toFixed(2)}</span>` +
        `</span>`;

      // Draw Canvas
      const { ctx } = VizKit.setupCanvas(canvas, W, H);
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, W, H);

      const plotW = W - PAD.l - PAD.r;
      const plotH = H - PAD.t - PAD.b;
      const maxRiskY = Math.max(st.l12, st.l21) * 1.05;

      const toCX = (x) => PAD.l + ((x - X_MIN) / (X_MAX - X_MIN)) * plotW;
      const toCY = (v) => PAD.t + plotH - (v / maxRiskY) * plotH;

      ctx.fillStyle = colors.textSubtle;
      ctx.font = "600 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Conditional Risk Curves: l¹(x) vs. l²(x)", PAD.l, 17);

      // Grid lines
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      [0, 0.5, 1.0].forEach((frac) => {
        const val = frac * Math.max(st.l12, st.l21);
        const py = toCY(val);
        ctx.beginPath();
        ctx.moveTo(PAD.l, py);
        ctx.lineTo(PAD.l + plotW, py);
        ctx.stroke();
        ctx.fillStyle = colors.textSubtle;
        ctx.font = "500 10px monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(val.toFixed(0), PAD.l - 6, py);
      });

      // Shaded Decision Regions bar along bottom
      const samples = 180;
      const regionY = PAD.t + plotH + 2;
      for (let i = 0; i < samples; i++) {
        const xA = X_MIN + (i / samples) * (X_MAX - X_MIN);
        const xB = X_MIN + ((i + 1) / samples) * (X_MAX - X_MIN);
        const ev = evalRisks((xA + xB) / 2, st);
        ctx.fillStyle = ev.riskChoose1 < ev.riskChoose2
          ? (colors.isDark ? "rgba(79,134,255,0.45)" : "rgba(37,99,235,0.35)")
          : (colors.isDark ? "rgba(248,113,113,0.45)" : "rgba(220,38,38,0.35)");
        ctx.fillRect(toCX(xA), regionY, toCX(xB) - toCX(xA) + 0.5, 9);
      }

      // Draw l^2(x) = λ12 * p(y1|x) [blue] and l^1(x) = λ21 * p(y2|x) [red]
      [
        { key: "riskChoose2", col: colors.accent },
        { key: "riskChoose1", col: colors.danger }
      ].forEach((item) => {
        ctx.strokeStyle = item.col;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i <= 220; i++) {
          const x = X_MIN + (i / 220) * (X_MAX - X_MIN);
          const ev = evalRisks(x, st);
          const px = toCX(x);
          const py = toCY(ev[item.key]);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      });

      // Equal-cost 0-1 boundary (dashed)
      if (t01 >= X_MIN && t01 <= X_MAX) {
        const p01 = toCX(t01);
        ctx.save();
        ctx.strokeStyle = colors.textSubtle;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(p01, PAD.t);
        ctx.lineTo(p01, PAD.t + plotH);
        ctx.stroke();
        ctx.restore();
      }

      // Min-risk boundary (solid green)
      if (tRisk >= X_MIN && tRisk <= X_MAX) {
        const pR = toCX(tRisk);
        ctx.strokeStyle = colors.success;
        ctx.lineWidth = costFocus === "total-risk" ? 3.5 : 2.5;
        ctx.beginPath();
        ctx.moveTo(pR, PAD.t);
        ctx.lineTo(pR, PAD.t + plotH);
        ctx.stroke();
      }

      // Probe x vertical dashed marker & dots on l^1(x) and l^2(x)
      const pProbe = toCX(probeX);
      ctx.save();
      ctx.strokeStyle = colors.textMuted;
      ctx.lineWidth = costFocus === "cond-risk" ? 1.8 : 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pProbe, PAD.t);
      ctx.lineTo(pProbe, PAD.t + plotH);
      ctx.stroke();
      ctx.restore();

      [
        { y: probed.riskChoose2, col: colors.accent },
        { y: probed.riskChoose1, col: colors.danger }
      ].forEach((pt) => {
        ctx.fillStyle = pt.col;
        ctx.beginPath();
        ctx.arc(pProbe, toCY(pt.y), costFocus === "cond-risk" ? 5.5 : 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colors.surface;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      });

      // Axes frame & x ticks
      ctx.strokeStyle = colors.borderStrong;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(PAD.l, PAD.t);
      ctx.lineTo(PAD.l, PAD.t + plotH);
      ctx.lineTo(PAD.l + plotW, PAD.t + plotH);
      ctx.stroke();
      for (let x = -2; x <= 6; x += 2) {
        ctx.fillStyle = colors.textSubtle;
        ctx.font = "500 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(String(x), toCX(x), PAD.t + plotH + 14);
      }
    }

    function applyPreset(name) {
      if (name === "equal") {
        l12Input.value = "1";
        l21Input.value = "1";
        p1Input.value = "0.50";
        col1El.textContent = row1El.textContent = "y₁ (Class 1)";
        col2El.textContent = row2El.textContent = "y₂ (Class 2)";
      } else if (name === "fruit") {
        l12Input.value = "1";
        l21Input.value = "9";
        p1Input.value = "0.50";
        col1El.textContent = row1El.textContent = "y₁ (Apple)";
        col2El.textContent = row2El.textContent = "y₂ (Pear)";
      } else {
        l12Input.value = "10";
        l21Input.value = "100";
        p1Input.value = "0.70";
        col1El.textContent = row1El.textContent = "y₁ (Healthy)";
        col2El.textContent = row2El.textContent = "y₂ (Ill)";
      }
      draw();
    }

    function handleRiskProbe(evt) {
      const pt = VizKit.getCanvasPoint(canvas, evt, W, H);
      const frac = (pt.x - PAD.l) / (W - PAD.l - PAD.r);
      probeX = VizKit.clamp(X_MIN + frac * (X_MAX - X_MIN), X_MIN, X_MAX);
      draw();
    }

    canvas.addEventListener("pointermove", handleRiskProbe);
    canvas.addEventListener("pointerdown", handleRiskProbe);

    document.querySelectorAll(".formula-card").forEach((card) => {
      const target = card.dataset && card.dataset.cFocus;
      if (!target) return;
      card.addEventListener("pointerenter", () => {
        costFocus = target;
        draw();
      });
      card.addEventListener("pointerleave", () => {
        costFocus = null;
        draw();
      });
    });

    presetSelect.addEventListener("change", () => applyPreset(presetSelect.value));
    [l12Input, l21Input, p1Input].forEach((el) => el.addEventListener("input", draw));

    VizKit.onThemeChange(draw);
    applyPreset("medical");
  }

  document.addEventListener("DOMContentLoaded", () => {
    initBayesRule();
    initBayesError();
    initMisclassificationCost();
  });
})();
