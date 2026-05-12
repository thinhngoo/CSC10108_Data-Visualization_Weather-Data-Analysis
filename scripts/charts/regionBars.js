// Q9 – Thời tiết giữa các khu vực  (3 region-level bar charts)
// Containers expected: <div id="bar-region-temp">, <div id="bar-region-humidity">, <div id="bar-region-precip">

const COLOR_TEMP = "#f3a85a";
const COLOR_TEMP_HOVER = "#d88536";
const COLOR_HUMIDITY = "#80c9b8";
const COLOR_HUMIDITY_HOVER = "#56a594";
const COLOR_PRECIP = "#5b85aa";
const COLOR_PRECIP_HOVER = "#3d6890";

const SI_FORMAT = (v) => {
  if (v === 0) return "0K";
  if (Math.abs(v) >= 1000) return d3.format("~s")(v).replace("G", "B");
  return String(v);
};

export function drawRegionBars(data) {
  const valid = data.filter(
    (d) =>
      d.region &&
      Number.isFinite(d.temp) &&
      Number.isFinite(d.humidity) &&
      Number.isFinite(d.precip),
  );

  /* ── 9.1 – Avg daily temperature per region ── */
  const avgTemp = d3
    .rollups(
      valid,
      (v) => d3.mean(v, (d) => d.temp),
      (d) => d.region,
    )
    .map(([region, value]) => ({ region, value }))
    .sort((a, b) => d3.ascending(a.value, b.value));

  drawRegionBar({
    selector: "#bar-region-temp",
    rows: avgTemp,
    color: COLOR_TEMP,
    colorHover: COLOR_TEMP_HOVER,
    yLabel: "Average Daily Temperature (°C)",
    valueFmt: (v) => v.toFixed(2) + " °C",
    yTickFmt: (v) => v.toString(),
    yDomain: [0, Math.ceil((d3.max(avgTemp, (d) => d.value) + 2) / 2.5) * 2.5],
    height: 360,
    yTicks: 12,
  });

  /* ── 9.2 – Avg daily humidity per region ── */
  const avgHum = d3
    .rollups(
      valid,
      (v) => d3.mean(v, (d) => d.humidity),
      (d) => d.region,
    )
    .map(([region, value]) => ({ region, value }))
    .sort((a, b) => d3.ascending(a.value, b.value));

  drawRegionBar({
    selector: "#bar-region-humidity",
    rows: avgHum,
    color: COLOR_HUMIDITY,
    colorHover: COLOR_HUMIDITY_HOVER,
    yLabel: "Average Daily Humidity (%)",
    valueFmt: (v) => v.toFixed(2) + " %",
    yTickFmt: (v) => v.toString(),
    yDomain: [0, 100],
    height: 340,
    yTicks: 10,
  });

  /* ── 9.3 – Total daily precipitation per region ── */
  const sumPrecip = d3
    .rollups(
      valid,
      (v) => d3.sum(v, (d) => d.precip),
      (d) => d.region,
    )
    .map(([region, value]) => ({ region, value }))
    .sort((a, b) => d3.ascending(a.value, b.value));

  const precipMax = d3.max(sumPrecip, (d) => d.value) ?? 0;
  drawRegionBar({
    selector: "#bar-region-precip",
    rows: sumPrecip,
    color: COLOR_PRECIP,
    colorHover: COLOR_PRECIP_HOVER,
    yLabel: "Total Daily Precipitation (mm)",
    valueFmt: (v) => v.toLocaleString("vi-VN", { maximumFractionDigits: 0 }) + " mm",
    yTickFmt: SI_FORMAT,
    yDomain: [0, Math.ceil(precipMax / 10000) * 10000],
    height: 340,
    yTicks: 5,
  });
}

/* ─────────────────────────────────────────────────────────── */

function drawRegionBar({
  selector,
  rows,
  color,
  colorHover,
  yLabel,
  valueFmt,
  yTickFmt,
  yDomain,
  height,
  yTicks,
}) {
  const container = d3.select(selector);
  container.html("");

  /* ── Layout ── */
  const margin = { top: 36, right: 16, bottom: 70, left: 64 };
  const totalW = 920;
  const totalH = height;
  const W = totalW - margin.left - margin.right;
  const H = totalH - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${totalW} ${totalH}`)
    .attr("width", "100%")
    .style("overflow", "visible");

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  /* ── Scales ── */
  const x = d3
    .scaleBand()
    .domain(rows.map((d) => d.region))
    .range([0, W])
    .paddingInner(0.35)
    .paddingOuter(0.18);

  const y = d3.scaleLinear().domain(yDomain).range([H, 0]).nice();

  /* ── Top header (centered, like Tableau) ── */
  g.append("text")
    .attr("x", W / 2)
    .attr("y", -16)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("font-weight", 600)
    .attr("fill", "#374151")
    .text("Location.Region");

  /* ── Grid ── */
  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(yTicks).tickSize(-W).tickFormat(""))
    .call((ax) => {
      ax.select(".domain").remove();
      ax.selectAll("line")
        .attr("stroke", "#e5e7eb")
        .attr("stroke-dasharray", "3 4");
    });

  /* ── Axes ── */
  g.append("g")
    .attr("transform", `translate(0,${H})`)
    .call(d3.axisBottom(x).tickSize(0).tickPadding(8))
    .call((ax) => ax.select(".domain").attr("stroke", "#d1d5db"))
    .selectAll("text")
    .attr("font-size", 11)
    .attr("fill", "#374151")
    .call(wrapTickLabel, x.bandwidth() + 14);

  g.append("g")
    .call(d3.axisLeft(y).ticks(yTicks).tickFormat(yTickFmt))
    .call((ax) => ax.select(".domain").attr("stroke", "#d1d5db"))
    .selectAll("text")
    .attr("font-size", 11)
    .attr("fill", "#6b7280");

  /* ── Y label ── */
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -H / 2)
    .attr("y", -48)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("fill", "#374151")
    .text(yLabel);

  /* ── Tooltip ── */
  const tooltip = d3.select("body").select(".chart-tooltip");
  const tt = tooltip.empty()
    ? d3.select("body").append("div").attr("class", "chart-tooltip")
    : tooltip;

  /* ── Bars (grow-up transition) ── */
  g.selectAll("rect.bar")
    .data(rows, (d) => d.region)
    .join("rect")
    .attr("class", "bar")
    .attr("x", (d) => x(d.region))
    .attr("width", x.bandwidth())
    .attr("y", H)
    .attr("height", 0)
    .attr("fill", color)
    .attr("rx", 2)
    .style("cursor", "pointer")
    .on("mouseenter", function (event, d) {
      tt.style("opacity", 1).html(
        `<strong>${d.region}</strong><br/>
         ${yLabel}: ${valueFmt(d.value)}`,
      );
      d3.select(this).transition().duration(120).attr("fill", colorHover);
    })
    .on("mousemove", (event) => {
      tt.style("left", event.pageX + 14 + "px").style(
        "top",
        event.pageY - 10 + "px",
      );
    })
    .on("mouseleave", function () {
      tt.style("opacity", 0);
      d3.select(this).transition().duration(120).attr("fill", color);
    })
    .transition()
    .duration(650)
    .delay((_, i) => i * 60)
    .ease(d3.easeCubicOut)
    .attr("y", (d) => y(d.value))
    .attr("height", (d) => H - y(d.value));
}

/* ─────────────────────────────────────────────────────────── */
/* Wrap long horizontal tick labels onto two lines (works for
   un-rotated axis labels). */
function wrapTickLabel(textSel, width) {
  textSel.each(function () {
    const text = d3.select(this);
    const raw = text.text();
    const words = raw.split(/\s+/);
    if (words.length <= 1) return;

    const tryLayout = (a, b) => {
      const longest = Math.max(a.length, b.length);
      return longest * 6.5 <= width;
    };

    let bestSplit = -1;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" ");
      const b = words.slice(i).join(" ");
      if (tryLayout(a, b)) {
        bestSplit = i;
        break;
      }
    }
    if (bestSplit === -1) {
      bestSplit = Math.ceil(words.length / 2);
    }

    const line1 = words.slice(0, bestSplit).join(" ");
    const line2 = words.slice(bestSplit).join(" ");

    text.text(null);
    text
      .append("tspan")
      .attr("x", 0)
      .attr("dy", "0em")
      .text(line1);
    text
      .append("tspan")
      .attr("x", 0)
      .attr("dy", "1.1em")
      .text(line2);
  });
}
