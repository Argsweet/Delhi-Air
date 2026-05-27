// Component script 1
(() => {

      const canvas = document.querySelector("#smokeCanvas");
      const ctx = canvas.getContext("2d");
      const intro = document.querySelector(".intro-smoke");
      const cursor = document.querySelector(".eraser-cursor");

      let width = 0;
      let height = 0;
      let lastPoint = null;
      let smokePatternReady = false;
      let smokeCleared = false;
      let smokeScrollProgress = 0;
      let touchStartY = null;
      const SCROLL_CLEAR_THRESHOLD = 0.45;
      const SMOKE_SCROLL_DISTANCE = 420;

      function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (smokeCleared) {
          clearSmokeLayer();
        } else {
          drawSmokeLayer();
        }
      }

      function drawSmokeLayer() {
        ctx.globalCompositeOperation = "source-over";
        ctx.clearRect(0, 0, width, height);

        const base = ctx.createLinearGradient(0, 0, 0, height);
        base.addColorStop(0, "rgba(0, 0, 0, 0.985)");
        base.addColorStop(0.45, "rgba(4, 4, 4, 0.96)");
        base.addColorStop(1, "rgba(12, 12, 12, 0.93)");
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < 125; i++) {
          const x = Math.random() * width;
          const y = Math.random() * height;
          const r = Math.random() * 180 + 70;
          const haze = ctx.createRadialGradient(x, y, 0, x, y, r);
          haze.addColorStop(0, `rgba(42,42,42,${Math.random() * 0.12 + 0.08})`);
          haze.addColorStop(
            0.48,
            `rgba(18,18,18,${Math.random() * 0.12 + 0.08})`,
          );
          haze.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = haze;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 0.12;
        for (let i = 0; i < 5000; i++) {
          const shade = Math.floor(Math.random() * 25 + 5);
          ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
          ctx.fillRect(Math.random() * width, Math.random() * height, 1.4, 1.4);
        }
        ctx.globalAlpha = 1;
        smokePatternReady = true;
      }

      function clearSmokeLayer() {
        smokeCleared = true;
        smokeScrollProgress = 1;
        smokePatternReady = false;
        ctx.globalCompositeOperation = "source-over";
        ctx.clearRect(0, 0, width, height);
        canvas.style.opacity = "0";
        canvas.style.pointerEvents = "none";
        cursor.style.opacity = "0";
      }

      function scrubSmokeWithScroll(deltaY) {
        if (smokeCleared || deltaY <= 0 || window.scrollY > 2) return false;

        const previousProgress = smokeScrollProgress;
        smokeScrollProgress = Math.min(1, previousProgress + deltaY / SMOKE_SCROLL_DISTANCE);
        canvas.style.opacity = String(1 - smokeScrollProgress);
        cursor.style.opacity = "0";

        if (smokeScrollProgress >= 1) {
          const usedDelta = (1 - previousProgress) * SMOKE_SCROLL_DISTANCE;
          const extraDelta = Math.max(0, deltaY - usedDelta);
          clearSmokeLayer();
          if (extraDelta > 0) {
            window.scrollBy(0, extraDelta);
          }
        }

        return true;
      }

      function handleSmokeWheel(event) {
        if (scrubSmokeWithScroll(event.deltaY)) {
          event.preventDefault();
        }
      }

      function handleSmokeTouchStart(event) {
        touchStartY = event.touches[0]?.clientY ?? null;
      }

      function handleSmokeTouchMove(event) {
        if (touchStartY === null) return;

        const currentY = event.touches[0]?.clientY ?? touchStartY;
        const deltaY = touchStartY - currentY;
        touchStartY = currentY;

        if (scrubSmokeWithScroll(deltaY)) {
          event.preventDefault();
        }
      }

      function eraseAt(x, y) {
        if (!smokePatternReady) return;
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";

        const radius = 66;
        const fade = ctx.createRadialGradient(x, y, 0, x, y, radius);
        fade.addColorStop(0, "rgba(0,0,0,0.9)");
        fade.addColorStop(0.58, "rgba(0,0,0,0.72)");
        fade.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = fade;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      function eraseLine(from, to) {
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        const steps = Math.max(1, Math.floor(distance / 18));

        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          eraseAt(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
        }
      }

      function handlePointerMove(event) {
        const rect = canvas.getBoundingClientRect();
        const point = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };

        cursor.style.left = `${event.clientX}px`;
        cursor.style.top = `${event.clientY}px`;

        if (lastPoint) eraseLine(lastPoint, point);
        eraseAt(point.x, point.y);
        lastPoint = point;
      }

      function handleScrollFade() {
        if (smokeCleared) {
          canvas.style.opacity = "0";
          return;
        }

        if (window.scrollY >= window.innerHeight * SCROLL_CLEAR_THRESHOLD) {
          clearSmokeLayer();
          return;
        }

        const progress = Math.min(
          window.scrollY / (window.innerHeight * 0.72),
          1,
        );
        canvas.style.opacity = String(1 - progress);
        cursor.style.opacity = progress > 0.18 ? 0 : undefined;
      }

      canvas.addEventListener("pointermove", handlePointerMove);
      canvas.addEventListener("pointerleave", () => {
        lastPoint = null;
      });

      window.addEventListener("resize", resizeCanvas);
      window.addEventListener("wheel", handleSmokeWheel, { passive: false });
      window.addEventListener("touchstart", handleSmokeTouchStart, { passive: true });
      window.addEventListener("touchmove", handleSmokeTouchMove, { passive: false });
      window.addEventListener("scroll", handleScrollFade, { passive: true });

      resizeCanvas();
    
})();

// Component script 3
(() => {
  const root = document.querySelector("#cigarette-interactive");
  if (!root) return;

  const ACTUAL_CIGARETTES = 44;
  let guess = 25;

  const guessEl = root.querySelector("#guess-number");
  const guessInput = root.querySelector("#guess-input");
  const liveEl = root.querySelector("#live-guess");
  const afterEl = root.querySelector("#after-guess");
  const liveGridEl = root.querySelector("#guess-cig-grid");
  const gridEl = root.querySelector("#cig-grid");
  const commentEl = root.querySelector("#guess-comment");
  const canvas = root.querySelector("#guess-histogram");

  function setGuess(nextGuess) {
    guess = Math.max(0, Math.min(100, Number(nextGuess) || 0));
    if (guessEl) guessEl.textContent = guess;
    guessInput.value = guess;
    renderCigaretteGrid(liveGridEl, guess);
    liveGridEl.style.setProperty("--cig-count", Math.max(guess, 1));

    if (!afterEl.hidden) drawHistogram();
  }

  function renderCigaretteGrid(target, count) {
    target.innerHTML = "";
    target.classList.toggle("is-empty", count === 0);
    const columns = Math.min(10, Math.max(6, Math.ceil(Math.sqrt(count * 1.1))));
    const rows = Math.max(1, Math.ceil(count / columns));
    target.style.setProperty("--cig-columns", columns);
    target.style.setProperty("--cig-rows", rows);

    if (count === 0) {
      target.innerHTML = `<p class="empty-grid-note">0 cigarettes/day</p>`;
      return;
    }

    for (let i = 0; i < count; i++) {
      const icon = document.createElement("div");
      icon.className = "cig-icon";
      icon.innerHTML = `<svg viewBox="0 0 46 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g transform="rotate(-24 21 8)">
          <rect x="2" y="6" width="14" height="4" rx="1.1" fill="#E4A23A"></rect>
          <rect x="15" y="5.2" width="22" height="5.6" rx="1.4" fill="#F1E9D8"></rect>
          <rect x="36" y="5.2" width="6.5" height="5.6" rx="1.1" fill="#D8673F"></rect>
          <path d="M41.4 4.5 C43.5 2.9 42.1 1.5 44 0.5" fill="none" stroke="#60605C" stroke-width="0.9" stroke-linecap="round"></path>
        </g>
      </svg>`;
      target.appendChild(icon);
    }
  }

  function drawHistogram() {
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(260, canvas.clientWidth || 360);
    const height = 150;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const values = [1.5, 2.2, 5.5, 8.8, 15.2, 16.0, 13.5, 10.2, 8.0, 6.5, 4.8];
    const pad = { top: 22, right: 12, bottom: 28, left: 34 };
    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;
    const barWidth = chartWidth / values.length;
    const maxValue = Math.max(...values);

    values.forEach((value, index) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = pad.left + index * barWidth;
      const y = pad.top + chartHeight - barHeight;
      ctx.fillStyle = "rgba(74, 67, 59, 0.66)";
      ctx.fillRect(x + 2, y, Math.max(2, barWidth - 4), barHeight);
    });

    ctx.strokeStyle = "rgba(95, 78, 60, 0.32)";
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + chartHeight);
    ctx.lineTo(width - pad.right, pad.top + chartHeight);
    ctx.stroke();

    ctx.fillStyle = "rgba(80, 65, 48, 0.8)";
    ctx.font = "10px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    for (let label = 0; label <= 100; label += 20) {
      const x = pad.left + (label / 100) * chartWidth;
      ctx.fillText(label, x, height - 7);
    }

    drawMarker(ctx, pad, chartWidth, chartHeight, guess, "#4a6fa5", "YOUR GUESS");
    drawMarker(ctx, pad, chartWidth, chartHeight, ACTUAL_CIGARETTES, "#B84020", "ACTUAL: 44");
  }

  function drawMarker(ctx, pad, chartWidth, chartHeight, value, color, label) {
    const x = pad.left + (value / 100) * chartWidth;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, pad.top + chartHeight);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.font = "bold 10px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x, pad.top - 5);
    ctx.restore();
  }

  function revealGuess() {
    liveEl.hidden = true;
    afterEl.hidden = false;
    renderCigaretteGrid(gridEl, ACTUAL_CIGARETTES);
    drawHistogram();

    const diff = guess - ACTUAL_CIGARETTES;
    if (Math.abs(diff) < 5) {
      commentEl.textContent = "Impressive. You were very close.";
    } else if (diff < 0) {
      commentEl.textContent = `You underestimated by ${Math.abs(diff)} cigarettes. Most people do.`;
    } else {
      commentEl.textContent = `You overestimated by ${diff} cigarettes. Still, the exposure is staggering.`;
    }
  }

  root.querySelectorAll(".guess-step").forEach((button) => {
    button.addEventListener("click", () => {
      setGuess(guess + Number(button.dataset.delta));
    });
  });

  guessInput.addEventListener("input", () => {
    setGuess(guessInput.value);
  });

  root.querySelector("#guess-confirm").addEventListener("click", revealGuess);
  window.addEventListener("resize", () => {
    if (!afterEl.hidden) drawHistogram();
  });

  setGuess(guess);
})();

// Component script 4
(() => {
  const root = document.querySelector("#fire-counts-section");
  if (!root) return;

  const svg = d3.select("#fire-counts-chart");
  const percentEl = root.querySelector("#fire-window-percent");
  const copyEl = root.querySelector("#fire-window-copy");
  const DATA_PATH = "data/final/fire_season_2020_2024.csv";
  const WINDOW_DAYS = 10;

  let rows = [];

  d3.csv(DATA_PATH, (d) => ({
    year: +d.year,
    seasonDay: +d.season_day,
    total: +d.total_fires,
  })).then((data) => {
    rows = data;
    drawFireCounts();
    window.addEventListener("resize", drawFireCounts);
  });

  function drawFireCounts() {
    if (!rows.length) return;

    const wrap = root.querySelector(".fire-counts-chart-wrap");
    const width = Math.max(520, wrap.clientWidth);
    const height = Math.max(360, Math.min(520, width * 0.48));
    const margin = { top: 46, right: 28, bottom: 42, left: 62 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();
    const clipId = `fire-counts-clip-${Math.round(width)}-${Math.round(height)}`;

    const years = Array.from(new Set(rows.map((d) => d.year))).sort();
    const byYear = d3.group(rows, (d) => d.year);
    const byDay = d3.rollups(
      rows,
      (values) => d3.mean(values, (d) => d.total),
      (d) => d.seasonDay,
    );
    const averageRows = byDay
      .map(([seasonDay, total]) => ({ seasonDay, total }))
      .sort((a, b) => a.seasonDay - b.seasonDay);

    const yearSummaries = years.map((year) => {
      const yearRows = byYear.get(year).slice().sort((a, b) => a.seasonDay - b.seasonDay);
      const total = d3.sum(yearRows, (d) => d.total);
      const best = bestWindow(yearRows);
      return { year, total, best, pct: best.sum / total };
    });
    const avgPct = d3.mean(yearSummaries, (d) => d.pct);
    const avgBest = bestWindow(averageRows);

    const x = d3.scaleLinear().domain([1, 61]).range([0, innerWidth]);
    const yMax = Math.ceil(d3.max(rows, (d) => d.total) / 1000) * 1000;
    const yTicks = d3.range(0, yMax + 1, 2000);
    const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    svg
      .append("defs")
      .append("clipPath")
      .attr("id", clipId)
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", innerWidth)
      .attr("height", innerHeight);

    const plotG = g.append("g").attr("clip-path", `url(#${clipId})`);

    plotG
      .append("rect")
      .attr("class", "fire-window-band")
      .attr("x", x(avgBest.start))
      .attr("y", 0)
      .attr("width", x(avgBest.end + 1) - x(avgBest.start))
      .attr("height", innerHeight);

    g.append("text")
      .attr("class", "fire-window-label")
      .attr("x", x(avgBest.start) + 12)
      .attr("y", 20)
      .text("Peak 10-day window");

    const grid = g.append("g").attr("class", "fire-grid-lines");
    grid
      .selectAll("line")
      .data(yTicks)
      .join("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d));

    const line = d3
      .line()
      .x((d) => x(d.seasonDay))
      .y((d) => y(d.total))
      .curve(d3.curveMonotoneX);

    years.forEach((year) => {
      const yearRows = byYear.get(year).slice().sort((a, b) => a.seasonDay - b.seasonDay);
      const peak = yearRows.reduce((best, d) => (d.total > best.total ? d : best), yearRows[0]);
      const labelX = Math.min(x(peak.seasonDay) + 10, innerWidth - 120);
      const labelY = Math.max(y(peak.total) - 36, 8);
      const yearGroup = plotG
        .append("g")
        .attr("class", "year-fire-series")
        .attr("data-year", year);

      yearGroup.append("path").datum(yearRows).attr("class", "year-fire-line").attr("d", line);
      const label = yearGroup
        .append("g")
        .attr("class", "year-fire-label")
        .attr("transform", `translate(${labelX},${labelY})`);
      label.append("rect").attr("rx", 3).attr("width", 118).attr("height", 31);
      label
        .append("text")
        .attr("x", 9)
        .attr("y", 20)
        .text(`${year}: ${d3.format(",")(peak.total)}`);
      yearGroup.append("path").datum(yearRows).attr("class", "year-fire-hit").attr("d", line);
    });

    plotG.append("path").datum(averageRows).attr("class", "avg-fire-line").attr("d", line);

    plotG
      .selectAll(".avg-fire-dot")
      .data(averageRows.filter((d) => d.seasonDay % 5 === 1))
      .join("circle")
      .attr("class", "avg-fire-dot")
      .attr("cx", (d) => x(d.seasonDay))
      .attr("cy", (d) => y(d.total))
      .attr("r", 3.7);

    const yAxis = g.append("g").attr("class", "fire-axis y-axis");
    yAxis
      .append("line")
      .attr("class", "axis-baseline")
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", 0)
      .attr("y2", innerHeight);
    yAxis
      .selectAll("text")
      .data(yTicks)
      .join("text")
      .attr("x", -12)
      .attr("y", (d) => y(d) + 4)
      .attr("text-anchor", "end")
      .text((d) => d3.format(",")(d));

    const xTicks = [1, 16, 32, 47, 61];
    const xAxis = g.append("g").attr("class", "fire-axis x-axis");
    xAxis
      .append("line")
      .attr("class", "axis-baseline")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", innerHeight)
      .attr("y2", innerHeight);
    xAxis
      .selectAll("text")
      .data(xTicks)
      .join("text")
      .attr("x", (d) => x(d))
      .attr("y", innerHeight + 24)
      .attr("text-anchor", (d) => (d === 1 ? "start" : d === 61 ? "end" : "middle"))
      .text((d) => seasonLabel(d));

    const legend = g.append("g").attr("class", "fire-counts-legend");
    legend.append("line").attr("x1", 0).attr("x2", 26).attr("y1", -24).attr("y2", -24);
    legend.append("text").attr("x", 34).attr("y", -20).text("2020-2024 daily average");
    legend
      .append("text")
      .attr("x", innerWidth)
      .attr("y", innerHeight + 34)
      .attr("text-anchor", "end")
      .text("Oct 1 - Nov 30");

    percentEl.textContent = `${Math.round(avgPct * 100)}%`;
    copyEl.textContent = `On average, each year's strongest ${WINDOW_DAYS}-day run captured this share of seasonal detections. For the average curve, that window falls around ${seasonLabel(avgBest.start)}-${seasonLabel(avgBest.end)}.`;
  }

  function highlightYear(year, yearRows) {
    const svgNode = svg.node();
    const activePath = svg.select(`.year-fire-line[data-year="${year}"]`);
    svg.selectAll(".year-fire-line").classed("is-muted", true).classed("is-active", false);
    activePath.classed("is-muted", false).classed("is-active", true).raise();
    svg.select(".avg-fire-line").raise();
    svg.selectAll(".avg-fire-dot").raise();
    svg.selectAll(".year-fire-hit").raise();

    const peak = yearRows.reduce((best, d) => (d.total > best.total ? d : best), yearRows[0]);
    const g = svg.select("g");
    const transform = d3.zoomTransform(g.node());
    const pathNode = activePath.node();
    const bbox = pathNode.getBBox();
    const labelX = Math.min(bbox.x + bbox.width + 8, svgNode.viewBox.baseVal.width - 150);
    const labelY = Math.max(bbox.y - 8, 8);
    const label = svg.select(".fire-hover-label").style("display", null);
    const text = `${year}: peak ${d3.format(",")(peak.total)} fires`;
    label.attr("transform", `translate(${labelX},${labelY})`);
    label.select("text").text(text);
    const textWidth = label.select("text").node().getComputedTextLength();
    label.select("rect").attr("width", textWidth + 18);
  }

  function resetYearHighlight() {
    svg.selectAll(".year-fire-line").classed("is-muted", false).classed("is-active", false);
    svg.select(".fire-hover-label").style("display", "none");
  }

  function bestWindow(values) {
    let best = { start: values[0].seasonDay, end: values[0].seasonDay, sum: 0 };

    values.forEach((d) => {
      const end = d.seasonDay + WINDOW_DAYS - 1;
      const windowRows = values.filter(
        (candidate) => candidate.seasonDay >= d.seasonDay && candidate.seasonDay <= end,
      );
      const sum = d3.sum(windowRows, (candidate) => candidate.total);
      if (sum > best.sum) {
        best = {
          start: d.seasonDay,
          end: windowRows[windowRows.length - 1].seasonDay,
          sum,
        };
      }
    });

    return best;
  }

  function seasonLabel(seasonDay) {
    if (seasonDay <= 31) return `Oct ${seasonDay}`;
    return `Nov ${seasonDay - 31}`;
  }
})();

// Component script 2
(() => {

      const mapWidth = 1120;
      const mapHeight = 760;

      const svg = d3
        .select("#fire-map")
        .attr("viewBox", `0 0 ${mapWidth} ${mapHeight}`);
      const mapLayer = svg.append("g");
      const fireLayer = svg.append("g");
      const labelLayer = svg.append("g");

      const projection = d3
        .geoMercator()
        .center([76.2, 29.45])
        .scale(6100)
        .translate([mapWidth / 2, mapHeight / 2]);

      const path = d3.geoPath(projection);
      const parseDate = d3.timeParse("%Y-%m-%d");
      const formatDate = d3.timeFormat("%b %d, %Y");

      const FIRE_CSV = "data/processed/fire_grid_2023.csv";
      const INDIA_GEOJSON = "data/geo/india_states.geojson";
      const SELECTED_YEAR = 2023;

      let fireRows = [];
      let dates = [];
      let currentIndex = 0;
      let frames = [];
      let pendingIndex = null;
      let renderQueued = false;

      Promise.all([
        d3.json(INDIA_GEOJSON),
        d3.csv(FIRE_CSV, (d) => ({
          lat: +d.latitude,
          lon: +d.longitude,
          date: parseDate(d.date),
          count: +d.count || 1,
          frp: +d.frp || 1,
        })),
      ]).then(([india, rows]) => {
        fireRows = rows
          .filter(
            (d) =>
              d.date && d.lon >= 73 && d.lon <= 79 && d.lat >= 27 && d.lat <= 33,
          )
          .sort((a, b) => a.date - b.date);

        dates = Array.from(d3.group(fireRows, (d) => +d.date).keys())
          .sort(d3.ascending)
          .map((d) => new Date(+d));
        frames = buildFrames(fireRows, dates);

        drawMap(india);
        updateByProgress(0);
        setupScroller();
      });

      function drawMap(india) {
        mapLayer
          .selectAll("path")
          .data(india.features)
          .join("path")
          .attr("class", (d) => {
            const name = getStateName(d).toLowerCase();
            return name.includes("punjab") || name.includes("haryana")
              ? "state region-focus"
              : "state";
          })
          .attr("d", path);

        const labels = [
          { name: "PUNJAB", coords: [75.4, 31.0] },
          { name: "HARYANA", coords: [76.25, 29.25] },
          { name: "RAJASTHAN", coords: [74.25, 28.35] },
          { name: "UTTAR PRADESH", coords: [78.15, 28.65] },
        ];

        labelLayer
          .selectAll(".map-label")
          .data(labels)
          .join("text")
          .attr("class", "map-label")
          .attr("x", (d) => projection(d.coords)[0])
          .attr("y", (d) => projection(d.coords)[1])
          .text((d) => d.name);

        const delhi = projection([77.209, 28.6139]);
        labelLayer
          .append("circle")
          .attr("cx", delhi[0])
          .attr("cy", delhi[1])
          .attr("r", 4.5)
          .attr("fill", "white");
        labelLayer
          .append("text")
          .attr("class", "delhi-label")
          .attr("x", delhi[0] + 11)
          .attr("y", delhi[1] + 5)
          .text("Delhi");
      }

      function getStateName(feature) {
        return (
          feature.properties?.NAME_1 ||
          feature.properties?.ST_NM ||
          feature.properties?.name ||
          feature.properties?.NAME ||
          ""
        );
      }

      function setupScroller() {
        const scroller = scrollama();

        scroller
          .setup({
            step: ".step",
            offset: 0.58,
            progress: true,
          })
          .onStepEnter((response) => {
            updateByProgress(getFireScrollProgress());
          })
          .onStepProgress((response) => {
            updateByProgress(getFireScrollProgress());
          });

        window.addEventListener("resize", scroller.resize);
        window.addEventListener(
          "scroll",
          () => updateByProgress(getFireScrollProgress()),
          { passive: true },
        );
      }

      function getFireScrollProgress() {
        const section = document.querySelector("#fire-scrolly");
        if (!section) return 0;

        const start = section.offsetTop;
        const scrollable = section.offsetHeight - window.innerHeight;
        return Math.max(
          0,
          Math.min(1, (window.scrollY - start) / Math.max(scrollable, 1)),
        );
      }

      function updateByProgress(progress) {
        if (!dates.length) return;

        const i = Math.max(
          0,
          Math.min(dates.length - 1, Math.round(progress * (dates.length - 1))),
        );
        if (i === currentIndex && fireLayer.selectAll("circle").size()) return;

        currentIndex = i;
        pendingIndex = i;

        if (!renderQueued) {
          renderQueued = true;
          requestAnimationFrame(() => {
            updateMap(pendingIndex);
            renderQueued = false;
          });
        }
      }

      function buildFrames(rows, frameDates) {
        return frameDates.map((date, index) => {
          const recentStart = d3.timeDay.offset(date, -5);
          const todayRows = rows.filter((d) => +d.date === +date);
          const recentRows = rows.filter((d) => d.date >= recentStart && d.date <= date);
          const cumulativeTotal = d3.sum(
            rows.filter((d) => d.date <= date),
            (d) => d.count,
          );

          const recentByCell = d3
            .rollups(
              recentRows,
              (values) => ({
                count: d3.sum(values, (d) => d.count),
                frp: d3.sum(values, (d) => d.frp),
                lon: values[0].lon,
                lat: values[0].lat,
                newest: d3.max(values, (d) => d.date),
              }),
              (d) => `${d.lon},${d.lat}`,
            )
            .map(([, value]) => {
              const projected = projection([value.lon, value.lat]);
              return {
                ...value,
                key: `${value.lon},${value.lat}`,
                x: projected[0],
                y: projected[1],
                age: (date - value.newest) / (1000 * 60 * 60 * 24),
              };
            });

          return {
            date,
            todayTotal: d3.sum(todayRows, (d) => d.count),
            recentTotal: d3.sum(recentRows, (d) => d.count),
            cumulativeTotal,
            recentByCell,
          };
        });
      }

      function updateMap(index) {
        const frame = frames[index];
        const currentDate = frame.date;

        d3.select("#fire-date").text(formatDate(currentDate));
        d3.select("#fire-count").text(
          `${frame.todayTotal.toLocaleString()} new fires | ${frame.recentTotal.toLocaleString()} in the last 6 days | ${frame.cumulativeTotal.toLocaleString()} cumulative`,
        );

        fireLayer
          .selectAll("circle")
          .data(frame.recentByCell, (d) => d.key)
          .join(
            (enter) =>
              enter
                .append("circle")
                .attr("class", "fire-point")
                .attr("cx", (d) => d.x)
                .attr("cy", (d) => d.y)
                .attr("r", 0)
                .attr("fill", (d) => fireColor(d))
                .attr("opacity", (d) => fireOpacity(d))
                .transition()
                .duration(90)
                .attr("r", (d) => fireRadius(d)),
            (update) =>
              update
                .transition()
                .duration(70)
                .attr("r", (d) => fireRadius(d))
                .attr("fill", (d) => fireColor(d))
                .attr("opacity", (d) => fireOpacity(d)),
            (exit) => exit.transition().duration(70).attr("r", 0).remove(),
          );
      }

      function fireRadius(d) {
        return Math.min(Math.sqrt(d.count) * 2.1 + Math.sqrt(d.frp) * 0.06, 18);
      }

      function fireColor(d) {
        const age = d.age;
        if (age <= 1) return "#ffe066";
        if (age <= 4) return "#ff9f1c";
        return "#c84f3a";
      }

      function fireOpacity(d) {
        const age = d.age;
        if (age <= 1) return 0.9;
        if (age <= 4) return 0.68;
        return 0.34;
      }
    
})();
