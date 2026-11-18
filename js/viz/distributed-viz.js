/**
 * CS-540: Distributed Systems Visualizations
 * 1) Lamport & Vector Clocks Space-Time Diagram
 * 2) Consistent Hashing Ring & Virtual Nodes
 */
(function () {
  /* ========================================================================
     1. Lamport & Vector Clocks
     ======================================================================== */
  function initClocks() {
    const canvas = document.getElementById("clk-canvas");
    if (!canvas) return;

    const fromSelect = document.getElementById("clk-from");
    const toSelect = document.getElementById("clk-to");
    const modeSelect = document.getElementById("clk-mode");
    const sendBtn = document.getElementById("clk-send");
    const sampleBtn = document.getElementById("clk-sample");
    const resetBtn = document.getElementById("clk-reset");
    const localBtns = document.querySelectorAll(".clk-local-btn");

    const selAEl = document.getElementById("clk-sel-a");
    const selBEl = document.getElementById("clk-sel-b");
    const relEl = document.getElementById("clk-relation");

    const W = 840;
    const H = 310;
    const PROC_COLORS = ["#2563eb", "#0d9488", "#7c3aed"];

    let lamport = [0, 0, 0];
    let vector = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ];
    let slot = [0, 0, 0];
    let events = []; // { id, p, slot, lamport, vector, kind, cx, cy }
    let messages = []; // { fromId, toId }
    let selected = []; // up to 2 event indices

    function resetState() {
      lamport = [0, 0, 0];
      vector = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
      ];
      slot = [0, 0, 0];
      events = [];
      messages = [];
      selected = [];
      draw();
    }

    function addLocal(p) {
      lamport[p] += 1;
      vector[p][p] += 1;
      slot[p] += 1;
      const evt = {
        id: `e${events.length + 1}`,
        p,
        slot: slot[p],
        lamport: lamport[p],
        vector: vector[p].slice(),
        kind: "local"
      };
      events.push(evt);
      draw();
    }

    function sendMsg(from, to) {
      if (from === to) return;

      // Send event
      lamport[from] += 1;
      vector[from][from] += 1;
      slot[from] += 1;
      const sendEvt = {
        id: `e${events.length + 1}`,
        p: from,
        slot: slot[from],
        lamport: lamport[from],
        vector: vector[from].slice(),
        kind: "send"
      };
      events.push(sendEvt);

      // Receive event
      lamport[to] = Math.max(lamport[to], sendEvt.lamport) + 1;
      for (let k = 0; k < 3; k++) {
        vector[to][k] = Math.max(vector[to][k], sendEvt.vector[k]);
      }
      vector[to][to] += 1;
      slot[to] = Math.max(slot[to] + 1, sendEvt.slot + 1);

      const recvEvt = {
        id: `e${events.length + 1}`,
        p: to,
        slot: slot[to],
        lamport: lamport[to],
        vector: vector[to].slice(),
        kind: "recv"
      };
      events.push(recvEvt);
      messages.push({ fromId: sendEvt.id, toId: recvEvt.id });
      draw();
    }

    function vecLt(a, b) {
      let strictlySmaller = false;
      for (let i = 0; i < 3; i++) {
        if (a[i] > b[i]) return false;
        if (a[i] < b[i]) strictlySmaller = true;
      }
      return strictlySmaller;
    }

    function updateSelectionReadout() {
      if (selected.length === 0) {
        selAEl.textContent = "Click an event";
        selBEl.textContent = "Click another event";
        relEl.textContent = "—";
        return;
      }

      const ea = events[selected[0]];
      selAEl.textContent = `${ea.id} (L=${ea.lamport}, V=[${ea.vector.join(",")}])`;

      if (selected.length === 1) {
        selBEl.textContent = "Click a 2nd event";
        relEl.textContent = "Select 2 events";
        return;
      }

      const eb = events[selected[1]];
      selBEl.textContent = `${eb.id} (L=${eb.lamport}, V=[${eb.vector.join(",")}])`;

      if (vecLt(ea.vector, eb.vector)) {
        relEl.textContent = `${ea.id} → ${eb.id} (Causal: happened-before)`;
      } else if (vecLt(eb.vector, ea.vector)) {
        relEl.textContent = `${eb.id} → ${ea.id} (Causal: happened-before)`;
      } else {
        relEl.textContent = `${ea.id} ∥ ${eb.id} (Concurrent! Note L=${ea.lamport} vs ${eb.lamport})`;
      }
    }

    function drawArrow(ctx, x1, y1, x2, y2, color) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const startX = x1 + ux * 13;
      const startY = y1 + uy * 13;
      const endX = x2 - ux * 14;
      const endY = y2 - uy * 14;

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const angle = Math.atan2(dy, dx);
      const head = 8;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - head * Math.cos(angle - 0.45), endY - head * Math.sin(angle - 0.45));
      ctx.lineTo(endX - head * Math.cos(angle + 0.45), endY - head * Math.sin(angle + 0.45));
      ctx.closePath();
      ctx.fill();
    }

    function draw() {
      const { ctx } = VizKit.setupCanvas(canvas, W, H);
      const colors = VizKit.getThemeColors();
      const mode = modeSelect.value;

      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, W, H);

      const padL = 70;
      const padR = 36;
      const rowY = [72, 160, 248];
      const maxSlot = Math.max(8, ...events.map((e) => e.slot));
      const stepX = (W - padL - padR) / maxSlot;

      // Process timeline lines
      for (let p = 0; p < 3; p++) {
        ctx.strokeStyle = colors.borderStrong;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padL, rowY[p]);
        ctx.lineTo(W - padR, rowY[p]);
        ctx.stroke();

        ctx.fillStyle = PROC_COLORS[p];
        ctx.font = "700 13px monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(`P${p + 1}`, padL - 18, rowY[p]);
      }

      // Compute event positions
      const byId = new Map();
      events.forEach((e) => {
        e.cx = padL + e.slot * stepX;
        e.cy = rowY[e.p];
        byId.set(e.id, e);
      });

      // Message arrows
      for (const m of messages) {
        const a = byId.get(m.fromId);
        const b = byId.get(m.toId);
        if (a && b) {
          drawArrow(ctx, a.cx, a.cy, b.cx, b.cy, colors.warning);
        }
      }

      // Event nodes & clock labels
      events.forEach((e, idx) => {
        const isSel = selected.includes(idx);
        ctx.beginPath();
        ctx.arc(e.cx, e.cy, isSel ? 13 : 10, 0, Math.PI * 2);
        ctx.fillStyle = isSel ? colors.accent : PROC_COLORS[e.p];
        ctx.fill();
        ctx.strokeStyle = isSel ? colors.warning : colors.surface;
        ctx.lineWidth = isSel ? 3 : 2;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "700 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(e.id, e.cx, e.cy + 0.5);

        // Timestamp annotations above/below
        ctx.fillStyle = colors.text;
        ctx.font = "600 10px monospace";
        const lText = `L=${e.lamport}`;
        const vText = `[${e.vector.join(",")}]`;
        if (mode === "lamport") {
          ctx.fillText(lText, e.cx, e.cy - 20);
        } else if (mode === "vector") {
          ctx.fillText(vText, e.cx, e.cy - 20);
        } else {
          ctx.fillText(lText, e.cx, e.cy - 21);
          ctx.fillStyle = colors.textMuted;
          ctx.fillText(vText, e.cx, e.cy + 22);
        }
      });

      updateSelectionReadout();
    }

    function loadSampleScenario() {
      resetState();
      addLocal(0); // e1: P1 local
      addLocal(1); // e2: P2 local (will be concurrent with P3's branch!)
      sendMsg(0, 2); // e3 -> e4: P1 -> P3
      addLocal(2); // e5: P3 local (L=3 or 4, concurrent with e2!)
      sendMsg(2, 1); // e6 -> e7: P3 -> P2
      sendMsg(1, 0); // e8 -> e9: P2 -> P1
      selected = [1, 4]; // preselect e2 and e5 to showcase concurrency immediately
      draw();
    }

    canvas.addEventListener("pointerdown", (e) => {
      const pt = VizKit.getCanvasPoint(canvas, e, W, H);
      let hit = -1;
      let bestDist = 20;
      events.forEach((evt, idx) => {
        const d = Math.hypot(pt.x - evt.cx, pt.y - evt.cy);
        if (d < bestDist) {
          bestDist = d;
          hit = idx;
        }
      });
      if (hit === -1) return;
      if (selected.length >= 2) selected = [hit];
      else if (selected[0] !== hit) selected.push(hit);
      draw();
    });

    localBtns.forEach((btn) => {
      btn.addEventListener("click", () => addLocal(Number(btn.dataset.p)));
    });
    sendBtn.addEventListener("click", () => {
      const from = Number(fromSelect.value);
      const to = Number(toSelect.value);
      if (from === to) {
        relEl.textContent = "Choose two different processes to send a message";
        return;
      }
      sendMsg(from, to);
    });
    modeSelect.addEventListener("change", draw);
    sampleBtn.addEventListener("click", loadSampleScenario);
    resetBtn.addEventListener("click", resetState);

    VizKit.onThemeChange(draw);
    loadSampleScenario();
  }

  /* ========================================================================
     2. Consistent Hashing Ring Explorer
     ======================================================================== */
  function initConsistentHashing() {
    const ringCanvas = document.getElementById("ring-canvas");
    const barsCanvas = document.getElementById("ring-bars");
    if (!ringCanvas || !barsCanvas) return;

    const addNodeBtn = document.getElementById("ring-add-node");
    const remNodeBtn = document.getElementById("ring-rem-node");
    const vnodesSelect = document.getElementById("ring-vnodes");
    const keysSelect = document.getElementById("ring-keys");
    const lookupInput = document.getElementById("ring-lookup");

    const srvCountEl = document.getElementById("ring-srv-count");
    const tokCountEl = document.getElementById("ring-tok-count");
    const ownerEl = document.getElementById("ring-owner");
    const spreadEl = document.getElementById("ring-spread");

    const RW = 440;
    const RH = 340;
    const BW = 380;
    const BH = 340;

    const NODE_COLORS = [
      "#2563eb",
      "#16a34a",
      "#d97706",
      "#7c3aed",
      "#db2777",
      "#0d9488",
      "#dc2626"
    ];

    let servers = ["Node A", "Node B", "Node C"];

    function fnv1a32(str) {
      let h = 0x811c9dc5;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      return h >>> 0;
    }

    function hashUnit(str) {
      return fnv1a32(str) / 4294967296;
    }

    function buildRing() {
      const vnodes = Number(vnodesSelect.value);
      const tokens = [];
      servers.forEach((srv, srvIdx) => {
        for (let v = 0; v < vnodes; v++) {
          tokens.push({
            server: srv,
            srvIdx,
            pos: hashUnit(`${srv}#v${v}`)
          });
        }
      });
      tokens.sort((a, b) => a.pos - b.pos);
      return tokens;
    }

    function findOwner(tokens, keyPos) {
      if (tokens.length === 0) return null;
      for (const t of tokens) {
        if (t.pos >= keyPos) return t;
      }
      return tokens[0];
    }

    function draw() {
      const colors = VizKit.getThemeColors();
      const tokens = buildRing();
      const numKeys = Number(keysSelect.value);
      const counts = new Array(servers.length).fill(0);

      const keys = [];
      for (let i = 0; i < numKeys; i++) {
        const name = `item:${i + 1}`;
        const pos = hashUnit(name);
        const owner = findOwner(tokens, pos);
        if (owner) counts[owner.srvIdx]++;
        keys.push({ name, pos, owner });
      }

      const lookupName = lookupInput.value.trim() || "user:42";
      const lookupPos = hashUnit(lookupName);
      const lookupOwner = findOwner(tokens, lookupPos);

      // Update readouts
      srvCountEl.textContent = String(servers.length);
      tokCountEl.textContent = String(tokens.length);
      ownerEl.textContent = lookupOwner ? `${lookupName} → ${lookupOwner.server}` : "—";

      const mean = numKeys / Math.max(1, servers.length);
      const variance =
        counts.reduce((s, c) => s + Math.pow(((c - mean) / numKeys) * 100, 2), 0) /
        Math.max(1, servers.length);
      spreadEl.textContent = `${Math.sqrt(variance).toFixed(1)}%`;

      // Draw Ring Canvas
      const { ctx: rctx } = VizKit.setupCanvas(ringCanvas, RW, RH);
      rctx.fillStyle = colors.bg;
      rctx.fillRect(0, 0, RW, RH);

      const cx = RW / 2;
      const cy = RH / 2 + 6;
      const R = 118;

      // Colored ownership arcs along ring
      if (tokens.length > 0) {
        for (let i = 0; i < tokens.length; i++) {
          const prev = tokens[(i - 1 + tokens.length) % tokens.length];
          const cur = tokens[i];
          const startAng = prev.pos * Math.PI * 2 - Math.PI / 2;
          let endAng = cur.pos * Math.PI * 2 - Math.PI / 2;
          if (endAng <= startAng) endAng += Math.PI * 2;

          rctx.strokeStyle = NODE_COLORS[cur.srvIdx % NODE_COLORS.length];
          rctx.lineWidth = 6;
          rctx.globalAlpha = 0.35;
          rctx.beginPath();
          rctx.arc(cx, cy, R, startAng, endAng);
          rctx.stroke();
        }
        rctx.globalAlpha = 1;
      }

      // Base ring outline
      rctx.strokeStyle = colors.borderStrong;
      rctx.lineWidth = 1.5;
      rctx.beginPath();
      rctx.arc(cx, cy, R, 0, Math.PI * 2);
      rctx.stroke();

      // Sample key dots slightly inside ring
      for (const k of keys) {
        const ang = k.pos * Math.PI * 2 - Math.PI / 2;
        const kx = cx + Math.cos(ang) * (R - 13);
        const ky = cy + Math.sin(ang) * (R - 13);
        rctx.fillStyle = k.owner
          ? NODE_COLORS[k.owner.srvIdx % NODE_COLORS.length]
          : colors.textSubtle;
        rctx.beginPath();
        rctx.arc(kx, ky, 3, 0, Math.PI * 2);
        rctx.fill();
      }

      // Server / vnode markers on ring
      tokens.forEach((t) => {
        const ang = t.pos * Math.PI * 2 - Math.PI / 2;
        const tx = cx + Math.cos(ang) * R;
        const ty = cy + Math.sin(ang) * R;
        const col = NODE_COLORS[t.srvIdx % NODE_COLORS.length];
        rctx.fillStyle = col;
        rctx.beginPath();
        rctx.arc(tx, ty, 6, 0, Math.PI * 2);
        rctx.fill();
        rctx.strokeStyle = colors.surface;
        rctx.lineWidth = 1.8;
        rctx.stroke();
      });

      // Highlighted lookup key & clockwise link to owner
      if (lookupOwner) {
        const kAng = lookupPos * Math.PI * 2 - Math.PI / 2;
        const lx = cx + Math.cos(kAng) * (R + 22);
        const ly = cy + Math.sin(kAng) * (R + 22);

        const oAng = lookupOwner.pos * Math.PI * 2 - Math.PI / 2;
        const ox = cx + Math.cos(oAng) * R;
        const oy = cy + Math.sin(oAng) * R;

        rctx.strokeStyle = colors.text;
        rctx.lineWidth = 1.5;
        rctx.setLineDash([4, 3]);
        rctx.beginPath();
        rctx.moveTo(lx, ly);
        rctx.lineTo(ox, oy);
        rctx.stroke();
        rctx.setLineDash([]);

        rctx.fillStyle = colors.text;
        rctx.beginPath();
        rctx.arc(lx, ly, 5.5, 0, Math.PI * 2);
        rctx.fill();

        rctx.font = "700 11px monospace";
        rctx.textAlign = "center";
        rctx.fillText(lookupName, cx, 18);
      }

      // Draw Load Bars Canvas
      const { ctx: bctx } = VizKit.setupCanvas(barsCanvas, BW, BH);
      bctx.fillStyle = colors.bg;
      bctx.fillRect(0, 0, BW, BH);

      bctx.fillStyle = colors.textSubtle;
      bctx.font = "600 11px sans-serif";
      bctx.textAlign = "left";
      bctx.fillText("Key Load per Physical Server", 18, 22);

      const padL = 78;
      const padR = 54;
      const startY = 48;
      const barMaxW = BW - padL - padR;
      const rowH = Math.min(38, (BH - startY - 24) / Math.max(1, servers.length));

      // Ideal equal share vertical reference line
      const idealPct = 100 / Math.max(1, servers.length);
      const maxPct = Math.max(50, ...counts.map((c) => (c / numKeys) * 100));
      const idealX = padL + (idealPct / maxPct) * barMaxW;

      bctx.strokeStyle = colors.borderStrong;
      bctx.setLineDash([4, 4]);
      bctx.beginPath();
      bctx.moveTo(idealX, startY - 8);
      bctx.lineTo(idealX, startY + servers.length * rowH);
      bctx.stroke();
      bctx.setLineDash([]);

      servers.forEach((srv, idx) => {
        const y = startY + idx * rowH;
        const count = counts[idx];
        const pct = (count / numKeys) * 100;
        const barW = (pct / maxPct) * barMaxW;
        const col = NODE_COLORS[idx % NODE_COLORS.length];

        bctx.fillStyle = colors.text;
        bctx.font = "600 12px monospace";
        bctx.textAlign = "right";
        bctx.textBaseline = "middle";
        bctx.fillText(srv, padL - 10, y + 13);

        bctx.fillStyle = colors.surfaceMuted;
        bctx.fillRect(padL, y + 3, barMaxW, 20);

        bctx.fillStyle = col;
        bctx.fillRect(padL, y + 3, Math.max(2, barW), 20);

        bctx.fillStyle = colors.textMuted;
        bctx.font = "600 11px monospace";
        bctx.textAlign = "left";
        bctx.fillText(`${pct.toFixed(0)}%`, padL + barMaxW + 8, y + 13);
      });
    }

    addNodeBtn.addEventListener("click", () => {
      if (servers.length >= 7) return;
      const letter = String.fromCharCode(65 + servers.length);
      servers.push(`Node ${letter}`);
      draw();
    });

    remNodeBtn.addEventListener("click", () => {
      if (servers.length <= 1) return;
      servers.pop();
      draw();
    });

    vnodesSelect.addEventListener("change", draw);
    keysSelect.addEventListener("change", draw);
    lookupInput.addEventListener("input", draw);

    VizKit.onThemeChange(draw);
    draw();
  }

  document.addEventListener("DOMContentLoaded", () => {
    initClocks();
    initConsistentHashing();
  });
})();
