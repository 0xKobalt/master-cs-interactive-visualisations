/**
 * CS-510: Computer Architecture & Memory Visualizations
 * 1) CPU Cache Simulator (Direct-Mapped, Set-Associative, Fully Associative)
 * 2) IEEE 754 32-Bit Single-Precision Float Explorer
 */
(function () {
  /* ========================================================================
     1. CPU Cache Simulator
     ======================================================================== */
  function initCacheSim() {
    const tbody = document.getElementById("cache-tbody");
    if (!tbody) return;

    const linesSelect = document.getElementById("cache-lines");
    const assocSelect = document.getElementById("cache-assoc");
    const blockSelect = document.getElementById("cache-block");
    const policySelect = document.getElementById("cache-policy");
    const presetSelect = document.getElementById("cache-preset");
    const traceInput = document.getElementById("cache-trace");

    const stepBtn = document.getElementById("cache-step");
    const runBtn = document.getElementById("cache-run");
    const resetBtn = document.getElementById("cache-reset");

    const progEl = document.getElementById("cache-prog");
    const lastEl = document.getElementById("cache-last");
    const splitEl = document.getElementById("cache-split");
    const hmEl = document.getElementById("cache-hm");
    const rateEl = document.getElementById("cache-rate");

    const PRESETS = {
      thrash: "0x00, 0x20, 0x00, 0x20, 0x04, 0x24, 0x00, 0x20",
      spatial: "0x00, 0x04, 0x08, 0x0C, 0x10, 0x14, 0x18, 0x1C",
      loop: "0x00, 0x04, 0x10, 0x00, 0x04, 0x10, 0x00, 0x04"
    };

    let state = null;

    function parseTrace(text) {
      return text
        .split(/[\s,]+/)
        .map((tok) => tok.trim())
        .filter(Boolean)
        .map((tok) => {
          const val = tok.toLowerCase().startsWith("0x")
            ? parseInt(tok, 16)
            : parseInt(tok, 10);
          return Number.isNaN(val) ? null : (val & 0xffff);
        })
        .filter((v) => v !== null);
    }

    function getGeometry() {
      const totalLines = Number(linesSelect.value);
      const rawAssoc = assocSelect.value;
      const ways = rawAssoc === "full" ? totalLines : Math.min(totalLines, Number(rawAssoc));
      const numSets = Math.max(1, totalLines / ways);
      const blockBytes = Number(blockSelect.value);

      const offsetBits = Math.round(Math.log2(blockBytes));
      const indexBits = Math.round(Math.log2(numSets));
      const tagBits = 16 - offsetBits - indexBits;

      return { totalLines, ways, numSets, blockBytes, offsetBits, indexBits, tagBits };
    }

    function resetCache() {
      const geom = getGeometry();
      const trace = parseTrace(traceInput.value);
      const sets = Array.from({ length: geom.numSets }, () =>
        Array.from({ length: geom.ways }, () => ({
          valid: false,
          tag: 0,
          blockAddr: 0,
          loadedAt: 0,
          lastUsedAt: 0
        }))
      );

      state = {
        geom,
        trace,
        stepIdx: 0,
        tick: 0,
        hits: 0,
        misses: 0,
        seenBlocks: new Set(),
        sets,
        lastEvent: null
      };
      render();
    }

    function stepCache() {
      if (!state) resetCache();
      if (state.stepIdx >= state.trace.length) return false;

      const { geom, sets, seenBlocks } = state;
      const addr = state.trace[state.stepIdx];
      state.stepIdx++;
      state.tick++;

      const blockAddr = addr >>> geom.offsetBits;
      const setMask = (1 << geom.indexBits) - 1;
      const setIdx = geom.indexBits === 0 ? 0 : blockAddr & setMask;
      const tag = blockAddr >>> geom.indexBits;
      const offset = addr & (geom.blockBytes - 1);

      const waysArr = sets[setIdx];
      let hitWay = waysArr.findIndex((line) => line.valid && line.tag === tag);

      if (hitWay !== -1) {
        state.hits++;
        waysArr[hitWay].lastUsedAt = state.tick;
        state.lastEvent = {
          addr,
          tag,
          setIdx,
          offset,
          wayIdx: hitWay,
          kind: "HIT"
        };
      } else {
        state.misses++;
        const isCold = !seenBlocks.has(blockAddr);
        seenBlocks.add(blockAddr);

        let targetWay = waysArr.findIndex((line) => !line.valid);
        let evicted = false;
        if (targetWay === -1) {
          evicted = true;
          const policy = policySelect.value;
          targetWay = 0;
          for (let w = 1; w < waysArr.length; w++) {
            const metricW = policy === "lru" ? waysArr[w].lastUsedAt : waysArr[w].loadedAt;
            const metricBest = policy === "lru" ? waysArr[targetWay].lastUsedAt : waysArr[targetWay].loadedAt;
            if (metricW < metricBest) targetWay = w;
          }
        }

        waysArr[targetWay] = {
          valid: true,
          tag,
          blockAddr,
          loadedAt: state.tick,
          lastUsedAt: state.tick
        };

        state.lastEvent = {
          addr,
          tag,
          setIdx,
          offset,
          wayIdx: targetWay,
          kind: isCold ? "COLD MISS" : evicted ? "CONFLICT / EVICT" : "MISS"
        };
      }

      render();
      return state.stepIdx < state.trace.length;
    }

    function fmtHex(num, pad = 2) {
      return "0x" + num.toString(16).toUpperCase().padStart(pad, "0");
    }

    function render() {
      const { geom, trace, stepIdx, hits, misses, sets, lastEvent } = state;
      progEl.textContent = `${stepIdx} / ${trace.length}`;
      hmEl.textContent = `${hits} / ${misses}`;
      const total = hits + misses;
      rateEl.textContent = total > 0 ? `${((hits / total) * 100).toFixed(1)}%` : "—";
      splitEl.textContent = `${geom.tagBits}b Tag | ${geom.indexBits}b Index | ${geom.offsetBits}b Offset`;

      if (lastEvent) {
        lastEl.textContent = `${fmtHex(lastEvent.addr, 2)} → Set ${lastEvent.setIdx}, Tag ${fmtHex(lastEvent.tag, 2)} (${lastEvent.kind})`;
      } else {
        lastEl.textContent = "Ready";
      }

      const rows = [];
      sets.forEach((waysArr, sIdx) => {
        waysArr.forEach((line, wIdx) => {
          const isTouched = lastEvent && lastEvent.setIdx === sIdx && lastEvent.wayIdx === wIdx;
          let rowStyle = "";
          let statusHtml = "—";
          if (isTouched) {
            if (lastEvent.kind === "HIT") {
              rowStyle = "background: var(--success-soft);";
              statusHtml = `<strong style="color:var(--success)">HIT</strong>`;
            } else {
              rowStyle = "background: var(--warning-soft);";
              statusHtml = `<strong style="color:var(--warning)">${lastEvent.kind}</strong>`;
            }
          }

          const byteStart = line.blockAddr * geom.blockBytes;
          const byteEnd = byteStart + geom.blockBytes - 1;
          const rangeText = line.valid ? `${fmtHex(byteStart)}..${fmtHex(byteEnd)}` : "—";
          const orderVal = policySelect.value === "lru" ? line.lastUsedAt : line.loadedAt;

          rows.push(`
            <tr style="${rowStyle}">
              <td>S${sIdx}</td>
              <td>W${wIdx}</td>
              <td>${line.valid ? "1" : "0"}</td>
              <td>${line.valid ? fmtHex(line.tag) : "—"}</td>
              <td>${rangeText}</td>
              <td>${line.valid ? `t=${orderVal}` : "—"}</td>
              <td>${statusHtml}</td>
            </tr>
          `);
        });
      });

      tbody.innerHTML = rows.join("");
    }

    presetSelect.addEventListener("change", () => {
      traceInput.value = PRESETS[presetSelect.value] || PRESETS.thrash;
      resetCache();
    });

    [linesSelect, assocSelect, blockSelect, policySelect].forEach((el) => {
      el.addEventListener("change", resetCache);
    });
    traceInput.addEventListener("change", resetCache);

    stepBtn.addEventListener("click", stepCache);
    runBtn.addEventListener("click", () => {
      if (state.stepIdx >= state.trace.length) resetCache();
      while (stepCache()) {
        /* run remaining trace steps */
      }
    });
    resetBtn.addEventListener("click", resetCache);

    resetCache();
  }

  /* ========================================================================
     2. IEEE 754 Single-Precision (32-Bit) Bit Explorer
     ======================================================================== */
  function initIEEE754() {
    const bitsHost = document.getElementById("fp-bits");
    if (!bitsHost) return;

    const inputEl = document.getElementById("fp-input");
    const presetBtns = document.querySelectorAll(".fp-preset");
    const catEl = document.getElementById("fp-cat");
    const hexEl = document.getElementById("fp-hex");
    const signEl = document.getElementById("fp-sign");
    const expEl = document.getElementById("fp-exp");
    const exactEl = document.getElementById("fp-exact");

    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    let currentBits = 0x3dcccccd; // 0.1f

    function encodeFromString(raw) {
      const s = raw.trim();
      if (s === "-0" || s === "-0.0") {
        currentBits = 0x80000000;
        return;
      }
      if (/^nan$/i.test(s)) {
        currentBits = 0x7fc00000;
        return;
      }
      if (/^\+?inf(inity)?$/i.test(s)) {
        currentBits = 0x7f800000;
        return;
      }
      if (/^-inf(inity)?$/i.test(s)) {
        currentBits = 0xff800000;
        return;
      }
      const num = Number(s);
      if (Number.isNaN(num)) return;
      view.setFloat32(0, num, false);
      currentBits = view.getUint32(0, false) >>> 0;
    }

    function formatExact(val) {
      if (Number.isNaN(val)) return "NaN";
      if (!Number.isFinite(val)) return val > 0 ? "+Infinity" : "-Infinity";
      if (Object.is(val, -0)) return "-0";
      if (val === 0) return "0";
      return String(val);
    }

    function render(updateInput = true) {
      const bits = currentBits >>> 0;
      view.setUint32(0, bits, false);
      const val = view.getFloat32(0, false);

      const signBit = (bits >>> 31) & 1;
      const expRaw = (bits >>> 23) & 0xff;
      const mantRaw = bits & 0x7fffff;

      let category = "Normal";
      let expDesc = `${expRaw} − 127 = ${expRaw - 127}`;

      if (expRaw === 255) {
        category = mantRaw === 0 ? "Infinity (±∞)" : "NaN";
        expDesc = "255 (Special)";
      } else if (expRaw === 0) {
        if (mantRaw === 0) {
          category = "Zero (±0)";
          expDesc = "0 (Zero)";
        } else {
          category = "Subnormal";
          expDesc = "0 (fixed 2⁻¹²⁶)";
        }
      }

      catEl.textContent = category;
      hexEl.textContent = "0x" + bits.toString(16).toUpperCase().padStart(8, "0");
      signEl.textContent = signBit === 1 ? "1 (−)" : "0 (+)";
      expEl.textContent = expDesc;
      exactEl.textContent = formatExact(val);

      if (updateInput) {
        inputEl.value = formatExact(val);
      }

      // Render 3 bit groups: Sign (31), Exponent (30..23), Mantissa (22..0)
      function makeButtons(hi, lo, cls) {
        const out = [];
        for (let b = hi; b >= lo; b--) {
          const on = (bits >>> b) & 1;
          out.push(
            `<button type="button" class="bit-btn ${cls} ${on ? "on" : ""}" data-bit="${b}" title="Bit ${b}">${on}</button>`
          );
        }
        return out.join("");
      }

      bitsHost.innerHTML = `
        <div class="bit-group">
          <span class="bit-group-label">Sign (1b)</span>
          <div class="bit-cells">${makeButtons(31, 31, "bit-sign")}</div>
        </div>
        <div class="bit-group">
          <span class="bit-group-label">Exponent (8b)</span>
          <div class="bit-cells">${makeButtons(30, 23, "bit-exp")}</div>
        </div>
        <div class="bit-group">
          <span class="bit-group-label">Mantissa / Fraction (23b)</span>
          <div class="bit-cells">${makeButtons(22, 0, "bit-mant")}</div>
        </div>
      `;

      bitsHost.querySelectorAll(".bit-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const b = Number(btn.dataset.bit);
          currentBits = (currentBits ^ (1 << b)) >>> 0;
          render(true);
        });
      });
    }

    inputEl.addEventListener("input", () => {
      encodeFromString(inputEl.value);
      render(false);
    });

    presetBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        encodeFromString(btn.dataset.val);
        render(true);
      });
    });

    encodeFromString("0.1");
    render(true);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initCacheSim();
    initIEEE754();
  });
})();
