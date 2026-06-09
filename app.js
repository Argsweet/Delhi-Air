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
      haze.addColorStop(0.48, `rgba(18,18,18,${Math.random() * 0.12 + 0.08})`);
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
    smokeScrollProgress = Math.min(
      1,
      previousProgress + deltaY / SMOKE_SCROLL_DISTANCE,
    );
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

    const progress = Math.min(window.scrollY / (window.innerHeight * 0.72), 1);
    canvas.style.opacity = String(1 - progress);
    cursor.style.opacity = progress > 0.18 ? 0 : undefined;
  }

  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerleave", () => {
    lastPoint = null;
  });

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("wheel", handleSmokeWheel, { passive: false });
  window.addEventListener("touchstart", handleSmokeTouchStart, {
    passive: true,
  });
  window.addEventListener("touchmove", handleSmokeTouchMove, {
    passive: false,
  });
  window.addEventListener("scroll", handleScrollFade, { passive: true });

  resizeCanvas();
})();

// Fixed section navigator inspired by the reference project.
(() => {
  const container = document.querySelector("#section-navigator");
  if (!container) return;

  const sections = [
    { id: "intro-smoke", label: "Intro", type: "text" },
    { id: "problem-section", label: "Problem", type: "text" },
    { id: "farmer-window", label: "Why Farmers Burn", type: "text" },
    { id: "fire-scrolly", label: "Fire Map", type: "interaction" },
    { id: "pm25-comparison", label: "AQI Visual", type: "interaction" },
    { id: "what-this-means", label: "What It Means", type: "text" },
    {
      id: "cigarette-interactive",
      label: "Cigarette Equivalent",
      type: "interaction",
    },
    { id: "city-wrapped-in-smoke", label: "India Gate", type: "text" },
    { id: "why-winter-makes-it-worse", label: "Winter Trap", type: "text" },
    { id: "more-than-one-source", label: "Other Sources", type: "text" },
  ].filter((section) => document.getElementById(section.id));

  if (!sections.length) return;

  const navItems = sections.map((section) => {
    const item = document.createElement("button");
    item.className = "section-nav-item";
    item.type = "button";
    item.dataset.target = section.id;
    item.dataset.navType = section.type;
    item.setAttribute("aria-label", `Jump to ${section.label}`);

    const label = document.createElement("span");
    label.className = "section-nav-label";
    label.textContent = section.label;
    item.appendChild(label);

    item.addEventListener("click", () => {
      document.getElementById(section.id)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    container.appendChild(item);
    return item;
  });

  function setActive(id) {
    navItems.forEach((item) => {
      const isActive = item.dataset.target === id;
      item.classList.toggle("active", isActive);
      if (isActive) {
        item.setAttribute("aria-current", "true");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActive(entry.target.id);
        }
      });
    },
    {
      root: null,
      rootMargin: "-42% 0px -42% 0px",
      threshold: 0,
    },
  );

  sections.forEach((section) =>
    observer.observe(document.getElementById(section.id)),
  );
  setActive(sections[0].id);
})();

// PM2.5 comparison scrollytelling
(() => {
  const section = document.querySelector("#pm25-comparison");
  const svgEl = document.querySelector("#pm25-scrolly-viz");
  if (!section || !svgEl || !window.d3) return;

  const svg = d3.select(svgEl);
  const copyPanel = document.querySelector(".pm25-copy");
  const copyTitle = document.querySelector("#pm25-copy-title");
  const copyBody = document.querySelector("#pm25-copy-body");

  const steps = [
    {
      title:
        "PM2.5 is microscopic air pollution—about 30 times smaller than a human hair—that can travel deep into your lungs and even enter your bloodstream when you breathe.",
      body: "Between 2020 and 2023, Los Angeles County's annual average concentration hovered around 11.1 micrograms of these particles per cubic meter (11.1 µg/m³).",
    },
    {
      title:
        "The World Health Organization (WHO) labels the 24-hour safety level at 15 µg/m³, only slightly above Los Angeles County's annual average ...",
      body: "",
    },
    {
      title:
        "By 225.5, the U.S. Environmental Protection Agency labels the air as hazardous ...",
      body: "",
    },
    {
      title: "Delhi's PM2.5 levels are far higher.",
      body: "Delhi averaged 377 µg/m³ in winter from 2020 to early 2023 ... even the rest-of-year average was 154.6 µg/m³.",
    },
  ];

  const red = "#b84020";
  const blue = "#3a3a3a";
  const mutedBlue = "#555";
  const rng = d3.randomLcg(0.42);
  const usParticles = d3.range(11).map(() => ({
    dx: rng() * 2 - 1,
    dy: rng() * 2 - 1,
    phase: rng() * Math.PI * 2,
    speed: 0.55 + rng() * 0.45,
  }));
  const delhiParticles = d3.range(377).map((_, index) => {
    const value = index + 0.5 + (rng() - 0.5) * 0.65;
    return {
      value,
      lane: rng() * 2 - 1,
      jitter: rng() * 2 - 1,
      phase: rng() * Math.PI * 2,
      speed: 0.35 + rng() * 0.35,
    };
  });

  let width = 0;
  let height = 0;
  let latestProgress = 0;
  let targetProgress = 0;
  let lastRawProgress = 0;
  let latestStep = -1;
  let finalStepDrawn = false;

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function ease(value) {
    return d3.easeCubicInOut(clamp(value));
  }

  function between(progress, start, end) {
    return clamp((progress - start) / (end - start));
  }

  function setCopy(progress) {
    const index = Math.min(steps.length - 1, Math.max(0, Math.round(progress)));
    if (index === latestStep) return;
    latestStep = index;
    copyTitle.textContent = steps[index].title;
    copyBody.textContent = steps[index].body;
  }

  function markerGroup(root, options) {
    const {
      x,
      y1,
      y2,
      color,
      opacity,
      value,
      label,
      anchor = "middle",
      labelY = y1 - 56,
    } = options;
    const group = root.append("g").attr("opacity", opacity);

    group
      .append("line")
      .attr("class", "pm25-marker-line")
      .attr("x1", x)
      .attr("x2", x)
      .attr("y1", y1)
      .attr("y2", y2)
      .attr("stroke", color);
    group
      .append("circle")
      .attr("cx", x)
      .attr("cy", y1)
      .attr("r", 4.8)
      .attr("fill", color);
    group
      .append("text")
      .attr("class", "pm25-marker-value")
      .attr("x", x)
      .attr("y", labelY)
      .attr("fill", color)
      .attr("text-anchor", anchor)
      .text(value);
    group
      .append("text")
      .attr("class", "pm25-marker-label")
      .attr("x", x)
      .attr("y", labelY + 20)
      .attr("fill", color)
      .attr("text-anchor", anchor)
      .text(label);
  }

  function limitZone(root, options) {
    const {
      x,
      y,
      width,
      height,
      opacity,
      maxOpacity = 0.2,
      direction = 1,
    } = options;
    const easedOpacity = clamp(opacity);
    const zoneWidth = Math.max(0, width * easedOpacity);

    root
      .append("rect")
      .attr("x", direction > 0 ? x : x - zoneWidth)
      .attr("y", y)
      .attr("width", zoneWidth)
      .attr("height", height)
      .attr("fill", "#b14320")
      .attr("opacity", maxOpacity * easedOpacity);
  }

  function draw(time = 0) {
    const progress = latestProgress;
    setCopy(targetProgress);

    const rect = svgEl.getBoundingClientRect();
    width = Math.max(320, rect.width);
    height = Math.max(420, rect.height);
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();

    const midY = height * 0.53;
    const markerTop = Math.max(126, height * 0.24);
    const markerBottom = Math.min(height - 150, height * 0.74);
    const tWho = ease(between(progress, 0.45, 1));
    const tHazard = ease(between(progress, 1.42, 2));
    const roomShift = ease(between(progress, 1.94, 2.46));
    const delhiMotion = ease(between(progress, 2.03, 2.86));
    const tDelhi = ease(between(progress, 2.1, 2.92));
    const stageA = ease(between(progress, 0, 1));
    const stageB = ease(between(progress, 1, 2));
    const stageC = roomShift;
    const baseUsX = d3.interpolate(width * 0.5, width * 0.62)(stageA);
    const preDelhiUsX = d3.interpolate(baseUsX, width * 0.7)(stageB);
    const dividerX = width * 0.36;
    const rightMin = dividerX + 62;
    const rightMax = width * 0.96;
    const rightXScale = d3
      .scaleLinear()
      .domain([0, 15, 154.6, 225.5, 377, 400])
      .range([
        rightMin,
        rightMin + (rightMax - rightMin) * 0.13,
        rightMin + (rightMax - rightMin) * 0.36,
        rightMin + (rightMax - rightMin) * 0.68,
        rightMin + (rightMax - rightMin) * 0.9,
        rightMax,
      ]);
    const finalUsWhoX = dividerX - (rightXScale(15) - dividerX);
    const usClusterX = d3.interpolate(preDelhiUsX, width * 0.27)(stageC);
    const whoPreX = d3.interpolate(
      usClusterX - width * 0.12,
      usClusterX - width * 0.14,
    )(stageB);
    const whoX = d3.interpolate(whoPreX, finalUsWhoX)(stageC);
    const hazardX = d3.interpolate(width * 0.09, width * 0.075)(stageC);
    const delhiEnterOffset = d3.interpolate(width * 0.5, 0)(delhiMotion);
    const rightX = (value) => rightXScale(value) + delhiEnterOffset;
    const usSpreadBeforeDelhi = d3.interpolate(
      Math.min(135, width * 0.14),
      Math.min(58, width * 0.07),
    )(Math.max(stageA, stageB));
    const usSpread = d3.interpolate(
      usSpreadBeforeDelhi,
      Math.min(28, width * 0.035),
    )(stageC);
    const usRadius = d3.interpolate(8.6, 4.2)(Math.max(stageA, stageB));
    const finalUsRadius = d3.interpolate(usRadius, 3.5)(stageC);
    const markerLabelY = markerTop - 58;
    const copyDistance = Math.min(
      0.5,
      Math.abs(progress - Math.round(progress)),
    );
    const copyFade = 0.38 + 0.62 * (1 - copyDistance / 0.5);
    const rangeZoneFade = 1 - tDelhi;

    if (copyPanel) {
      copyPanel.style.opacity = String(clamp(copyFade, 0.42, 1));
    }

    const background = svg.append("g");
    const zoneHeight = markerBottom - markerTop;
    // 15+ zone: 20%
    limitZone(background, {
      x: whoX,
      y: markerTop,
      width: width * 0.86 - whoX,
      height: zoneHeight,
      opacity: tWho * rangeZoneFade,
    });

    // hazardous zone: another 20%, overlapping from 225.5 onward
    if (tHazard > 0.01) {
      limitZone(background, {
        x: hazardX,
        y: markerTop,
        width: width * 0.86 - hazardX,
        height: zoneHeight,
        opacity: tHazard * rangeZoneFade,
      });
    }
    background
      .append("line")
      .attr("class", "pm25-center-line")
      .attr("x1", dividerX)
      .attr("x2", dividerX)
      .attr("y1", height * 0.12)
      .attr("y2", height * 0.84)
      .attr("opacity", tDelhi * 0.95);

    markerGroup(background, {
      x: whoX,
      y1: markerTop,
      y2: markerBottom,
      color: red,
      opacity: tWho,
      value: "15",
      label: "WHO",
      labelY: markerLabelY,
    });
    if (tHazard > 0.01) {
      markerGroup(background, {
        x: hazardX,
        y1: markerTop,
        y2: markerBottom,
        color: red,
        opacity: tHazard,
        value: "225.5",
        label: "EPA hazardous",
        anchor: "start",
        labelY: markerLabelY,
      });
    }
    markerGroup(background, {
      x: rightX(15),
      y1: markerTop,
      y2: markerBottom,
      color: mutedBlue,
      opacity: tDelhi,
      value: "15",
      label: "WHO",
      labelY: markerLabelY,
    });
    markerGroup(background, {
      x: rightX(225.5),
      y1: markerTop,
      y2: markerBottom,
      color: mutedBlue,
      opacity: tDelhi,
      value: "225.5",
      label: "EPA hazardous",
      labelY: markerLabelY,
    });
    markerGroup(background, {
      x: rightX(154.6),
      y1: markerTop,
      y2: markerBottom,
      color: mutedBlue,
      opacity: tDelhi,
      value: "154.6",
      label: "Rest of year",
      labelY: markerLabelY,
    });
    markerGroup(background, {
      x: rightX(377),
      y1: markerTop,
      y2: markerBottom,
      color: blue,
      opacity: tDelhi,
      value: "377",
      label: "Winter",
      labelY: markerLabelY,
    });

    const labelLayer = svg.append("g");
    labelLayer
      .append("text")
      .attr("class", "pm25-country-label")
      .attr("x", d3.interpolate(usClusterX, width * 0.22)(stageC))
      .attr("y", markerTop - 86)
      .attr("text-anchor", "middle")
      .attr("fill", red)
      .text("Los Angeles County");

    if (tDelhi > 0.02) {
      labelLayer
        .append("text")
        .attr("class", "pm25-country-label")
        .attr("x", (rightMin + rightMax) / 2 + delhiEnterOffset)
        .attr("y", markerTop - 86)
        .attr("text-anchor", "middle")
        .attr("fill", blue)
        .attr("opacity", tDelhi)
        .text("Delhi");
    }

    const particles = svg.append("g");
    particles
      .selectAll("circle.us")
      .data(usParticles)
      .join("circle")
      .attr("class", "pm25-particle us")
      .attr(
        "cx",
        (d) =>
          usClusterX +
          d.dx * usSpread +
          Math.sin(time * 0.001 * d.speed + d.phase) * 4,
      )
      .attr(
        "cy",
        (d) =>
          midY +
          d.dy * usSpread * 0.62 +
          Math.cos(time * 0.0011 * d.speed + d.phase) * 4,
      )
      .attr("r", finalUsRadius)
      .attr("fill", red)
      .attr("opacity", 0.95);

    particles
      .selectAll("circle.delhi")
      .data(delhiParticles)
      .join("circle")
      .attr("class", "pm25-particle delhi")
      .attr("cx", (d) => {
        const base = rightX(d.value);
        return (
          base +
          d.jitter * 12 +
          Math.sin(time * 0.001 * d.speed + d.phase) * 2.4
        );
      })
      .attr(
        "cy",
        (d) =>
          midY +
          d.lane * Math.min(88, height * 0.12) +
          Math.cos(time * 0.001 * d.speed + d.phase) * 2.4,
      )
      .attr("r", 3.6)
      .attr("fill", blue)
      .attr("opacity", 0.74 * tDelhi);
  }

  function updateProgress() {
    const rect = section.getBoundingClientRect();
    const scrollable = Math.max(1, section.offsetHeight - window.innerHeight);
    // The section overlaps the fires-dissolve by one viewport (margin-top), so
    // hold the viz on its first step through that overlap — the transition can't
    // scroll the PM2.5 intro out from under you.
    const hold = window.innerHeight;
    const rawProgress =
      clamp((-rect.top - hold) / Math.max(1, scrollable - hold)) *
      (steps.length - 1);
    const scrollingDown = rawProgress >= lastRawProgress;
    const thresholds = scrollingDown ? [0.45, 1.22, 2.02] : [0.25, 0.95, 1.72];

    if (rawProgress < thresholds[0]) targetProgress = 0;
    else if (rawProgress < thresholds[1]) targetProgress = 1;
    else if (rawProgress < thresholds[2]) targetProgress = 2;
    else targetProgress = 3;

    lastRawProgress = rawProgress;
  }

  function tick(time) {
    updateProgress();
    const distance = targetProgress - latestProgress;
    if (Math.abs(distance) < 0.018) {
      latestProgress = targetProgress;
    } else {
      latestProgress += distance * 0.12;
    }

    const isFinalSettled =
      targetProgress === steps.length - 1 && latestProgress === targetProgress;
    if (!isFinalSettled || !finalStepDrawn) {
      draw(time);
      finalStepDrawn = isFinalSettled;
    }
    if (!isFinalSettled) finalStepDrawn = false;

    requestAnimationFrame(tick);
  }

  window.addEventListener(
    "resize",
    () => {
      finalStepDrawn = false;
      updateProgress();
    },
    { passive: true },
  );
  updateProgress();
  requestAnimationFrame(tick);
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
    const columns = Math.min(
      10,
      Math.max(6, Math.ceil(Math.sqrt(count * 1.1))),
    );
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
          <rect x="2" y="6" width="14" height="4" rx="1.1" fill="#d4956a"></rect>
          <rect x="15" y="5.2" width="22" height="5.6" rx="1.4" fill="#f7eadb"></rect>
          <rect x="36" y="5.2" width="6.5" height="5.6" rx="1.1" fill="#b84020"></rect>
          <path d="M41.4 4.5 C43.5 2.9 42.1 1.5 44 0.5" fill="none" stroke="#555" stroke-width="0.9" stroke-linecap="round"></path>
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
      ctx.fillStyle = "rgba(46, 46, 46, 0.9)";
      ctx.fillRect(x + 2, y, Math.max(2, barWidth - 4), barHeight);
    });

    ctx.strokeStyle = "rgba(184, 64, 32, 0.46)";
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + chartHeight);
    ctx.lineTo(width - pad.right, pad.top + chartHeight);
    ctx.stroke();

    ctx.fillStyle = "rgba(46, 46, 46, 0.88)";
    ctx.font = "10px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    for (let label = 0; label <= 100; label += 20) {
      const x = pad.left + (label / 100) * chartWidth;
      ctx.fillText(label, x, height - 7);
    }

    drawMarker(ctx, pad, chartWidth, chartHeight, guess, "#555", "YOUR GUESS");
    drawMarker(
      ctx,
      pad,
      chartWidth,
      chartHeight,
      ACTUAL_CIGARETTES,
      "#B84020",
      "ACTUAL: 44",
    );
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
      commentEl.innerHTML =
        "<span>Impressive.</span><strong>You were very close.</strong>";
    } else if (diff < 0) {
      commentEl.innerHTML = `<span>You underestimated by ${Math.abs(diff)} cigarettes.</span><strong>Most people do.</strong>`;
    } else {
      commentEl.innerHTML = `<span>You overestimated by ${diff} cigarettes.</span><strong>Still, the exposure is staggering.</strong>`;
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
  let chartHasEntered = false;

  d3.csv(DATA_PATH, (d) => ({
    year: +d.year,
    seasonDay: +d.season_day,
    total: +d.total_fires,
  })).then((data) => {
    rows = data;
    drawFireCounts();
    window.addEventListener("resize", drawFireCounts);
    setupFireCountsEntrance();
  });

  function drawFireCounts() {
    if (!rows.length) return;

    const wrap = root.querySelector(".fire-counts-chart-wrap");
    const width = Math.max(640, wrap.clientWidth);
    const height = Math.max(360, Math.min(470, width * 0.45));
    const margin = { top: 34, right: 30, bottom: 38, left: 64 };
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
      const yearRows = byYear
        .get(year)
        .slice()
        .sort((a, b) => a.seasonDay - b.seasonDay);
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

    plotG
      .selectAll(".fire-window-boundary")
      .data([avgBest.start, avgBest.end + 1])
      .join("line")
      .attr("class", "fire-window-boundary")
      .attr("x1", (d) => x(d))
      .attr("x2", (d) => x(d))
      .attr("y1", 0)
      .attr("y2", innerHeight);

    g.append("text")
      .attr("class", "fire-window-label")
      .attr("x", (x(avgBest.start) + x(avgBest.end + 1)) / 2)
      .attr("y", -8)
      .attr("text-anchor", "middle")
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
      const yearRows = byYear
        .get(year)
        .slice()
        .sort((a, b) => a.seasonDay - b.seasonDay);
      const peak = yearRows.reduce(
        (best, d) => (d.total > best.total ? d : best),
        yearRows[0],
      );
      const labelX = Math.min(x(peak.seasonDay) + 10, innerWidth - 54);
      const labelY = Math.max(y(peak.total) - 28, 8);
      const yearGroup = plotG
        .append("g")
        .attr("class", "year-fire-series")
        .attr("data-year", year);

      yearGroup
        .append("path")
        .datum(yearRows)
        .attr("class", "year-fire-line")
        .attr("d", line);
      const label = yearGroup
        .append("g")
        .attr("class", "year-fire-label")
        .attr("transform", `translate(${labelX},${labelY})`);
      label.append("rect").attr("rx", 10).attr("width", 48).attr("height", 24);
      label
        .append("text")
        .attr("x", 24)
        .attr("y", 16)
        .attr("text-anchor", "middle")
        .text(year);
      yearGroup
        .append("path")
        .datum(yearRows)
        .attr("class", "year-fire-hit")
        .attr("d", line);
    });

    plotG
      .append("path")
      .datum(averageRows)
      .attr("class", "avg-fire-line")
      .attr("d", line);

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
      .attr("text-anchor", (d) =>
        d === 1 ? "start" : d === 61 ? "end" : "middle",
      )
      .text((d) => seasonLabel(d));

    const legend = g.append("g").attr("class", "fire-counts-legend");
    legend
      .append("line")
      .attr("x1", 0)
      .attr("x2", 26)
      .attr("y1", -14)
      .attr("y2", -14);
    legend
      .append("text")
      .attr("x", 34)
      .attr("y", -10)
      .text("Red line: mean of all years");
    legend
      .append("text")
      .attr("x", innerWidth)
      .attr("y", innerHeight + 34)
      .attr("text-anchor", "end")
      .text("Oct 1 - Nov 30");

    percentEl.textContent = `${Math.round(avgPct * 100)}%`;
    copyEl.textContent = `On average, the strongest ${WINDOW_DAYS}-day window captures ${Math.round(avgPct * 100)}% of seasonal fire detections, falling around ${seasonLabel(avgBest.start)}–${seasonLabel(avgBest.end)}.`;
    prepareFireCountsEntrance();
  }

  function setupFireCountsEntrance() {
    if (isFireCountsVisible()) {
      chartHasEntered = true;
      playFireCountsEntrance();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        chartHasEntered = true;
        playFireCountsEntrance();
        observer.disconnect();
      },
      { threshold: 0.28 },
    );
    observer.observe(root);
  }

  function isFireCountsVisible() {
    const rect = root.getBoundingClientRect();
    const visibleHeight =
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    return visibleHeight > Math.min(rect.height * 0.12, 160);
  }

  function prepareFireCountsEntrance() {
    const lineNodes = svg.selectAll(".year-fire-line, .avg-fire-line").nodes();

    lineNodes.forEach((node) => {
      const length = node.getTotalLength();
      node.style.strokeDasharray = `${length}`;
      node.style.strokeDashoffset = chartHasEntered ? "0" : `${length}`;
    });

    root.classList.toggle("is-chart-entered", chartHasEntered);
  }

  function playFireCountsEntrance() {
    window.setTimeout(() => {
      root.classList.add("is-chart-entered");
      requestAnimationFrame(() => {
        svg
          .selectAll(".year-fire-line, .avg-fire-line")
          .style("stroke-dashoffset", 0);
      });
    }, 450);
  }

  function highlightYear(year, yearRows) {
    const svgNode = svg.node();
    const activePath = svg.select(`.year-fire-line[data-year="${year}"]`);
    svg
      .selectAll(".year-fire-line")
      .classed("is-muted", true)
      .classed("is-active", false);
    activePath.classed("is-muted", false).classed("is-active", true).raise();
    svg.select(".avg-fire-line").raise();
    svg.selectAll(".avg-fire-dot").raise();
    svg.selectAll(".year-fire-hit").raise();

    const peak = yearRows.reduce(
      (best, d) => (d.total > best.total ? d : best),
      yearRows[0],
    );
    const g = svg.select("g");
    const transform = d3.zoomTransform(g.node());
    const pathNode = activePath.node();
    const bbox = pathNode.getBBox();
    const labelX = Math.min(
      bbox.x + bbox.width + 8,
      svgNode.viewBox.baseVal.width - 58,
    );
    const labelY = Math.max(bbox.y - 6, 8);
    const label = svg.select(".fire-hover-label").style("display", null);
    const text = `${year}`;
    label.attr("transform", `translate(${labelX},${labelY})`);
    label.select("text").text(text);
    const textWidth = label.select("text").node().getComputedTextLength();
    label.select("rect").attr("width", textWidth + 18);
  }

  function resetYearHighlight() {
    svg
      .selectAll(".year-fire-line")
      .classed("is-muted", false)
      .classed("is-active", false);
    svg.select(".fire-hover-label").style("display", "none");
  }

  function bestWindow(values) {
    let best = { start: values[0].seasonDay, end: values[0].seasonDay, sum: 0 };

    values.forEach((d) => {
      const end = d.seasonDay + WINDOW_DAYS - 1;
      const windowRows = values.filter(
        (candidate) =>
          candidate.seasonDay >= d.seasonDay && candidate.seasonDay <= end,
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

// Component script 5: one-scroll fire takeover
(() => {
  const transition = document.querySelector(".fire-transition");
  const nextSection = document.querySelector("#fire-scrolly");
  const mapVeil = document.querySelector("#map-reveal-veil");
  const seamCap = document.querySelector("#fire-seam-cap");
  if (!transition || !nextSection) return;

  let hasPlayed = false;
  let isPlaying = false;
  let touchStartY = null;
  let scrollAccum = 0;
  const ANIMATION_MS = 2200;
  // Require a deliberate downward scroll before igniting, so the takeover is
  // not a hair trigger on the smallest trackpad nudge.
  const TRIGGER_THRESHOLD = 320;

  function lockScroll() {
    document.documentElement.classList.add("fire-scroll-locked");
    document.body.classList.add("fire-scroll-locked");
  }

  function unlockScroll() {
    document.documentElement.classList.remove("fire-scroll-locked");
    document.body.classList.remove("fire-scroll-locked");
  }

  function transitionIsReady() {
    const rect = transition.getBoundingClientRect();
    // Trigger once the overlapping fire layer is basically the current screen.
    return (
      rect.top <= window.innerHeight * 0.18 &&
      rect.bottom > window.innerHeight * 0.35
    );
  }

  function playFire() {
    if (hasPlayed || isPlaying) return;
    hasPlayed = true;
    isPlaying = true;

    // Snap to the overlapped transition viewport so the fire covers the farmer/chart screen.
    const targetY = window.scrollY + transition.getBoundingClientRect().top;
    window.scrollTo({ top: targetY, behavior: "auto" });

    lockScroll();
    transition.classList.add("fire-armed");

    requestAnimationFrame(() => {
      transition.classList.add("fire-playing");
    });

    window.setTimeout(() => {
      transition.classList.add("fire-finished");
      // Hold a solid map-tone veil over the viewport so the instant jump to the
      // map is hidden, then fade it out to reveal the map instead of cutting.
      mapVeil?.classList.add("is-covering");
      nextSection.scrollIntoView({ behavior: "auto", block: "start" });
      unlockScroll();
      isPlaying = false;

      // Once we've landed on the map, dismiss the fire overlay entirely and
      // reveal the smoke-cap divider, which separates the two sections from now
      // on. The takeover is one-time and never plays again.
      window.setTimeout(() => {
        transition.classList.remove("fire-playing", "fire-finished", "fire-armed");
        transition.classList.add("fire-settled");
        seamCap?.classList.add("is-revealed");
      }, 80);

      // Fade the veil out so the map reveals in. Double rAF lets the solid
      // cover paint first, so removing the class animates 1 -> 0.
      if (mapVeil) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            mapVeil.classList.remove("is-covering");
          });
        });
      }
    }, ANIMATION_MS);
  }

  function maybePlay(deltaY, event) {
    if (hasPlayed || isPlaying) return;
    // Scrolling up or out of the trigger zone resets intent.
    if (deltaY <= 0 || !transitionIsReady()) {
      scrollAccum = 0;
      return;
    }
    // Hold the page at the farmer screen and build up intent. The flames only
    // take over once the user keeps scrolling down past the threshold.
    event?.preventDefault();
    scrollAccum += deltaY;
    if (scrollAccum >= TRIGGER_THRESHOLD) {
      playFire();
    }
  }

  window.addEventListener(
    "wheel",
    (event) => {
      maybePlay(event.deltaY, event);
    },
    { passive: false },
  );

  window.addEventListener(
    "touchstart",
    (event) => {
      touchStartY = event.touches[0]?.clientY ?? null;
    },
    { passive: true },
  );

  window.addEventListener(
    "touchmove",
    (event) => {
      if (touchStartY === null) return;
      const currentY = event.touches[0]?.clientY ?? touchStartY;
      const deltaY = touchStartY - currentY;
      touchStartY = currentY;
      maybePlay(deltaY, event);
    },
    { passive: false },
  );

  window.addEventListener("keydown", (event) => {
    const forwardKeys = ["ArrowDown", "PageDown", " ", "Spacebar"];
    if (!forwardKeys.includes(event.key)) return;
    // A single deliberate key press should ignite on its own.
    maybePlay(TRIGGER_THRESHOLD, event);
  });

  // Safety net: if a fast scroll blows past the trigger zone without igniting
  // (so the user would otherwise land on the map and miss the takeover), snap
  // back to the farmer screen and play it. The takeover is one-time only.
  window.addEventListener(
    "scroll",
    () => {
      if (hasPlayed || isPlaying) return;
      const rect = transition.getBoundingClientRect();
      // Fire while the seam is still near the bottom (map barely visible), so the
      // user never sees the top of the map before the takeover plays.
      if (rect.bottom <= window.innerHeight * 0.85) {
        playFire();
      }
    },
    { passive: true },
  );
})();

// Component script 2
(() => {
  const mapWidth = 1120;
  const mapHeight = 760;

  const svg = d3
    .select("#fire-map")
    .attr("viewBox", `0 0 ${mapWidth} ${mapHeight}`);
  const windSvg = d3
    .select("#wind-overlay")
    .attr("viewBox", `0 0 ${mapWidth} ${mapHeight}`);
  const mapLayer = svg.append("g");
  const fireLayer = svg.append("g");
  const labelLayer = svg.append("g");
  const windLayer = windSvg.append("g").attr("class", "wind-layer");
  const dimLayer = d3.select(".smoke-screen-dim");
  // End-of-scrollytelling dissolve + transition, all while the map is still
  // pinned (no gap, no slide):
  //   1. dissolve the map to a grey veil (and fade the annotations out)
  //   2. fade the transition lines in/out on the grey veil, one at a time
  //   3. turn the veil to the PM2.5 peach, so it hands straight off into PM2.5.
  const fadeVeil = document.querySelector("#fire-scrolly .map-fade-veil");
  const stepsEl = document.querySelector("#fire-scrolly .steps");
  const dissolveLines = fadeVeil
    ? Array.from(fadeVeil.querySelectorAll(".dissolve-line"))
    : [];
  const smokeLayer = fadeVeil
    ? fadeVeil.querySelector(".dissolve-smoke")
    : null;

  function fadeMapAtEnd() {
    const sectionEl = document.querySelector("#fire-scrolly");
    if (!sectionEl || !fadeVeil) return;

    const vh = window.innerHeight;
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    // Scroll position where the sticky map releases.
    const releaseY = sectionEl.offsetTop + sectionEl.offsetHeight - vh;
    // The whole sequence plays over this tail (in viewport units) before release.
    const TAIL = vh * 4.0;
    const tp = clamp01((window.scrollY - (releaseY - TAIL)) / TAIL);

    // 1. Dissolve the map to grey; fade the annotations out. Triggered (auto),
    //    so it always completes — never stuck half-dimmed if you pause.
    const dissolving = tp >= 0.04;
    fadeVeil.classList.toggle("is-grey", dissolving);
    if (stepsEl) stepsEl.classList.toggle("is-faded", dissolving);

    // 2. Each line: scrolling into its range toggles .is-visible, which plays a
    //    timed CSS fade. Blank gaps between ranges; all done before the crossfade.
    const wins = [
      [0.1, 0.28],
      [0.32, 0.5],
      [0.54, 0.72],
    ];
    dissolveLines.forEach((line, i) => {
      const active = tp >= wins[i][0] && tp <= wins[i][1];
      line.classList.toggle("is-visible", active);
    });

    // Smoke behind the text: builds across the lines, clears before the crossfade.
    if (smokeLayer) {
      const build = clamp01((tp - 0.1) / 0.45);
      const clear = 1 - clamp01((tp - 0.62) / 0.1);
      smokeLayer.style.opacity = build * clear;
    }

    // 3. Grey -> PM2.5 peach, also triggered (auto-completes, never stuck mid-blend).
    fadeVeil.classList.toggle("is-peach", tp >= 0.74);

    // 4. Once the dissolve is done and the PM2.5 viz is pinned behind, dismiss the
    //    whole fires layer — a class-triggered CSS fade (margin-top: -200vh puts the
    //    viz underneath). Time-based, so it always completes; you can't get stuck
    //    half-faded. Reveals the peach+viz in place (never the dark map).
    sectionEl.classList.toggle("is-dismissed", window.scrollY >= releaseY - vh);
  }

  const projection = d3
    .geoMercator()
    .center([76.2, 29.45])
    .scale(6100)
    .translate([mapWidth / 2 - 115, mapHeight / 2]);

  const path = d3.geoPath(projection);
  const parseDate = d3.timeParse("%Y-%m-%d");
  const formatDate = d3.timeFormat("%b %d, %Y");

  const FIRE_CSV = "data/processed/fire_grid_2023.csv";
  const INDIA_GEOJSON = "data/geo/india_states.geojson";
  const INDEXED_CSV = "data/processed/fire_pm25_indexed_2023.csv";
  const SELECTED_YEAR = 2023;
  // How much of the section tail is excluded from the date progress. It's less
  // than the full hold region (.fire-outro-spacer), so the day-by-day animation
  // spreads further into the section and keeps advancing right up to the
  // dissolve — instead of finishing early and sitting frozen on the last day.
  const OUTRO_SPACER_VH = 3.9;

  function mapScrollable() {
    const section = document.querySelector("#fire-scrolly");
    if (!section) return 1;
    return Math.max(
      1,
      section.offsetHeight -
        window.innerHeight -
        window.innerHeight * OUTRO_SPACER_VH,
    );
  }

  let fireRows = [];
  let dates = [];
  let currentIndex = 0;
  let frames = [];
  let pendingIndex = null;
  let renderQueued = false;

  // Indexed fire-vs-PM2.5 mini-chart state (grows with the map's current date).
  let indexedRows = [];
  let miniX = null;
  let miniY = null;
  let miniLineFires = null;
  let miniLinePm = null;
  let miniFiresPath = null;
  let miniPmPath = null;
  let miniDayMarker = null;

  Promise.all([
    d3.json(INDIA_GEOJSON),
    d3.csv(FIRE_CSV, (d) => ({
      lat: +d.latitude,
      lon: +d.longitude,
      date: parseDate(d.date),
      count: +d.count || 1,
      frp: +d.frp || 1,
    })),
    d3.csv(INDEXED_CSV, (d) => ({
      seasonDay: +d.season_day,
      date: parseDate(d.date),
      fires: +d.fires_indexed,
      pm25: +d.pm25_indexed,
    })),
  ]).then(([india, rows, indexed]) => {
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
    buildMiniChart(indexed);
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
      { name: "UTTAR PRADESH", coords: [78.45, 28.95] },
    ];

    labelLayer
      .selectAll(".map-label")
      .data(labels)
      .join("text")
      .attr("class", "map-label")
      .attr("x", (d) => projection(d.coords)[0])
      .attr("y", (d) => projection(d.coords)[1])
      .text((d) => d.name);

    drawWindFlow();

    const delhi = projection([77.209, 28.6139]);
    labelLayer
      .append("circle")
      .attr("class", "delhi-ring delhi-ring-outer")
      .attr("cx", delhi[0])
      .attr("cy", delhi[1])
      .attr("r", 18);
    labelLayer
      .append("circle")
      .attr("class", "delhi-ring delhi-ring-inner")
      .attr("cx", delhi[0])
      .attr("cy", delhi[1])
      .attr("r", 10);
    labelLayer
      .append("circle")
      .attr("class", "delhi-marker")
      .attr("cx", delhi[0])
      .attr("cy", delhi[1])
      .attr("r", 6.5);
    labelLayer
      .append("text")
      .attr("class", "delhi-label")
      .attr("x", delhi[0] + 24)
      .attr("y", delhi[1] + 6)
      .text("DELHI");
  }

  function drawWindFlow() {
    const routes = [
      {
        id: "smoke-to-delhi",
        points: [
          [75.15, 30.85],
          [75.95, 30.15],
          [76.55, 29.3],
          [77.18, 28.63],
        ],
      },
    ];

    const line = d3
      .line()
      .curve(d3.curveBasis)
      .x((d) => projection(d)[0])
      .y((d) => projection(d)[1]);

    const defs = windSvg.append("defs");
    defs
      .append("marker")
      .attr("id", "wind-arrowhead")
      .attr("viewBox", "0 -5 12 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L12,0L0,5")
      .attr("class", "wind-arrowhead");
    defs
      .append("marker")
      .attr("id", "wind-vector-arrowhead")
      .attr("viewBox", "0 -3 7 6")
      .attr("refX", 6)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-3L7,0L0,3")
      .attr("class", "wind-vector-arrowhead");

    const vectors = [];
    for (let lon = 74.5; lon <= 78.2; lon += 0.45) {
      for (let lat = 28.2; lat <= 31.4; lat += 0.42) {
        const start = projection([lon, lat]);
        const end = projection([lon + 0.18, lat - 0.12]);
        vectors.push({ x1: start[0], y1: start[1], x2: end[0], y2: end[1] });
      }
    }

    windLayer
      .append("g")
      .attr("class", "wind-vector-field")
      .selectAll("line")
      .data(vectors)
      .join("line")
      .attr("class", "wind-vector")
      .attr("x1", (d) => d.x1)
      .attr("y1", (d) => d.y1)
      .attr("x2", (d) => d.x2)
      .attr("y2", (d) => d.y2)
      .attr("marker-end", "url(#wind-vector-arrowhead)");

    const routeGroup = windLayer
      .selectAll(".wind-route-group")
      .data(routes)
      .join("g")
      .attr("class", (d, i) => `wind-route-group wind-route-group-${i + 1}`);

    routeGroup
      .append("path")
      .attr("class", "wind-route-halo")
      .attr("d", (d) => line(d.points));

    routeGroup
      .append("path")
      .attr("class", (d, i) => `wind-route wind-route-${i + 1}`)
      .attr("d", (d) => line(d.points))
      .attr("marker-end", "url(#wind-arrowhead)");
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
    // Batch all scroll/step/resize work into one frame. Scroll events and
    // scrollama's progress callback both fire many times per frame and each does
    // layout reads (getBoundingClientRect) — coalescing to a single rAF removes
    // the layout thrashing that makes the scrollytelling feel choppy.
    let scrollScheduled = false;
    function scheduleUpdate() {
      if (scrollScheduled) return;
      scrollScheduled = true;
      requestAnimationFrame(() => {
        scrollScheduled = false;
        updateByProgress(getFireScrollProgress());
        fadeMapAtEnd();
      });
    }

    const scroller = scrollama();
    scroller
      .setup({
        step: ".step",
        offset: 0.58,
        progress: true,
      })
      .onStepEnter(scheduleUpdate)
      .onStepProgress(scheduleUpdate);

    window.addEventListener("resize", scroller.resize);
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    scheduleUpdate();
  }

  function getFireScrollProgress() {
    const section = document.querySelector("#fire-scrolly");
    if (!section) return 0;

    const start = section.offsetTop;
    const scrollable = mapScrollable();
    const rawProgress = Math.max(
      0,
      Math.min(1, (window.scrollY - start) / scrollable),
    );
    return Math.max(0, Math.min(1, rawProgress * 1.12));
  }

  // Freeze the day while the wind visualization is prominently on screen, then
  // resume. We hold the date across the wind window and remap the rest of the
  // scroll so it stays continuous (no jump when the wind fades away).
  const FREEZE_FOCUS_THRESHOLD = 0.5;

  function getWindFreezeWindow() {
    const smokeStep = document.querySelector(".smoke-route-step");
    const section = document.querySelector("#fire-scrolly");
    if (!smokeStep || !section) return null;

    const start = section.offsetTop;
    const scrollable = mapScrollable();
    const scrollToProgress = (y) => {
      const raw = Math.max(0, Math.min(1, (y - start) / scrollable));
      return Math.max(0, Math.min(1, raw * 1.12));
    };

    const rect = smokeStep.getBoundingClientRect();
    const stepCenterAbs = rect.top + window.scrollY + rect.height / 2;
    // Scroll position where the wind focus peaks (step centered in viewport).
    const scrollCenter = stepCenterAbs - window.innerHeight / 2;
    const range = window.innerHeight * 0.55; // must match getSmokeStepFocus
    // Freeze across the band where focus exceeds the threshold.
    const half = range * (1 - FREEZE_FOCUS_THRESHOLD);
    return {
      a: scrollToProgress(scrollCenter - half),
      b: scrollToProgress(scrollCenter + half),
    };
  }

  function freezeAdjustedProgress(progress) {
    const win = getWindFreezeWindow();
    if (!win) return progress;
    const span = win.b - win.a;
    if (!(span > 0) || span >= 0.9) return progress;

    let eff;
    if (progress <= win.a) eff = progress;
    else if (progress < win.b) eff = win.a; // held on the wind day
    else eff = progress - span;
    return eff / (1 - span);
  }

  function updateByProgress(progress) {
    if (!dates.length) return;

    const smokeStepFocus = getSmokeStepFocus();
    dimLayer.style("opacity", smokeStepFocus * 0.28);
    windLayer.style("opacity", smokeStepFocus * 0.88);

    const eff = freezeAdjustedProgress(progress);
    const i = Math.max(
      0,
      Math.min(dates.length - 1, Math.round(eff * (dates.length - 1))),
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
      const recentRows = rows.filter(
        (d) => d.date >= recentStart && d.date <= date,
      );
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

    updateMiniChart(currentDate);

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

  function buildMiniChart(data) {
    indexedRows = (data || [])
      .filter((d) => d.date && !isNaN(d.fires) && !isNaN(d.pm25))
      .sort((a, b) => a.seasonDay - b.seasonDay);
    if (!indexedRows.length) return;

    const W = 300;
    const H = 170;
    const m = { top: 24, right: 10, bottom: 22, left: 34 };
    const maxDay = d3.max(indexedRows, (d) => d.seasonDay);

    const svgMini = d3
      .select("#fire-pm-mini-chart")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
    svgMini.selectAll("*").remove();

    miniX = d3.scaleLinear().domain([1, maxDay]).range([m.left, W - m.right]);
    miniY = d3.scaleLinear().domain([0, 1]).range([H - m.bottom, m.top]);

    // Horizontal gridlines at 0 / 0.5 / 1.
    svgMini
      .append("g")
      .attr("class", "mini-grid")
      .selectAll("line")
      .data([0, 0.5, 1])
      .join("line")
      .attr("x1", m.left)
      .attr("x2", W - m.right)
      .attr("y1", (d) => miniY(d))
      .attr("y2", (d) => miniY(d));

    // Y axis: domain line, ticks (0 / 0.5 / 1), and a rotated title.
    const yAxis = svgMini.append("g").attr("class", "axis mini-yaxis");
    yAxis
      .append("line")
      .attr("x1", m.left)
      .attr("x2", m.left)
      .attr("y1", miniY(0))
      .attr("y2", miniY(1));
    yAxis
      .selectAll("text.tick")
      .data([0, 0.5, 1])
      .join("text")
      .attr("class", "tick")
      .attr("x", m.left - 5)
      .attr("y", (d) => miniY(d))
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .text((d) => d);
    yAxis
      .append("text")
      .attr("class", "mini-axis-title")
      .attr("transform", `translate(9, ${(miniY(0) + miniY(1)) / 2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .text("Relative level (0–1)");

    // X labels: Oct 1, Nov 1, Nov 30.
    const xticks = [
      { day: 1, label: "Oct 1", anchor: "start" },
      { day: 32, label: "Nov 1", anchor: "middle" },
      { day: maxDay, label: "Nov 30", anchor: "end" },
    ];
    svgMini
      .append("g")
      .attr("class", "axis")
      .selectAll("text")
      .data(xticks)
      .join("text")
      .attr("x", (d) => miniX(d.day))
      .attr("y", H - m.bottom + 12)
      .attr("text-anchor", (d) => d.anchor)
      .text((d) => d.label);

    // Vertical marker at the current day.
    miniDayMarker = svgMini
      .append("line")
      .attr("class", "mini-day-marker")
      .attr("y1", m.top)
      .attr("y2", H - m.bottom)
      .attr("x1", miniX(1))
      .attr("x2", miniX(1))
      .style("opacity", 0);

    miniLineFires = d3
      .line()
      .x((d) => miniX(d.seasonDay))
      .y((d) => miniY(d.fires))
      .curve(d3.curveMonotoneX);
    miniLinePm = d3
      .line()
      .x((d) => miniX(d.seasonDay))
      .y((d) => miniY(d.pm25))
      .curve(d3.curveMonotoneX);

    miniPmPath = svgMini.append("path").attr("class", "mini-line pm25");
    miniFiresPath = svgMini.append("path").attr("class", "mini-line fires");

    // Compact legend in the top margin.
    const legend = svgMini
      .append("g")
      .attr("class", "mini-legend")
      .attr("transform", `translate(${m.left}, 11)`);
    legend
      .append("line")
      .attr("class", "mini-line fires")
      .attr("x1", 0)
      .attr("x2", 14)
      .attr("y1", 0)
      .attr("y2", 0);
    legend.append("text").attr("x", 18).attr("y", 3).text("Fires");
    legend
      .append("line")
      .attr("class", "mini-line pm25")
      .attr("x1", 56)
      .attr("x2", 70)
      .attr("y1", 0)
      .attr("y2", 0);
    legend.append("text").attr("x", 74).attr("y", 3).text("Delhi PM2.5 (2022)");

    updateMiniChart(indexedRows[0].date);
  }

  function currentSeasonDay(date) {
    if (!date || !indexedRows.length) return 1;
    const seasonStart = new Date(date.getFullYear(), 9, 1); // Oct 1
    const day = Math.round((date - seasonStart) / 86400000) + 1;
    const maxDay = d3.max(indexedRows, (d) => d.seasonDay);
    return Math.max(1, Math.min(maxDay, day));
  }

  function updateMiniChart(currentDate) {
    if (!indexedRows.length || !miniFiresPath) return;
    const day = currentSeasonDay(currentDate);
    const visible = indexedRows.filter((d) => d.seasonDay <= day);
    if (!visible.length) return;
    miniFiresPath.attr("d", miniLineFires(visible));
    miniPmPath.attr("d", miniLinePm(visible));
    const last = visible[visible.length - 1];
    miniDayMarker
      .attr("x1", miniX(last.seasonDay))
      .attr("x2", miniX(last.seasonDay))
      .style("opacity", 1);
  }

  function getSmokeStepFocus() {
    const smokeStep = document.querySelector(".smoke-route-step");
    if (!smokeStep) return 0;

    const rect = smokeStep.getBoundingClientRect();
    const viewportMid = window.innerHeight * 0.5;
    const distance = Math.abs(rect.top + rect.height * 0.5 - viewportMid);
    const range = window.innerHeight * 0.55;
    return Math.max(0, Math.min(1, 1 - distance / range));
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
