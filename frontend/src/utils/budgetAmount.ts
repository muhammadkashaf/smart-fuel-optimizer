export const formatBudgetAmountInput = (raw: string) => {
  const cleaned = raw.replace(/[^\d.]/g, '');
  if (!cleaned) return '';

  const dot = cleaned.indexOf('.');
  const whole = (dot === -1 ? cleaned : cleaned.slice(0, dot)).replace(/^0+(?=\d)/, '');
  const grouped = (whole || (dot === -1 ? '' : '0')).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dot === -1 ? grouped : `${grouped}.${cleaned.slice(dot + 1).replace(/\./g, '')}`;
};

export const parseBudgetAmountInput = (formatted: string) =>
  Number(formatted.replace(/,/g, ''));

export const budgetAmountCaret = (rawBeforeCaret: string, formatted: string) => {
  const meaningful = rawBeforeCaret.replace(/[^\d.]/g, '');
  let charactersLeft = meaningful.length + (meaningful.startsWith('.') && formatted.startsWith('0.') ? 1 : 0);
  let position = 0;
  while (position < formatted.length && charactersLeft > 0) {
    if (/[\d.]/.test(formatted[position])) charactersLeft -= 1;
    position += 1;
  }
  return position;
};
