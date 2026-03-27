export interface WeatherSnapshot {
  temperatureF: number;
  conditionLabel: string;
  locationLabel: string;
  fetchedAtIso: string;
}

export interface WeatherService {
  getCurrentWeather: () => Promise<WeatherSnapshot>;
}

class MockWeatherService implements WeatherService {
  async getCurrentWeather(): Promise<WeatherSnapshot> {
    return {
      temperatureF: 72,
      conditionLabel: 'Partly Sunny',
      locationLabel: 'Local',
      fetchedAtIso: new Date().toISOString(),
    };
  }
}

export const createWeatherService = (): WeatherService => {
  return new MockWeatherService();
};
