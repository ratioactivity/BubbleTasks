import { useState } from 'react';
import type { BoredTask } from '../../types/task';
import Modal from '../common/Modal';

interface BoredListModalProps {
  isOpen: boolean;
  boredTasks: BoredTask[];
  onClose: () => void;
  onAdd: (title: string) => void;
  onRemove: (taskId: string) => void;
}

const BoredListModal = ({ isOpen, boredTasks, onClose, onAdd, onRemove }: BoredListModalProps) => {
  const [title, setTitle] = useState('');

  return (
    <Modal isOpen={isOpen} titleId="bored-title" onClose={onClose}>
      <section className="mx-auto max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/70 bg-bubble-surface p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="bored-title" className="font-heading text-3xl">If I&apos;m Bored...</h2>
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
    </Modal>
  );
};

export default BoredListModal;
