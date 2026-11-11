import assert from 'node:assert/strict';
import { backspaceOtp } from '../src/components/common/otpInputLogic.ts';

let value = '753294';
let focusIndex = 5;
const expected = [
  ['75329 ', 5],
  ['7532  ', 4],
  ['753   ', 3],
  ['75    ', 2],
  ['7     ', 1],
  ['      ', 0],
];

for (const [nextValue, nextFocus] of expected) {
  const result = backspaceOtp(value, focusIndex);
  assert.equal(result.value, nextValue);
  assert.equal(result.focusIndex, nextFocus);
  value = result.value;
  focusIndex = result.focusIndex;
}

assert.deepEqual(backspaceOtp('      ', 0), { value: '      ', focusIndex: 0 });
console.log('OTP continuous Backspace sequence passed.');
