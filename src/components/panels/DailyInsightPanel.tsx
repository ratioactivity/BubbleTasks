import { formatDisplayDate } from '../../utils/format';
import type { HolidayInfo } from '../../services/holidayService';

interface DailyInsightPanelProps {
  encouragingMessage: string;
  todayHoliday: HolidayInfo | null;
  upcomingHoliday: HolidayInfo | null;
}

const DailyInsightPanel = ({ encouragingMessage, todayHoliday, upcomingHoliday }: DailyInsightPanelProps) => {
  return (
    <section className="rounded-2xl bg-bubble-surface p-4 shadow-soft">
      <h2 className="font-heading text-3xl">Daily Insight</h2>
      <p className="mt-1 text-sm">{encouragingMessage}</p>
      {todayHoliday ? <p className="mt-2 text-xs">Today: {todayHoliday.name}</p> : <p className="mt-2 text-xs">No holiday noted today.</p>}
      {upcomingHoliday ? (
        <p className="text-xs opacity-80">
          Upcoming: {upcomingHoliday.name} on {formatDisplayDate(upcomingHoliday.dateIso)} ({upcomingHoliday.daysUntil} days)
        </p>
      ) : (
        <p className="text-xs opacity-80">Upcoming holiday integration is ready for service wiring.</p>
      )}
    </section>
  );
};

export default DailyInsightPanel;
