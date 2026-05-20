// Q8 – Nhiệt độ theo trạng thái thời tiết  (box plot per condition)
// Container element expected: <div id="box-condition-temp"></div>

const BOX_DARK = "#4ea3a8";   // Q1 → median (lower half)
const BOX_LIGHT = "#b9e4ec";  // median → Q3 (upper half)
const WHISKER = "#6b7280";
const STRIP = "#4ea3a8";

export function drawQ8(data) {
  /* ── Group temps by condition & compute box stats ── */
  const grouped = d3.rollups(
    data.filter(
      (d) =>
        d.condition &&
        d.condition !== "Unknown" &&
        Number.isFinite(d.temp),
    ),
    (rows) => rows.map((r) => r.temp).sort(d3.ascending),
    (d) => d.condition,
  );

  const stats = grouped
    .map(([condition, temps]) => {
      const q1 = d3.quantile(temps, 0.25);
      const median = d3.quantile(temps, 0.5);
      const q3 = d3.quantile(temps, 0.75);
      return {
        condition,
        temps,
        count: temps.length,
        min: temps[0],
        max: temps[temps.length - 1],
        q1,
        median,
        q3,
        mean: d3.mean(temps),
      };
    })
    .sort((a, b) => d3.ascending(a.median, b.median));

  /* ── Layout ── */
  const margin = { top: 40, right: 24, bottom: 160, left: 64 };
  const totalW = 980;
  const totalH = 620;
  const W = totalW - margin.left - margin.right;
  const H = totalH - margin.top - margin.bottom;

  const container = d3.select("#box-condition-temp");
  container.html("");

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
    .domain(stats.map((d) => d.condition))
    .range([0, W])
    .paddingInner(0.45)
    .paddingOuter(0.25);

  const allTemps = stats.flatMap((s) => [s.min, s.max]);
  const y = d3
    .scaleLinear()
    .domain([
      Math.floor((d3.min(allTemps) - 1) / 5) * 5,
      Math.ceil((d3.max(allTemps) + 1) / 5) * 5,
    ])
    .range([H, 0])
    .nice();

  /* ── Column header label (top, centered like Tableau) ── */
  g.append("text")
    .attr("x", W / 2)
    .attr("y", -18)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("font-weight", 600)
    .attr("fill", "#374151")
    .text("Day.Condition.Text");

  /* ── Grid (horizontal) ── */
  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(7).tickSize(-W).tickFormat(""))
    .call((ax) => {
      ax.select(".domain").remove();
      ax.selectAll("line")
        .attr("stroke", "#e5e7eb")
        .attr("stroke-dasharray", "3 4");
    });

  /* ── Axes ── */
  g.append("g")
    .attr("transform", `translate(0,${H})`)
    .call(d3.axisBottom(x).tickSize(0).tickPadding(10))
    .call((ax) => ax.select(".domain").attr("stroke", "#d1d5db"))
    .selectAll("text")
    .attr("font-size", 11)
    .attr("fill", "#374151")
    .attr("transform", "rotate(-65)")
    .attr("text-anchor", "end")
    .attr("dx", "-0.4em")
    .attr("dy", "0.5em")
    .call(wrapTickLabel, 110);

  g.append("g")
    .call(d3.axisLeft(y).ticks(7))
    .call((ax) => ax.select(".domain").attr("stroke", "#d1d5db"))
    .selectAll("text")
    .attr("font-size", 12)
    .attr("fill", "#6b7280");

  /* ── Y-axis label ── */
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -H / 2)
    .attr("y", -46)
    .attr("text-anchor", "middle")
    .attr("font-size", 13)
    .attr("fill", "#374151")
    .text("Average Temperature (°C)");

  /* ── Tooltip ── */
  const tooltip = d3.select("body").select(".chart-tooltip");
  const tt = tooltip.empty()
    ? d3.select("body").append("div").attr("class", "chart-tooltip")
    : tooltip;

  /* ── Strip plot (faint individual day ticks behind boxes) ── */
  const stripHalfW = Math.min(x.bandwidth() * 0.7, 14);
  const stripJitter = d3.randomUniform(-stripHalfW, stripHalfW - 4);

  const stripG = g.append("g").attr("class", "strip-layer");
  stats.forEach((s) => {
    const groupCx = x(s.condition) + x.bandwidth() / 2;
    const stripData = s.temps.map((t) => ({
      t,
      x0: groupCx + stripJitter(),
    }));
    stripG
      .append("g")
      .selectAll("line")
      .data(stripData)
      .join("line")
      .attr("x1", (d) => d.x0)
      .attr("x2", (d) => d.x0 + 4)
      .attr("y1", (d) => y(d.t))
      .attr("y2", (d) => y(d.t))
      .attr("stroke", STRIP)
      .attr("stroke-opacity", 0.08)
      .attr("stroke-width", 1);
  });

  /* ── Box groups (one per condition) ── */
  const boxes = g
    .selectAll("g.box")
    .data(stats, (d) => d.condition)
    .join("g")
    .attr("class", "box")
    .attr("transform", (d) => `translate(${x(d.condition)},0)`)
    .style("cursor", "pointer")
    .on("mouseenter", function (event, d) {
      tt.style("opacity", 1).html(
        `<strong>${d.condition}</strong><br/>
         Số ngày: ${d.count.toLocaleString("vi-VN")}<br/>
         Min: ${d.min.toFixed(1)} °C<br/>
         Q1: ${d.q1.toFixed(1)} °C<br/>
         Median: ${d.median.toFixed(1)} °C<br/>
         Q3: ${d.q3.toFixed(1)} °C<br/>
         Max: ${d.max.toFixed(1)} °C<br/>
         Mean: ${d.mean.toFixed(1)} °C`,
      );
      d3.select(this).select(".box-upper").attr("fill", "#9dd9e3");
      d3.select(this).select(".box-lower").attr("fill", "#3b8a8f");
    })
    .on("mousemove", (event) => {
      tt.style("left", event.pageX + 14 + "px").style(
        "top",
        event.pageY - 10 + "px",
      );
    })
    .on("mouseleave", function () {
      tt.style("opacity", 0);
      d3.select(this).select(".box-upper").attr("fill", BOX_LIGHT);
      d3.select(this).select(".box-lower").attr("fill", BOX_DARK);
    });

  const bw = x.bandwidth();
  const cx = bw / 2;

  /* Vertical whisker line (min → max) */
  boxes
    .append("line")
    .attr("class", "whisker-line")
    .attr("x1", cx)
    .attr("x2", cx)
    .attr("y1", (d) => y(d.min))
    .attr("y2", (d) => y(d.min))
    .attr("stroke", WHISKER)
    .attr("stroke-width", 1)
    .transition()
    .duration(600)
    .delay((_, i) => i * 22)
    .ease(d3.easeCubicOut)
    .attr("y2", (d) => y(d.max));

  /* Whisker caps */
  const capW = Math.min(bw * 0.5, 18);
  boxes
    .append("line")
    .attr("class", "whisker-cap")
    .attr("x1", cx - capW / 2)
    .attr("x2", cx + capW / 2)
    .attr("y1", (d) => y(d.min))
    .attr("y2", (d) => y(d.min))
    .attr("stroke", WHISKER)
    .attr("stroke-width", 1);

  boxes
    .append("line")
    .attr("class", "whisker-cap")
    .attr("x1", cx - capW / 2)
    .attr("x2", cx + capW / 2)
    .attr("y1", (d) => y(d.max))
    .attr("y2", (d) => y(d.max))
    .attr("stroke", WHISKER)
    .attr("stroke-width", 1)
    .attr("opacity", 0)
    .transition()
    .delay((_, i) => 400 + i * 22)
    .duration(220)
    .attr("opacity", 1);

  /* Lower half (Q1 → median) — darker */
  boxes
    .append("rect")
    .attr("class", "box-lower")
    .attr("x", 0)
    .attr("width", bw)
    .attr("y", (d) => y(d.median))
    .attr("height", 0)
    .attr("fill", BOX_DARK)
    .attr("stroke", "white")
    .attr("stroke-width", 0.5)
    .transition()
    .delay((_, i) => 200 + i * 22)
    .duration(500)
    .ease(d3.easeCubicOut)
    .attr("y", (d) => y(d.median))
    .attr("height", (d) => Math.max(0, y(d.q1) - y(d.median)));

  /* Upper half (median → Q3) — lighter */
  boxes
    .append("rect")
    .attr("class", "box-upper")
    .attr("x", 0)
    .attr("width", bw)
    .attr("y", (d) => y(d.median))
    .attr("height", 0)
    .attr("fill", BOX_LIGHT)
    .attr("stroke", "white")
    .attr("stroke-width", 0.5)
    .transition()
    .delay((_, i) => 200 + i * 22)
    .duration(500)
    .ease(d3.easeCubicOut)
    .attr("y", (d) => y(d.q3))
    .attr("height", (d) => Math.max(0, y(d.median) - y(d.q3)));

  /* Median tick (sits on top, between two halves) */
  boxes
    .append("line")
    .attr("class", "median-line")
    .attr("x1", 0)
    .attr("x2", bw)
    .attr("y1", (d) => y(d.median))
    .attr("y2", (d) => y(d.median))
    .attr("stroke", "white")
    .attr("stroke-width", 1.5);
}

/* ── Helper: wrap rotated tick label on whitespace ── */
function wrapTickLabel(textSel, width) {
  textSel.each(function () {
    const text = d3.select(this);
    const words = text.text().split(/\s+/);
    if (words.length <= 2) return;
    const half = Math.ceil(words.length / 2);
    const l1 = words.slice(0, half).join(" ");
    const l2 = words.slice(half).join(" ");
    text.text(null);
    text
      .append("tspan")
      .attr("x", 0)
      .attr("dy", "0em")
      .text(l1);
    text
      .append("tspan")
      .attr("x", 0)
      .attr("dy", "1.1em")
      .text(l2);
  });
}
