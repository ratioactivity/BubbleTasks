window.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'bubbletasks_plain_v1';
  const WEATHER_LOCATION_LABEL = 'Springfield, MO 65810';
  const WEATHER_LAT = 37.1375;
  const WEATHER_LON = -93.2982;
  const categories = [
    { key: 'Work', color: 'var(--work)', gif: 'assets/green.gif' },
    { key: 'School', color: 'var(--school)', gif: 'assets/teal.gif' },
    { key: 'Business', color: 'var(--business)', gif: 'assets/blue.gif' },
    { key: 'Home', color: 'var(--home)', gif: 'assets/pink.gif' },
    { key: 'Personal', color: 'var(--personal)', gif: 'assets/orange.gif' },
    { key: 'Creative', color: 'var(--creative)', gif: 'assets/yellow.gif' },
    { key: 'Other', color: 'var(--other)', gif: 'assets/purple.gif' },
  ];

  const state = {
    tasks: [],
    archived: [],
    bored: [],
    completions: [],
    layout: 'columns',
    activeTab: 'Work',
    weatherSummary: 'Loading weather...',
    boardVisibleByCategory: {},
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
    backupTasksButton: document.getElementById('backupTasksButton'),
    loadBackupButton: document.getElementById('loadBackupButton'),
    backupFileInput: document.getElementById('backupFileInput'),
    openArchiveButton: document.getElementById('openArchiveButton'),
    openBoredButton: document.getElementById('openBoredButton'),
    archiveModal: document.getElementById('archiveModal'),
    archiveList: document.getElementById('archiveList'),
    closeArchiveButton: document.getElementById('closeArchiveButton'),
    clearArchiveButton: document.getElementById('clearArchiveButton'),
    resetInsightsButton: document.getElementById('resetInsightsButton'),
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
    categories.forEach((category) => {
      if (!Number.isFinite(state.boardVisibleByCategory?.[category.key])) {
        state.boardVisibleByCategory[category.key] = 4;
      }
    });
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
      <p class="date-big">${now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
      <p class="time-big"><strong>${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</strong></p>
      <p>${WEATHER_LOCATION_LABEL}: ${state.weatherSummary}</p>
    `;
  };

  const updateWeather = async () => {
    const weatherApiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&current=temperature_2m,apparent_temperature,weather_code&temperature_unit=fahrenheit`;

    try {
      const response = await fetch(weatherApiUrl);
      const payload = await response.json();
      const currentWeather = payload.current;

      if (currentWeather && typeof currentWeather.temperature_2m === 'number') {
        state.weatherSummary = `${Math.round(currentWeather.temperature_2m)}°F (feels like ${Math.round(currentWeather.apparent_temperature)}°F)`;
      } else {
        state.weatherSummary = 'Weather unavailable';
      }
    } catch (error) {
      state.weatherSummary = 'Weather unavailable';
    }

    renderDateTime();
  };

  const renderFeed = () => {
    const now = Date.now();
    const in3 = now + 3 * 24 * 60 * 60 * 1000;
    const overdue = state.tasks.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < now);
    const soon = state.tasks.filter((t) => t.dueDate && new Date(t.dueDate).getTime() >= now && new Date(t.dueDate).getTime() <= in3);
    const stale = state.tasks.filter((t) => now - new Date(t.createdAt).getTime() > 30 * 24 * 60 * 60 * 1000 && t.status !== 'Complete');

    const list = (arr) => arr.map((t) => `<li>${t.title}</li>`).join('') || '<li>None</li>';
    elements.feedCard.innerHTML = `
      <h2>Feed</h2>
      <h4>Overdue</h4><ul>${list(overdue)}</ul>
      <h4>Due in 3 days</h4><ul>${list(soon)}</ul>
      <h4>Stale for 1 month</h4><ul>${list(stale)}</ul>
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
        <div class="task-edit-actions">
          <button data-action="edit">Edit</button>
          <button data-action="delete">Delete</button>
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
        <section class="category-column" style="background-color:${c.color}; background-image:url(${c.gif}); ${c.key === 'Other' ? 'grid-column: 1 / -1;' : ''}">
          <div class="category-title"><h3>${c.key}</h3></div>
          ${grouped[c.key].slice(0, state.boardVisibleByCategory[c.key]).map(taskCardHTML).join('') || '<p>No tasks</p>'}
          <div class="column-expand-controls">
            ${
              grouped[c.key].length > state.boardVisibleByCategory[c.key]
                ? `<button class="load-more-button" data-action="load-more" data-category="${c.key}">Load more</button>`
                : ''
            }
            ${
              state.boardVisibleByCategory[c.key] > 4
                ? `<button class="load-more-button" data-action="collapse-more" data-category="${c.key}">Collapse</button>`
                : ''
            }
          </div>
        </section>
      `,
        )
        .join('');
    } else {
      elements.boardContainer.className = 'board tabs';
      const active = categories.find((c) => c.key === state.activeTab) || categories[0];
      elements.boardContainer.innerHTML = `
        <div class="tab-buttons">
          ${categories
            .map(
              (c) =>
                `<button class="${c.key === active.key ? 'is-active' : ''}" style="background-color:${c.color};" data-tab="${c.key}">${c.key}</button>`,
            )
            .join('')}
        </div>
        <section class="category-column" style="background-color:${active.color}; background-image:url(${active.gif});">
          <div class="category-title"><h3>${active.key}</h3></div>
          ${grouped[active.key].map(taskCardHTML).join('') || '<p>No tasks</p>'}
        </section>
      `;
      elements.taskCategoryInput.value = active.key;
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
        <div class="task-actions">
          <button data-bored-did="${item.id}">Did Today</button>
          <button data-bored-remove="${item.id}">Remove</button>
        </div>
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

  const backupTasksToDevice = () => {
    const backupPayload = {
      exportedAt: nowISO(),
      taskCount: state.tasks.length,
      tasks: state.tasks,
      archived: state.archived,
      bored: state.bored,
      completions: state.completions,
      layout: state.layout,
      activeTab: state.activeTab,
    };

    const backupBlob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
    const backupUrl = URL.createObjectURL(backupBlob);
    const backupLink = document.createElement('a');
    const safeDate = new Date().toISOString().replace(/[:.]/g, '-');
    backupLink.href = backupUrl;
    backupLink.download = `bubbletasks-backup-${safeDate}.json`;
    document.body.appendChild(backupLink);
    backupLink.click();
    document.body.removeChild(backupLink);
    URL.revokeObjectURL(backupUrl);
  };

  const loadTasksFromBackup = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    try {
      const fileText = await selectedFile.text();
      const parsed = JSON.parse(fileText);
      const restoredTasks = Array.isArray(parsed) ? parsed : parsed.tasks;
      const safeTasks = Array.isArray(restoredTasks) ? restoredTasks : [];
      const safeArchived = Array.isArray(parsed?.archived) ? parsed.archived : [];
      const safeBored = Array.isArray(parsed?.bored) ? parsed.bored : [];
      const safeCompletions = Array.isArray(parsed?.completions) ? parsed.completions : [];

      state.tasks = safeTasks.map((task) => ({
        id: task.id || crypto.randomUUID(),
        title: task.title || 'Untitled Task',
        category: categories.some((c) => c.key === task.category) ? task.category : 'Other',
        status: task.status || 'Not Started',
        dueDate: task.dueDate || null,
        priority: Number.isFinite(task.priority) ? task.priority : null,
        createdAt: task.createdAt || nowISO(),
      }));
      state.archived = safeArchived.map((task) => ({
        id: task.id || crypto.randomUUID(),
        title: task.title || 'Untitled Task',
        category: categories.some((c) => c.key === task.category) ? task.category : 'Other',
        status: 'Complete',
        dueDate: task.dueDate || null,
        priority: Number.isFinite(task.priority) ? task.priority : null,
        createdAt: task.createdAt || nowISO(),
      }));
      state.bored = safeBored.map((item) => ({
        id: item.id || crypto.randomUUID(),
        title: item.title || 'Untitled Bored Task',
      }));
      state.completions = safeCompletions.filter((value) => Number.isFinite(new Date(value).getTime()));
      if (parsed?.layout === 'columns' || parsed?.layout === 'tabs') {
        state.layout = parsed.layout;
      }
      if (categories.some((c) => c.key === parsed?.activeTab)) {
        state.activeTab = parsed.activeTab;
      }
    } catch (error) {
      window.alert('Invalid backup file format. Please select a BubbleTasks backup JSON file.');
    }

    event.target.value = '';
    renderAll();
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
    if (state.layout === 'tabs') {
      elements.taskCategoryInput.value = state.activeTab;
    }
    renderAll();
  });
  elements.backupTasksButton.addEventListener('click', backupTasksToDevice);
  elements.loadBackupButton.addEventListener('click', () => elements.backupFileInput.click());
  elements.backupFileInput.addEventListener('change', loadTasksFromBackup);

  elements.boardContainer.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const tab = target.dataset.tab;
    if (tab) {
      state.activeTab = tab;
      elements.taskCategoryInput.value = tab;
      renderAll();
    }

    const loadMoreCategory = target.dataset.action === 'load-more' ? target.dataset.category : null;
    if (loadMoreCategory && categories.some((c) => c.key === loadMoreCategory)) {
      state.boardVisibleByCategory[loadMoreCategory] = (state.boardVisibleByCategory[loadMoreCategory] || 4) + 4;
      renderAll();
    }

    const collapseCategory = target.dataset.action === 'collapse-more' ? target.dataset.category : null;
    if (collapseCategory && categories.some((c) => c.key === collapseCategory)) {
      state.boardVisibleByCategory[collapseCategory] = 4;
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
    if (action === 'edit') {
      const nextTitle = window.prompt('Edit task title:', task.title);
      if (nextTitle !== null) {
        const trimmedTitle = nextTitle.trim();
        if (trimmedTitle) {
          task.title = trimmedTitle;
        }
      }

      const categoryList = categories.map((c) => c.key).join(', ');
      const nextCategory = window.prompt(`Edit category (${categoryList}):`, task.category);
      if (nextCategory !== null) {
        const normalizedCategory = categories.find(
          (category) => category.key.toLowerCase() === nextCategory.trim().toLowerCase(),
        );
        if (normalizedCategory) {
          task.category = normalizedCategory.key;
        }
      }
    }
    if (action === 'delete') {
      if (window.confirm('Delete this task?')) {
        state.tasks = state.tasks.filter((t) => t.id !== id);
      }
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

  elements.resetInsightsButton.addEventListener('click', () => {
    if (window.confirm('Reset all completion insights to zero?')) {
      state.completions = [];
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
    const completedBoredId = target.dataset.boredDid;
    if (completedBoredId) {
      state.completions.push(nowISO());
      renderAll();
    }
    if (!id) return;
    state.bored = state.bored.filter((item) => item.id !== id);
    renderAll();
  });

  setInterval(renderDateTime, 1000 * 30);
  setInterval(updateWeather, 1000 * 60 * 15);
  load();
  updateWeather();
  renderAll();
  console.log('✅ script validated');
});
