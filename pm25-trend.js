/* Delhi annual mean PM2.5 over the years — interactive "draw your guess, then
   reveal the truth" chart.
   2014–2017: WHO ambient air quality database (via Wikipedia).
   2018–2024: IQAir World Air Quality Report. */
(function () {
  "use strict";

  const DATA = [
    { year: 2014, pm25: 198 },
    { year: 2015, pm25: 113 },
    { year: 2016, pm25: 149 },
    { year: 2017, pm25: 129 },
    { year: 2018, pm25: 113.5 },
    { year: 2019, pm25: 98.6 },
    { year: 2020, pm25: 84.1 },
    { year: 2021, pm25: 96.4 },
    { year: 2022, pm25: 92.6 },
    { year: 2023, pm25: 102.1 },
    { year: 2024, pm25: 108.3 },
  ];

  // One real data point handed to the reader as an anchor.
  const ANCHOR = DATA.find((d) => d.year === 2019);

  const MARKERS = [
    { year: 2016, label: "Odd-even car trial" },
    { year: 2017, label: "GRAP pollution plan" },
    { year: 2019, label: "Clean Air Programme" },
    { year: 2020, label: "COVID-19 lockdown" },
  ];

  const INK = "#4a3c2e";
  const AXIS_LINE = "rgba(74, 60, 46, 0.55)";
  const GRID = "rgba(74, 60, 46, 0.1)";
  const RUST = "#c2541f";
  const GUESS = "#2f6f8f"; // reader's line — distinct teal-blue
  const Y_MAX = 220;

  const state = { points: [], revealed: false };
  let userPath = null;
  let xScale = null;
  let yScale = null;

  const $ = (id) => document.getElementById(id);

  const lineGen = () =>
    window.d3
      .line()
      .x((d) => xScale(d.year))
      .y((d) => yScale(d.pm25))
      .curve(window.d3.curveMonotoneX);

  function sortedPoints() {
    return state.points.slice().sort((a, b) => a.year - b.year);
  }

  function updateUserLine() {
    if (!userPath) return;
    const pts = sortedPoints();
    userPath.attr("d", pts.length > 1 ? lineGen()(pts) : null);
    const confirmBtn = $("pm25-confirm");
    if (confirmBtn && !state.revealed) confirmBtn.disabled = pts.length < 3;
  }

  function render() {
    const host = $("pm25-trend-chart");
    if (!host || typeof window.d3 === "undefined") return;
    const d3 = window.d3;

    const width = host.clientWidth || 900;
    const height = Math.max(440, Math.min(580, Math.round(width * 0.46)));
    const margin = { top: 38, right: 26, bottom: 50, left: 78 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    d3.select(host).selectAll("*").remove();
    const svg = d3
      .select(host)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", height)
      .style("display", "block")
      .style("overflow", "visible")
      .style("touch-action", "none");

    const defs = svg.append("defs");
    const grad = defs
      .append("linearGradient")
      .attr("id", "pm25-area-grad")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", 1);
    grad
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", RUST)
      .attr("stop-opacity", 0.32);
    grad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", RUST)
      .attr("stop-opacity", 0.02);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([2014, 2024]).range([0, w]);
    const y = d3.scaleLinear().domain([0, Y_MAX]).range([h, 0]);
    xScale = x;
    yScale = y;

    // ── Grid + Y axis (manual, inline styles so always visible) ──
    const yTicks = y.ticks(7);
    yTicks.forEach((t) => {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", w)
        .attr("y1", y(t))
        .attr("y2", y(t))
        .style("stroke", GRID);
      g.append("text")
        .attr("x", -12)
        .attr("y", y(t) + 4)
        .attr("text-anchor", "end")
        .style("fill", INK)
        .style("font-size", "12px")
        .style("font-family", "Arial, Helvetica, sans-serif")
        .text(t);
    });
    g.append("line")
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", 0)
      .attr("y2", h)
      .style("stroke", AXIS_LINE);
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -h / 2)
      .attr("y", -margin.left + 18)
      .attr("text-anchor", "middle")
      .style("fill", INK)
      .style("font-size", "12px")
      .style("font-weight", "700")
      .style("font-family", "Arial, Helvetica, sans-serif")
      .text("Annual mean PM2.5 (µg/m³)");

    // ── X axis (years) ──
    g.append("line")
      .attr("x1", 0)
      .attr("x2", w)
      .attr("y1", h)
      .attr("y2", h)
      .style("stroke", AXIS_LINE);
    DATA.forEach((d) => {
      g.append("text")
        .attr("x", x(d.year))
        .attr("y", h + 22)
        .attr("text-anchor", "middle")
        .style("fill", INK)
        .style("font-size", "12px")
        .style("font-family", "Arial, Helvetica, sans-serif")
        .text(d.year);
    });

    // ── WHO guideline (5 µg/m³) ──
    g.append("line")
      .attr("x1", 0)
      .attr("x2", w)
      .attr("y1", y(5))
      .attr("y2", y(5))
      .style("stroke", "#2e7d4f")
      .style("stroke-width", 1.6)
      .style("stroke-dasharray", "6 4");
    g.append("text")
      .attr("x", w)
      .attr("y", y(5) - 7)
      .attr("text-anchor", "end")
      .style("fill", "#2e7d4f")
      .style("font-size", "11px")
      .style("font-weight", "700")
      .style("font-family", "Arial, Helvetica, sans-serif")
      .text("WHO guideline · 5 µg/m³");

    // ── Event markers (only after reveal) ──
    if (state.revealed) {
      MARKERS.forEach((m) => {
        const mx = x(m.year);
        g.append("line")
          .attr("x1", mx)
          .attr("x2", mx)
          .attr("y1", 0)
          .attr("y2", h)
          .style("stroke", "rgba(74, 60, 46, 0.3)")
          .style("stroke-dasharray", "2 4");
        g.append("text")
          .attr("transform", `translate(${mx - 5}, ${h - 8}) rotate(-90)`)
          .attr("text-anchor", "start")
          .style("fill", "rgba(74, 60, 46, 0.7)")
          .style("font-size", "10.5px")
          .style("font-weight", "700")
          .style("font-family", "Arial, Helvetica, sans-serif")
          .text(m.label);
      });
    }

    // ── Real line + area + dots (only after reveal) ──
    if (state.revealed) {
      const area = d3
        .area()
        .x((d) => x(d.year))
        .y0(h)
        .y1((d) => y(d.pm25))
        .curve(d3.curveMonotoneX);
      g.append("path")
        .datum(DATA)
        .attr("d", area)
        .attr("fill", "url(#pm25-area-grad)");
      g.append("path")
        .datum(DATA)
        .attr("d", lineGen()(DATA))
        .attr("fill", "none")
        .attr("stroke", RUST)
        .attr("stroke-width", 3)
        .attr("stroke-linejoin", "round");
      g.selectAll("circle.realdot")
        .data(DATA)
        .join("circle")
        .attr("cx", (d) => x(d.year))
        .attr("cy", (d) => y(d.pm25))
        .attr("r", 4)
        .attr("fill", RUST)
        .attr("stroke", "#fbf3e6")
        .attr("stroke-width", 1.5);
      g.selectAll("text.realval")
        .data(DATA)
        .join("text")
        .attr("x", (d) => x(d.year))
        .attr("y", (d) => y(d.pm25) - 12)
        .attr("text-anchor", "middle")
        .style("fill", RUST)
        .style("font-size", "11px")
        .style("font-weight", "700")
        .style("font-family", "Arial, Helvetica, sans-serif")
        .text((d) => Math.round(d.pm25));
    }

    // ── Anchor point (the one real reading we give them) ──
    g.append("circle")
      .attr("cx", x(ANCHOR.year))
      .attr("cy", y(ANCHOR.pm25))
      .attr("r", 5.5)
      .attr("fill", "#2b2620")
      .attr("stroke", "#fbf3e6")
      .attr("stroke-width", 2);
    if (!state.revealed) {
      g.append("text")
        .attr("x", x(ANCHOR.year))
        .attr("y", y(ANCHOR.pm25) - 14)
        .attr("text-anchor", "middle")
        .style("fill", "#2b2620")
        .style("font-size", "11px")
        .style("font-weight", "700")
        .style("font-family", "Arial, Helvetica, sans-serif")
        .text(`2019: ${ANCHOR.pm25}`);
    }

    // ── Reader's drawn line ──
    userPath = g
      .append("path")
      .attr("fill", "none")
      .attr("stroke", GUESS)
      .attr("stroke-width", 3)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("stroke-dasharray", state.revealed ? "6 5" : null);
    updateUserLine();

    // ── Drawing surface (active only before reveal) ──
    if (!state.revealed) {
      const clampYear = (v) => Math.max(2014, Math.min(2024, v));
      const clampPm = (v) => Math.max(0, Math.min(Y_MAX, v));
      let drawing = false;

      const addPoint = (event) => {
        const [mx, my] = d3.pointer(event, g.node());
        const year = clampYear(x.invert(mx));
        const pm25 = clampPm(y.invert(my));
        // keep the line a left-to-right function of year
        state.points = state.points.filter(
          (p) => Math.abs(p.year - year) > 0.18,
        );
        state.points.push({ year, pm25 });
        updateUserLine();
      };

      g.append("rect")
        .attr("width", w)
        .attr("height", h)
        .style("fill", "transparent")
        .style("cursor", "crosshair")
        .style("touch-action", "none")
        .on("pointerdown", function (event) {
          drawing = true;
          this.setPointerCapture?.(event.pointerId);
          addPoint(event);
        })
        .on("pointermove", (event) => {
          if (drawing) addPoint(event);
        })
        .on("pointerup", () => {
          drawing = false;
        })
        .on("pointerleave", () => {
          drawing = false;
        });
    }
  }

  function reveal() {
    if (state.revealed) return;
    state.revealed = true;
    const title = $("pm25-draw-title");
    const desc = $("pm25-draw-desc");
    if (title) title.textContent = "Delhi's air crisis isn't new.";
    if (desc) {
      desc.textContent =
        "Whatever you drew, the real line barely improves. For more than a " +
        "decade Delhi's annual PM2.5 has stayed roughly 15–40× the WHO safe " +
        "limit — easing only during the 2020 lockdown before climbing back. " +
        "This is a persistent, structural crisis, not a passing spike.";
    }
    const controls = $("pm25-draw-controls");
    if (controls) controls.setAttribute("hidden", "");
    render();
  }

  function clearDrawing() {
    if (state.revealed) return;
    state.points = [];
    updateUserLine();
    const confirmBtn = $("pm25-confirm");
    if (confirmBtn) confirmBtn.disabled = true;
  }

  let raf = 0;
  function onResize() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(render);
  }

  function init() {
    render();
    $("pm25-confirm")?.addEventListener("click", reveal);
    $("pm25-clear")?.addEventListener("click", clearDrawing);
    window.addEventListener("resize", onResize);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
