import { formatDisplayDate } from '../../utils/format';
import type { Task } from '../../types/task';
import Modal from '../common/Modal';

interface ArchiveModalProps {
  isOpen: boolean;
  archivedTasks: Task[];
  onClose: () => void;
  onRestore: (taskId: string) => void;
  onClearArchive: () => void;
}

const ArchiveModal = ({ isOpen, archivedTasks, onClose, onRestore, onClearArchive }: ArchiveModalProps) => {
  return (
    <Modal isOpen={isOpen} titleId="archive-title" onClose={onClose}>
      <section className="mx-auto max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/70 bg-bubble-surface p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="archive-title" className="font-heading text-3xl">Archive</h2>
          <button onClick={onClose} className="rounded-full bg-bubble-sidebar px-3 py-1 text-xs">Close</button>
        </div>
        <div className="space-y-2">
          {archivedTasks.map((task) => (
            <div key={task.id} className="rounded-xl bg-bubble-sidebar p-3 text-sm">
              <p className="font-bold">{task.title}</p>
              <p className="text-xs opacity-80">Completed: {formatDisplayDate(task.updatedAt)}</p>
              <button onClick={() => onRestore(task.id)} className="mt-2 rounded-full bg-bubble-work px-2 py-1 text-xs">
                Restore to Not Started
              </button>
            </div>
          ))}
          {archivedTasks.length === 0 ? <p className="text-sm">Archive is empty.</p> : null}
        </div>
        <button onClick={onClearArchive} className="mt-3 rounded-full bg-bubble-home px-3 py-1 text-xs">Clear Archive</button>
      </section>
    </Modal>
  );
};

export default ArchiveModal;
