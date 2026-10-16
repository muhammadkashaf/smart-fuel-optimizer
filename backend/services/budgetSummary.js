import Budget from "../models/Budget.js";
import FuelRecord from "../models/FuelRecord.js";

export const pkrCents = (value) => Math.round(value * 100);

export async function getMonthlyBudgetState(userId, year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const [budget, totals] = await Promise.all([
    Budget.findOne({ userId, year, month }),
    FuelRecord.aggregate([
      { $match: { userId, date: { $gte: start, $lt: end } } },
      { $group: { _id: null, spent: { $sum: "$cost" } } },
    ]),
  ]);
  const spent = totals[0]?.spent ?? 0;
  const amount = budget?.amount ?? null;
  return {
    month, year, budget: amount, spent,
    remaining: amount === null ? null : amount - spent,
    percentageUsed: amount === null ? null : (spent / amount) * 100,
    isExceeded: amount !== null && pkrCents(spent) > pkrCents(amount),
  };
}
