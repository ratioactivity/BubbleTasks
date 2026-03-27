interface CompletionSummaryProps {
  today: number;
  week: number;
  month: number;
  year: number;
}

const CompletionSummary = ({ today, week, month, year }: CompletionSummaryProps) => {
  return (
    <section className="rounded-2xl bg-bubble-business p-4 shadow-soft">
      <h2 className="font-heading text-3xl">Wins</h2>
      <p className="font-bold text-sm">You&apos;ve completed {today} tasks today!</p>
      <p className="font-bold text-sm">You&apos;ve completed {week} tasks this week!</p>
      <p className="mt-1 text-xs opacity-80">Month: {month} • Year: {year}</p>
    </section>
  );
};

export default CompletionSummary;
