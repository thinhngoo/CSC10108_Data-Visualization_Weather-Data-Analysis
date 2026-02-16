export function cleanData(raw) {
  const parseDate = d3.timeParse("%Y-%m-%d");

  return raw
    .filter((d) => d["day.avgtemp_c"] !== "")
    .map((d) => ({
      date: parseDate(d.date),
      region: d["location.region"].trim(),
      temp: +d["day.avgtemp_c"],
      uv: +d["day.uv"],
      condition: d["day.condition.text"] || "Unknown",
      lat: +d["location.lat"],
      lon: +d["location.lon"],
      sunrise: d["astro.sunrise"],
      sunset: d["astro.sunset"],
    }));
}
