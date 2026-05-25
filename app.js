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

      function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawSmokeLayer();
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
      window.addEventListener("scroll", handleScrollFade, { passive: true });

      resizeCanvas();
    
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

      const FIRE_CSV = "data/processed/fire_points_2020_2024.csv";
      const INDIA_GEOJSON = "data/geo/india_states.geojson";
      const SELECTED_YEAR = 2023;

      let currentFires = [];
      let dates = [];
      let currentIndex = 0;

      Promise.all([
        d3.json(INDIA_GEOJSON),
        d3.csv(FIRE_CSV, (d) => ({
          lat: +d.latitude,
          lon: +d.longitude,
          date: parseDate(d.date),
          year: +d.year,
          frp: +d.frp || 1,
          state: d.state || d.name || "",
        })),
      ]).then(([india, fires]) => {
        const regionFires = fires.filter(
          (d) =>
            d.date &&
            d.year === SELECTED_YEAR &&
            d.lon >= 73 &&
            d.lon <= 79 &&
            d.lat >= 27 &&
            d.lat <= 33,
        );

        currentFires = regionFires.sort((a, b) => a.date - b.date);
        dates = Array.from(d3.group(currentFires, (d) => +d.date).keys())
          .sort(d3.ascending)
          .map((d) => new Date(+d));

        drawMap(india);
        updateByProgress(0.08);
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
            const progress = +response.element.dataset.progress;
            updateByProgress(progress);
          })
          .onStepProgress((response) => {
            const steps = Array.from(document.querySelectorAll(".step"));
            const stepIndex = steps.indexOf(response.element);
            const start = +response.element.dataset.progress;
            const next = steps[stepIndex + 1]
              ? +steps[stepIndex + 1].dataset.progress
              : start;
            const interpolated = start + (next - start) * response.progress;
            updateByProgress(interpolated);
          });

        window.addEventListener("resize", scroller.resize);
      }

      function updateByProgress(progress) {
        if (!dates.length) return;

        const i = Math.max(
          0,
          Math.min(dates.length - 1, Math.round(progress * (dates.length - 1))),
        );
        if (i === currentIndex && fireLayer.selectAll("circle").size()) return;

        currentIndex = i;
        updateMap(dates[i]);
      }

      function updateMap(currentDate) {
        const visibleFires = currentFires.filter((d) => d.date <= currentDate);
        const todayFires = currentFires.filter(
          (d) => +d.date === +currentDate,
        ).length;

        d3.select("#fire-date").text(formatDate(currentDate));
        d3.select("#fire-count").text(
          `${todayFires.toLocaleString()} new fires · ${visibleFires.length.toLocaleString()} cumulative fires`,
        );

        fireLayer
          .selectAll("circle")
          .data(visibleFires, (d) => `${d.lat}-${d.lon}-${+d.date}-${d.frp}`)
          .join(
            (enter) =>
              enter
                .append("circle")
                .attr("class", "fire-point")
                .attr("cx", (d) => projection([d.lon, d.lat])[0])
                .attr("cy", (d) => projection([d.lon, d.lat])[1])
                .attr("r", 0)
                .attr("fill", (d) => fireColor(d, currentDate))
                .attr("opacity", (d) => fireOpacity(d, currentDate))
                .transition()
                .duration(180)
                .attr("r", (d) => Math.min(Math.sqrt(d.frp) * 0.55 + 1.1, 6.2)),
            (update) =>
              update
                .transition()
                .duration(100)
                .attr("fill", (d) => fireColor(d, currentDate))
                .attr("opacity", (d) => fireOpacity(d, currentDate)),
            (exit) => exit.remove(),
          );
      }

      function fireAgeDays(d, currentDate) {
        return (currentDate - d.date) / (1000 * 60 * 60 * 24);
      }

      function fireColor(d, currentDate) {
        const age = fireAgeDays(d, currentDate);
        if (age <= 1) return "#ffe066";
        if (age <= 7) return "#ff9f1c";
        return "#c84f3a";
      }

      function fireOpacity(d, currentDate) {
        const age = fireAgeDays(d, currentDate);
        if (age <= 1) return 0.95;
        if (age <= 7) return 0.72;
        return 0.32;
      }
    
})();
