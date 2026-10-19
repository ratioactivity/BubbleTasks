// Compact controls reuse the task board's existing delegated actions.
window.addEventListener('DOMContentLoaded', () => {
  const board = document.getElementById('boardContainer');
  if (!board) return;
  function compactTasks() {
    board.querySelectorAll('.task-card[data-id]:not(.task-card-compact)').forEach((card) => {
      const copy = document.createElement('div');
      copy.className = 'task-copy';
      [...card.children].forEach((child) => {
        if (child.matches('.task-actions, .task-edit-actions')) child.remove();
        else copy.appendChild(child);
      });
      card.appendChild(copy);
      const controls = [
        ['task-quick-actions', [['status', 'reload.png', 'Mark in progress'], ['complete', 'check.png', 'Complete task']]],
        ['task-quick-edit', [['edit', 'pencil.png', 'Edit task'], ['delete', 'delete.png', 'Delete task']]],
      ];
      controls.forEach(([className, actions]) => {
        const group = document.createElement('div');
        group.className = className;
        actions.forEach(([action, icon, label]) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.action = action;
          if (action === 'status') button.dataset.status = 'In Progress';
          const image = document.createElement('img');
          image.src = 'assets/' + icon;
          image.alt = '';
          image.width = 24;
          image.height = 24;
          image.draggable = false;
          button.appendChild(image);
          button.setAttribute('aria-label', label);
          button.title = label;
          group.appendChild(button);
        });
        card.appendChild(group);
      });
      card.classList.add('task-card-compact');
    });
  }
  new MutationObserver(compactTasks).observe(board, { childList: true, subtree: true });
  compactTasks();
});
