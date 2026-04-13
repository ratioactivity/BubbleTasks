import type { LayoutMode } from '../../types/task';

interface LayoutToggleProps {
  layoutMode: LayoutMode;
  onToggle: () => void;
}

const LayoutToggle = ({ layoutMode, onToggle }: LayoutToggleProps) => {
  const label = layoutMode === 'board' ? 'Switch to Tabs' : 'Switch to Board';

  return (
    <button onClick={onToggle} className="fixed bottom-4 right-24 rounded-full bg-bubble-business px-4 py-2 font-bold shadow-soft">
      {label}
    </button>
  );
};

export default LayoutToggle;
