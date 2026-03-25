import { CATEGORY_CONFIG } from '../../config/categories';
import { formatDisplayDate, formatPriorityStars, formatStatusLabel } from '../../utils/format';
import type { Task, TaskStatus } from '../../types/task';

interface TaskCardProps {
  task: Task;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onSetStatus: (taskId: string, status: TaskStatus) => void;
  onCompleteAndArchive: (taskId: string) => void;
  onCountComplete: (taskId: string) => void;
}

const TaskCard = ({ task, onEdit, onDelete, onSetStatus, onCompleteAndArchive, onCountComplete }: TaskCardProps) => {
  const dueDate = formatDisplayDate(task.dueDate);
  const stars = formatPriorityStars(task.priority);
  const category = CATEGORY_CONFIG[task.category];

  return (
    <article className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-soft backdrop-blur">
      <div className="mb-2 flex items-center gap-2">
        <img src={category.gifAssetPath} alt="category icon" className="h-5 w-5 rounded-full" />
        <h4 className="font-bold text-base">{task.title}</h4>
      </div>
      <p className="text-xs">Status: {formatStatusLabel(task.status)}</p>
      {dueDate ? <p className="mt-1 text-xs opacity-80">Due: {dueDate}</p> : null}
      {stars ? <p className="text-xs opacity-80">Priority: {stars}</p> : null}

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <button onClick={() => onSetStatus(task.id, 'not_started')} className="rounded-full bg-bubble-sidebar px-2 py-1">Not Started</button>
        <button onClick={() => onSetStatus(task.id, 'in_progress')} className="rounded-full bg-bubble-school px-2 py-1">In Progress</button>
        <button onClick={() => onCompleteAndArchive(task.id)} className="rounded-full bg-bubble-work px-2 py-1">Full Complete</button>
        <button onClick={() => onCountComplete(task.id)} className="rounded-full bg-bubble-creative px-2 py-1">Count Complete</button>
        <button onClick={() => onEdit(task.id)} className="rounded-full bg-bubble-business px-2 py-1">Edit</button>
        <button onClick={() => onDelete(task.id)} className="rounded-full bg-bubble-home px-2 py-1">Delete</button>
      </div>
    </article>
  );
};

export default TaskCard;
