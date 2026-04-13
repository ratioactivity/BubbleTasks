const FloatingLogo = () => {
  return (
    <a
      href="https://github.com/ratioactivity"
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-4 right-4 rounded-full bg-bubble-surface p-2 shadow-soft"
      aria-label="Open ratioactivity GitHub"
    >
      <img src="/assets/icon128.png" alt="BubbleTasks logo" className="h-10 w-10 rounded-full" />
    </a>
  );
};

export default FloatingLogo;
