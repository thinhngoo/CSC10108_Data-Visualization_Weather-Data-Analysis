// Q10 – UV Index vs Average Temperature  (scatter, colour = region)
// Container element expected: <div id="scatter-uv-temp"></div>

const REGIONS = [
  "Bắc Trung Bộ và Duyên hải miền Trung",
  "Đồng Bằng Sông Cửu Long",
  "Đồng Bằng Sông Hồng",
  "Đông Nam Bộ",
  "Tây Nguyên",
  "Trung du và miền núi Bắc Bộ",
];
const COLORS = ["#4f8ef7","#f97316","#ef4444","#22d3ee","#a855f7","#eab308"];
const colorOf = (region) => COLORS[REGIONS.indexOf(region)] ?? "#888";

export function drawScatterUVTemp(data) {
  /* ── Layout ── */
  const margin = { top: 24, right: 24, bottom: 56, left: 60 };
  const totalW = 860, totalH = 420;
  const W = totalW - margin.left - margin.right;
  const H = totalH - margin.top  - margin.bottom;

  const container = d3.select("#scatter-uv-temp");
  container.html(""); // clear on redraw

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${totalW} ${totalH}`)
    .attr("width", "100%")
    .style("overflow", "visible");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  /* ── Scales ── */
  const uvValues = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const x = d3.scaleLinear().domain([1, 11]).range([0, W]);
  const y = d3.scaleLinear().domain([0, 38]).range([H, 0]).nice();

  /* ── Grid ── */
  g.append("g").attr("class", "grid")
    .call(d3.axisLeft(y).ticks(6).tickSize(-W).tickFormat(""))
    .call(ax => { ax.select(".domain").remove(); ax.selectAll("line").attr("stroke","#e5e7eb").attr("stroke-dasharray","3 4"); });

  g.append("g").attr("class", "grid").attr("transform", `translate(0,${H})`)
    .call(d3.axisBottom(x).ticks(10).tickSize(-H).tickFormat(""))
    .call(ax => { ax.select(".domain").remove(); ax.selectAll("line").attr("stroke","#e5e7eb").attr("stroke-dasharray","3 4"); });

  /* ── Axes ── */
  g.append("g").attr("transform", `translate(0,${H})`)
    .call(d3.axisBottom(x).tickValues(uvValues).tickFormat(d3.format("d")))
    .call(ax => ax.select(".domain").attr("stroke","#d1d5db"))
    .selectAll("text").attr("font-size", 12).attr("fill", "#6b7280");

  g.append("g")
    .call(d3.axisLeft(y).ticks(6))
    .call(ax => ax.select(".domain").attr("stroke","#d1d5db"))
    .selectAll("text").attr("font-size", 12).attr("fill", "#6b7280");

  /* ── Axis labels ── */
  g.append("text")
    .attr("x", W / 2).attr("y", H + 46)
    .attr("text-anchor", "middle").attr("font-size", 13).attr("fill", "#374151")
    .text("Day.Uv");

  g.append("text")
    .attr("transform", "rotate(-90)").attr("x", -H / 2).attr("y", -46)
    .attr("text-anchor", "middle").attr("font-size", 13).attr("fill", "#374151")
    .text("Day.Avgtemp C");

  /* ── Tooltip ── */
  const tooltip = d3.select("body").select(".chart-tooltip");
  const tt = tooltip.empty()
    ? d3.select("body").append("div").attr("class","chart-tooltip")
    : tooltip;

  /* ── Aggregate: mean temp per (region, uv) ── */
  const grouped = d3.rollups(
    data.filter(d => d.uv >= 2 && d.uv <= 10),
    (v) => ({ avgtemp: d3.mean(v, d => d.temp), count: v.length }),
    (d) => d.uv,
    (d) => d.region
  );

  const points = [];
  grouped.forEach(([uv, regionArr]) => {
    regionArr.forEach(([region, val]) => {
      points.push({ uv: +uv, region, avgtemp: val.avgtemp, count: val.count });
    });
  });

  /* ── Jitter within each UV column ── */
  const uvCounts = d3.rollup(points, v => v.length, d => d.uv);
  const uvIndex  = d3.rollup(points, v => v, d => d.uv);
  uvIndex.forEach((arr, uv) => {
    arr.forEach((d, i) => {
      d.jitter = (i - (arr.length - 1) / 2) * 0.08;
    });
  });

  /* ── Dots ── */
  let highlighted = null;
  const allDots = g.selectAll("circle.dot")
    .data(points)
    .join("circle")
    .attr("class", "dot")
    .attr("cx", d => x(d.uv + d.jitter))
    .attr("cy", d => y(d.avgtemp))
    .attr("r",  d => Math.sqrt(d.count) * 0.6 + 5)
    .attr("fill",         d => colorOf(d.region))
    .attr("fill-opacity", 0.78)
    .attr("stroke",       d => colorOf(d.region))
    .attr("stroke-width", 1.5)
    .attr("stroke-opacity", 0.35)
    .style("cursor", "pointer")
    /* hover */
    .on("mouseenter", function (event, d) {
      tt.style("opacity", 1)
        .html(`<strong>UV ${d.uv}</strong><br/>
               Vùng: ${d.region}<br/>
               Avg Temp: ${d.avgtemp.toFixed(1)} °C<br/>
               Mẫu: ${d.count} ngày`);
      d3.select(this).raise().transition().duration(120)
        .attr("r", Math.sqrt(d.count) * 0.6 + 10)
        .attr("fill-opacity", 1);
    })
    .on("mousemove", (event) => {
      tt.style("left", event.pageX + 14 + "px").style("top", event.pageY - 10 + "px");
    })
    .on("mouseleave", function (_, d) {
      tt.style("opacity", 0);
      d3.select(this).transition().duration(120)
        .attr("r", Math.sqrt(d.count) * 0.6 + 5)
        .attr("fill-opacity", highlighted && highlighted !== d ? 0.15 : 0.78);
    })
    /* click to highlight */
    .on("click", function (_, d) {
      highlighted = highlighted === d ? null : d;
      allDots
        .transition().duration(200)
        .attr("fill-opacity", dd => highlighted
          ? (dd === highlighted ? 1 : 0.1)
          : 0.78);
    });

  /* ── Legend ── */
  const legend = svg.append("g")
    .attr("transform", `translate(${margin.left + W - 10}, ${margin.top})`);

  REGIONS.forEach((r, i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${i * 22})`);
    row.append("rect").attr("width", 12).attr("height", 12).attr("rx", 3)
       .attr("fill", COLORS[i]);
    row.append("text").attr("x", 18).attr("y", 10)
       .attr("font-size", 11).attr("fill", "#374151")
       .text(r.length > 22 ? r.slice(0, 22) + "…" : r);
  });
}
