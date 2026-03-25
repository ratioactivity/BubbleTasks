import CompletionSummary from './components/panels/CompletionSummary';
import DateTimeWeatherPanel from './components/panels/DateTimeWeatherPanel';
import InsightsFeed from './components/panels/InsightsFeed';
import LayoutToggle from './components/layout/LayoutToggle';
import FloatingLogo from './components/layout/FloatingLogo';
import CategoryBoardView from './components/tasks/CategoryBoardView';
import CategoryTabbedView from './components/tasks/CategoryTabbedView';
import ArchiveModal from './components/modals/ArchiveModal';
import BoredListModal from './components/modals/BoredListModal';

const App = () => {
  return (
    <div className="relative min-h-screen bg-bubble-base bg-stars/10 p-4 md:p-6">
      <div className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4 rounded-3xl bg-bubble-sidebar p-4 shadow-soft">
          <DateTimeWeatherPanel />
          <InsightsFeed />
          <CompletionSummary />
        </aside>

        <main className="space-y-4">
          <header className="rounded-3xl bg-bubble-surface p-4 shadow-soft">
            <h1 className="font-heading text-4xl">BubbleTasks</h1>
            <p className="text-sm opacity-80">Browser + Notion-embed friendly task organization scaffold.</p>
          </header>

          <CategoryBoardView />
          <CategoryTabbedView />
          <div className="grid gap-4 md:grid-cols-2">
            <ArchiveModal />
            <BoredListModal />
          </div>
        </main>
      </div>

      <LayoutToggle />
      <FloatingLogo />
    </div>
  );
};

export default App;
