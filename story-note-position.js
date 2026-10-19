// Keep story notes within the visible screen while retaining their card anchor.
window.addEventListener('DOMContentLoaded', () => {
  const board = document.getElementById('boardContainer');
  if (!board) return;
  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const viewportWidth = document.documentElement.clientWidth;
      board.querySelectorAll('.story-status-note').forEach((note) => {
        if (getComputedStyle(note).display === 'none') return;
        note.style.setProperty('--note-shift-x', '0px');
        const bounds = note.getBoundingClientRect();
        const shift = Math.max(12 - bounds.left, Math.min(0, viewportWidth - 12 - bounds.right));
        note.style.setProperty('--note-shift-x', shift + 'px');
      });
    });
  };
  board.addEventListener('pointerover', schedule);
  board.addEventListener('focusin', schedule);
  window.addEventListener('resize', schedule);
  window.addEventListener('scroll', schedule, true);
});
