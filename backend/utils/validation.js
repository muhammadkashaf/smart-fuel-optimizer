export const isValidEmail = (email) => {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidContactNumber = (contactNumber) => {
  return typeof contactNumber === "string" && /^[0-9+\-\s()]{7,20}$/.test(contactNumber.trim());
};

export const isValidYear = (value) => {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1980 && year <= new Date().getFullYear() + 1;
};

export const isPositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
};
