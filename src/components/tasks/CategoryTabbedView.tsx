import { CATEGORY_CONFIG, CATEGORY_ORDER } from '../../config/categories';
import type { CategoryKey, Task, TaskStatus } from '../../types/task';
import TaskCard from './TaskCard';

interface CategoryTabbedViewProps {
  activeCategory: CategoryKey;
  tasksByCategory: Record<string, Task[]>;
  onSelectCategory: (category: CategoryKey) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onSetStatus: (taskId: string, status: TaskStatus) => void;
  onCompleteAndArchive: (taskId: string) => void;
  onCountComplete: (taskId: string) => void;
}

const CategoryTabbedView = ({
  activeCategory,
  tasksByCategory,
  onSelectCategory,
  onEdit,
  onDelete,
  onSetStatus,
  onCompleteAndArchive,
  onCountComplete,
}: CategoryTabbedViewProps) => {
  const activeTasks = tasksByCategory[activeCategory] ?? [];
  const activeCategoryConfig = CATEGORY_CONFIG[activeCategory];

  return (
    <section
      className="rounded-2xl bg-cover bg-center bg-no-repeat p-4 shadow-soft"
      style={{ backgroundColor: activeCategoryConfig.pastelColor, backgroundImage: `url(${activeCategoryConfig.gifAssetPath})` }}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORY_ORDER.map((categoryKey) => {
          const category = CATEGORY_CONFIG[categoryKey];

          return (
            <button
              key={category.key}
              onClick={() => onSelectCategory(categoryKey)}
              className="rounded-full px-3 py-1 text-sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.25)', color: '#ffffff' }}
            >
              {category.label}
            </button>
          );
        })}
      </div>
      <div className="space-y-3">
        {activeTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            onSetStatus={onSetStatus}
            onCompleteAndArchive={onCompleteAndArchive}
            onCountComplete={onCountComplete}
          />
        ))}
        {activeTasks.length === 0 ? <p className="text-sm text-white">No tasks yet.</p> : null}
      </div>
    </section>
  );
};

export default CategoryTabbedView;
