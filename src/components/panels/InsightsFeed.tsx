import { formatDisplayDate } from '../../utils/format';
import type { Task } from '../../types/task';

interface InsightsFeedProps {
  overdue: Task[];
  dueInThreeDays: Task[];
  stale: Task[];
}

const InsightsFeed = ({ overdue, dueInThreeDays, stale }: InsightsFeedProps) => {
  return (
    <section className="rounded-2xl bg-bubble-surface p-4 shadow-soft">
      <h2 className="font-heading text-3xl">Task Feed</h2>
      <div className="mt-2 space-y-3 text-sm opacity-90">
        <div>
          <p className="font-bold">Overdue</p>
          {overdue.slice(0, 3).map((task) => (
            <p key={task.id} className="mt-1 rounded-lg bg-bubble-home px-2 py-1">
              • {task.title} {task.dueDate ? `(Was due ${formatDisplayDate(task.dueDate)})` : ''}
            </p>
          ))}
          {overdue.length === 0 ? <p className="mt-1">• No overdue tasks 🎉</p> : null}
        </div>
        <div>
          <p className="font-bold">Due in 3 Days</p>
          {dueInThreeDays.slice(0, 3).map((task) => (
            <p key={task.id} className="mt-1 rounded-lg bg-bubble-creative px-2 py-1">
              • {task.title} {task.dueDate ? `(Due ${formatDisplayDate(task.dueDate)})` : ''}
            </p>
          ))}
          {dueInThreeDays.length === 0 ? <p className="mt-1">• No near-term due dates.</p> : null}
        </div>
        <div>
          <p className="font-bold">Long Unfinished</p>
          {stale.slice(0, 3).map((task) => (
            <p key={task.id} className="mt-1 rounded-lg bg-bubble-other px-2 py-1">• {task.title}</p>
          ))}
          {stale.length === 0 ? <p className="mt-1">• No stale tasks right now.</p> : null}
        </div>
      </div>
    </section>
  );
};

export default InsightsFeed;
