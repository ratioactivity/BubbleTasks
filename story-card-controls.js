// Story-card paging stays local; saved tasks and cloud sync are unchanged.
window.addEventListener('DOMContentLoaded', () => {
  const board = document.getElementById('boardContainer');
  if (!board) return;
  const counts = new Map();
  const pageSize = 3;
  function enhance() {
    board.querySelectorAll('.story-column').forEach((card) => {
      const name = card.dataset.story;
      const count = counts.get(name) || pageSize;
      const tasks = [...card.querySelectorAll(':scope > .task-card')];
      const original = card.querySelector(':scope > button[data-action="load-story"]');
      const remaining = Number(original?.textContent.match(/\((\d+)\)/)?.[1] || 0);
      const total = tasks.length + remaining;
      tasks.forEach((task, index) => { if (task.hidden !== (index >= count)) task.hidden = index >= count; });
      let controls = card.querySelector(':scope > .story-page-controls');
      if (!controls) {
        controls = document.createElement('div');
        controls.className = 'story-page-controls';
        card.insertBefore(controls, card.querySelector(':scope > .story-pin'));
      }
      const wanted = [];
      if (total > count) wanted.push(['story-page-more', 'Load more (' + (total - count) + ')']);
      if (count > pageSize) wanted.push(['story-page-collapse', 'Collapse']);
      const signature = JSON.stringify(wanted);
      if (controls.dataset.signature !== signature) {
        controls.replaceChildren(...wanted.map(([action, text]) => {
          const button = document.createElement('button');
          button.type = 'button'; button.dataset.action = action; button.textContent = text;
          return button;
        }));
        controls.dataset.signature = signature;
      }
      const pin = card.querySelector(':scope > .story-pin');
      if (pin && !pin.querySelector('img')) {
        const image = document.createElement('img');
        image.src = 'assets/office-push-pin.png'; image.alt = ''; image.width = 22; image.height = 22;
        pin.replaceChildren(image);
      }
    });
  }
  board.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || !['story-page-more', 'story-page-collapse'].includes(button.dataset.action)) return;
    const card = button.closest('.story-column');
    const name = card.dataset.story;
    if (button.dataset.action === 'story-page-collapse') {
      counts.set(name, pageSize); enhance();
      const next = card.querySelector('[data-action="story-page-more"]');
      next?.focus();
    } else {
      const count = (counts.get(name) || pageSize) + pageSize;
      counts.set(name, count);
      if (card.querySelectorAll(':scope > .task-card').length < count) {
        card.querySelector(':scope > button[data-action="load-story"]')?.click();
      }
      enhance();
    }
  });
  new MutationObserver(enhance).observe(board, {childList: true, subtree: true});
  enhance();
});
