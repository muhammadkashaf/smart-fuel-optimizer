export type BudgetStatus = 'unset' | 'within' | 'approaching' | 'exceeded';

export const getBudgetStatus = (percentageUsed: number | null | undefined): BudgetStatus => {
  if (percentageUsed === null || percentageUsed === undefined) return 'unset';
  if (percentageUsed >= 100) return 'exceeded';
  if (percentageUsed >= 80) return 'approaching';
  return 'within';
};
