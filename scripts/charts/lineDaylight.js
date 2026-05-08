// Q11 – Độ dài ban ngày theo thời gian  (multi-line, filter + transition)
// Container element expected: <div id="line-daylight"></div>

const REGIONS = [
  "Bắc Trung Bộ và Duyên hải miền Trung",
  "Đồng Bằng Sông Cửu Long",
  "Đồng Bằng Sông Hồng",
  "Đông Nam Bộ",
  "Tây Nguyên",
  "Trung du và miền núi Bắc Bộ",
];
const REGION_SHORT = [
  "Bắc Trung Bộ", "ĐB Sông Cửu Long", "ĐB Sông Hồng",
  "Đông Nam Bộ",  "Tây Nguyên",       "Trung du Bắc Bộ",
];
const COLORS = ["#4f8ef7","#f97316","#ef4444","#22d3ee","#a855f7","#eab308"];
const colorOf = (region) => COLORS[REGIONS.indexOf(region)] ?? "#888";

export function drawLineDaylight(data) {
  /* ── Pre-process: weekly average HourOfDayLight per region ── */
  const validData = data.filter(d => d.hourOfDayLight != null);

  // Group by ISO week + region
  const rollup = d3.rollups(
    validData,
    (v) => d3.mean(v, d => d.hourOfDayLight),
    (d) => {
      // Round date to Monday of its week
      const dt = new Date(d.date);
      dt.setDate(dt.getDate() - dt.getDay() + 1);
      return dt.toISOString().slice(0, 10);
    },
    (d) => d.region
  );

  const series = new Map(); // region → [{date, value}]
  REGIONS.forEach(r => series.set(r, []));

  rollup.forEach(([weekStr, regionArr]) => {
    const weekDate = new Date(weekStr);
    regionArr.forEach(([region, avg]) => {
      if (series.has(region)) {
        series.get(region).push({ date: weekDate, value: avg });
      }
    });
  });
  series.forEach(arr => arr.sort((a, b) => a.date - b.date));

  /* ── Layout ── */
  const margin = { top: 24, right: 24, bottom: 60, left: 64 };
  const totalW = 860, totalH = 380;
  const W = totalW - margin.left - margin.right;
  const H = totalH - margin.top  - margin.bottom;

  const container = d3.select("#line-daylight");
  container.html("");

  /* ── Filter bar (buttons above chart) ── */
  const controls = container.append("div").attr("class", "chart-filter-bar");
  let activeRegions = new Set(REGIONS);

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${totalW} ${totalH}`)
    .attr("width", "100%");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  /* ── Scales ── */
  const allDates  = [...series.values()].flatMap(a => a.map(d => d.date));
  const allValues = [...series.values()].flatMap(a => a.map(d => d.value));

  const x = d3.scaleTime().domain(d3.extent(allDates)).range([0, W]);
  const y = d3.scaleLinear().domain([
    d3.min(allValues) - 0.3,
    d3.max(allValues) + 0.3
  ]).nice().range([H, 0]);

  /* ── Grid ── */
  g.append("g").attr("class", "grid")
    .call(d3.axisLeft(y).ticks(7).tickSize(-W).tickFormat(""))
    .call(ax => { ax.select(".domain").remove(); ax.selectAll("line").attr("stroke","#e5e7eb").attr("stroke-dasharray","3 4"); });

  /* ── Axes ── */
  g.append("g").attr("transform", `translate(0,${H})`)
    .call(d3.axisBottom(x).ticks(d3.timeMonth.every(2)).tickFormat(d3.timeFormat("%b %Y")))
    .call(ax => ax.select(".domain").attr("stroke","#d1d5db"))
    .selectAll("text").attr("font-size", 11).attr("fill", "#6b7280")
    .attr("transform","rotate(-30)").attr("text-anchor","end").attr("dy","0.2em");

  g.append("g")
    .call(d3.axisLeft(y).ticks(7).tickFormat(d => d.toFixed(1)))
    .call(ax => ax.select(".domain").attr("stroke","#d1d5db"))
    .selectAll("text").attr("font-size", 11).attr("fill", "#6b7280");

  /* ── Axis labels ── */
  g.append("text").attr("x", W / 2).attr("y", H + 54)
    .attr("text-anchor","middle").attr("font-size",13).attr("fill","#374151")
    .text("Day of Date");

  g.append("text").attr("transform","rotate(-90)").attr("x", -H / 2).attr("y", -52)
    .attr("text-anchor","middle").attr("font-size",13).attr("fill","#374151")
    .text("Avg. HourOfDayLight ▼");

  /* ── Line generator ── */
  const lineGen = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.value))
    .curve(d3.curveCatmullRom.alpha(0.5));

  /* ── Tooltip ── */
  const tooltip = d3.select("body").select(".chart-tooltip");
  const tt = tooltip.empty()
    ? d3.select("body").append("div").attr("class","chart-tooltip")
    : tooltip;

  /* ── Draw lines ── */
  const paths = new Map();

  REGIONS.forEach((region) => {
    const path = g.append("path")
      .datum(series.get(region))
      .attr("fill", "none")
      .attr("stroke", colorOf(region))
      .attr("stroke-width", 2)
      .attr("d", lineGen)
      .style("cursor", "pointer")
      .on("mouseenter", function (event) {
        d3.select(this).raise().attr("stroke-width", 3.5);
        tt.style("opacity",1).html(`<strong>${region}</strong>`);
      })
      .on("mousemove", (event) => {
        tt.style("left", event.pageX + 14 + "px").style("top", event.pageY - 10 + "px");
      })
      .on("mouseleave", function () {
        tt.style("opacity", 0);
        d3.select(this).attr("stroke-width", 2);
      });

    paths.set(region, path);
  });

  /* ── Hover crosshair ── */
  const crosshair = g.append("line")
    .attr("stroke", "#9ca3af").attr("stroke-width", 1).attr("stroke-dasharray","4 3")
    .attr("y1", 0).attr("y2", H).attr("opacity", 0);

  g.append("rect").attr("width", W).attr("height", H).attr("fill", "transparent")
    .on("mousemove", function (event) {
      const [mx] = d3.pointer(event);
      crosshair.attr("x1", mx).attr("x2", mx).attr("opacity", 1);
    })
    .on("mouseleave", () => crosshair.attr("opacity", 0));

  /* ── Filter buttons  ←  THIS is the TRANSITION chart ── */
  // Each button toggles a region's line on/off with a smooth opacity transition
  REGIONS.forEach((region, i) => {
    const btn = controls.append("button")
      .attr("class", "chart-filter-btn active")
      .style("border-color", COLORS[i])
      .style("color", COLORS[i])
      .text(REGION_SHORT[i]);

    btn.on("click", function () {
      if (activeRegions.has(region)) {
        if (activeRegions.size <= 1) return; // keep at least one
        activeRegions.delete(region);
      } else {
        activeRegions.add(region);
      }

      this.classList.toggle("active", activeRegions.has(region));

      /* ── TRANSITION: smooth fade in/out when filter changes ── */
      paths.forEach((path, reg) => {
        path.transition()
          .duration(450)
          .ease(d3.easeCubicInOut)
          .attr("opacity",      activeRegions.has(reg) ? 1 : 0.06)
          .attr("stroke-width", activeRegions.has(reg) ? 2 : 0.5);
      });
    });
  });
}
