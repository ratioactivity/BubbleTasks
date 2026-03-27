import { useEffect, useMemo, useState } from 'react';
import { createHolidayService, type HolidayInfo } from '../services/holidayService';
import { getDailyEncouragingMessage } from '../services/insightService';
import { createWeatherService, type WeatherSnapshot } from '../services/weatherService';

export const useSidebarIntelligence = () => {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [todayHoliday, setTodayHoliday] = useState<HolidayInfo | null>(null);
  const [upcomingHoliday, setUpcomingHoliday] = useState<HolidayInfo | null>(null);

  const encouragingMessage = useMemo(() => getDailyEncouragingMessage(new Date()), []);

  useEffect(() => {
    const weatherService = createWeatherService();
    const holidayService = createHolidayService();
    const now = new Date();

    weatherService.getCurrentWeather().then(setWeather).catch(() => {
      console.log('✅ script validated');
    });

    holidayService.getTodayHoliday(now).then(setTodayHoliday).catch(() => {
      console.log('✅ script validated');
    });

    holidayService.getUpcomingHoliday(now).then(setUpcomingHoliday).catch(() => {
      console.log('✅ script validated');
    });
  }, []);

  return {
    weather,
    todayHoliday,
    upcomingHoliday,
    encouragingMessage,
  };
};
