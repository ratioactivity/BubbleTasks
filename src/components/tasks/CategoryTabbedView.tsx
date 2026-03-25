import { CATEGORY_CONFIG, CATEGORY_ORDER } from '../../config/categories';
import { DEV_SEEDED_TASKS } from '../../data/seeds';
import TaskCard from './TaskCard';

const activeCategory = CATEGORY_ORDER[0];

const CategoryTabbedView = () => {
  const taskForActiveCategory = DEV_SEEDED_TASKS.find((task) => task.category === activeCategory);

  return (
    <section className="rounded-2xl bg-bubble-surface p-4 shadow-soft">
      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORY_ORDER.map((categoryKey) => {
          const category = CATEGORY_CONFIG[categoryKey];

          return (
            <button
              key={category.key}
              className="rounded-full px-3 py-1 text-sm"
              style={{ backgroundColor: category.pastelColor, color: category.textColor }}
            >
              {category.label}
            </button>
          );
        })}
      </div>
      {taskForActiveCategory ? <TaskCard task={taskForActiveCategory} /> : <p className="text-sm">No tasks yet.</p>}
    </section>
  );
};

export default CategoryTabbedView;
