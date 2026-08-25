window.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'bubbletasks_plain_v1';
  const WEATHER_LOCATION_LABEL = 'Springfield, MO 65810';
  const WEATHER_LAT = 37.1375;
  const WEATHER_LON = -93.2982;
  const categories = [
    { key: 'Work', color: 'var(--work)', gif: 'assets/green.gif' },
    { key: 'X', color: 'var(--school)', gif: 'assets/teal.gif' },
    { key: 'Business', color: 'var(--business)', gif: 'assets/blue.gif' },
    { key: 'Home', color: 'var(--home)', gif: 'assets/pink.gif' },
    { key: 'Personal', color: 'var(--personal)', gif: 'assets/orange.gif' },
    { key: 'Creative', color: 'var(--creative)', gif: 'assets/yellow.gif' },
    { key: 'Other', color: 'var(--other)', gif: 'assets/purple.gif' },
  ];
  const categoryByWeekday = ['Home', 'Personal', 'Work', 'X', 'Business', 'Creative', 'Other'];

  const agendaDefaults = ['Update daily tasks', 'Track previous day'];

  const state = {
    tasks: [],
    archived: [],
    bored: [],
    completions: [],
    layout: 'columns',
    activeTab: 'Work',
    weatherSummary: 'Loading weather...',
    boardVisibleByCategory: {},
    agenda: {
      dateKey: '',
      items: [],
      previousDayItems: [],
    },
  };

  const elements = {
    dateTimeCard: document.getElementById('dateTimeCard'),
    feedCard: document.getElementById('feedCard'),
    completionCard: document.getElementById('completionCard'),
    agendaCard: document.getElementById('agendaCard'),
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
  const normalizeCategoryKey = (categoryKey) => {
    if (categoryKey === 'School') return 'X';
    return categories.some((category) => category.key === categoryKey) ? categoryKey : 'Other';
  };
  const load = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.assign(state, parsed);
      state.tasks = (state.tasks || []).map((task) => ({ ...task, category: normalizeCategoryKey(task.category) }));
      state.archived = (state.archived || []).map((task) => ({ ...task, category: normalizeCategoryKey(task.category) }));
    }
    ensureAgendaForToday();
    categories.forEach((category) => {
      if (!Number.isFinite(state.boardVisibleByCategory?.[category.key])) {
        state.boardVisibleByCategory[category.key] = 4;
      }
    });
  };

  const nowISO = () => new Date().toISOString();
  const stars = (n) => (n ? '★'.repeat(n) : '');
  const todayKey = () => new Date().toISOString().slice(0, 10);
  const parseLocalDate = (isoDate) => {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const normalizeAgendaItem = (item, fallbackTitle) => ({
    id: item?.id || crypto.randomUUID(),
    title: (item?.title || fallbackTitle || 'Untitled Agenda Task').trim(),
    completed: Boolean(item?.completed),
    isDefault: Boolean(item?.isDefault),
  });

  const buildDefaultAgendaItems = () =>
    agendaDefaults.map((title) => ({ id: crypto.randomUUID(), title, completed: false, isDefault: true }));

  const ensureAgendaForToday = () => {
    const today = todayKey();
    const hasAgendaObject = state.agenda && typeof state.agenda === 'object';
    if (!hasAgendaObject) {
      state.agenda = { dateKey: today, items: buildDefaultAgendaItems(), previousDayItems: [] };
    }

    if (!Array.isArray(state.agenda.items)) {
      state.agenda.items = buildDefaultAgendaItems();
    } else {
      const customItems = state.agenda.items.filter((item) => !item?.isDefault).map((item) => normalizeAgendaItem(item));
      const existingDefaults = new Map(
        state.agenda.items.filter((item) => item?.isDefault).map((item) => [item.title, normalizeAgendaItem(item)]),
      );
      if (!existingDefaults.has('Update daily tasks') && existingDefaults.has('Add daily tasks')) {
        existingDefaults.set('Update daily tasks', {
          ...existingDefaults.get('Add daily tasks'),
          title: 'Update daily tasks',
        });
      }
      state.agenda.items = [
        ...agendaDefaults.map(
          (title) => existingDefaults.get(title) || { id: crypto.randomUUID(), title, completed: false, isDefault: true },
        ),
        ...customItems,
      ];
    }

    if (!Array.isArray(state.agenda.previousDayItems)) {
      state.agenda.previousDayItems = [];
    } else {
      state.agenda.previousDayItems = state.agenda.previousDayItems.map((item) => normalizeAgendaItem(item));
    }

    if (!state.agenda.dateKey) {
      state.agenda.dateKey = today;
    }

    if (state.agenda.dateKey !== today) {
      state.agenda.previousDayItems = state.agenda.items.map((item) => ({ ...item, completed: false }));
      state.agenda.items = buildDefaultAgendaItems();
      state.agenda.dateKey = today;
    }
  };

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

  const formatDayLabel = (isoDate) => {
    if (!isoDate) return 'No Due Date';
    const parsedDate = parseLocalDate(isoDate);
    if (Number.isNaN(parsedDate.getTime())) return 'No Due Date';
    return parsedDate.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
  };

  const categoryForDay = (dayKey) => {
    if (dayKey === 'no-due-date') return categories.find((category) => category.key === 'Other');

    const weekday = parseLocalDate(dayKey).getDay();
    const categoryKey = categoryByWeekday[weekday] || 'Other';
    return categories.find((category) => category.key === categoryKey);
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
    const due = task.dueDate ? `Due: ${parseLocalDate(task.dueDate).toLocaleDateString()}` : '&nbsp;';
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

      const renderCategorySection = (category) => `
        <section class="category-column" style="background-color:${category.color}; background-image:url(${category.gif});">
          <div class="category-title"><h3>${category.key}</h3></div>
          ${grouped[category.key].slice(0, state.boardVisibleByCategory[category.key]).map(taskCardHTML).join('') || '<p>No tasks</p>'}
          <div class="column-expand-controls">
            ${
              grouped[category.key].length > state.boardVisibleByCategory[category.key]
                ? `<button class="load-more-button" data-action="load-more" data-category="${category.key}">Load more</button>`
                : ''
            }
            ${
              state.boardVisibleByCategory[category.key] > 4
                ? `<button class="load-more-button" data-action="collapse-more" data-category="${category.key}">Collapse</button>`
                : ''
            }
          </div>
        </section>
      `;

      const columnBuckets = [[], [], []];
      const columnHeights = [0, 0, 0];
      categories.forEach((category) => {
        const estimatedHeight = Math.max(1, Math.min(state.boardVisibleByCategory[category.key], grouped[category.key].length)) + 1;
        let targetColumn = 0;
        if (columnHeights[1] < columnHeights[targetColumn]) targetColumn = 1;
        if (columnHeights[2] < columnHeights[targetColumn]) targetColumn = 2;
        columnBuckets[targetColumn].push(renderCategorySection(category));
        columnHeights[targetColumn] += estimatedHeight;
      });

      elements.boardContainer.innerHTML = columnBuckets
        .map(
          (bucket) => `
        <div class="board-column-stack">
          ${bucket.join('')}
        </div>
      `,
        )
        .join('');
    } else if (state.layout === 'tabs') {
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
    } else {
      elements.boardContainer.className = 'board day';
      const dayGroups = {};
      sortedTasks(state.tasks).forEach((task) => {
        const dayKey = task.dueDate || 'no-due-date';
        if (!dayGroups[dayKey]) {
          dayGroups[dayKey] = [];
        }
        dayGroups[dayKey].push(task);
      });

      const orderedDayKeys = Object.keys(dayGroups).sort((a, b) => {
        if (a === 'no-due-date') return 1;
        if (b === 'no-due-date') return -1;
        return new Date(a).getTime() - new Date(b).getTime();
      });

      elements.boardContainer.innerHTML = orderedDayKeys
        .map((dayKey) => {
          const label = dayKey === 'no-due-date' ? 'No Due Date' : formatDayLabel(dayKey);
          const dayCategory = categoryForDay(dayKey);
          return `
            <section class="category-column day-column" data-day-category="${dayCategory.key}" style="background-color:${dayCategory.color}; background-image:url(${dayCategory.gif});">
              <div class="category-title"><h3>${label}</h3></div>
              ${dayGroups[dayKey].map(taskCardHTML).join('') || '<p>No tasks</p>'}
            </section>
          `;
        })
        .join('');
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

  const renderAgenda = () => {
    ensureAgendaForToday();
    const agendaItems = state.agenda.items;
    const completedCount = agendaItems.filter((item) => item.completed).length;
    const progressPercent = agendaItems.length > 0 ? Math.round((completedCount / agendaItems.length) * 100) : 0;

    elements.agendaCard.innerHTML = `
      <h2>Today's Agenda</h2>
      <p class="agenda-progress">Progress: ${progressPercent}% (${completedCount}/${agendaItems.length})</p>
      <div class="agenda-progress-track" aria-hidden="true">
        <div class="agenda-progress-fill" style="width:${progressPercent}%;"></div>
      </div>
      <div class="agenda-add-row">
        <input id="agendaAddInput" type="text" placeholder="Add agenda task" />
        <button id="agendaAddButton" type="button">Add</button>
      </div>
      <div class="agenda-restore-row">
        <button id="restoreYesterdayAgendaButton" type="button">Bring back yesterday's tasks</button>
      </div>
      <ul class="agenda-list">
        ${
          agendaItems
            .map(
              (item) => `
          <li>
            <label class="agenda-item ${item.completed ? 'is-done' : ''}">
              <input type="checkbox" data-agenda-action="toggle" data-id="${item.id}" ${item.completed ? 'checked' : ''} />
              <span>${item.title}</span>
            </label>
            ${item.isDefault ? '' : `<button type="button" data-agenda-action="remove" data-id="${item.id}">Remove</button>`}
          </li>
        `,
            )
            .join('') || '<li>No agenda items yet.</li>'
        }
      </ul>
    `;
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
    renderAgenda();
    renderBoard();
    renderArchive();
    renderBored();
    elements.layoutToggleButton.textContent = `Layout: ${state.layout}`;
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
        category: normalizeCategoryKey(task.category),
        status: task.status || 'Not Started',
        dueDate: task.dueDate || null,
        priority: Number.isFinite(task.priority) ? task.priority : null,
        createdAt: task.createdAt || nowISO(),
      }));
      state.archived = safeArchived.map((task) => ({
        id: task.id || crypto.randomUUID(),
        title: task.title || 'Untitled Task',
        category: normalizeCategoryKey(task.category),
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
      if (parsed?.layout === 'columns' || parsed?.layout === 'tabs' || parsed?.layout === 'day') {
        state.layout = parsed.layout;
      }
      state.activeTab = normalizeCategoryKey(parsed?.activeTab);
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
    const layoutOrder = ['columns', 'tabs', 'day'];
    const currentIndex = layoutOrder.indexOf(state.layout);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % layoutOrder.length;
    state.layout = layoutOrder[nextIndex];
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

  elements.agendaCard.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.id === 'agendaAddButton') {
      const agendaInput = elements.agendaCard.querySelector('#agendaAddInput');
      if (!(agendaInput instanceof HTMLInputElement)) {
        renderAll();
      }
      if (agendaInput instanceof HTMLInputElement) {
        const title = agendaInput.value.trim();
        if (title) {
          state.agenda.items.push({
            id: crypto.randomUUID(),
            title,
            completed: false,
            isDefault: false,
          });
          agendaInput.value = '';
          renderAll();
        }
      }
    }

    if (target.id === 'restoreYesterdayAgendaButton') {
      const existingTitles = new Set(state.agenda.items.map((item) => item.title.toLowerCase()));
      state.agenda.previousDayItems.forEach((item) => {
        if (!existingTitles.has(item.title.toLowerCase())) {
          state.agenda.items.push({
            id: crypto.randomUUID(),
            title: item.title,
            completed: false,
            isDefault: false,
          });
        }
      });
      renderAll();
    }

    const action = target.dataset.agendaAction;
    const itemId = target.dataset.id;
    if (!action || !itemId) return;
    const agendaItem = state.agenda.items.find((item) => item.id === itemId);
    if (!agendaItem) return;

    if (action === 'toggle') {
      agendaItem.completed = !agendaItem.completed;
    }
    if (action === 'remove' && !agendaItem.isDefault) {
      state.agenda.items = state.agenda.items.filter((item) => item.id !== itemId);
    }

    renderAll();
  });

  elements.agendaCard.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (event.key !== 'Enter') return;
    if (target.id !== 'agendaAddInput') return;
    const addButton = elements.agendaCard.querySelector('#agendaAddButton');
    if (addButton instanceof HTMLElement) {
      addButton.click();
    }
  });

  setInterval(renderDateTime, 1000 * 30);
  setInterval(updateWeather, 1000 * 60 * 15);
  load();
  updateWeather();
  renderAll();
  console.log('✅ script validated');
});
