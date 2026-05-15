/**
 * Q3 – Dashboard: trục X = vùng; trong mỗi vùng luôn có vị trí Q1–Q4.
 * Biểu 1: dual axis — độ ẩm (trái), nhiệt độ (phải), lưới đồng bộ.
 * Lọc quý: chỉ cột; nhiệt độ = node đen. Chọn Tất cả: đường nối Q1→Q4.
 */
export function drawQ3MultiAttribute(data) {
  const container = d3.select("#combo-region-weather");
  container.selectAll("*").remove();

  if (!data || data.length === 0) return;

  const state = {
    quarter: "all",
    pinnedRegion: null,
    hoverRegion: null,
  };

  const controls = container
    .append("div")
    .attr("class", "q3-controls chart-controls")
    .style("display", "flex")
    .style("flex-wrap", "wrap")
    .style("gap", "1rem")
    .style("align-items", "center")
    .style("margin-bottom", "0.75rem");

  controls
    .append("label")
    .attr("for", "q3-quarter-filter")
    .style("margin", "0")
    .text("Lọc quý:");

  const quarterSelect = controls
    .append("select")
    .attr("id", "q3-quarter-filter")
    .attr("class", "form-select")
    .style("max-width", "220px");

  quarterSelect
    .selectAll("option")
    .data([
      { v: "all", t: "Tất cả (Q1–Q4)" },
      { v: "1", t: "Chỉ Q1" },
      { v: "2", t: "Chỉ Q2" },
      { v: "3", t: "Chỉ Q3" },
      { v: "4", t: "Chỉ Q4" },
    ])
    .join("option")
    .attr("value", (d) => d.v)
    .text((d) => d.t);

  let tooltip = d3.select("body").select(".d3-tooltip-q3");
  if (tooltip.empty()) {
    tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "d3-tooltip-q3")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.88)")
      .style("color", "#fff")
      .style("padding", "8px 12px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 1000);
  }

  const panel1 = container
    .append("div")
    .attr("class", "q3-panel")
    .style("width", "100%");
  panel1
    .append("h3")
    .attr("class", "q3-panel-title")
    .style("margin", "0 0 0.5rem 0")
    .style("font-size", "1rem")
    .text("Task 3.1 - So sánh nhiệt độ và độ ẩm trung bình theo vùng và quý");

  const el1 = panel1
    .append("div")
    .attr("class", "chart-container q3-chart-temp-humidity")
    .style("position", "relative");

  const panel2 = container
    .append("div")
    .attr("class", "q3-panel")
    .style("width", "100%");
  panel2
    .append("h3")
    .attr("class", "q3-panel-title")
    .style("margin", "0 0 0.5rem 0")
    .style("font-size", "1rem")
    .text("Task 3.2 - Phân bố lượng mưa theo vùng và quý");

  const el2 = panel2
    .append("div")
    .attr("class", "chart-container q3-chart-precip")
    .style("position", "relative");

  const regionsAll = Array.from(new Set(data.map((d) => d.region))).sort();
  const meanHumidityByRegion = d3.rollup(
    data,
    (v) => d3.mean(v, (d) => d.humidity),
    (d) => d.region,
  );
  /** Thứ tự vùng trên trục X: độ ẩm TB tăng dần (khô → ẩm) */
  const regionsOrdered = [...regionsAll].sort(
    (a, b) =>
      (meanHumidityByRegion.get(a) ?? 0) - (meanHumidityByRegion.get(b) ?? 0),
  );

  const rolled = d3.rollup(
    data,
    (v) => ({
      avgTemp: d3.mean(v, (d) => d.temp),
      avgHumidity: d3.mean(v, (d) => d.humidity),
      sumPrecip: d3.sum(v, (d) => d.precip),
    }),
    (d) => d.region,
    (d) => Math.floor(d.date.getMonth() / 3) + 1,
  );

  const quartersAll = [1, 2, 3, 4];
  function visibleQuarters() {
    if (state.quarter === "all") return quartersAll;
    const q = +state.quarter;
    return Number.isFinite(q) && q >= 1 && q <= 4 ? [q] : quartersAll;
  }

  function buildMatrix() {
    const matrix = [];
    regionsOrdered.forEach((region) => {
      quartersAll.forEach((q) => {
        const cell = rolled.get(region)?.get(q);
        matrix.push({
          region,
          quarter: q,
          avgTemp: cell?.avgTemp ?? null,
          avgHumidity: cell?.avgHumidity ?? null,
          sumPrecip: cell?.sumPrecip ?? 0,
        });
      });
    });
    return matrix;
  }

  const matrix = buildMatrix();

  /** Màu cột & điểm theo quý */
  const qColor = d3
    .scaleOrdinal()
    .domain([1, 2, 3, 4])
    .range(["#2563eb", "#0d9488", "#d97706", "#b91c1c"]);

  /** Band quý trên trục (luôn Q1–Q4 để đường nhiệt nối kể cả khi lọc cột) */
  const qBandLabels = quartersAll.map((q) => `Q${q}`);
  /** Màu đường nhiệt độ (dual axis, tách khỏi màu cột quý) */
  const tempLineStroke = "#0a0a0a";

  const margin = { top: 44, right: 56, bottom: 102, left: 54 };
  const widthFallback = container.node().getBoundingClientRect().width || 800;
  const height1 = 408;
  const height2 = 348;
  const tDur = 550;

  function regionDimOpacity(r) {
    const focus = state.pinnedRegion ?? state.hoverRegion;
    if (!focus) return 1;
    return r === focus ? 1 : 0.18;
  }

  function showTip(html, event) {
    tooltip.transition().duration(120).style("opacity", 1);
    tooltip
      .html(html)
      .style("left", event.pageX + 14 + "px")
      .style("top", event.pageY - 26 + "px");
  }

  function hideTip() {
    tooltip.transition().duration(350).style("opacity", 0);
  }

  /** Xuống dòng tên vùng theo số ký tự tối đa mỗi dòng (ưu tiên tách theo khoảng trắng). */
  function wrapRegionName(name, maxChars) {
    const s = String(name ?? "").trim();
    if (!s) return [""];
    const words = s.split(/\s+/);
    const out = [];
    let line = "";
    const flush = () => {
      if (line) {
        out.push(line);
        line = "";
      }
    };
    for (const w of words) {
      let chunk = w;
      while (chunk.length > maxChars) {
        flush();
        out.push(chunk.slice(0, maxChars));
        chunk = chunk.slice(maxChars);
      }
      if (!line) line = chunk;
      else if (`${line} ${chunk}`.length <= maxChars) line = `${line} ${chunk}`;
      else {
        flush();
        line = chunk;
      }
    }
    flush();
    return out.length ? out : [s];
  }

  /** Nhãn trục X: nhiều dòng, căn giữa theo từng vùng; title hiển thị đủ tên khi hover. */
  function applyWrappedRegionLabels(xAxisG, x0) {
    const bw = x0.bandwidth();
    const maxChars = Math.max(8, Math.min(28, Math.floor(bw / 5.6)));
    const fontPx = bw < 95 ? 9 : 10;
    xAxisG
      .selectAll(".tick text")
      .style("text-anchor", "middle")
      .attr("transform", null)
      .attr("dx", 0)
      .attr("dy", null)
      .style("font-size", `${fontPx}px`)
      .each(function (d) {
        const t = d3.select(this);
        t.selectAll("title").remove();
        t.selectAll("tspan").remove();
        t.text(null);
        wrapRegionName(d, maxChars).forEach((ln, i) => {
          t.append("tspan")
            .attr("x", 0)
            .attr("dy", i === 0 ? "0.95em" : "1.08em")
            .text(ln);
        });
        t.append("title").text(String(d));
      });
  }

  function drawChart1() {
    const vq = visibleQuarters();
    const w = el1.node().getBoundingClientRect().width || widthFallback;
    const innerWidth = w - margin.left - margin.right;
    const innerHeight = height1 - margin.top - margin.bottom;

    const x0 = d3
      .scaleBand()
      .domain(regionsOrdered)
      .rangeRound([0, innerWidth])
      .paddingInner(0.14);

    const x1 = d3
      .scaleBand()
      .domain(qBandLabels)
      .rangeRound([0, x0.bandwidth()])
      .padding(0.18);

    const barRows = matrix.filter(
      (d) =>
        vq.includes(d.quarter) &&
        d.avgHumidity != null &&
        !Number.isNaN(d.avgHumidity),
    );

    const temps = matrix
      .map((d) => d.avgTemp)
      .filter((t) => t != null && !Number.isNaN(t));
    const tMin = d3.min(temps) ?? 0;
    const tMax = d3.max(temps) ?? 30;

    /** Trái: độ ẩm (cột) · Phải: nhiệt độ (đường/node) — lưới đồng bộ theo trục trái */
    const yHum = d3.scaleLinear().domain([0, 100]).nice().range([innerHeight, 0]);
    const yTemp = d3
      .scaleLinear()
      .domain([Math.min(0, tMin - 2), tMax + 2])
      .nice()
      .range([innerHeight, 0]);

    const humTicks = yHum.ticks(6);
    const tempTicksSynced = humTicks.map((h) => yTemp.invert(yHum(h)));
    const showTempLines = state.quarter === "all";

    const lineGenRel = d3
      .line()
      .defined((d) => d.avgTemp != null && !Number.isNaN(d.avgTemp))
      .x((d) => x1(`Q${d.quarter}`) + x1.bandwidth() / 2)
      .y((d) => yTemp(d.avgTemp))
      .curve(d3.curveLinear);

    const svg = el1
      .selectAll("svg")
      .data([{ w, key: `${w}|${vq.join(",")}` }])
      .join(
        (enter) =>
          enter
            .append("svg")
            .attr("opacity", 0)
            .call((s) => s.transition().duration(280).attr("opacity", 1)),
        (update) => update,
        (exit) => exit.remove(),
      )
      .attr("width", (d) => d.w)
      .attr("height", height1)
      .attr("viewBox", `0 0 ${w} ${height1}`)
      .style("max-width", "100%")
      .style("height", "auto");

    const root = svg.selectAll("g.q3-root").data([0]).join("g").attr("class", "q3-root").attr("transform", `translate(${margin.left},${margin.top})`);

    root
      .selectAll("g.q3-grid")
      .data([0])
      .join("g")
      .attr("class", "q3-grid")
      .style("pointer-events", "none")
      .selectAll("line")
      .data(humTicks)
      .join("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", (d) => yHum(d))
      .attr("y2", (d) => yHum(d))
      .attr("stroke", "#e5e7eb")
      .attr("stroke-dasharray", "2 3");

    root
      .selectAll(".x-axis")
      .data([0])
      .join("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x0))
      .call((g) => applyWrappedRegionLabels(g, x0));

    root
      .selectAll(".y-left")
      .data([0])
      .join("g")
      .attr("class", "y-left")
      .call(
        d3
          .axisLeft(yHum)
          .tickValues(humTicks)
          .tickFormat((d) => `${Math.round(d)}%`)
          .tickSizeOuter(0),
      );

    root
      .selectAll(".y-right")
      .data([0])
      .join("g")
      .attr("class", "y-right")
      .attr("transform", `translate(${innerWidth},0)`)
      .call(
        d3
          .axisRight(yTemp)
          .tickValues(tempTicksSynced)
          .tickFormat((d) => `${Math.round(d)}°C`)
          .tickSizeOuter(0),
      );

    root
      .selectAll(".ylab-l")
      .data([0])
      .join("text")
      .attr("class", "ylab-l")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 14)
      .attr("x", -innerHeight / 2)
      .attr("fill", "#1e40af")
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Độ ẩm TB (%)");

    root
      .selectAll(".ylab-r")
      .data([0])
      .join("text")
      .attr("class", "ylab-r")
      .attr("transform", "rotate(-90)")
      .attr("y", innerWidth + margin.right - 10)
      .attr("x", -innerHeight / 2)
      .attr("fill", "#b45309")
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Nhiệt độ TB (°C)");

    const colLayer = root
      .selectAll("g.region-col")
      .data(regionsOrdered, (d) => d)
      .join("g")
      .attr("class", "region-col")
      .attr("transform", (r) => `translate(${x0(r)},0)`)
      .style("opacity", (r) => regionDimOpacity(r))
      .style("cursor", "pointer")
      .on("mouseenter", (event, r) => {
        state.hoverRegion = r;
        refreshDim();
      })
      .on("mouseleave", () => {
        state.hoverRegion = null;
        refreshDim();
      })
      .on("click", (event, r) => {
        state.pinnedRegion = state.pinnedRegion === r ? null : r;
        refreshDim();
      });

    colLayer
      .selectAll("rect.hum-bar")
      .data(
        (r) => barRows.filter((d) => d.region === r),
        (d) => `${d.region}|${d.quarter}`,
      )
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", "hum-bar")
            .attr("rx", 2)
            .attr("x", (d) => x1(`Q${d.quarter}`))
            .attr("width", x1.bandwidth())
            .attr("y", innerHeight)
            .attr("height", 0)
            .attr("fill", (d) => qColor(d.quarter))
            .style("opacity", 0.72)
            .style("pointer-events", "all"),
        (update) => update,
        (exit) =>
          exit
            .transition()
            .duration(tDur * 0.6)
            .attr("y", innerHeight)
            .attr("height", 0)
            .remove(),
      )
      .on("mouseover", function (event, d) {
        d3.select(this).style("opacity", 0.95);
        showTip(
          `<strong>${d.region} — Q${d.quarter}</strong><br/>` +
            `Độ ẩm TB: ${d.avgHumidity.toFixed(1)}%<br/>` +
            `Nhiệt độ TB: ${d.avgTemp != null ? d.avgTemp.toFixed(1) : "—"}°C`,
          event,
        );
      })
      .on("mouseout", function () {
        d3.select(this).style("opacity", 0.72);
        hideTip();
      })
      .transition()
      .duration(tDur)
      .attr("x", (d) => x1(`Q${d.quarter}`))
      .attr("width", x1.bandwidth())
      .attr("y", (d) => yHum(d.avgHumidity))
      .attr("height", (d) => innerHeight - yHum(d.avgHumidity))
      .attr("fill", (d) => qColor(d.quarter));

    colLayer
      .selectAll("g.region-temp-pack")
      .data((r) => [r])
      .join("g")
      .attr("class", "region-temp-pack")
      .each(function drawRegionTemp(region) {
        const pack = d3.select(this);
        const quarterSource = showTempLines ? quartersAll : vq;
        const series = quarterSource
          .map((q) =>
            matrix.find((d) => d.region === region && d.quarter === q),
          )
          .filter(
            (d) =>
              d &&
              d.avgTemp != null &&
              !Number.isNaN(d.avgTemp),
          );

        const segments = [];
        if (showTempLines) {
          for (let q = 1; q <= 3; q++) {
            const a = matrix.find(
              (d) => d.region === region && d.quarter === q,
            );
            const b = matrix.find(
              (d) => d.region === region && d.quarter === q + 1,
            );
            if (
              !a ||
              !b ||
              a.avgTemp == null ||
              b.avgTemp == null ||
              Number.isNaN(a.avgTemp) ||
              Number.isNaN(b.avgTemp)
            ) {
              continue;
            }
            segments.push({
              a,
              b,
              key: `${region}-${q}-${q + 1}`,
            });
          }
        }

        pack
          .selectAll("path.temp-seg-halo")
          .data(showTempLines ? segments : [], (d) => `${d.key}-h`)
          .join(
            (enter) =>
              enter
                .append("path")
                .attr("class", "temp-seg-halo")
                .attr("fill", "none")
                .attr("stroke", "#fff")
                .attr("stroke-width", 5)
                .attr("stroke-linecap", "round")
                .attr("opacity", 0.85)
                .style("pointer-events", "none"),
            (update) => update,
            (exit) => exit.remove(),
          )
          .attr("d", (d) => lineGenRel([d.a, d.b]))
          .transition()
          .duration(tDur)
          .attr("d", (d) => lineGenRel([d.a, d.b]));

        pack
          .selectAll("path.temp-seg")
          .data(showTempLines ? segments : [], (d) => d.key)
          .join(
            (enter) =>
              enter
                .append("path")
                .attr("class", "temp-seg")
                .attr("fill", "none")
                .attr("stroke-width", 2.5)
                .attr("stroke-linecap", "round")
                .style("pointer-events", "stroke"),
            (update) => update,
            (exit) => exit.remove(),
          )
          .attr("stroke", tempLineStroke)
          .attr("d", (d) => lineGenRel([d.a, d.b]))
          .on("mouseover", function (event, d) {
            showTip(
              `<strong>${d.b.region}</strong> Q${d.a.quarter}→Q${d.b.quarter}<br/>` +
                `TB: ${d.a.avgTemp.toFixed(1)}°C → ${d.b.avgTemp.toFixed(1)}°C`,
              event,
            );
          })
          .on("mouseout", hideTip)
          .transition()
          .duration(tDur)
          .attr("d", (d) => lineGenRel([d.a, d.b]));

        pack
          .selectAll("circle.temp-pt")
          .data(series, (d) => d.quarter)
          .join(
            (enter) =>
              enter
                .append("circle")
                .attr("class", "temp-pt")
                .attr("r", 0)
                .attr("fill", tempLineStroke)
                .attr("stroke", "#fff")
                .attr("stroke-width", 1.5)
                .style("pointer-events", "all")
                .style("cursor", "default"),
            (update) => update,
            (exit) => exit.transition().duration(200).attr("r", 0).remove(),
          )
          .on("mouseover", function (event, d) {
            d3.select(this).transition().duration(150).attr("r", 7);
            showTip(
              `<strong>${d.region} — Q${d.quarter}</strong><br/>` +
                `Nhiệt độ TB: ${d.avgTemp.toFixed(1)}°C<br/>` +
                `Độ ẩm TB: ${d.avgHumidity != null ? d.avgHumidity.toFixed(1) : "—"}%`,
              event,
            );
          })
          .on("mouseout", function () {
            d3.select(this).transition().duration(200).attr("r", 5);
            hideTip();
          })
          .transition()
          .duration(tDur)
          .attr("cx", (d) => x1(`Q${d.quarter}`) + x1.bandwidth() / 2)
          .attr("cy", (d) => yTemp(d.avgTemp))
          .attr("r", 5);
      });

    const leg = svg.selectAll("g.q3-legend").data([0]).join("g").attr("class", "q3-legend").attr("transform", `translate(${margin.left}, 10)`);

    const legItems = quartersAll.map((q) => ({ q, c: qColor(q), lab: `Q${q}` }));
    leg
      .selectAll("g.li")
      .data(legItems)
      .join("g")
      .attr("class", "li")
      .attr("transform", (d, i) => `translate(${i * 88}, 0)`)
      .each(function (d) {
        const g = d3.select(this);
        g.selectAll("rect").data([0]).join("rect").attr("width", 14).attr("height", 14).attr("rx", 2).attr("fill", d.c);
        g.selectAll("text").data([0]).join("text").attr("x", 20).attr("y", 12).style("font-size", "11px").attr("fill", "#374151").text(d.lab);
      });
  }

  function drawChart2() {
    const vq = visibleQuarters();
    const w = el2.node().getBoundingClientRect().width || widthFallback;
    const innerWidth = w - margin.left - margin.right;
    const innerHeight = height2 - margin.top - margin.bottom;

    const x0 = d3
      .scaleBand()
      .domain(regionsOrdered)
      .rangeRound([0, innerWidth])
      .paddingInner(0.14);

    const x1 = d3
      .scaleBand()
      .domain(qBandLabels)
      .rangeRound([0, x0.bandwidth()])
      .padding(0.16);

    const precipRows = matrix.filter((d) => vq.includes(d.quarter));

    const pMax = d3.max(precipRows, (d) => d.sumPrecip) ?? 1;
    const y = d3
      .scaleLinear()
      .domain([0, pMax * 1.08])
      .nice()
      .range([innerHeight, 0]);

    const svg = el2
      .selectAll("svg")
      .data([{ w, key: `${w}|${vq.join(",")}` }])
      .join(
        (enter) =>
          enter
            .append("svg")
            .attr("opacity", 0)
            .call((s) => s.transition().duration(280).attr("opacity", 1)),
        (update) => update,
        (exit) => exit.remove(),
      )
      .attr("width", (d) => d.w)
      .attr("height", height2)
      .attr("viewBox", `0 0 ${w} ${height2}`)
      .style("max-width", "100%")
      .style("height", "auto");

    const g = svg.selectAll("g.q3-root").data([0]).join("g").attr("class", "q3-root").attr("transform", `translate(${margin.left},${margin.top})`);

    g.selectAll(".x-axis")
      .data([0])
      .join("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x0))
      .call((ag) => applyWrappedRegionLabels(ag, x0));

    g.selectAll(".y-axis")
      .data([0])
      .join("g")
      .attr("class", "y-axis")
      .call(
        d3
          .axisLeft(y)
          .ticks(6)
          .tickFormat((d) => (d >= 1000 ? d / 1000 + "k" : d) + " mm"),
      );

    g.selectAll(".ylab").data([0]).join("text").attr("class", "ylab").attr("transform", "rotate(-90)").attr("y", -margin.left + 12).attr("x", -innerHeight / 2).attr("fill", "#047857").attr("text-anchor", "middle").style("font-size", "12px").text("Tổng lượng mưa (mm)");

    const colG = g
      .selectAll("g.precip-col")
      .data(regionsOrdered, (d) => d)
      .join("g")
      .attr("class", "precip-col")
      .attr("transform", (r) => `translate(${x0(r)},0)`)
      .style("opacity", (r) => regionDimOpacity(r))
      .style("cursor", "pointer")
      .on("mouseenter", (event, r) => {
        state.hoverRegion = r;
        refreshDim();
      })
      .on("mouseleave", () => {
        state.hoverRegion = null;
        refreshDim();
      })
      .on("click", (event, r) => {
        state.pinnedRegion = state.pinnedRegion === r ? null : r;
        refreshDim();
      });

    colG
      .selectAll("rect.precip-bar")
      .data(
        (r) => precipRows.filter((d) => d.region === r),
        (d) => `${d.region}|${d.quarter}`,
      )
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", "precip-bar")
            .attr("rx", 2)
            .attr("x", (d) => x1(`Q${d.quarter}`))
            .attr("width", x1.bandwidth())
            .attr("y", innerHeight)
            .attr("height", 0)
            .attr("fill", (d) => qColor(d.quarter))
            .style("opacity", 0.88),
        (update) => update,
        (exit) =>
          exit
            .transition()
            .duration(tDur * 0.6)
            .attr("y", innerHeight)
            .attr("height", 0)
            .remove(),
      )
      .on("mouseover", function (event, d) {
        d3.select(this).style("opacity", 1);
        showTip(
          `<strong>${d.region} — Q${d.quarter}</strong><br/>` +
            `Tổng mưa: ${d.sumPrecip.toFixed(1)} mm`,
          event,
        );
      })
      .on("mouseout", function () {
        d3.select(this).style("opacity", 0.88);
        hideTip();
      })
      .transition()
      .duration(tDur)
      .attr("x", (d) => x1(`Q${d.quarter}`))
      .attr("width", x1.bandwidth())
      .attr("y", (d) => y(d.sumPrecip))
      .attr("height", (d) => innerHeight - y(d.sumPrecip))
      .attr("fill", (d) => qColor(d.quarter));
  }

  function refreshDim() {
    el1.selectAll("g.region-col").style("opacity", (r) => regionDimOpacity(r));
    el2.selectAll("g.precip-col").style("opacity", (r) => regionDimOpacity(r));
  }

  function redraw() {
    drawChart1();
    drawChart2();
    refreshDim();
  }

  quarterSelect.property("value", state.quarter);
  quarterSelect.on("change", function () {
    state.quarter = this.value;
    redraw();
  });

  redraw();

  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => redraw());
    ro.observe(container.node());
  }
}
