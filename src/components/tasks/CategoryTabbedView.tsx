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
      <div className="mb-4 flex flex-nowrap gap-2 max-[980px]:flex-wrap">
        {CATEGORY_ORDER.map((categoryKey) => {
          const category = CATEGORY_CONFIG[categoryKey];
          const isActive = categoryKey === activeCategory;

          return (
            <button
              key={category.key}
              onClick={() => onSelectCategory(categoryKey)}
              className={`min-w-0 flex-1 rounded-full border px-2 py-1 text-xs font-bold transition hover:brightness-105 ${
                isActive ? 'shadow-soft' : ''
              }`}
              style={{
                backgroundColor: isActive ? 'rgba(255,255,255,0.82)' : 'rgba(157,138,224,0.45)',
                borderColor: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.72)',
                color: isActive ? '#6b4cb1' : '#ffffff',
              }}
              aria-pressed={isActive}
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
