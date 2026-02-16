import { loadData } from "./load.js";
import { cleanData } from "./clean.js";

export { loadData, cleanData };

export async function getWeatherData() {
  const raw = await loadData();
  return cleanData(raw);
}
