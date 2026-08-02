import dotenv from "dotenv";
dotenv.config();

interface CachedWeather {
  rainfallMm24h: number;
  riverWaterLevelMeters: number;
  elevationMeters: number;
  expiresAt: number;
}

const cacheMap = new Map<string, CachedWeather>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache TTL

export async function fetchWeatherData(lat: number, lng: number): Promise<{
  rainfallMm24h: number;
  riverWaterLevelMeters: number;
  elevationMeters: number;
} | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.warn("[Weather Service] Missing OPENWEATHER_API_KEY. Weather API fetch skipped.");
    return null;
  }

  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = cacheMap.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`[Weather Service] Cache Hit for coordinates ${cacheKey}`);
    return {
      rainfallMm24h: cached.rainfallMm24h,
      riverWaterLevelMeters: cached.riverWaterLevelMeters,
      elevationMeters: cached.elevationMeters,
    };
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout limit

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OpenWeather API returned status code ${res.status}`);
    }

    const data = await res.json();

    // Parse rainfall metrics (rain["1h"] or rain["3h"])
    const rain1h = data.rain?.["1h"] || 0;
    const rain3h = data.rain?.["3h"] || 0;
    const computedRain = rain1h > 0 ? rain1h * 12 : rain3h > 0 ? (rain3h / 3) * 12 : 0;
    const rainfallMm24h = Math.round(computedRain * 10) / 10; // Round to 1 decimal

    // Mocking river water level and elevation based on coordinates for realistic heuristics
    const riverWaterLevelMeters = lat > 24.5 ? 2.5 : 0.8; // Higher mock level for flood prone north districts
    const elevationMeters = lat > 24.0 ? 4 : 2;

    const result = {
      rainfallMm24h,
      riverWaterLevelMeters,
      elevationMeters,
    };

    cacheMap.set(cacheKey, {
      ...result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    console.log(`[Weather Service] Fetched live weather for ${cacheKey}: Rain: ${rainfallMm24h}mm`);
    return result;
  } catch (error: any) {
    console.error(`[Weather Service] Fetch failed: ${error.message}. Returning fallback null.`);
    return null;
  }
}
