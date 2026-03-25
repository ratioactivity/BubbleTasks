import { formatDisplayDate, formatPriorityStars } from '../../utils/format';
import type { Task } from '../../types/task';

interface TaskCardProps {
  task: Task;
}

const TaskCard = ({ task }: TaskCardProps) => {
  const dueDate = formatDisplayDate(task.dueDate);
  const stars = formatPriorityStars(task.priority);

  return (
    <article className="rounded-xl border border-white/70 bg-bubble-surface p-3 shadow-soft">
      <h4 className="font-bold text-base">{task.title}</h4>
      <p className="text-xs">Status: {task.status}</p>
      <div className="mt-2 flex gap-2 text-xs">
        <button className="rounded-full bg-bubble-school px-3 py-1">In Progress</button>
        <button className="rounded-full bg-bubble-work px-3 py-1">Complete</button>
      </div>
      {dueDate ? <p className="mt-2 text-xs opacity-80">Due: {dueDate}</p> : null}
      {stars ? <p className="text-xs opacity-80">Priority: {stars}</p> : null}
    </article>
  );
};

export default TaskCard;
