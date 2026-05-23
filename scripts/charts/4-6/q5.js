// Improved split violin: vertical value axis, mirrored densities, jittered points and tooltip
export function drawQ5(rows) {
  try {
    console.log('drawQ5 called', Array.isArray(rows) ? rows.length : typeof rows);
    const containerId = "q5-violin";
    const container = d3.select(`#${containerId}`);
    if (container.empty()) return;

    const metricSelect = d3.select("#q5-metric-select");
    if (!metricSelect.empty() && !metricSelect.node().__onchange_registered) {
      metricSelect.on("change", () => {
        drawQ5(rows);
      });
      metricSelect.node().__onchange_registered = true;
    }
    const metricKey = metricSelect.empty() ? "temp" : metricSelect.node().value;
    const metricLabels = {
      temp: "Avg Temp (°C)",
      humidity: "Avg Humidity (%)",
      precip: "Precipitation (mm)",
      maxwind: "Max Wind (kph)",
    };
    const metricLabel = metricLabels[metricKey] || metricKey;

    const data = rows.filter((d) => d && d.terrain && Number.isFinite(d[metricKey]));
    const groupFor = (d) => (String(d.terrain).toLowerCase().includes("ven biển") ? "Coastal" : "Inland");
    const groups = ["Coastal", "Inland"];

    const margin = { top: 28, right: 20, bottom: 48, left: 64 };
    const width = Math.max(680, container.node().getBoundingClientRect().width || 900);
    const height = 480;
    let svg = container.select("svg");
    let g;
    const isInit = svg.empty();
    if (isInit) {
      svg = container.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%");
      g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    } else {
      g = svg.select("g");
      svg.attr("viewBox", `0 0 ${width} ${height}`);
      g.attr("transform", `translate(${margin.left},${margin.top})`);
    }
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    // group centers
    const x = d3.scalePoint().domain(groups).range([innerW * 0.25, innerW * 0.75]);

    // y scale from metric values
    const allVals = data.map((d) => d[metricKey]);
    const y = d3.scaleLinear().domain([d3.min(allVals), d3.max(allVals)]).nice().range([innerH, 0]);

    // KDE helpers
    function kernelEpanechnikov(bandwidth) {
      return function (u) {
        u = u / bandwidth;
        return Math.abs(u) <= 1 ? 0.75 * (1 - u * u) / bandwidth : 0;
      };
    }
    function kernelDensityEstimator(kernel, X) {
      return function (V) {
        return X.map(function (x) {
          return [x, d3.mean(V, function (v) {
            return kernel(x - v);
          }) || 0];
        });
      };
    }

    const DENSITY_STEPS = 30; // fewer steps -> cheaper KDE and path interpolation
    const densityY = d3.range(y.domain()[0], y.domain()[1] + 1e-9, (y.domain()[1] - y.domain()[0]) / Math.max(1, DENSITY_STEPS - 1));

    // compute densities per group
    const densities = new Map();
    groups.forEach((gname) => {
      const vals = data.filter((d) => groupFor(d) === gname).map((d) => d[metricKey]);
      if (vals.length === 0) {
        densities.set(gname, []);
        return;
      }
      const bw = (d3.max(vals) - d3.min(vals)) / Math.sqrt(vals.length) || (y.domain()[1] - y.domain()[0]) / 20;
      const kde = kernelDensityEstimator(kernelEpanechnikov(bw), densityY);
      const dens = kde(vals);
      densities.set(gname, dens);
    });

    // width scale for violin (density -> px)
    const maxDensity = d3.max(Array.from(densities.values()).flatMap((d) => d.map((p) => p[1]))) || 0.0001;
    const maxViolinWidth = Math.min(120, innerW * 0.18);
    const widthScale = d3.scaleLinear().domain([0, maxDensity]).range([0, maxViolinWidth]);

    // single y-axis on the left
    const yAxisG = g.selectAll(".y-axis").data([0]).join("g").attr("class", "y-axis");
    yAxisG.call(d3.axisLeft(y)).selectAll("text").attr("font-size", 11);

    // center line labels
    g.selectAll(".group-label").data(groups).join("text").attr("class", "group-label").attr("x", (d) => x(d)).attr("y", innerH + 32).attr("text-anchor", "middle").text((d) => d).attr("font-weight", 700);

    // tooltip
    const ttSel = d3.select("body").selectAll(".chart-tooltip").data([0]);
    const tt = ttSel.enter().append("div").attr("class", "chart-tooltip").merge(ttSel).style("position", "absolute").style("pointer-events", "none").style("opacity", 0).style("background", "white").style("border", "1px solid #ddd").style("padding", "6px").style("font-size", "12px");

    const TRANS_DUR = 1200;
    const TRANS_EASE = d3.easeCubic;
    const MAX_POINTS_PER_GROUP = 200; // cap rendered points per group to reduce DOM pressure

    // draw / update violins
    groups.forEach((gname, i) => {
      const dens = densities.get(gname) || [];
      if (!dens.length) return;
      const area = d3.area()
        .x0((d) => x(gname) - widthScale(d[1]))
        .x1((d) => x(gname) + widthScale(d[1]))
        .y((d) => y(d[0]))
        .curve(d3.curveCatmullRom);

      // group container for this violin
      let groupG = g.select(`g.violin-group[data-name='${gname}']`);
      if (groupG.empty()) groupG = g.append("g").attr("class", "violin-group").attr("data-name", gname);

      // violin path join (use numeric interpolation of density arrays for better perf)
      const pathSel = groupG.selectAll("path.violin").data([dens]);
      pathSel.join(
        (enter) => enter.append("path").attr("class", "violin").attr("d", area).attr("fill", gname === "Coastal" ? "#2563eb" : "#ef4444").attr("stroke", "#111827").attr("stroke-width", 0.5).attr("opacity", 0).call((s) => s.transition().duration(TRANS_DUR).ease(TRANS_EASE).attr("opacity", 0.75)).each(function (d) { this.__prevDensityArr = d.map(p => p[1]); }),
        (update) => update.transition().duration(TRANS_DUR).ease(TRANS_EASE).attrTween("d", function (nextD) {
          const prevArr = this.__prevDensityArr || nextD.map(p => p[1]);
          const nextArr = nextD.map(p => p[1]);
          const interp = d3.interpolateArray(prevArr, nextArr);
          this.__prevDensityArr = nextArr;
          return (t) => {
            const arr = interp(t);
            const densInterp = nextD.map((p, i) => [p[0], arr[i]]);
            return area(densInterp);
          };
        }).attr("fill", gname === "Coastal" ? "#2563eb" : "#ef4444"),
        (exit) => exit.transition().duration(400).attr("opacity", 0).remove()
      );

      // (raw points removed for clarity and performance)

      // median line
      const valsFor = data.filter((d) => groupFor(d) === gname).map((d) => d[metricKey]);
      if (valsFor.length) {
        const med = d3.median(valsFor);
        const medLineSel = groupG.selectAll("line.median").data([med]);
        medLineSel.join(
          (enter) => enter.append("line").attr("class", "median").attr("x1", x(gname) - Math.min(maxViolinWidth, widthScale(d3.max(dens, (d) => d[1])))).attr("x2", x(gname) + Math.min(maxViolinWidth, widthScale(d3.max(dens, (d) => d[1])))).attr("y1", y(med)).attr("y2", y(med)).attr("stroke", "#111827").attr("stroke-width", 2).attr("stroke-dasharray", "3 2").attr("opacity", 0).call((s) => s.transition().duration(TRANS_DUR).ease(TRANS_EASE).attr("opacity", 1)),
          (update) => update.transition().duration(TRANS_DUR).ease(TRANS_EASE).attrTween("y1", function (n) { const prev = +this.getAttribute('y1') || y(n); const next = y(n); return t => prev + (next - prev) * t; }).attrTween("y2", function (n) { const prev = +this.getAttribute('y2') || y(n); const next = y(n); return t => prev + (next - prev) * t; }).attr("x1", x(gname) - Math.min(maxViolinWidth, widthScale(d3.max(dens, (d) => d[1])))).attr("x2", x(gname) + Math.min(maxViolinWidth, widthScale(d3.max(dens, (d) => d[1])))).attr("opacity", 1),
          (exit) => exit.transition().duration(300).attr("opacity", 0).remove()
        );
      }
    });

    // y-axis title
    const yTitle = g.selectAll(".y-title").data([metricLabel]);
    yTitle.join(
      (enter) => enter.append("text").attr("class", "y-title").attr("x", -margin.left + 12).attr("y", -8).attr("text-anchor", "start").attr("font-size", 13).attr("font-weight", 700).text(metricLabel),
      (update) => update.text(metricLabel)
    );

    // legend
    const legend = g.selectAll(".legend").data([0]).join("g").attr("class", "legend").attr("transform", `translate(${innerW - 140}, -6)`);
    const legendItems = [{ k: 'Coastal', c: '#2563eb' }, { k: 'Inland', c: '#ef4444' }];
    const itemSel = legend.selectAll('g.item').data(legendItems);
    itemSel.join(
      (enter) => {
        const row = enter.append('g').attr('class', 'item').attr('transform', (d, i) => `translate(0, ${i * 18})`);
        row.append('rect').attr('width', 12).attr('height', 12).attr('fill', (d) => d.c);
        row.append('text').attr('x', 18).attr('y', 10).text((d) => d.k).attr('font-size', 12);
        return row;
      },
      (update) => update.attr('transform', (d, i) => `translate(0, ${i * 18})`).select('text').text((d) => d.k),
      (exit) => exit.remove()
    );

    // update y axis if already present
    yAxisG.transition().duration(TRANS_DUR).ease(TRANS_EASE).call(d3.axisLeft(y)).selectAll("text").attr("font-size", 11);
  } catch (err) {
    console.error('drawQ5 error', err && err.message ? err.message : err);
    throw err;
  }
}
