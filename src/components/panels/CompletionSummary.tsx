interface CompletionSummaryProps {
  today: number;
  week: number;
  month: number;
  year: number;
}

const CompletionSummary = ({ today, week, month, year }: CompletionSummaryProps) => {
  return (
    <section className="rounded-2xl bg-bubble-creative p-4 shadow-soft">
      <h2 className="font-heading text-2xl">Completion Summary</h2>
      <p className="font-bold text-sm">You&apos;ve completed {today} tasks today.</p>
      <p className="text-xs opacity-80">Week: {week} • Month: {month} • Year: {year}</p>
    </section>
  );
};

export default CompletionSummary;
