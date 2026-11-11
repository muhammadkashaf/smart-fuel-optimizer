export type OtpFlow = 'verification' | 'reset';

const emailKeys = {
  verification: 'smartfuel_verify_email_address',
  reset: 'smartfuel_password_reset_email',
} as const;

const resendKeys = {
  verification: 'smartfuel_verify_email_resend_at',
  reset: 'smartfuel_password_reset_resend_at',
} as const;

const storage = () => {
  try { return window.sessionStorage; } catch { return null; }
};

export const maskEmail = (email: string) => {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length === 1) return `${local}***@${domain}`;
  if (local.length === 2) return `${local[0]}*${local[1]}@${domain}`;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local.at(-1)}@${domain}`;
};

export const getFlowEmail = (flow: OtpFlow) => storage()?.getItem(emailKeys[flow]) ?? '';

export const rememberFlowEmail = (flow: OtpFlow, email: string) => {
  storage()?.setItem(emailKeys[flow], email.trim().toLowerCase());
};

export const clearFlow = (flow: OtpFlow) => {
  storage()?.removeItem(emailKeys[flow]);
  storage()?.removeItem(resendKeys[flow]);
};

export const startResendCooldown = (flow: OtpFlow, email: string, seconds = 60) => {
  storage()?.setItem(resendKeys[flow], JSON.stringify({ email: email.trim().toLowerCase(), availableAt: Date.now() + seconds * 1000 }));
};

export const getResendSeconds = (flow: OtpFlow, email: string) => {
  try {
    const item = storage()?.getItem(resendKeys[flow]);
    if (!item) return 0;
    const parsed: unknown = JSON.parse(item);
    if (!parsed || typeof parsed !== 'object' || !('email' in parsed) || !('availableAt' in parsed)) return 0;
    if (parsed.email !== email.trim().toLowerCase() || typeof parsed.availableAt !== 'number') return 0;
    return Math.max(0, Math.ceil((parsed.availableAt - Date.now()) / 1000));
  } catch { return 0; }
};
