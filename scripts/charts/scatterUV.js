export function drawScatterUV(data) {
  const width = 600,
    height = 350;

  const svg = d3
    .select("#scatter-uv")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.temp))
    .range([50, width - 20]);

  const y = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.uv))
    .range([height - 40, 20]);

  const circles = svg
    .selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d.temp))
    .attr("cy", (d) => y(d.uv))
    .attr("r", 3)
    .attr("fill", "green")
    .attr("opacity", 0.6);

  // transition demo
  circles.transition().duration(1000).attr("r", 5);

  svg
    .append("g")
    .attr("transform", `translate(0,${height - 40})`)
    .call(d3.axisBottom(x));

  svg.append("g").attr("transform", `translate(50,0)`).call(d3.axisLeft(y));
}
