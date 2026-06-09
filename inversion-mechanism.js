/* Delhi temperature-inversion scrollytelling — one full-width scene.
   Mountains across the back, Delhi skyline centred near the bottom, a dark
   ground strip, and pollutant particles that drift across the whole scene.
   Steps:
     1  crop smoke flies in from the left
     2  city sources fade in one-by-one (traffic, waste, industry, ...and more)
     3  most of the year it disperses (particles fan across the scene)
     4  winter inversion lid appears
     5  smog thickens (pressed against the lid)
     6  stuck over Delhi */
(function () {
  "use strict";

  var VB_W = 1440,
    VB_H = 810,
    GROUND_Y = 700,
    LID_Y = 300,
    DELHI_CX = 970;

  var SOURCES = [
    { group: 0, color: "#e8743a", count: 34 }, // crop (flies in from left)
    { group: 1, color: "#9a8f7d", count: 30 }, // traffic
    { group: 2, color: "#b0875c", count: 26 }, // waste
    { group: 3, color: "#d2a36e", count: 26 }, // industry
    { group: 4, color: "#6f6557", count: 22 }, // ...and more
  ];

  var CITY_LINES = [
    "Traffic emissions",
    "Waste burning",
    "Industry emissions",
    "…and many more, all from within the city",
  ];

  var STEP_TEXT = {
    1: { title: "", body: "It's not just fires that affect Delhi's air…" },
    3: {
      title: "Most of the year, it clears",
      body: "For much of the year, breezes carry these particles away and the air can breathe.",
    },
    4: {
      title: "But the city sits in a bowl",
      body: "Delhi lies in a low basin on the Indo-Gangetic Plain — ringed by the Himalayas to the north and the Aravalli hills to the southwest. The polluted air can only drift so far.",
    },
    5: {
      title: "And winter seals it in",
      body: "Cold air settles beneath a layer of warmer air — a <b>temperature inversion</b> — and calm winter winds let the smog pile up.",
    },
    6: {
      title: "The smog thickens",
      body: "Pollutants accumulate, and moist winter air mixes with them into the thick smog that blankets the city.",
    },
    7: {
      title: "Stuck over Delhi",
      body: "Trapped in the bowl beneath the lid, the smog can sit over Delhi for days — pollution you can see and breathe.",
    },
  };

  var dots = [];
  var svg, dotSel, lidG;
  var currentStep = 0,
    cityReveal = 0,
    captionTimer = null,
    cityTimers = [];

  function buildDots() {
    var id = 0;
    SOURCES.forEach(function (s) {
      for (var i = 0; i < s.count; i++) {
        dots.push({
          id: id++,
          group: s.group,
          color: s.color,
          rx: Math.random(),
          ry: Math.random(),
          rx2: Math.random(),
          ry2: Math.random(),
        });
      }
    });
  }

  function gatheredX(d) {
    return DELHI_CX + (d.rx - 0.5) * 460;
  }
  function gatheredY(d) {
    return GROUND_Y - 14 - d.ry * 210;
  }

  function visibleMax(step, reveal) {
    if (step >= 3) return 4;
    if (step === 2) return reveal;
    return 0;
  }

  function layout(d, step, reveal) {
    if (d.group > visibleMax(step, reveal)) {
      return { x: gatheredX(d), y: gatheredY(d), op: 0, r: 0 };
    }
    var x, y, op, r = 7;
    if (step <= 2) {
      x = gatheredX(d);
      y = gatheredY(d);
      op = 0.94;
    } else if (step === 3) {
      x = 120 + d.rx2 * (VB_W - 240);
      y = 90 + d.ry2 * 560;
      op = 0.4;
      r = 6.4;
    } else if (step === 4) {
      // basin: the air settles back low over the city, spread but contained
      x = DELHI_CX + (d.rx - 0.5) * 680;
      y = GROUND_Y - 16 - d.ry * 244;
      op = 0.76;
    } else if (step === 5) {
      x = DELHI_CX + (d.rx - 0.5) * 580;
      y = LID_Y + 26 + d.ry * (GROUND_Y - LID_Y - 44);
      op = 0.8;
    } else if (step === 6) {
      x = DELHI_CX + (d.rx - 0.5) * 540;
      y = LID_Y + 12 + d.ry * (GROUND_Y - LID_Y - 26) * 0.82;
      op = 0.9;
    } else {
      x = DELHI_CX + (d.rx - 0.5) * 580;
      y = LID_Y + 8 + d.ry * (GROUND_Y - LID_Y - 18);
      op = 0.97;
    }
    return { x: x, y: y, op: op, r: r };
  }

  function render(step, reveal) {
    dots.forEach(function (d) {
      d._t = layout(d, step, reveal);
    });
    dotSel
      .transition()
      .duration(900)
      .ease(window.d3.easeCubicInOut)
      .attr("cx", function (d) {
        return d._t.x;
      })
      .attr("cy", function (d) {
        return d._t.y;
      })
      .attr("r", function (d) {
        return d._t.r;
      })
      .style("opacity", function (d) {
        return d._t.op;
      });
    lidG.transition().duration(650).style("opacity", step >= 5 ? 1 : 0);
  }

  /* ── Captions ── */
  function cap() {
    return document.getElementById("inversion-caption");
  }
  function singleHTML(t) {
    return (
      '<div class="cap-inner">' +
      (t.title ? "<h3>" + t.title + "</h3>" : "") +
      "<p>" +
      t.body +
      "</p></div>"
    );
  }
  function cityHTML(reveal) {
    var html =
      '<div class="cap-inner"><p class="cap-lead">There\'s also…</p><ul class="cap-list">';
    for (var i = 0; i < reveal; i++) {
      html +=
        '<li class="cap-li' +
        (i === reveal - 1 ? " cap-new" : "") +
        '">' +
        CITY_LINES[i] +
        "</li>";
    }
    return html + "</ul></div>";
  }
  function fadeCaption(html) {
    var c = cap();
    if (!c) return;
    c.classList.remove("is-shown");
    if (captionTimer) clearTimeout(captionTimer);
    captionTimer = setTimeout(function () {
      c.innerHTML = html;
      c.classList.add("is-shown");
    }, 250);
  }
  function clearCityTimers() {
    cityTimers.forEach(clearTimeout);
    cityTimers = [];
  }
  function playCityStep() {
    clearCityTimers();
    cityReveal = 0;
    render(2, 0);
    fadeCaption(cityHTML(0));
    [
      [1, 600],
      [2, 1500],
      [3, 2400],
      [4, 3300],
    ].forEach(function (pair) {
      cityTimers.push(
        setTimeout(function () {
          cityReveal = pair[0];
          render(2, cityReveal);
          var c = cap();
          if (c) {
            c.innerHTML = cityHTML(cityReveal);
            c.classList.add("is-shown");
          }
        }, 250 + pair[1]),
      );
    });
  }

  function goToStep(step) {
    if (step === currentStep) return;
    currentStep = step;
    clearCityTimers();
    if (step === 2) {
      playCityStep();
    } else {
      render(step, 4);
      fadeCaption(singleHTML(STEP_TEXT[step]));
    }
  }

  function mountainPoints(layer) {
    // soft triangular silhouettes — a far range and a nearer one for depth
    var pts =
      layer === 0
        ? [
            // far range: higher, gentler peaks
            [0, GROUND_Y],
            [260, 540],
            [520, 612],
            [820, 470],
            [1120, 590],
            [1440, 520],
            [1440, GROUND_Y],
          ]
        : [
            // near range: lower, broader triangles in front
            [0, GROUND_Y],
            [180, 632],
            [460, 560],
            [760, 648],
            [1040, 556],
            [1340, 640],
            [1440, 600],
            [1440, GROUND_Y],
          ];
    return pts
      .map(function (p) {
        return p.join(",");
      })
      .join(" ");
  }

  function drawCity(g) {
    var cx = DELHI_CX;
    // soft rounded-top buildings, centred on cx
    [
      [-110, 26, 50],
      [-78, 18, 78],
      [-30, 28, 60],
      [112, 24, 64],
      [142, 20, 42],
    ].forEach(function (b) {
      g.append("rect")
        .attr("x", cx + b[0])
        .attr("y", GROUND_Y - b[2])
        .attr("width", b[1])
        .attr("height", b[2])
        .attr("rx", 5);
    });
    // Qutub-style minar — slightly taller than nearby buildings, still subtle
    var mx = cx - 54;
    g.append("path").attr(
      "d",
      "M" + mx + " " + GROUND_Y + " L" + (mx + 5) + " 590 L" + (mx + 15) +
        " 590 L" + (mx + 20) + " " + GROUND_Y + " Z",
    );
    g.append("rect").attr("x", mx + 2).attr("y", 612).attr("width", 16).attr("height", 5).attr("rx", 1);
    g.append("rect").attr("x", mx + 3).attr("y", 638).attr("width", 14).attr("height", 5).attr("rx", 1);
    // India Gate-style arch — scaled to building height so it doesn't dominate
    var ax = cx + 4;
    g.append("path")
      .attr("fill-rule", "evenodd")
      .attr(
        "d",
        "M" + ax + " " + GROUND_Y + " L" + ax + " 636 Q" + (ax + 28) + " 624 " +
          (ax + 56) + " 636 L" + (ax + 56) + " " + GROUND_Y + " Z " +
          "M" + (ax + 18) + " " + GROUND_Y + " L" + (ax + 18) + " 654 Q" +
          (ax + 28) + " 646 " + (ax + 38) + " 654 L" + (ax + 38) + " " + GROUND_Y + " Z",
      );
    // domed building
    var dx = cx + 70;
    g.append("rect").attr("x", dx).attr("y", GROUND_Y - 46).attr("width", 34).attr("height", 46).attr("rx", 4);
    g.append("path").attr(
      "d",
      "M" + dx + " " + (GROUND_Y - 46) + " Q" + (dx + 17) + " " + (GROUND_Y - 72) +
        " " + (dx + 34) + " " + (GROUND_Y - 46) + " Z",
    );
  }

  function build() {
    var host = document.getElementById("inversion-viz");
    if (!host || typeof window.d3 === "undefined") return;
    var d3 = window.d3;
    buildDots();

    svg = d3
      .select(host)
      .append("svg")
      .attr("viewBox", "0 0 " + VB_W + " " + VB_H)
      .attr("preserveAspectRatio", "xMidYMax slice")
      .style("width", "100%")
      .style("height", "100%")
      .style("display", "block");

    var defs = svg.append("defs");
    var sky = defs
      .append("linearGradient")
      .attr("id", "inv-sky")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", 1);
    sky.append("stop").attr("offset", "0%").attr("stop-color", "#322f2a");
    sky.append("stop").attr("offset", "100%").attr("stop-color", "#48433c");
    // ground fades into the next section's panel colour for a seamless hand-off
    var grd = defs
      .append("linearGradient")
      .attr("id", "inv-ground")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", 1);
    grd.append("stop").attr("offset", "0%").attr("stop-color", "#201e1a");
    grd.append("stop").attr("offset", "100%").attr("stop-color", "#383735");

    svg
      .append("rect")
      .attr("width", VB_W)
      .attr("height", VB_H)
      .attr("fill", "url(#inv-sky)");
    // background mountains — subtle, low-opacity silhouettes for depth
    svg
      .append("polygon")
      .attr("points", mountainPoints(0))
      .attr("fill", "#564f44")
      .attr("opacity", 0.4);
    svg
      .append("polygon")
      .attr("points", mountainPoints(1))
      .attr("fill", "#3a352d")
      .attr("opacity", 0.55);
    svg
      .append("rect")
      .attr("x", 0)
      .attr("y", GROUND_Y)
      .attr("width", VB_W)
      .attr("height", VB_H - GROUND_Y)
      .attr("fill", "url(#inv-ground)");

    drawCity(svg.append("g").attr("fill", "#15130f"));
    svg
      .append("text")
      .attr("x", DELHI_CX)
      .attr("y", GROUND_Y + 36)
      .attr("text-anchor", "middle")
      .attr("fill", "#c9c0b1")
      .style("font-size", "18px")
      .style("font-weight", "700")
      .style("letter-spacing", "0.16em")
      .style("font-family", "Arial, Helvetica, sans-serif")
      .text("DELHI");

    lidG = svg.append("g").style("opacity", 0);
    lidG
      .append("line")
      .attr("x1", VB_W / 2)
      .attr("x2", VB_W - 60)
      .attr("y1", LID_Y)
      .attr("y2", LID_Y)
      .attr("stroke", "#dca85a")
      .attr("stroke-width", 3)
      .attr("stroke-dasharray", "12 8");
    lidG
      .append("text")
      .attr("x", VB_W - 66)
      .attr("y", LID_Y - 14)
      .attr("text-anchor", "end")
      .attr("fill", "#e2b46a")
      .style("font-size", "17px")
      .style("font-weight", "700")
      .style("font-family", "Arial, Helvetica, sans-serif")
      .text("warm-air lid · inversion");

    dotSel = svg
      .append("g")
      .selectAll("circle")
      .data(dots)
      .join("circle")
      .attr("cx", function (d) {
        return d.group === 0 ? -140 : gatheredX(d);
      })
      .attr("cy", function (d) {
        return d.group === 0 ? GROUND_Y - 90 - d.ry * 160 : gatheredY(d);
      })
      .attr("r", 0)
      .style("opacity", 0)
      .attr("fill", function (d) {
        return d.color;
      });

    setupObserver();
  }

  function setupObserver() {
    var steps = document.querySelectorAll(".inversion-step");
    if (!steps.length) return;
    if (!("IntersectionObserver" in window)) {
      goToStep(6);
      return;
    }
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            var s = +e.target.getAttribute("data-step");
            if (s) goToStep(s);
          }
        });
      },
      { threshold: 0.55 },
    );
    steps.forEach(function (s) {
      obs.observe(s);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
