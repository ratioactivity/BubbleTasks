import { useMemo, useState } from 'react';
import CompletionSummary from './components/panels/CompletionSummary';
import DateTimeWeatherPanel from './components/panels/DateTimeWeatherPanel';
import InsightsFeed from './components/panels/InsightsFeed';
import DailyInsightPanel from './components/panels/DailyInsightPanel';
import LayoutToggle from './components/layout/LayoutToggle';
import FloatingLogo from './components/layout/FloatingLogo';
import CategoryBoardView from './components/tasks/CategoryBoardView';
import CategoryTabbedView from './components/tasks/CategoryTabbedView';
import ArchiveModal from './components/modals/ArchiveModal';
import BoredListModal from './components/modals/BoredListModal';
import ConfirmDialog from './components/common/ConfirmDialog';
import { CATEGORY_ORDER } from './config/categories';
import { useBubbleTasksState } from './hooks/useBubbleTasksState';
import { useSidebarIntelligence } from './hooks/useSidebarIntelligence';
import type { CategoryKey, Task } from './types/task';

const App = () => {
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<CategoryKey>(CATEGORY_ORDER[0]);
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [boredOpen, setBoredOpen] = useState(false);
  const [confirmClearArchiveOpen, setConfirmClearArchiveOpen] = useState(false);
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<string | null>(null);

  const {
    repositoryMode,
    isHydrated,
    persistenceError,
    tasks,
    tasksByCategory,
    archivedTasks,
    boredTasks,
    completionSummary,
    layoutMode,
    activeCategory,
    addTask,
    updateTask,
    deleteTask,
    setTaskStatus,
    completeAndArchiveTask,
    countAsCompletedKeepVisible,
    restoreArchivedTask,
    clearArchive,
    addBoredTask,
    removeBoredTask,
    setLayoutMode,
    setActiveCategory,
  } = useBubbleTasksState();


  const { weather, todayHoliday, upcomingHoliday, encouragingMessage } = useSidebarIntelligence();
  const overdueTasks = useMemo(() => {
    const now = Date.now();

    return tasks.filter((task: Task) => {
      if (!task.dueDate) {
        return false;
      }

      return new Date(task.dueDate).getTime() < now;
    });
  }, [tasks]);

  const dueInThreeDays = useMemo(() => {
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;

    return tasks.filter((task: Task) => {
      if (!task.dueDate) {
        return false;
      }

      const due = new Date(task.dueDate).getTime();
      return due >= now && due - now <= threeDays;
    });
  }, [tasks]);

  const staleTasks = useMemo(() => {
    const staleCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return tasks.filter((task: Task) => new Date(task.createdAt).getTime() < staleCutoff);
  }, [tasks]);

  const handleAddTask = () => {
    if (!newTitle.trim()) {
      return;
    }

    const parsedPriority = Number(newPriority);
    const hasPriority = Number.isInteger(parsedPriority) && parsedPriority >= 1 && parsedPriority <= 5;

    addTask({
      title: newTitle,
      category: newCategory,
      dueDate: newDueDate || undefined,
      priority: hasPriority ? (parsedPriority as 1 | 2 | 3 | 4 | 5) : undefined,
    });

    setNewTitle('');
    setNewDueDate('');
    setNewPriority('');
  };

  const handleEditTask = (taskId: string) => {
    const existing = tasks.find((task) => task.id === taskId);

    if (!existing) {
      return;
    }

    const title = window.prompt('Edit task title', existing.title);

    if (!title) {
      return;
    }

    updateTask(taskId, { title });
  };

  const toggleLayout = () => {
    setLayoutMode(layoutMode === 'board' ? 'tabbed' : 'board');
  };

  const handleClearArchive = () => {
    clearArchive();
    setConfirmClearArchiveOpen(false);
  };

  const handleDeleteTask = () => {
    if (!pendingDeleteTaskId) {
      return;
    }

    deleteTask(pendingDeleteTaskId);
    setPendingDeleteTaskId(null);
  };

  return (
    <div className="relative min-h-screen bg-bubble-base p-2 sm:p-4 md:p-6">
      <img src="/assets/stars.gif" alt="decorative stars" className="pointer-events-none absolute left-2 top-10 hidden h-36 opacity-15 lg:block" />
      <div className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4 rounded-3xl bg-bubble-sidebar/90 p-4 shadow-soft">
          <DateTimeWeatherPanel weather={weather} />
          <InsightsFeed overdue={overdueTasks} dueInThreeDays={dueInThreeDays} stale={staleTasks} />
          <DailyInsightPanel
            encouragingMessage={encouragingMessage}
            todayHoliday={todayHoliday}
            upcomingHoliday={upcomingHoliday}
          />
          <CompletionSummary
            today={completionSummary.today}
            week={completionSummary.week}
            month={completionSummary.month}
            year={completionSummary.year}
          />
        </aside>

        <main className="space-y-4">
          <header className="rounded-3xl bg-bubble-surface p-4 shadow-soft">
            <div className="flex items-center justify-between gap-2">
              <h1 className="font-heading text-4xl">BubbleTasks</h1>
              <img src="/assets/singlestar3.gif" alt="decorative star" className="h-5 w-5" />
            </div>
            <p className="text-sm opacity-80">Persistence mode: {repositoryMode === 'supabase' ? 'Supabase' : 'Local fallback'}</p>
            {isHydrated ? null : <p className="text-xs opacity-70">Loading saved data...</p>}
            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto]">
              <input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Task title"
                className="rounded-lg border border-bubble-text/20 px-3 py-2 text-sm"
              />
              <select
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value as CategoryKey)}
                className="rounded-lg border border-bubble-text/20 px-3 py-2 text-sm"
              >
                {CATEGORY_ORDER.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={newDueDate}
                onChange={(event) => setNewDueDate(event.target.value)}
                className="rounded-lg border border-bubble-text/20 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={1}
                max={5}
                value={newPriority}
                onChange={(event) => setNewPriority(event.target.value)}
                placeholder="Priority"
                className="rounded-lg border border-bubble-text/20 px-3 py-2 text-sm"
              />
              <button onClick={handleAddTask} className="rounded-lg bg-bubble-business px-4 py-2 text-sm font-bold">
                Add Task
              </button>
            </div>
            {persistenceError ? <p className="mt-2 rounded-lg bg-bubble-home px-2 py-1 text-xs">{persistenceError}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setArchiveOpen(true)} className="rounded-full bg-bubble-home px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-bubble-text/40">
                Archive ({archivedTasks.length})
              </button>
              <button onClick={() => setBoredOpen(true)} className="rounded-full bg-bubble-creative px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-bubble-text/40">
                Bored List ({boredTasks.length})
              </button>
            </div>
          </header>

          {layoutMode === 'board' ? (
            <CategoryBoardView
              tasksByCategory={tasksByCategory}
              onEdit={handleEditTask}
              onDelete={setPendingDeleteTaskId}
              onSetStatus={setTaskStatus}
              onCompleteAndArchive={completeAndArchiveTask}
              onCountComplete={countAsCompletedKeepVisible}
            />
          ) : (
            <CategoryTabbedView
              activeCategory={activeCategory}
              tasksByCategory={tasksByCategory}
              onSelectCategory={setActiveCategory}
              onEdit={handleEditTask}
              onDelete={setPendingDeleteTaskId}
              onSetStatus={setTaskStatus}
              onCompleteAndArchive={completeAndArchiveTask}
              onCountComplete={countAsCompletedKeepVisible}
            />
          )}
        </main>
      </div>

      <ArchiveModal
        isOpen={archiveOpen}
        archivedTasks={archivedTasks}
        onClose={() => setArchiveOpen(false)}
        onRestore={restoreArchivedTask}
        onClearArchive={() => setConfirmClearArchiveOpen(true)}
      />
      <BoredListModal
        isOpen={boredOpen}
        boredTasks={boredTasks}
        onClose={() => setBoredOpen(false)}
        onAdd={addBoredTask}
        onRemove={removeBoredTask}
      />


      <ConfirmDialog
        isOpen={confirmClearArchiveOpen}
        title="Clear archive?"
        message="This will permanently remove all archived tasks."
        confirmLabel="Clear"
        onCancel={() => setConfirmClearArchiveOpen(false)}
        onConfirm={handleClearArchive}
      />
      <ConfirmDialog
        isOpen={Boolean(pendingDeleteTaskId)}
        title="Delete task?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setPendingDeleteTaskId(null)}
        onConfirm={handleDeleteTask}
      />
      <LayoutToggle layoutMode={layoutMode} onToggle={toggleLayout} />
      <FloatingLogo />
    </div>
  );
};

export default App;
