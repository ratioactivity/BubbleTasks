const ENCOURAGING_MESSAGES = [
  'Tiny progress still counts—one task at a time.',
  'Done is better than perfect. Keep moving 🌟',
  'A focused 15 minutes can change your whole day.',
  'You are building momentum with every check mark.',
  'Future-you will thank you for this progress.',
];

export const getDailyEncouragingMessage = (today: Date): string => {
  const index = today.getDate() % ENCOURAGING_MESSAGES.length;
  return ENCOURAGING_MESSAGES[index];
};
