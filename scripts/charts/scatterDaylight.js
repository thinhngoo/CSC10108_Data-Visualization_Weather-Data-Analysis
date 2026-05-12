// Q12 – Ban ngày dài có ảnh hưởng đến UV không?  (scatter HoD vs UV)
// Container element expected: <div id="scatter-daylight"></div>

const REGIONS = [
  "Bắc Trung Bộ và Duyên hải miền Trung",
  "Đồng Bằng Sông Cửu Long",
  "Đồng Bằng Sông Hồng",
  "Đông Nam Bộ",
  "Tây Nguyên",
  "Trung du và miền núi Bắc Bộ",
];
const REGION_SHORT = [
  "Bắc Trung Bộ","ĐB Sông Cửu Long","ĐB Sông Hồng",
  "Đông Nam Bộ","Tây Nguyên","Trung du Bắc Bộ",
];
const COLORS = ["#4f8ef7","#f97316","#ef4444","#22d3ee","#a855f7","#eab308"];
const colorOf = (region) => COLORS[REGIONS.indexOf(region)] ?? "#888";

const jitter = d3.randomNormal(0, 0.022);

export function drawScatterDaylight(data) {
  const validData = data.filter(d => d.hourOfDayLight != null && d.uv >= 2);

  /* ── Layout ── */
  const margin = { top: 24, right: 24, bottom: 56, left: 60 };
  const totalW = 860, totalH = 460;
  const W = totalW - margin.left - margin.right;
  const H = totalH - margin.top  - margin.bottom;

  const container = d3.select("#scatter-daylight");
  container.html("");

  /* ── Filter bar ── */
  const controls = container.append("div").attr("class","chart-filter-bar");
  let activeRegions = new Set(REGIONS);

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${totalW} ${totalH}`)
    .attr("width","100%");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  /* ── Scales ── */
  const hodExt = d3.extent(validData, d => d.hourOfDayLight);
  const x = d3.scaleLinear()
    .domain([hodExt[0] - 0.1, hodExt[1] + 0.1]).range([0, W]);
  const y = d3.scaleLinear()
    .domain([1, 11]).range([H, 0]);

  /* ── Grid ── */
  g.append("g").attr("class","grid")
    .call(d3.axisLeft(y).ticks(10).tickSize(-W).tickFormat(""))
    .call(ax => { ax.select(".domain").remove(); ax.selectAll("line").attr("stroke","#e5e7eb").attr("stroke-dasharray","3 4"); });

  g.append("g").attr("class","grid").attr("transform",`translate(0,${H})`)
    .call(d3.axisBottom(x).ticks(8).tickSize(-H).tickFormat(""))
    .call(ax => { ax.select(".domain").remove(); ax.selectAll("line").attr("stroke","#e5e7eb").attr("stroke-dasharray","3 4"); });

  /* ── Axes ── */
  g.append("g").attr("transform",`translate(0,${H})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d => d.toFixed(1)))
    .call(ax => ax.select(".domain").attr("stroke","#d1d5db"))
    .selectAll("text").attr("font-size",12).attr("fill","#6b7280");

  g.append("g")
    .call(d3.axisLeft(y).ticks(10).tickFormat(d3.format("d")))
    .call(ax => ax.select(".domain").attr("stroke","#d1d5db"))
    .selectAll("text").attr("font-size",12).attr("fill","#6b7280");

  /* ── Axis labels ── */
  g.append("text").attr("x", W / 2).attr("y", H + 46)
    .attr("text-anchor","middle").attr("font-size",13).attr("fill","#374151")
    .text("HourOfDayLight");

  g.append("text").attr("transform","rotate(-90)").attr("x",-H/2).attr("y",-46)
    .attr("text-anchor","middle").attr("font-size",13).attr("fill","#374151")
    .text("Day.Uv");

  /* ── Tooltip ── */
  const tooltip = d3.select("body").select(".chart-tooltip");
  const tt = tooltip.empty()
    ? d3.select("body").append("div").attr("class","chart-tooltip")
    : tooltip;

  /* ── Dots per region group ── */
  const dotGroups = new Map();

  REGIONS.forEach(region => {
    const regionData = validData.filter(d => d.region === region);

    const dots = g.selectAll(`.dot-r${REGIONS.indexOf(region)}`)
      .data(regionData)
      .join("circle")
      .attr("class", `dot dot-r${REGIONS.indexOf(region)}`)
      .attr("cx", d => x(d.hourOfDayLight + jitter()))
      .attr("cy", d => y(d.uv + (Math.random() - 0.5) * 0.12))
      .attr("r", 4)
      .attr("fill", colorOf(region))
      .attr("fill-opacity", 0.5)
      .style("cursor","pointer")
      .on("mouseenter", function (event, d) {
        tt.style("opacity",1).html(
          `<strong>UV ${d.uv}</strong><br/>
           Daylight: ${d.hourOfDayLight.toFixed(2)} h<br/>
           Vùng: ${REGION_SHORT[REGIONS.indexOf(d.region)]}<br/>
           Ngày: ${d3.timeFormat("%d/%m/%Y")(d.date)}`
        );
        d3.select(this).raise().transition().duration(100).attr("r",7).attr("fill-opacity",1);
      })
      .on("mousemove", (event) => {
        tt.style("left", event.pageX + 14 + "px").style("top", event.pageY - 10 + "px");
      })
      .on("mouseleave", function () {
        tt.style("opacity",0);
        d3.select(this).transition().duration(100)
          .attr("r",4)
          .attr("fill-opacity", activeRegions.has(region) ? 0.5 : 0.04);
      });

    dotGroups.set(region, dots);
  });

  /* ── Filter buttons ── */
  REGIONS.forEach((region, i) => {
    const btn = controls.append("button")
      .attr("class","chart-filter-btn active")
      .style("border-color", COLORS[i])
      .style("color", COLORS[i])
      .text(REGION_SHORT[i]);

    btn.on("click", function () {
      if (activeRegions.has(region)) {
        if (activeRegions.size <= 1) return;
        activeRegions.delete(region);
      } else {
        activeRegions.add(region);
      }
      this.classList.toggle("active", activeRegions.has(region));

      dotGroups.forEach((dots, reg) => {
        dots.transition().duration(300)
          .attr("fill-opacity", activeRegions.has(reg) ? 0.5 : 0.04)
          .attr("r",            activeRegions.has(reg) ? 4   : 2);
      });
    });
  });
}
