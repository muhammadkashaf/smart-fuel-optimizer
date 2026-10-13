import Budget from "../models/Budget.js";
import FuelRecord from "../models/FuelRecord.js";

const parsePeriod = ({ year, month }) => {
  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month)) return null;
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  if (parsedYear < 2000 || parsedYear > 2100 || parsedMonth < 1 || parsedMonth > 12) return null;
  return { year: parsedYear, month: parsedMonth };
};

const periodFromRequest = (req, res) => {
  const period = parsePeriod(req.params);
  if (!period) res.status(400).json({ message: "Enter a valid month (1-12) and year (2000-2100)" });
  return period;
};

export const putBudget = async (req, res, next) => {
  const period = periodFromRequest(req, res);
  if (!period) return;
  const { amount } = req.body || {};
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "Budget amount must be greater than 0" });
  }

  try {
    const filter = { userId: req.user._id, ...period };
    const budget = await Budget.findOneAndUpdate(
      filter,
      { $set: { amount } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.json({ message: "Monthly budget saved successfully", budget });
  } catch (error) {
    return next(error);
  }
};

export const getBudget = async (req, res, next) => {
  const period = periodFromRequest(req, res);
  if (!period) return;
  try {
    const budget = await Budget.findOne({ userId: req.user._id, ...period });
    return res.json({ budget });
  } catch (error) {
    return next(error);
  }
};

export const getPreviousBudget = async (req, res, next) => {
  const period = periodFromRequest(req, res);
  if (!period) return;
  try {
    const budget = await Budget.findOne({
      userId: req.user._id,
      $or: [
        { year: { $lt: period.year } },
        { year: period.year, month: { $lt: period.month } },
      ],
    }).sort({ year: -1, month: -1 });
    return res.json({ budget });
  } catch (error) {
    return next(error);
  }
};

export const getBudgetSummary = async (req, res, next) => {
  const period = periodFromRequest(req, res);
  if (!period) return;
  try {
    const { year, month } = period;
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const [budget, totals] = await Promise.all([
      Budget.findOne({ userId: req.user._id, ...period }),
      FuelRecord.aggregate([
        { $match: { userId: req.user._id, date: { $gte: start, $lt: end } } },
        { $group: { _id: null, spent: { $sum: "$cost" } } },
      ]),
    ]);
    const spent = totals[0]?.spent ?? 0;
    const amount = budget?.amount ?? null;
    return res.json({
      month,
      year,
      budget: amount,
      spent,
      remaining: amount === null ? null : amount - spent,
      percentageUsed: amount === null ? null : (spent / amount) * 100,
      isExceeded: amount !== null && spent > amount,
    });
  } catch (error) {
    return next(error);
  }
};
