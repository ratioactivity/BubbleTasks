window.addEventListener('DOMContentLoaded', () => {
  const board = document.getElementById('boardContainer');
  const dialog = document.getElementById('cardTaskDialog');
  const form = document.getElementById('cardTaskForm');
  let context = null;
  let opener = null;
  const addControls = () => {
    if (!board.matches('.columns, .tabs')) return;
    board.querySelectorAll('.category-column').forEach((card) => {
      if (card.querySelector(':scope > .card-add-task')) return;
      const story = card.dataset.story;
      const category = story ? 'Writing' : card.querySelector('.category-title h3')?.textContent;
      if (!category) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'card-add-task';
      button.textContent = '+';
      button.dataset.category = category;
      button.dataset.story = story === 'Other Writing' ? '' : (story || '');
      button.title = button.ariaLabel = 'Add task to ' + (story || category);
      card.appendChild(button);
    });
  };
  new MutationObserver(addControls).observe(board, {childList: true, subtree: true});
  addControls();
  board.addEventListener('click', (event) => {
    const button = event.target.closest('.card-add-task');
    if (!button) return;
    context = {category: button.dataset.category, story: button.dataset.story};
    opener = button;
    form.reset();
    document.getElementById('cardTaskHeading').textContent = 'Add task · ' + (context.story || context.category);
    dialog.showModal();
  });
  document.getElementById('cancelCardTask').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener?.isConnected && opener.focus());
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = form.elements.cardTitle.value.trim();
    if (!title || !context) return;
    const ids = ['taskTitleInput', 'taskCategoryInput', 'taskStoryInput', 'taskDueDateInput', 'taskPriorityInput'];
    const inputs = ids.map((id) => document.getElementById(id));
    const draft = inputs.map((input) => input.value);
    inputs[0].value = title;
    inputs[1].value = context.category;
    inputs[1].dispatchEvent(new Event('change'));
    inputs[2].value = context.story;
    inputs[3].value = form.elements.cardDue.value;
    inputs[4].value = form.elements.cardPriority.value;
    document.getElementById('addTaskButton').click();
    inputs.forEach((input, index) => { input.value = draft[index]; });
    inputs[1].dispatchEvent(new Event('change'));
    dialog.close();
    const card = [...board.querySelectorAll('.card-add-task')].find((button) =>
      button.dataset.category === context.category && button.dataset.story === context.story);
    card?.focus();
  });
});
