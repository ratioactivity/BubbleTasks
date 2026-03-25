import { CATEGORY_CONFIG, CATEGORY_ORDER } from '../../config/categories';
import { DEV_SEEDED_TASKS } from '../../data/seeds';
import TaskCard from './TaskCard';

const CategoryBoardView = () => {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CATEGORY_ORDER.map((categoryKey) => {
        const category = CATEGORY_CONFIG[categoryKey];
        const firstTaskInCategory = DEV_SEEDED_TASKS.find((task) => task.category === categoryKey);

        return (
          <div key={category.key} className="rounded-2xl p-3 shadow-soft" style={{ backgroundColor: category.pastelColor }}>
            <div className="mb-3 flex items-center gap-2">
              <img src={category.gifAssetPath} alt={`${category.label} icon`} className="h-6 w-6 rounded-full" />
              <h3 className="font-heading text-2xl" style={{ color: category.textColor }}>
                {category.label}
              </h3>
            </div>
            {firstTaskInCategory ? <TaskCard task={firstTaskInCategory} /> : <p className="text-sm">No tasks yet.</p>}
          </div>
        );
      })}
    </section>
  );
};

export default CategoryBoardView;
