import { formatDisplayDate } from '../../utils/format';
import type { Task } from '../../types/task';

interface ArchiveModalProps {
  isOpen: boolean;
  archivedTasks: Task[];
  onClose: () => void;
  onRestore: (taskId: string) => void;
  onClearArchive: () => void;
}

const ArchiveModal = ({ isOpen, archivedTasks, onClose, onRestore, onClearArchive }: ArchiveModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-dashed border-bubble-text/30 bg-bubble-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-2xl">Archive</h2>
        <button onClick={onClose} className="rounded-full bg-bubble-sidebar px-3 py-1 text-xs">Close</button>
      </div>
      <div className="space-y-2">
        {archivedTasks.map((task) => (
          <div key={task.id} className="rounded-xl bg-bubble-sidebar p-2 text-sm">
            <p className="font-bold">{task.title}</p>
            <p className="text-xs opacity-80">Completed: {formatDisplayDate(task.updatedAt)}</p>
            <button onClick={() => onRestore(task.id)} className="mt-1 rounded-full bg-bubble-work px-2 py-1 text-xs">
              Restore to Not Started
            </button>
          </div>
        ))}
        {archivedTasks.length === 0 ? <p className="text-sm">Archive is empty.</p> : null}
      </div>
      <button onClick={onClearArchive} className="mt-3 rounded-full bg-bubble-home px-3 py-1 text-xs">Clear Archive</button>
    </section>
  );
};

export default ArchiveModal;
