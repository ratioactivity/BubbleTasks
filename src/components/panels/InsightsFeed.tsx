import { formatDisplayDate } from '../../utils/format';
import type { Task } from '../../types/task';

interface InsightsFeedProps {
  dueSoon: Task[];
  stale: Task[];
}

const InsightsFeed = ({ dueSoon, stale }: InsightsFeedProps) => {
  return (
    <section className="rounded-2xl bg-bubble-surface p-4 shadow-soft">
      <h2 className="font-heading text-2xl">Insights Feed</h2>
      <div className="space-y-2 text-sm opacity-90">
        <div>
          <p className="font-bold">Due Soon</p>
          {dueSoon.slice(0, 2).map((task) => (
            <p key={task.id}>• {task.title} {task.dueDate ? `(Due ${formatDisplayDate(task.dueDate)})` : ''}</p>
          ))}
          {dueSoon.length === 0 ? <p>• No urgent due dates.</p> : null}
        </div>
        <div>
          <p className="font-bold">Stale Tasks</p>
          {stale.slice(0, 2).map((task) => (
            <p key={task.id}>• {task.title}</p>
          ))}
          {stale.length === 0 ? <p>• Everything is moving.</p> : null}
        </div>
      </div>
    </section>
  );
};

export default InsightsFeed;
