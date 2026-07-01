const UK_LATITUDE = 53.0;
const UK_LONGITUDE = -1.5;

export type DailyTemperatures = Record<string, number>;

type OpenMeteoDailyResponse = {
  daily?: {
    time?: string[];
    temperature_2m_mean?: (number | null)[];
  };
};

function parseDailyTemperatures(data: OpenMeteoDailyResponse): DailyTemperatures {
  const times = data.daily?.time ?? [];
  const values = data.daily?.temperature_2m_mean ?? [];
  const result: DailyTemperatures = {};

  for (let i = 0; i < times.length; i++) {
    const value = values[i];
    if (value != null) {
      result[times[i]] = Math.round(value * 10) / 10;
    }
  }

  return result;
}

function buildQuery(startDate: string, endDate: string) {
  return new URLSearchParams({
    latitude: String(UK_LATITUDE),
    longitude: String(UK_LONGITUDE),
    daily: "temperature_2m_mean",
    timezone: "Europe/London",
    start_date: startDate,
    end_date: endDate,
  });
}

export async function fetchUkDailyTemperatures(
  startDate: string,
  endDate: string,
): Promise<DailyTemperatures> {
  const today = new Date().toISOString().slice(0, 10);
  const effectiveEnd = endDate > today ? today : endDate;

  if (startDate > effectiveEnd) return {};

  const query = buildQuery(startDate, effectiveEnd);
  const endpoint =
    startDate >= "2021-01-01"
      ? "https://historical-forecast-api.open-meteo.com/v1/forecast"
      : "https://archive-api.open-meteo.com/v1/archive";

  const res = await fetch(`${endpoint}?${query}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch UK temperature data");
  }

  const temperatures = parseDailyTemperatures(await res.json());

  if (effectiveEnd === today && temperatures[today] === undefined) {
    const forecastRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?${buildQuery(today, today)}&forecast_days=1`,
      { next: { revalidate: 3600 } },
    );

    if (forecastRes.ok) {
      Object.assign(temperatures, parseDailyTemperatures(await forecastRes.json()));
    }
  }

  return temperatures;
}
