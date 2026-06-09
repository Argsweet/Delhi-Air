/**
 * Delhi AQI Dashboard — radial calendar, drill-down, draw to predict 2026
 */
(function () {
  const EMBED =
    document.getElementById("aqi-dashboard")?.dataset.aqiEmbed === "true";
  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const BURN_MONTHS = [10, 11];

  let DATA = null;
  let state = {
    year: 2020,
    selectedMonth: null,
    playTimer: null,
    drawPoints: [],
    isDrawing: false,
    revealed: false,
    predictScales: null,
  };

  const $ = (sel) => document.querySelector(sel);
  const viewHome = $("#view-home");
  const viewDetail = $("#view-detail");

  function chartContainerWidth(node) {
    if (!node) return 800;
    const measured =
      node.getBoundingClientRect?.().width || node.clientWidth || 0;
    if (measured > 20) return Math.round(measured);
    const card =
      node.closest?.(".chart-card") || node.closest?.(".predict-card");
    const cardW =
      card?.getBoundingClientRect?.().width || card?.clientWidth || 0;
    if (cardW > 20) return Math.round(cardW - 40);
    return 800;
  }

  function afterLayout(fn) {
    requestAnimationFrame(() => requestAnimationFrame(fn));
  }

  function scrollToDetail() {
    if (EMBED) {
      (
        document.querySelector(".dashboard-detail-rail") || viewDetail
      )?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function dataJsonUrl() {
    const v = document.body?.dataset?.build || Date.now();
    return new URL(
      `data/delhi_aqi.json?v=${encodeURIComponent(v)}`,
      window.location.href,
    ).href;
  }

  function fetchJsonWithTimeout(url, ms = 45000) {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { cache: "no-store", signal: ctrl.signal }).finally(() =>
      window.clearTimeout(timer),
    );
  }

  function setLoadStatus(message, isError) {
    const el = $("#cloud-load-status") || $("#aqi-load-status");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("is-error", !!isError);
  }

  /* ─── Load data ─── */
  async function loadData() {
    const fill = $("#loader-fill");
    const loader = $("#loader");
    if (fill) fill.style.width = "20%";
    setLoadStatus("Loading sensor data…", false);

    try {
      if (window.__delhiDataPromise) {
        DATA = await window.__delhiDataPromise;
      } else {
        const res = await fetchJsonWithTimeout(dataJsonUrl());
        if (!res.ok) {
          throw new Error(
            `Could not load data (${res.status}). Use a local server from delhi-dashboard/.`,
          );
        }
        DATA = await res.json();
      }
      if (!DATA?.monthly || !DATA?.years?.length) {
        throw new Error("Data file is empty or invalid.");
      }
      if (fill) fill.style.width = "100%";
      if (loader) loader.classList.add("hidden");
      setLoadStatus(
        EMBED
          ? "Data ready — explore the calendar below."
          : "Data ready — scroll through the clouds to enter.",
        false,
      );

      const startApp = () => {
        const app = $("#app");
        const loaderEl = $("#loader");
        if (loaderEl) {
          loaderEl.classList.add("hidden");
          loaderEl.style.display = "none";
        }
        if (app) app.classList.remove("hidden");
        document.body.style.removeProperty("--tunnel-reveal");
        init();
      };

      if (EMBED) {
        startApp();
      } else if (window.CloudTunnel) {
        $("#app").classList.remove("hidden");
        window.CloudTunnel.signalDataReady();
        window.CloudTunnel.onEmerge(startApp);
      } else {
        $("#cloud-intro")?.classList.add("hidden");
        document.body.classList.remove("tunnel-locked");
        startApp();
      }
    } catch (err) {
      console.error(err);
      const msg =
        err.name === "AbortError"
          ? "Data took too long to load. Refresh the page or use a faster connection."
          : err.message || "Failed to load data.";
      if (loader) {
        loader.classList.remove("hidden");
        loader.innerHTML =
          "<p style='color:#8b3a2a;padding:2rem;max-width:420px;text-align:center'>" +
          "Failed to load data. Run: <code>cd delhi-dashboard && python3 -m http.server 8080</code> " +
          "then open http://localhost:8080</p>";
      }
      setLoadStatus(msg, true);
      document.body.classList.remove("tunnel-locked");
      if (window.CloudTunnel?.signalDataError) {
        window.CloudTunnel.signalDataError(
          "Data failed to load — see message below.",
        );
      }
    }
  }

  function monthData(year, month) {
    return DATA?.monthly?.[String(year)]?.[String(month)] ?? null;
  }

  function partialMeta(year, month) {
    return DATA?.partialYearMeta?.[String(year)]?.[String(month)] ?? null;
  }

  function dailySeries(year, month) {
    return DATA?.daily?.[String(year)]?.[String(month)] ?? [];
  }

  function hourlySeries(year, month) {
    return DATA?.hourly?.[String(year)]?.[String(month)] ?? [];
  }

  function actual2026Meta(month) {
    return DATA?.actual2026Meta?.[String(month)] ?? null;
  }

  /* ─── Legend ─── */
  function buildLegend() {
    const ul = $("#legend-bins");
    ul.innerHTML = AQI_BINS.map(
      (b) =>
        `<li><span class="legend-swatch" style="background:${b.color}"></span>${b.label} · ${b.range}</li>`,
    ).join("");
  }

  /* ─── Radial chart ─── */
  function renderRadial() {
    const svg = d3.select("#radial-chart");
    svg.selectAll("*").remove();

    const width = 520;
    const height = 520;
    const cx = width / 2;
    const cy = height / 2;
    const innerR = 72;
    const outerR = 220;

    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%")
      .style("display", "block");

    const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

    const year = state.year;
    $("#radial-center").textContent = year;
    $("#year-display").textContent = year;

    const pie = d3.pie().value(1).sort(null).padAngle(0.015);

    const arc = d3.arc().innerRadius(innerR).outerRadius(outerR);

    const arcs = g
      .selectAll(".month-arc")
      .data(pie(d3.range(12)))
      .join("path")
      .attr("class", (d) => {
        const m = d.data + 1;
        const rec = monthData(year, m);
        return `month-arc ${rec ? "has-data" : "no-data"}`;
      })
      .attr("d", arc)
      .attr("fill", (d) => {
        const m = d.data + 1;
        const rec = monthData(year, m);
        if (!rec) return "#e6dcc8";
        return colorForBin(rec.bin);
      })
      .attr("stroke", "#f7f1e3")
      .attr("stroke-width", 2.5)
      .on("click", (_, d) => {
        const m = d.data + 1;
        if (monthData(year, m)) openDetail(year, m);
      });

    arcs.append("title").text((d) => {
      const m = d.data + 1;
      const rec = monthData(year, m);
      if (!rec) return `${MONTHS[d.data]} ${year}: no data`;
      return `${MONTHS[d.data]} ${year}\nAQI ${rec.aqi} · ${labelForBin(rec.bin)}`;
    });

    // Month labels
    const labelR = outerR + 28;
    g.selectAll(".month-label")
      .data(pie(d3.range(12)))
      .join("text")
      .attr("class", (d) => {
        const m = d.data + 1;
        return `month-label ${BURN_MONTHS.includes(m) ? "burn" : ""}`;
      })
      .attr("transform", (d) => {
        const a = (d.startAngle + d.endAngle) / 2;
        const x = Math.sin(a) * labelR;
        const y = -Math.cos(a) * labelR;
        return `translate(${x},${y})`;
      })
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#a8adb4")
      .attr("font-size", 12)
      .text((d) => MONTHS[d.data]);

    updateYearStats();
  }

  function updateYearStats() {
    const year = state.year;
    const recs = [];
    for (let m = 1; m <= 12; m++) {
      const r = monthData(year, m);
      if (r) recs.push(r);
    }
    if (!recs.length) {
      $("#stat-peak").textContent = "—";
      $("#stat-mean").textContent = "—";
      $("#stat-months").textContent = "0";
      return;
    }
    const peak = recs.reduce((a, b) => (a.aqi > b.aqi ? a : b));
    let peakMonth = 1;
    for (let m = 1; m <= 12; m++) {
      const r = monthData(year, m);
      if (r && r.aqi === peak.aqi) {
        peakMonth = m;
        break;
      }
    }
    const mean = recs.reduce((s, r) => s + r.aqi, 0) / recs.length;
    $("#stat-peak").textContent = `${peak.aqi} (${MONTHS[peakMonth - 1]})`;
    $("#stat-mean").textContent = String(Math.round(mean));
    $("#stat-months").textContent = String(recs.length);
  }

  /* ─── Detail view ─── */
  function openDetail(year, month, shouldScroll = true) {
    state.selectedMonth = { year, month };

    const rec = monthData(year, month);
    const mName = MONTHS[month - 1];
    const fcYear = DATA?.forecastYear ?? 2026;
    const partial = partialMeta(year, month);

    viewDetail.classList.add("view-active");
    $("#app")?.classList.add("has-month");

    $("#detail-title").textContent = `${mName} ${year}`;
    $("#detail-badge").textContent = `Delhi · ${year}`;
    const chartUnit = $("#chart-aqi-unit");
    if (chartUnit) {
      const fullMonth = new Date(2020, month - 1, 1).toLocaleString("en-US", {
        month: "long",
      });
      chartUnit.textContent = `(${fullMonth} ${year})`;
    }
    $("#detail-sub").textContent = `Mean AQI ${rec.aqi} (${labelForBin(rec.bin)})`;

    afterLayout(() => {
      renderDetailCharts(year, month);
      if (shouldScroll) scrollToDetail();
    });
  }

  function closeDetail() {
    $("#app")?.classList.remove("has-month");
    state.selectedMonth = null;
  }

  function chartMargins() {
    return { top: 14, right: 14, bottom: 26, left: 58 };
  }

  function mountSvg(container, W, H) {
    return d3
      .select(container)
      .append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("width", "100%")
      .attr("height", H)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("role", "img")
      .style("display", "block")
      .style("overflow", "hidden");
  }

  function drawGrid(g, y, w, ticks = 4) {
    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y).tickSize(-w).tickFormat("").ticks(ticks))
      .call((sel) => sel.select(".domain").remove());
  }

  function drawAxes(g, x, y, h, xTicks = 6, yTicks = 5) {
    const xAxis = g
      .append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${h})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(xTicks)
          .tickFormat((d) => String(Math.round(d))),
      );

    const yAxis = g
      .append("g")
      .attr("class", "axis y-axis")
      .call(
        d3
          .axisLeft(y)
          .ticks(yTicks)
          .tickFormat((d) => d3.format(",")(Math.round(d))),
      );

    // Inline STYLES (not attrs) so they beat the .axis CSS rule and are visible.
    [xAxis, yAxis].forEach((ax) => {
      ax.selectAll("text")
        .style("fill", "#4a3c2e")
        .style("font-size", "11px")
        .style("font-family", "Arial, Helvetica, sans-serif");
      ax.selectAll(".tick line").style("stroke", "rgba(74, 60, 46, 0.5)");
      ax.select(".domain").style("stroke", "rgba(74, 60, 46, 0.7)");
    });
  }

  let chartUid = 0;
  function nextGradId(prefix) {
    chartUid += 1;
    return `${prefix}-${chartUid}`;
  }

  function renderDetailCharts(year, month) {
    const daily = dailySeries(year, month);
    if (!daily.length) return;

    renderAqiChart("#chart-aqi", daily, `${MONTHS[month - 1]} ${year}`);
  }

  function renderAqiChart(selector, daily, title) {
    const el = d3.select(selector);
    el.selectAll("*").remove();
    const margin = { ...chartMargins(), left: 66, bottom: 50 };
    const W = chartContainerWidth(el.node());
    const H = 380;
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const svg = mountSvg(selector, W, H);
    const clipId = nextGradId("chart-clip");
    svg
      .append("defs")
      .append("clipPath")
      .attr("id", clipId)
      .append("rect")
      .attr("width", w)
      .attr("height", h);

    const gradId = nextGradId("area-gradient-aqi");
    const defs = svg.select("defs");
    const grad = defs
      .append("linearGradient")
      .attr("id", gradId)
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", 1);
    grad
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#dd8a4e")
      .attr("stop-opacity", 0.42);
    grad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#dd8a4e")
      .attr("stop-opacity", 0.04);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleLinear()
      .domain([1, d3.max(daily, (d) => d.day)])
      .range([0, w]);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(daily, (d) => d.aqi) * 1.1])
      .nice()
      .range([h, 0]);

    // Axes drawn MANUALLY (like the fire-counts chart) with a unique class and
    // inline styles, so no shared .axis CSS can hide them.
    const axisInk = "#4a3c2e";
    const axisLineInk = "rgba(74, 60, 46, 0.6)";
    const yTicks = y.ticks(5);
    const xTicks = x.ticks(6);

    const yAxisG = g.append("g").attr("class", "aqi-trend-axis");
    yAxisG
      .append("line")
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", 0)
      .attr("y2", h)
      .style("stroke", axisLineInk);
    yAxisG
      .selectAll("text")
      .data(yTicks)
      .join("text")
      .attr("x", -10)
      .attr("y", (d) => y(d) + 4)
      .attr("text-anchor", "end")
      .style("fill", axisInk)
      .style("font-size", "11px")
      .style("font-family", "Arial, Helvetica, sans-serif")
      .text((d) => d3.format(",")(Math.round(d)));
    yAxisG
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -h / 2)
      .attr("y", -margin.left + 14)
      .attr("text-anchor", "middle")
      .style("fill", axisInk)
      .style("font-size", "11px")
      .style("font-weight", "700")
      .style("font-family", "Arial, Helvetica, sans-serif")
      .text("Daily mean AQI");

    const xAxisG = g.append("g").attr("class", "aqi-trend-axis");
    xAxisG
      .append("line")
      .attr("x1", 0)
      .attr("x2", w)
      .attr("y1", h)
      .attr("y2", h)
      .style("stroke", axisLineInk);
    xAxisG
      .selectAll("text")
      .data(xTicks)
      .join("text")
      .attr("x", (d) => x(d))
      .attr("y", h + 20)
      .attr("text-anchor", "middle")
      .style("fill", axisInk)
      .style("font-size", "11px")
      .style("font-family", "Arial, Helvetica, sans-serif")
      .text((d) => String(Math.round(d)));
    xAxisG
      .append("text")
      .attr("x", w / 2)
      .attr("y", h + 42)
      .attr("text-anchor", "middle")
      .style("fill", axisInk)
      .style("font-size", "11px")
      .style("font-weight", "700")
      .style("font-family", "Arial, Helvetica, sans-serif")
      .text("Day of month");

    const line = d3
      .line()
      .x((d) => x(d.day))
      .y((d) => y(d.aqi))
      .curve(d3.curveMonotoneX);

    const area = d3
      .area()
      .x((d) => x(d.day))
      .y0(h)
      .y1((d) => y(d.aqi))
      .curve(d3.curveMonotoneX);

    const plotG = g.append("g").attr("clip-path", `url(#${clipId})`);
    plotG
      .append("path")
      .datum(daily)
      .attr("class", "area-aqi")
      .attr("fill", `url(#${gradId})`)
      .attr("d", area);
    plotG.append("path").datum(daily).attr("class", "line-aqi").attr("d", line);

    plotG
      .selectAll(".dot-aqi")
      .data(daily)
      .join("circle")
      .attr("class", "dot-aqi")
      .attr("cx", (d) => x(d.day))
      .attr("cy", (d) => y(d.aqi))
      .attr("r", 2.4);

    // ── Hover tooltip: snap to the nearest day, show its exact AQI ──
    const bisectDay = d3.bisector((d) => d.day).left;

    const capture = g
      .append("rect")
      .attr("width", w)
      .attr("height", h)
      .style("fill", "none")
      .style("pointer-events", "all");

    const focus = g
      .append("g")
      .attr("class", "aqi-focus")
      .style("pointer-events", "none")
      .style("display", "none");
    focus
      .append("line")
      .attr("y1", 0)
      .attr("y2", h)
      .style("stroke", "rgba(74, 60, 46, 0.45)")
      .style("stroke-dasharray", "3 3");
    focus
      .append("circle")
      .attr("r", 4.5)
      .style("fill", "#c2541f")
      .style("stroke", "#fff7ec")
      .style("stroke-width", 1.6);
    const tipG = focus.append("g");
    const tipRect = tipG
      .append("rect")
      .attr("rx", 5)
      .attr("height", 21)
      .style("fill", "#2e2925")
      .style("opacity", 0.93);
    const tipText = tipG
      .append("text")
      .attr("y", 14.5)
      .style("fill", "#fff")
      .style("font-size", "11px")
      .style("font-family", "Arial, Helvetica, sans-serif");

    capture
      .on("mousemove", (event) => {
        if (!daily.length) return;
        const [mx] = d3.pointer(event, g.node());
        const day0 = x.invert(mx);
        const i = bisectDay(daily, day0);
        const dPrev = daily[Math.max(0, i - 1)];
        const dCur = daily[Math.min(daily.length - 1, i)];
        const d = day0 - dPrev.day < dCur.day - day0 ? dPrev : dCur;
        const px = x(d.day);
        const py = y(d.aqi);
        focus.style("display", null);
        focus.select("line").attr("x1", px).attr("x2", px);
        focus.select("circle").attr("cx", px).attr("cy", py);
        tipText.text(`Day ${d.day} · AQI ${Math.round(d.aqi)}`);
        const tw = tipText.node().getComputedTextLength() + 16;
        let tx = px - tw / 2;
        tx = Math.max(0, Math.min(w - tw, tx));
        let ty = py - 31;
        if (ty < 0) ty = py + 12;
        tipG.attr("transform", `translate(${tx},${ty})`);
        tipRect.attr("width", tw);
        tipText.attr("x", 8);
      })
      .on("mouseleave", () => focus.style("display", "none"));
  }

  function redrawUserDraw(ctx, x, y) {
    const pts = state.drawPoints;
    if (!ctx || pts.length < 2) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = "#2e2925";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    pts.forEach((p, i) => {
      const sx = x(p.day);
      const sy = y(p.aqi);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();
  }

  function reveal2026(month, series) {
    state.revealed = true;
    $("#btn-finish").disabled = true;
    const panel = $("#reveal-panel");
    panel.classList.remove("hidden");

    const mName = MONTHS[month - 1];
    const fcYear = DATA?.forecastYear ?? 2026;
    const meta = actual2026Meta(month);
    let title = `Actual ${mName} ${fcYear}`;
    let note = "";

    if (!series.length) {
      title = `${mName} ${fcYear} — no data`;
      note = "No 2026 curve available for this month.";
    } else if (meta?.source === "estimated") {
      title = `Estimated ${mName} ${fcYear}`;
      note =
        meta.note ||
        "This month is estimated from 2025–2026 trends (sensors only through May 2026).";
    } else if (meta?.source === "observed") {
      note = `Recorded in the Delhi sensor dataset through May ${fcYear}.`;
    }

    $("#reveal-title").textContent = title;
    $("#reveal-note").textContent = note;

    const el = d3.select("#chart-reveal");
    el.selectAll("*").remove();

    const W = chartContainerWidth(el.node());
    const H = EMBED ? 320 : 220;
    const mg = chartMargins();
    const iw = W - mg.left - mg.right;
    const ih = H - mg.top - mg.bottom;

    const x2 = d3
      .scaleLinear()
      .domain([1, d3.max(series, (d) => d.day)])
      .range([0, iw]);
    const y2 = d3
      .scaleLinear()
      .domain([0, d3.max(series, (d) => d.aqi) * 1.1])
      .nice()
      .range([ih, 0]);

    const svg = mountSvg("#chart-reveal", W, H);
    const clipId = nextGradId("chart-clip");
    svg
      .append("defs")
      .append("clipPath")
      .attr("id", clipId)
      .append("rect")
      .attr("width", iw)
      .attr("height", ih);
    const g = svg
      .append("g")
      .attr("transform", `translate(${mg.left},${mg.top})`);

    drawGrid(g, y2, iw, 5);
    drawAxes(g, x2, y2, ih, 6, 5);

    const line = d3
      .line()
      .x((d) => x2(d.day))
      .y((d) => y2(d.aqi))
      .curve(d3.curveMonotoneX);

    g.append("g")
      .attr("clip-path", `url(#${clipId})`)
      .append("path")
      .datum(series)
      .attr("class", "line-actual")
      .attr("d", line);

    panel.scrollIntoView({
      behavior: "smooth",
      block: EMBED ? "center" : "start",
    });
  }

  /* ─── Draw 2026 prediction (2023-style) ─── */
  function setupPredictChart(viewYear, viewMonth) {
    const wrap = $("#predict-wrap");
    const canvas = $("#predict-canvas");
    const svg = d3.select("#predict-grid");
    svg.selectAll("*").remove();

    const W = chartContainerWidth(wrap);
    const H = wrap.clientHeight;
    canvas.width = W;
    canvas.height = H;
    const margin = { top: 32, right: 24, bottom: 48, left: 72 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const viewDaily = dailySeries(viewYear, viewMonth);
    const actual2026 = dailySeries(DATA?.forecastYear ?? 2026, viewMonth);

    const maxDay = Math.max(
      28,
      d3.max(viewDaily, (d) => d.day) || 30,
      d3.max(actual2026, (d) => d.day) || 0,
    );

    const yMax = Math.max(
      500,
      d3.max(viewDaily, (d) => d.aqi) || 0,
      d3.max(actual2026, (d) => d.aqi) || 0,
      300,
    );

    const x = d3
      .scaleLinear()
      .domain([1, maxDay])
      .range([margin.left, margin.left + w]);
    const y = d3
      .scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([margin.top + h, margin.top]);

    state.predictScales = {
      x,
      y,
      maxDay,
      yMax,
      margin,
      W,
      H,
      viewYear,
      viewMonth,
    };

    const clipId = nextGradId("predict-clip");
    svg
      .attr("width", W)
      .attr("height", H)
      .append("defs")
      .append("clipPath")
      .attr("id", clipId)
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", w)
      .attr("height", h);

    const g = svg.append("g");

    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickSize(-w).tickFormat("").ticks(5))
      .call((sel) => sel.select(".domain").remove());

    g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${margin.top + h})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(8)
          .tickFormat((d) => `Day ${d}`),
      );

    g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(8));

    const line = d3
      .line()
      .x((d) => x(d.day))
      .y((d) => y(d.aqi))
      .curve(d3.curveMonotoneX);

    if (viewDaily.length) {
      g.append("path")
        .datum(viewDaily)
        .attr("fill", "none")
        .attr("class", "line-ref")
        .attr("clip-path", `url(#${clipId})`)
        .attr("stroke", "rgba(180,188,198,0.5)")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,4")
        .attr("d", line);
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    if (state.drawPoints.length >= 2) redrawUserDraw(ctx, x, y);

    function canvasPoint(evt) {
      const rect = canvas.getBoundingClientRect();
      const px = ((evt.clientX - rect.left) / rect.width) * W;
      const py = ((evt.clientY - rect.top) / rect.height) * H;
      const day = x.invert(px);
      const aqi = y.invert(py);
      return {
        day: Math.max(1, Math.min(maxDay, day)),
        aqi: Math.max(0, Math.min(yMax, aqi)),
      };
    }

    canvas.onmousedown = (e) => {
      if (state.revealed) return;
      state.isDrawing = true;
      state.drawPoints = [canvasPoint(e)];
      redrawUserDraw(ctx, x, y);
    };
    canvas.onmousemove = (e) => {
      if (!state.isDrawing || state.revealed) return;
      state.drawPoints.push(canvasPoint(e));
      redrawUserDraw(ctx, x, y);
    };
    canvas.onmouseup = () => {
      state.isDrawing = false;
    };
    canvas.onmouseleave = () => {
      state.isDrawing = false;
    };

    canvas.ontouchstart = (e) => {
      e.preventDefault();
      canvas.onmousedown(e.touches[0]);
    };
    canvas.ontouchmove = (e) => {
      e.preventDefault();
      canvas.onmousemove(e.touches[0]);
    };
    canvas.ontouchend = () => canvas.onmouseup();

    $("#btn-clear-draw").onclick = () => {
      if (state.revealed) return;
      state.drawPoints = [];
      ctx.clearRect(0, 0, W, H);
    };

    $("#btn-finish").onclick = () => {
      const series = dailySeries(DATA?.forecastYear ?? 2026, viewMonth);
      reveal2026(viewMonth, series);
    };
  }

  /* ─── Year slider / play ─── */
  function bindControls() {
    const slider = $("#year-slider");
    const calendarYears = DATA.years.filter((y) => y <= 2023);
    slider.innerHTML = calendarYears
      .map((y) => `<option value="${y}">${y}</option>`)
      .join("");
    slider.value = "2020";
    state.year = 2020;

    function applyYear(y) {
      state.year = +y;
      slider.value = String(y);
      renderRadial();
      if (state.selectedMonth) {
        const month = state.selectedMonth.month;
        if (monthData(state.year, month)) {
          openDetail(state.year, month, false);
        } else {
          closeDetail();
        }
      }
    }

    slider.addEventListener("input", () => applyYear(slider.value));

    const stepYear = (dir) => {
      const i = calendarYears.indexOf(state.year);
      const j = Math.max(0, Math.min(calendarYears.length - 1, i + dir));
      applyYear(calendarYears[j]);
    };
    $("#year-prev")?.addEventListener("click", () => stepYear(-1));
    $("#year-next")?.addEventListener("click", () => stepYear(1));

    $("#year-play").addEventListener("click", () => {
      if (state.playTimer) {
        clearInterval(state.playTimer);
        state.playTimer = null;
        $("#year-play").textContent = "▶";
        return;
      }
      $("#year-play").textContent = "❚❚";
      const years = DATA.years.filter((y) => y <= 2023);
      let i = years.indexOf(state.year);
      state.playTimer = setInterval(() => {
        i = (i + 1) % years.length;
        state.year = years[i];
        slider.value = state.year;
        renderRadial();
        if (state.selectedMonth) {
          const month = state.selectedMonth.month;
          if (monthData(state.year, month))
            openDetail(state.year, month, false);
          else closeDetail();
        }
      }, 1200);
    });

    $("#btn-back").addEventListener("click", closeDetail);
  }

  function mountEmbeddedDetailRail() {
    if (!EMBED || !viewDetail) return;
    const grid = document.querySelector(".dashboard-grid");
    const panelSide = document.querySelector(".panel-side");
    const radialPanel = document.querySelector(".panel-radial");
    if (
      !grid ||
      !panelSide ||
      !radialPanel ||
      document.querySelector(".dashboard-detail-rail")
    )
      return;

    const rail = document.createElement("div");
    rail.className = "dashboard-detail-rail";
    grid.insertBefore(rail, panelSide);
    radialPanel.appendChild(panelSide);
    rail.appendChild(viewDetail);

    const predict = document.querySelector("#predict-section");
    if (predict) {
      const stage = document.createElement("div");
      stage.className = "dashboard-predict-stage";
      grid.insertAdjacentElement("afterend", stage);
      stage.appendChild(predict);
    }
  }

  function init() {
    mountEmbeddedDetailRail();
    buildLegend();
    bindControls();
    renderRadial();
    // Hold the 3-column detail layout permanently so the radial never resizes;
    // the right column swaps placeholder text -> trend via .has-month.
    $("#app")?.classList.add("is-detail");
    viewDetail?.classList.add("view-active");
    initPredict();
    window.addEventListener("resize", () => {
      if (state.selectedMonth) {
        const { year, month } = state.selectedMonth;
        renderDetailCharts(year, month);
      }
      if (!state.revealed && state.predictMonth) {
        setupPredictChart(state.predictRefYear, state.predictMonth);
      }
    });
  }

  // Draw-to-predict runs as its own independent section with its own month
  // picker — no radial click required.
  function initPredict() {
    const sel = document.querySelector("#predict-month");
    if (!sel || !DATA) return;
    const fcYear = DATA.forecastYear ?? 2026;
    const refYear = DATA.years.filter((y) => y <= 2023).slice(-1)[0] || 2023;
    state.predictRefYear = refYear;
    sel.innerHTML = MONTHS.map(
      (m, i) => `<option value="${i + 1}">${m}</option>`,
    ).join("");
    sel.value = "11";

    function loadPredict(month) {
      state.predictMonth = month;
      state.drawPoints = [];
      state.revealed = false;
      state.isDrawing = false;
      $("#reveal-panel")?.classList.add("hidden");
      const finish = $("#btn-finish");
      if (finish) finish.disabled = false;
      const label = $("#predict-month-label");
      if (label) {
        const full = new Date(2020, month - 1, 1).toLocaleString("en-US", {
          month: "long",
        });
        label.textContent = `${full} ${fcYear}`;
      }
      afterLayout(() => setupPredictChart(refYear, month));
    }

    sel.addEventListener("change", () => loadPredict(+sel.value));
    loadPredict(11);
  }

  function boot() {
    if (EMBED) {
      const section = document.getElementById("aqi-dashboard-section");
      if (!section) {
        loadData();
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries[0]?.isIntersecting) return;
          observer.disconnect();
          loadData();
        },
        { rootMargin: "240px 0px" },
      );
      observer.observe(section);
      return;
    }
    loadData();
  }

  boot();
})();
