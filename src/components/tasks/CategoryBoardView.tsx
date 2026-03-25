import { categoryMeta } from '../../data/categories';
import TaskCard from './TaskCard';
import type { Task } from '../../types/task';

const demoTask: Task = {
  id: 'placeholder',
  title: 'Placeholder task',
  category: 'Work',
  status: 'Not Started',
};

const CategoryBoardView = () => {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {categoryMeta.map((category) => (
        <div key={category.name} className={`rounded-2xl p-3 shadow-soft ${category.colorClass}`}>
          <div className="mb-3 flex items-center gap-2">
            <img src={category.icon} alt={`${category.name} icon`} className="h-6 w-6 rounded-full" />
            <h3 className="font-heading text-2xl">{category.name}</h3>
          </div>
          <TaskCard task={{ ...demoTask, category: category.name }} />
        </div>
      ))}
    </section>
  );
};

export default CategoryBoardView;
