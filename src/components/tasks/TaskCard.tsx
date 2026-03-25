import type { Task } from '../../types/task';

interface TaskCardProps {
  task: Task;
}

const TaskCard = ({ task }: TaskCardProps) => {
  return (
    <article className="rounded-xl border border-white/70 bg-bubble-surface p-3 shadow-soft">
      <h4 className="font-bold text-base">{task.title}</h4>
      <p className="text-xs">Status: {task.status}</p>
      <div className="mt-2 flex gap-2 text-xs">
        <button className="rounded-full bg-bubble-school px-3 py-1">In Progress</button>
        <button className="rounded-full bg-bubble-work px-3 py-1">Complete</button>
      </div>
      <div className="mt-2 text-xs opacity-75">Due date / Priority hidden if missing</div>
    </article>
  );
};

export default TaskCard;
