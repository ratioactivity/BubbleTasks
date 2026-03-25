import { useState } from 'react';
import type { BoredTask } from '../../types/task';

interface BoredListModalProps {
  isOpen: boolean;
  boredTasks: BoredTask[];
  onClose: () => void;
  onAdd: (title: string) => void;
  onRemove: (taskId: string) => void;
}

const BoredListModal = ({ isOpen, boredTasks, onClose, onAdd, onRemove }: BoredListModalProps) => {
  const [title, setTitle] = useState('');

  if (!isOpen) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-dashed border-bubble-text/30 bg-bubble-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-2xl">Bored List</h2>
        <button onClick={onClose} className="rounded-full bg-bubble-sidebar px-3 py-1 text-xs">Close</button>
      </div>
      <div className="mb-3 flex gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add quick task"
          className="w-full rounded-lg border border-bubble-text/20 px-2 py-1 text-sm"
        />
        <button
          onClick={() => {
            onAdd(title);
            setTitle('');
          }}
          className="rounded-full bg-bubble-business px-3 py-1 text-xs"
        >
          Add
        </button>
      </div>
      <div className="space-y-2">
        {boredTasks.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-xl bg-bubble-sidebar p-2 text-sm">
            <span>{item.title}</span>
            <button onClick={() => onRemove(item.id)} className="rounded-full bg-bubble-home px-2 py-1 text-xs">Remove</button>
          </div>
        ))}
        {boredTasks.length === 0 ? <p className="text-sm">No bored-list tasks yet.</p> : null}
      </div>
    </section>
  );
};

export default BoredListModal;
