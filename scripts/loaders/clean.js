export function cleanData(raw) {
  const parseDate = d3.timeParse("%Y-%m-%d");
  const parseTime = d3.timeParse("%I:%M %p");
  return raw
    .filter((d) => d["day.avgtemp_c"] !== "")
    .map((d) => {
      const rise = parseTime((d["astro.sunrise"] || "").trim());
      const set  = parseTime((d["astro.sunset"]  || "").trim());
      const hourOfDayLight = rise && set ? +((set - rise) / 3_600_000).toFixed(4) : null;

      return{
      date: parseDate(d.date),
      region: d["location.region"].trim(),
      temp: +d["day.avgtemp_c"],
      uv: +d["day.uv"],
      condition: d["day.condition.text"] || "Unknown",
      lat: +d["location.lat"],
      lon: +d["location.lon"],
      sunrise: d["astro.sunrise"],
      sunset: d["astro.sunset"],
      hourOfDayLight,}
    });
}
