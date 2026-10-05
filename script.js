const CATEGORIES = ["Work", "Business", "Home", "Personal", "Creative", "Writing", "Other"];
const STORIES = [
  ["BOTA", "BOTAbkg.gif"], ["APEX", "apexbkg.gif"], ["Parallel", "parallelbkg.gif"],
  ["Black & Blue", "blackandbluebkg.gif"], ["Wild Skies", "wildskiesbkg.gif"],
  ["Mask", "maskbkg.gif"], ["Teeth", "teethbkg.gif"], ["Ruse", "rusebkg.gif"],
  ["Horizon Line", "horizonlinebkg.gif"], ["Sleeper", "sleeperbkg.gif"],
  ["Coup", "coupbkg.gif"], ["Kaleidoscope", "kaleidoscopebkg.gif"]
];
const CARD_LIMIT = 5;

window.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#task-form");
  const categorySelect = document.querySelector("#task-category");
  const storySelect = document.querySelector("#task-story");
  const tabs = document.querySelector("#category-tabs");
  const board = document.querySelector("#task-board");
  const layoutToggle = document.querySelector("#layout-toggle");
  let tasks = JSON.parse(localStorage.getItem("bubbleTasks") || "[]");
  let layout = localStorage.getItem("bubbleTasksLayout") || "tabs";
  let activeCategory = "Writing";
  const visibleCounts = {};

  CATEGORIES.forEach((category) => categorySelect.add(new Option(category, category)));
  STORIES.forEach(([story]) => storySelect.add(new Option(story, story)));
  categorySelect.value = "Writing";

  function updateStoryControl() {
    const writing = categorySelect.value === "Writing";
    storySelect.hidden = !writing;
    storySelect.disabled = !writing;
  }

  function saveTasks() { localStorage.setItem("bubbleTasks", JSON.stringify(tasks)); }
  function sortedTasks(category, story) {
    return tasks.filter((task) => task.category === category && (!story || task.story === story))
      .sort((a, b) => Number(b.priority) - Number(a.priority) || new Date(a.due || "9999") - new Date(b.due || "9999"));
  }

  function taskMarkup(task, showStory) {
    const story = showStory && task.story ? `<span class="story-chip">${escapeHtml(task.story)}</span> · ` : "";
    return `<li class="task-item ${task.done ? "done" : ""}">
      <input type="checkbox" data-toggle="${task.id}" aria-label="Complete ${escapeHtml(task.title)}" ${task.done ? "checked" : ""}>
      <span class="task-copy">${escapeHtml(task.title)}<small class="task-meta">${story}Priority ${task.priority}${task.due ? ` · ${task.due}` : ""}</small></span>
      <button class="delete-task" data-delete="${task.id}" aria-label="Delete ${escapeHtml(task.title)}">×</button></li>`;
  }

  function cardMarkup({ title, background, banner, items, showStory = false, key }) {
    const count = visibleCounts[key] || CARD_LIMIT;
    const shown = items.slice(0, count);
    return `<article class="task-card" style="background-image:url('${background}')"><div class="card-content">
      ${banner ? `<img class="story-banner" src="assets/banners/placeholder.png" alt="${escapeHtml(title)} banner">` : ""}
      <h2>${escapeHtml(title)}</h2>
      ${shown.length ? `<ul class="task-list">${shown.map((task) => taskMarkup(task, showStory)).join("")}</ul>` : `<p class="empty-state">No tasks</p>`}
      ${items.length > count ? `<button class="load-more" data-load="${key}">Load more (${items.length - count})</button>` : ""}
    </div></article>`;
  }

  function renderTabs() {
    tabs.innerHTML = CATEGORIES.map((category) => `<button class="category-tab" data-category="${category}" aria-selected="${category === activeCategory}">${category}</button>`).join("");
  }

  function render() {
    layoutToggle.textContent = `Layout: ${layout}`;
    tabs.hidden = layout === "columns";
    if (layout === "tabs" && activeCategory === "Writing") {
      board.className = "board-grid writing-grid";
      board.innerHTML = STORIES.map(([story, gif]) => cardMarkup({ title: story, background: `assets/backgrounds/${gif}`, banner: true, items: sortedTasks("Writing", story), key: `story:${story}` })).join("");
    } else if (layout === "tabs") {
      board.className = "board-grid";
      board.innerHTML = cardMarkup({ title: activeCategory, background: `assets/${activeCategory === "Writing" ? "blue" : "teal"}.gif`, items: sortedTasks(activeCategory), key: `category:${activeCategory}` });
    } else {
      board.className = "board-grid columns-grid";
      board.innerHTML = CATEGORIES.map((category, index) => cardMarkup({ title: category, background: `assets/${["teal","green","pink","orange","purple","blue","yellow"][index]}.gif`, items: sortedTasks(category), showStory: category === "Writing", key: `column:${category}` })).join("");
    }
  }

  function escapeHtml(value) { const node = document.createElement("span"); node.textContent = value; return node.innerHTML; }
  categorySelect.addEventListener("change", updateStoryControl);
  tabs.addEventListener("click", (event) => { if (event.target.dataset.category) { activeCategory = event.target.dataset.category; renderTabs(); render(); } });
  layoutToggle.addEventListener("click", () => { layout = layout === "tabs" ? "columns" : "tabs"; localStorage.setItem("bubbleTasksLayout", layout); render(); });
  board.addEventListener("click", (event) => {
    if (event.target.dataset.load) { visibleCounts[event.target.dataset.load] = (visibleCounts[event.target.dataset.load] || CARD_LIMIT) + CARD_LIMIT; render(); }
    if (event.target.dataset.delete) { tasks = tasks.filter((task) => task.id !== event.target.dataset.delete); saveTasks(); render(); }
  });
  board.addEventListener("change", (event) => { if (event.target.dataset.toggle) { const task = tasks.find((item) => item.id === event.target.dataset.toggle); if (task) task.done = event.target.checked; saveTasks(); render(); } });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    tasks.push({ id: crypto.randomUUID(), title: document.querySelector("#task-title").value.trim(), category: categorySelect.value, story: categorySelect.value === "Writing" ? storySelect.value : "", due: document.querySelector("#task-date").value, priority: Number(document.querySelector("#task-priority").value), done: false });
    saveTasks(); form.reset(); categorySelect.value = "Writing"; updateStoryControl(); render();
  });

  updateStoryControl(); renderTabs(); render();
  console.log("✅ script validated");
});
