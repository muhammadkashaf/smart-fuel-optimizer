export const OTP_LENGTH = 6;

export function backspaceOtp(value: string, focusedIndex: number) {
  const digits = value.padEnd(OTP_LENGTH, ' ').slice(0, OTP_LENGTH).split('');
  let nextFocus = focusedIndex;
  if (digits[focusedIndex] === ' ' && focusedIndex > 0) nextFocus -= 1;
  digits[nextFocus] = ' ';
  return { value: digits.join(''), focusIndex: nextFocus };
}
