// Q7 – Tần suất trạng thái thời tiết  (horizontal bar chart)
// Container element expected: <div id="bar-condition"></div>

const BAR_COLOR = "#5b85aa";
const BAR_COLOR_HOVER = "#3d6890";

const SI_FORMAT = (v) => {
  if (v === 0) return "0K";
  if (Math.abs(v) >= 1000) return d3.format("~s")(v).replace("G", "B");
  return String(v);
};

export function drawBarCondition(data) {
  /* ── Aggregate condition frequency (descending) ── */
  const counts = d3.rollups(
    data.filter((d) => d.condition && d.condition !== "Unknown"),
    (v) => v.length,
    (d) => d.condition,
  )
    .map(([condition, count]) => ({ condition, count }))
    .sort((a, b) => d3.descending(a.count, b.count));

  const total = d3.sum(counts, (d) => d.count);

  /* ── Layout ── */
  const margin = { top: 28, right: 32, bottom: 64, left: 240 };
  const rowH = 22;
  const innerH = Math.max(counts.length * rowH, 200);
  const totalW = 920;
  const totalH = innerH + margin.top + margin.bottom;
  const W = totalW - margin.left - margin.right;
  const H = innerH;

  const container = d3.select("#bar-condition");
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
  const maxCount = d3.max(counts, (d) => d.count) ?? 0;
  const x = d3
    .scaleLinear()
    .domain([0, Math.ceil(maxCount / 1000) * 1000 || maxCount])
    .nice()
    .range([0, W]);

  const y = d3
    .scaleBand()
    .domain(counts.map((d) => d.condition))
    .range([0, H])
    .padding(0.25);

  /* ── Column header label (top-left, like Tableau) ── */
  g.append("text")
    .attr("x", -margin.left + 12)
    .attr("y", -10)
    .attr("font-size", 12)
    .attr("font-weight", 600)
    .attr("fill", "#374151")
    .text("Day.Condition.Text");

  /* ── Grid (vertical) ── */
  g.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${H})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(Math.min(8, Math.max(2, Math.round(W / 90))))
        .tickSize(-H)
        .tickFormat(""),
    )
    .call((ax) => {
      ax.select(".domain").remove();
      ax.selectAll("line")
        .attr("stroke", "#e5e7eb")
        .attr("stroke-dasharray", "3 4");
    });

  /* ── Axes ── */
  g.append("g")
    .attr("transform", `translate(0,${H})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(Math.min(8, Math.max(2, Math.round(W / 90))))
        .tickFormat(SI_FORMAT),
    )
    .call((ax) => ax.select(".domain").attr("stroke", "#d1d5db"))
    .selectAll("text")
    .attr("font-size", 12)
    .attr("fill", "#6b7280");

  g.append("g")
    .call(d3.axisLeft(y).tickSize(0).tickPadding(8))
    .call((ax) => ax.select(".domain").remove())
    .selectAll("text")
    .attr("font-size", 12)
    .attr("fill", "#374151");

  /* ── Axis label (X) ── */
  g.append("text")
    .attr("x", W / 2)
    .attr("y", H + 48)
    .attr("text-anchor", "middle")
    .attr("font-size", 13)
    .attr("fill", "#374151")
    .text("Condition Frequency [Days Count]");

  /* ── Tooltip ── */
  const tooltip = d3.select("body").select(".chart-tooltip");
  const tt = tooltip.empty()
    ? d3.select("body").append("div").attr("class", "chart-tooltip")
    : tooltip;

  /* ── Bars (with grow-in transition) ── */
  const bars = g
    .selectAll("rect.bar")
    .data(counts, (d) => d.condition)
    .join("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", (d) => y(d.condition))
    .attr("height", y.bandwidth())
    .attr("width", 0)
    .attr("fill", BAR_COLOR)
    .attr("rx", 2)
    .style("cursor", "pointer")
    .on("mouseenter", function (event, d) {
      const pct = ((d.count / total) * 100).toFixed(1);
      tt.style("opacity", 1).html(
        `<strong>${d.condition}</strong><br/>
         Số ngày: ${d.count.toLocaleString("vi-VN")}<br/>
         Tỉ lệ: ${pct}%`,
      );
      d3.select(this)
        .transition()
        .duration(120)
        .attr("fill", BAR_COLOR_HOVER);
    })
    .on("mousemove", (event) => {
      tt.style("left", event.pageX + 14 + "px").style(
        "top",
        event.pageY - 10 + "px",
      );
    })
    .on("mouseleave", function () {
      tt.style("opacity", 0);
      d3.select(this).transition().duration(120).attr("fill", BAR_COLOR);
    });

  bars
    .transition()
    .duration(700)
    .delay((_, i) => i * 18)
    .ease(d3.easeCubicOut)
    .attr("width", (d) => x(d.count));

  /* ── Value labels at end of bars (fade in after grow) ── */
  g.selectAll("text.bar-value")
    .data(counts, (d) => d.condition)
    .join("text")
    .attr("class", "bar-value")
    .attr("y", (d) => y(d.condition) + y.bandwidth() / 2)
    .attr("x", (d) => x(d.count) + 6)
    .attr("dy", "0.35em")
    .attr("font-size", 11)
    .attr("fill", "#6b7280")
    .attr("opacity", 0)
    .text((d) => d.count.toLocaleString("vi-VN"))
    .transition()
    .delay((_, i) => 250 + i * 18)
    .duration(300)
    .attr("opacity", 1);
}
