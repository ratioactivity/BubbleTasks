export interface HolidayInfo {
  name: string;
  dateIso: string;
  daysUntil: number;
}

export interface HolidayService {
  getTodayHoliday: (today: Date) => Promise<HolidayInfo | null>;
  getUpcomingHoliday: (today: Date) => Promise<HolidayInfo | null>;
}

class PlaceholderHolidayService implements HolidayService {
  async getTodayHoliday(): Promise<HolidayInfo | null> {
    return null;
  }

  async getUpcomingHoliday(today: Date): Promise<HolidayInfo | null> {
    const upcoming = new Date(today);
    upcoming.setDate(today.getDate() + 6);

    return {
      name: 'Placeholder Holiday',
      dateIso: upcoming.toISOString(),
      daysUntil: 6,
    };
  }
}

export const createHolidayService = (): HolidayService => {
  return new PlaceholderHolidayService();
};
