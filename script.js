window.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'bubbletasks_plain_v1';
  const categories = [
    { key: 'Work', color: 'var(--work)', icon: 'assets/green.gif' },
    { key: 'School', color: 'var(--school)', icon: 'assets/teal.gif' },
    { key: 'Business', color: 'var(--business)', icon: 'assets/blue.gif' },
    { key: 'Home', color: 'var(--home)', icon: 'assets/pink.gif' },
    { key: 'Personal', color: 'var(--personal)', icon: 'assets/orange.gif' },
    { key: 'Creative', color: 'var(--creative)', icon: 'assets/yellow.gif' },
    { key: 'Other', color: 'var(--other)', icon: 'assets/purple.gif' },
  ];

  const state = {
    tasks: [],
    archived: [],
    bored: [],
    completions: [],
    layout: 'columns',
    activeTab: 'Work',
  };

  const elements = {
    dateTimeCard: document.getElementById('dateTimeCard'),
    feedCard: document.getElementById('feedCard'),
    completionCard: document.getElementById('completionCard'),
    boardContainer: document.getElementById('boardContainer'),
    taskTitleInput: document.getElementById('taskTitleInput'),
    taskCategoryInput: document.getElementById('taskCategoryInput'),
    taskDueDateInput: document.getElementById('taskDueDateInput'),
    taskPriorityInput: document.getElementById('taskPriorityInput'),
    addTaskButton: document.getElementById('addTaskButton'),
    layoutToggleButton: document.getElementById('layoutToggleButton'),
    openArchiveButton: document.getElementById('openArchiveButton'),
    openBoredButton: document.getElementById('openBoredButton'),
    archiveModal: document.getElementById('archiveModal'),
    archiveList: document.getElementById('archiveList'),
    closeArchiveButton: document.getElementById('closeArchiveButton'),
    clearArchiveButton: document.getElementById('clearArchiveButton'),
    boredModal: document.getElementById('boredModal'),
    boredList: document.getElementById('boredList'),
    boredInput: document.getElementById('boredInput'),
    addBoredButton: document.getElementById('addBoredButton'),
    closeBoredButton: document.getElementById('closeBoredButton'),
  };

  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const load = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.assign(state, parsed);
    }
  };

  const nowISO = () => new Date().toISOString();
  const stars = (n) => (n ? '★'.repeat(n) : '');

  const sortedTasks = (tasks) => {
    return [...tasks].sort((a, b) => {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : null;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : null;
      if (da !== null && db !== null) {
        if (da !== db) return da - db;
        return (b.priority || 0) - (a.priority || 0);
      }
      if (da !== null) return -1;
      if (db !== null) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  };

  const renderDateTime = () => {
    const now = new Date();
    elements.dateTimeCard.innerHTML = `
      <h2>Now</h2>
      <p>${now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
      <p><strong>${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</strong></p>
      <p>No weather API configured yet.</p>
    `;
  };

  const renderFeed = () => {
    const now = Date.now();
    const in3 = now + 3 * 24 * 60 * 60 * 1000;
    const overdue = state.tasks.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < now);
    const soon = state.tasks.filter((t) => t.dueDate && new Date(t.dueDate).getTime() >= now && new Date(t.dueDate).getTime() <= in3);
    const stale = state.tasks.filter((t) => now - new Date(t.createdAt).getTime() > 7 * 24 * 60 * 60 * 1000 && t.status !== 'Complete');

    const list = (arr) => arr.slice(0, 3).map((t) => `<li>${t.title}</li>`).join('') || '<li>None</li>';
    elements.feedCard.innerHTML = `
      <h2>Feed</h2>
      <h4>Overdue</h4><ul>${list(overdue)}</ul>
      <h4>Due in 3 days</h4><ul>${list(soon)}</ul>
      <h4>Stale</h4><ul>${list(stale)}</ul>
    `;
  };

  const renderCompletion = () => {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime();

    const count = (from) => state.completions.filter((c) => new Date(c).getTime() >= from).length;
    elements.completionCard.innerHTML = `
      <h2>Wins</h2>
      <p>You've completed ${count(dayStart)} tasks today!</p>
      <p>You've completed ${count(weekStart.getTime())} tasks this week!</p>
      <p>Month: ${count(monthStart)} • Year: ${count(yearStart)}</p>
    `;
  };

  const taskCardHTML = (task) => {
    const due = task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : '&nbsp;';
    const priority = task.priority ? `Priority: ${stars(task.priority)}` : '&nbsp;';
    return `
      <article class="task-card" data-id="${task.id}">
        <strong>${task.title}</strong>
        <div>Status: ${task.status}</div>
        <div class="task-meta"><div>${due}</div><div>${priority}</div></div>
        <div class="task-actions">
          <button data-action="status" data-status="Not Started">Not Started</button>
          <button data-action="status" data-status="In Progress">In Progress</button>
          <button data-action="complete">Complete</button>
        </div>
      </article>
    `;
  };

  const renderBoard = () => {
    const grouped = Object.fromEntries(categories.map((c) => [c.key, []]));
    sortedTasks(state.tasks).forEach((t) => grouped[t.category].push(t));

    if (state.layout === 'columns') {
      elements.boardContainer.className = 'board columns';
      elements.boardContainer.innerHTML = categories
        .map(
          (c) => `
        <section class="category-column" style="background:${c.color}">
          <div class="category-title"><img src="${c.icon}" alt="${c.key}"><h3>${c.key}</h3></div>
          ${grouped[c.key].map(taskCardHTML).join('') || '<p>No tasks</p>'}
        </section>
      `,
        )
        .join('');
    } else {
      elements.boardContainer.className = 'board tabs';
      const active = categories.find((c) => c.key === state.activeTab) || categories[0];
      elements.boardContainer.innerHTML = `
        <div class="tab-buttons">
          ${categories.map((c) => `<button data-tab="${c.key}">${c.key}</button>`).join('')}
        </div>
        <section class="category-column" style="background:${active.color}">
          <div class="category-title"><img src="${active.icon}" alt="${active.key}"><h3>${active.key}</h3></div>
          ${grouped[active.key].map(taskCardHTML).join('') || '<p>No tasks</p>'}
        </section>
      `;
    }
  };

  const renderArchive = () => {
    elements.archiveList.innerHTML =
      state.archived
        .map(
          (task) => `
      <div class="task-card">
        <strong>${task.title}</strong>
        <div class="task-actions">
          <button data-archive-action="restore" data-id="${task.id}">Restore</button>
        </div>
      </div>
    `,
        )
        .join('') || '<p>Archive is empty.</p>';
  };

  const renderBored = () => {
    elements.boredList.innerHTML =
      state.bored
        .map(
          (item) => `
      <div class="task-card">
        <span>${item.title}</span>
        <button data-bored-remove="${item.id}">Remove</button>
      </div>
    `,
        )
        .join('') || '<p>No bored tasks yet.</p>';
  };

  const renderAll = () => {
    renderDateTime();
    renderFeed();
    renderCompletion();
    renderBoard();
    renderArchive();
    renderBored();
    save();
  };

  const addTask = () => {
    const title = elements.taskTitleInput.value.trim();
    if (!title) return;
    const priorityRaw = Number(elements.taskPriorityInput.value);
    state.tasks.push({
      id: crypto.randomUUID(),
      title,
      category: elements.taskCategoryInput.value,
      status: 'Not Started',
      dueDate: elements.taskDueDateInput.value || null,
      priority: Number.isFinite(priorityRaw) && priorityRaw >= 1 && priorityRaw <= 5 ? priorityRaw : null,
      createdAt: nowISO(),
    });
    elements.taskTitleInput.value = '';
    elements.taskDueDateInput.value = '';
    elements.taskPriorityInput.value = '';
    renderAll();
  };

  elements.taskCategoryInput.innerHTML = categories.map((c) => `<option>${c.key}</option>`).join('');

  elements.addTaskButton.addEventListener('click', addTask);
  elements.layoutToggleButton.addEventListener('click', () => {
    state.layout = state.layout === 'columns' ? 'tabs' : 'columns';
    renderAll();
  });

  elements.boardContainer.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const tab = target.dataset.tab;
    if (tab) {
      state.activeTab = tab;
      renderAll();
    }

    const card = target.closest('.task-card');
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;

    const action = target.dataset.action;
    if (action === 'status') {
      task.status = target.dataset.status;
    }
    if (action === 'complete') {
      task.status = 'Complete';
      state.archived.unshift(task);
      state.tasks = state.tasks.filter((t) => t.id !== id);
      state.completions.push(nowISO());
    }

    renderAll();
  });

  elements.openArchiveButton.addEventListener('click', () => elements.archiveModal.classList.remove('hidden'));
  elements.closeArchiveButton.addEventListener('click', () => elements.archiveModal.classList.add('hidden'));
  elements.clearArchiveButton.addEventListener('click', () => {
    if (window.confirm('Delete all archived tasks?')) {
      state.archived = [];
      renderAll();
    }
  });
  elements.archiveList.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const restoreId = target.dataset.archiveAction === 'restore' ? target.dataset.id : null;
    if (!restoreId) return;
    const task = state.archived.find((t) => t.id === restoreId);
    if (!task) return;
    task.status = 'Not Started';
    state.tasks.push(task);
    state.archived = state.archived.filter((t) => t.id !== restoreId);
    renderAll();
  });

  elements.openBoredButton.addEventListener('click', () => elements.boredModal.classList.remove('hidden'));
  elements.closeBoredButton.addEventListener('click', () => elements.boredModal.classList.add('hidden'));
  elements.addBoredButton.addEventListener('click', () => {
    const title = elements.boredInput.value.trim();
    if (!title) return;
    state.bored.push({ id: crypto.randomUUID(), title });
    elements.boredInput.value = '';
    renderAll();
  });
  elements.boredList.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.dataset.boredRemove;
    if (!id) return;
    state.bored = state.bored.filter((item) => item.id !== id);
    renderAll();
  });

  setInterval(renderDateTime, 1000 * 30);
  load();
  renderAll();
  console.log('✅ script validated');
});
