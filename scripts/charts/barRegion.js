export function drawBarRegion(data) {
  const avgByRegion = d3.rollups(
    data,
    (v) => d3.mean(v, (d) => d.temp),
    (d) => d.region
  );

  const width = 600,
    height = 300;

  const svg = d3
    .select("#bar-region")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3
    .scaleBand()
    .domain(avgByRegion.map((d) => d[0]))
    .range([50, width - 20])
    .padding(0.2);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(avgByRegion, (d) => d[1])])
    .nice()
    .range([height - 40, 20]);

  svg
    .selectAll("rect")
    .data(avgByRegion)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d[0]))
    .attr("y", (d) => y(d[1]))
    .attr("height", (d) => y(0) - y(d[1]))
    .attr("width", x.bandwidth())
    .attr("fill", "orange")
    .on("mouseover", function () {
      d3.select(this).attr("fill", "red");
    })
    .on("mouseout", function () {
      d3.select(this).attr("fill", "orange");
    });

  svg
    .append("g")
    .attr("transform", `translate(0,${height - 40})`)
    .call(d3.axisBottom(x));

  svg.append("g").attr("transform", `translate(50,0)`).call(d3.axisLeft(y));
}
