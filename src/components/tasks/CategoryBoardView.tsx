import { CATEGORY_CONFIG, CATEGORY_ORDER } from '../../config/categories';
import type { Task, TaskStatus } from '../../types/task';
import TaskCard from './TaskCard';

interface CategoryBoardViewProps {
  tasksByCategory: Record<string, Task[]>;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onSetStatus: (taskId: string, status: TaskStatus) => void;
  onCompleteAndArchive: (taskId: string) => void;
  onCountComplete: (taskId: string) => void;
}

const CategoryBoardView = ({
  tasksByCategory,
  onEdit,
  onDelete,
  onSetStatus,
  onCompleteAndArchive,
  onCountComplete,
}: CategoryBoardViewProps) => {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {CATEGORY_ORDER.map((categoryKey) => {
        const category = CATEGORY_CONFIG[categoryKey];
        const tasks = tasksByCategory[categoryKey] ?? [];

        return (
          <div
            key={category.key}
            className={`rounded-2xl bg-cover bg-center bg-no-repeat p-3 shadow-soft ${category.key === "Other" ? "sm:col-span-2 xl:col-span-3" : ""}` }
            style={{ backgroundColor: category.pastelColor, backgroundImage: `url(${category.gifAssetPath})` }}
          >
            <div className="mb-3 flex items-center gap-2">
              <h3 className="font-heading text-2xl tracking-wide" style={{ color: category.textColor }}>
                {category.label}
              </h3>
            </div>
            <div className="space-y-3">
              {tasks.map((task) => (
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
              {tasks.length === 0 ? <p className="text-sm text-white">No tasks yet.</p> : null}
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default CategoryBoardView;
