export function drawLineTemp(data) {
  const width = 700,
    height = 300;
  const margin = { top: 30, right: 30, bottom: 40, left: 50 };

  const svg = d3
    .select("#line-temp")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3
    .scaleTime()
    .domain(d3.extent(data, (d) => d.date))
    .range([margin.left, width - margin.right]);

  const y = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.temp))
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr(
      "d",
      d3
        .line()
        .x((d) => x(d.date))
        .y((d) => y(d.temp))
    );

  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));
}
