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
        ['task-quick-actions', [['status', '🔄', 'Mark in progress'], ['complete', '✅', 'Complete task']]],
        ['task-quick-edit', [['edit', '✏️', 'Edit task'], ['delete', '❌', 'Delete task']]],
      ];
      controls.forEach(([className, actions]) => {
        const group = document.createElement('div');
        group.className = className;
        actions.forEach(([action, icon, label]) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.action = action;
          if (action === 'status') button.dataset.status = 'In Progress';
          button.textContent = icon;
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
