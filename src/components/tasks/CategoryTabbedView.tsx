import { categoryMeta } from '../../data/categories';
import TaskCard from './TaskCard';

const CategoryTabbedView = () => {
  return (
    <section className="rounded-2xl bg-bubble-surface p-4 shadow-soft">
      <div className="mb-4 flex flex-wrap gap-2">
        {categoryMeta.map((category) => (
          <button key={category.name} className="rounded-full bg-bubble-sidebar px-3 py-1 text-sm">
            {category.name}
          </button>
        ))}
      </div>
      <TaskCard
        task={{
          id: 'tab-placeholder',
          title: 'Placeholder tabbed task',
          category: 'Home',
          status: 'Not Started',
        }}
      />
    </section>
  );
};

export default CategoryTabbedView;
