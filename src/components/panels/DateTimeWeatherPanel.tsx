import { useEffect, useMemo, useState } from 'react';
import type { WeatherSnapshot } from '../../services/weatherService';

interface DateTimeWeatherPanelProps {
  weather: WeatherSnapshot | null;
}

const DateTimeWeatherPanel = ({ weather }: DateTimeWeatherPanelProps) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);

    return () => {
      window.clearInterval(id);
    };
  }, []);

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(now),
    [now],
  );

  const formattedTime = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(now),
    [now],
  );

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-bubble-home via-bubble-creative to-bubble-school p-4 shadow-soft">
      <img src="/assets/singlestar1.gif" alt="decorative star" className="absolute right-3 top-2 h-4 w-4 opacity-80" />
      <img src="/assets/singlestar2.gif" alt="decorative star" className="absolute right-8 top-5 h-3 w-3 opacity-60" />
      <h2 className="font-heading text-3xl">Right Now</h2>
      <p className="font-bold text-sm">{formattedDate}</p>
      <p className="text-xl font-bold">{formattedTime}</p>
      <p className="mt-2 text-sm">
        Weather: {weather ? `${weather.temperatureF}°F • ${weather.conditionLabel} (${weather.locationLabel})` : 'Loading weather...'}
      </p>
    </section>
  );
};

export default DateTimeWeatherPanel;
