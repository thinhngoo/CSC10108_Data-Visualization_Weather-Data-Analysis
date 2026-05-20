const ALL_REGION_VALUE = "__ALL__";
const ALL_YEARS_VALUE = "__ALL_YEARS__";

/** Màu theo nhiệt độ TB: lạnh (xanh) → nóng (cam/đỏ), điều chỉnh độ bão hòa/độ sáng qua HSL */
function tempColorScale(minT, maxT) {
  const lo = minT;
  const hi = maxT;
  const span = hi - lo || 1;
  return (t) => {
    const u = Math.max(0, Math.min(1, (t - lo) / span));
    return d3.interpolateHsl("hsl(210, 88%, 42%)", "hsl(12, 92%, 48%)")(u);
  };
}

export function drawQ1(data) {
  const container = d3.select("#trend-temp");
  container.selectAll("svg").remove();

  if (!data || data.length === 0) return;

  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
  const width = container.node().getBoundingClientRect().width || 800;
  const height = 400;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const regions = Array.from(new Set(data.map((d) => d.region))).sort();
  const years = Array.from(new Set(data.map((d) => d.date.getFullYear()))).sort();

  const regionSelect = d3.select("#q1-region-select");
  const yearSelect = d3.select("#q1-year-select");

  const prevRegion = regionSelect.property("value");
  const prevYear = yearSelect.property("value");

  const regionOptions = [
    { value: ALL_REGION_VALUE, label: "Cả nước" },
    ...regions.map((r) => ({ value: r, label: r })),
  ];
  regionSelect
    .selectAll("option")
    .data(regionOptions, (d) => d.value)
    .join("option")
    .attr("value", (d) => d.value)
    .text((d) => d.label);

  const yearOptions = [
    { value: ALL_YEARS_VALUE, label: "Tất cả (2024 & 2025)" },
    ...years.map((y) => ({ value: String(y), label: String(y) })),
  ];
  yearSelect
    .selectAll("option")
    .data(yearOptions, (d) => d.value)
    .join("option")
    .attr("value", (d) => d.value)
    .text((d) => d.label);

  const validRegion =
    prevRegion &&
      regionOptions.some((o) => o.value === prevRegion)
      ? prevRegion
      : regions[0];
  const validYear =
    prevYear && yearOptions.some((o) => o.value === prevYear)
      ? prevYear
      : String(years[0] ?? "");

  regionSelect.property("value", validRegion);
  yearSelect.property("value", validYear);

  let currentRegion = regionSelect.property("value");
  let currentYear = yearSelect.property("value");

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("max-width", "100%")
    .style("height", "auto");

  const defs = svg.append("defs");
  const areaGradientId = `q1-area-grad-${Math.random().toString(36).slice(2, 9)}`;
  const areaGradient = defs
    .append("linearGradient")
    .attr("id", areaGradientId)
    .attr("x1", "0%")
    .attr("x2", "100%")
    .attr("y1", "0%")
    .attr("y2", "0%");

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleTime().range([0, innerWidth]);
  const y = d3.scaleLinear().range([innerHeight, 0]);

  const xAxisGroup = g
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${innerHeight})`);

  const yAxisGroup = g.append("g").attr("class", "y-axis");

  const area = d3
    .area()
    .curve(d3.curveMonotoneX)
    .x((d) => x(d.monthDate))
    .y0((d) => y(d.minTemp))
    .y1((d) => y(d.maxTemp));

  const lineGen = d3
    .line()
    .curve(d3.curveMonotoneX)
    .x((d) => x(d.monthDate))
    .y((d) => y(d.avgTemp));

  const areaPath = g
    .append("path")
    .attr("class", "trend-area")
    .style("stroke", "none");

  const linesGroup = g.append("g").attr("class", "trend-lines-segments");

  let tooltip = d3.select("body").select(".d3-tooltip-q1");
  if (tooltip.empty()) {
    tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "d3-tooltip-q1")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "#fff")
      .style("padding", "8px 12px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 1000);
  }

  const dotsGroup = g.append("g").attr("class", "dots-group");

  function monthDateFor(monthIndex) {
    if (currentYear === ALL_YEARS_VALUE) {
      return new Date(2000, monthIndex, 1);
    }
    return new Date(+currentYear, monthIndex, 1);
  }

  function update() {
    currentRegion = regionSelect.property("value");
    currentYear = yearSelect.property("value");

    let slice = data;
    if (currentRegion !== ALL_REGION_VALUE) {
      slice = slice.filter((d) => d.region === currentRegion);
    }
    if (currentYear !== ALL_YEARS_VALUE) {
      slice = slice.filter((d) => d.date.getFullYear() === +currentYear);
    }

    const monthlyDataMap = d3.rollup(
      slice,
      (v) => {
        const minTemp = d3.mean(v, (d) => d.minTemp || d.temp);
        const maxTemp = d3.mean(v, (d) => d.maxTemp || d.temp);
        return {
          avgTemp: d3.mean(v, (d) => d.temp),
          minTemp,
          maxTemp,
        };
      },
      (d) => d.date.getMonth(),
    );

    const monthlyData = Array.from(monthlyDataMap, ([month, values]) => ({
      month,
      monthDate: monthDateFor(month),
      ...values,
    })).sort((a, b) => a.month - b.month);

    if (monthlyData.length === 0) {
      areaPath.style("display", "none");
      linesGroup.selectAll("path").remove();
      dotsGroup.selectAll("*").remove();
      return;
    }

    areaPath.style("display", null);

    const tMin = d3.min(monthlyData, (d) => d.avgTemp);
    const tMax = d3.max(monthlyData, (d) => d.avgTemp);
    const colorAt = tempColorScale(tMin, tMax);

    areaGradient.selectAll("stop").remove();
    monthlyData.forEach((d, i, arr) => {
      const offset = arr.length <= 1 ? 0 : (i / (arr.length - 1)) * 100;
      areaGradient
        .append("stop")
        .attr("offset", `${offset}%`)
        .attr("stop-color", colorAt(d.avgTemp))
        .attr("stop-opacity", 0.22);
    });

    areaPath.style("fill", `url(#${areaGradientId})`);

    if (currentYear === ALL_YEARS_VALUE) {
      x.domain([new Date(2000, 0, 1), new Date(2000, 11, 1)]);
    } else {
      x.domain(d3.extent(monthlyData, (d) => d.monthDate));
    }

    const maxVal = d3.max(monthlyData, (d) => d.maxTemp);
    const minVal = d3.min(monthlyData, (d) => d.minTemp);
    y.domain([Math.min(0, minVal - 5), maxVal + 5]).nice();

    const xTickFormat =
      currentYear === ALL_YEARS_VALUE
        ? d3.timeFormat("Th.%m")
        : d3.timeFormat("T%m");

    xAxisGroup
      .transition()
      .duration(750)
      .call(d3.axisBottom(x).ticks(12).tickFormat(xTickFormat));

    yAxisGroup
      .transition()
      .duration(750)
      .call(d3.axisLeft(y).tickFormat((d) => d + "°C"));

    areaPath
      .datum(monthlyData)
      .transition()
      .duration(750)
      .attr("d", area);

    const segments = [];
    for (let i = 0; i < monthlyData.length - 1; i++) {
      const a = monthlyData[i];
      const b = monthlyData[i + 1];
      segments.push({
        a,
        b,
        midAvg: (a.avgTemp + b.avgTemp) / 2,
      });
    }

    linesGroup
      .selectAll("path.line-seg")
      .data(segments)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "line-seg")
            .style("fill", "none")
            .style("stroke-width", 2.8)
            .style("stroke-linecap", "round")
            .style("stroke-linejoin", "round"),
        (update) => update,
        (exit) => exit.remove(),
      )
      .style("stroke", (d) => colorAt(d.midAvg))
      .transition()
      .duration(750)
      .attr("d", (d) => lineGen([d.a, d.b]));

    const dots = dotsGroup
      .selectAll(".trend-dot")
      .data(monthlyData, (d) => d.month);

    dots
      .enter()
      .append("circle")
      .attr("class", "trend-dot")
      .attr("r", 5)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .attr("cx", (d) => x(d.monthDate))
      .attr("cy", (d) => y(d.avgTemp))
      .style("opacity", 0)
      .on("mouseover", function (event, d) {
        d3.select(this).transition().duration(200).attr("r", 8);
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip
          .html(
            `<strong>Tháng: ${d.month + 1}</strong><br/>` +
            `AVG Temp: ${d.avgTemp.toFixed(1)}°C<br/>` +
            `Range: [${d.minTemp.toFixed(1)}°C - ${d.maxTemp.toFixed(1)}°C]`,
          )
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).transition().duration(200).attr("r", 5);
        tooltip.transition().duration(500).style("opacity", 0);
      })
      .merge(dots)
      .attr("fill", (d) => colorAt(d.avgTemp))
      .transition()
      .duration(750)
      .attr("cx", (d) => x(d.monthDate))
      .attr("cy", (d) => y(d.avgTemp))
      .style("opacity", 1);

    dots.exit().remove();
  }

  regionSelect.on("change", update);
  yearSelect.on("change", update);

  update();
}
