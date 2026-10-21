import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { CircleCheck, MailCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { resendVerificationRequest, verifyEmailRequest } from '@/api/authApi';
import ResendCode from '@/components/auth/ResendCode';
import { Button, OtpInput, Spinner } from '@/components/common';
import type { OtpInputHandle } from '@/components/common/OtpInput';
import AuthFrame from '@/components/layout/AuthFrame';
import { clearFlow, getFlowEmail, maskEmail, rememberFlowEmail } from '@/utils/authFlow';

export default function VerifyEmailPage() {
  const { state } = useLocation();
  const routeEmail = state && typeof state === 'object' && 'email' in state && typeof state.email === 'string' ? state.email : '';
  const [deliveryFailed, setDeliveryFailed] = useState(() => Boolean(state && typeof state === 'object' && 'deliveryFailed' in state && state.deliveryFailed === true));
  const [codeSent, setCodeSent] = useState(() => Boolean(state && typeof state === 'object' && 'codeSent' in state && state.codeSent === true));
  const [recoverySent, setRecoverySent] = useState(() => Boolean(state && typeof state === 'object' && 'recoverySent' in state && state.recoverySent === true));
  const [recoveryCooldown, setRecoveryCooldown] = useState(() => Boolean(state && typeof state === 'object' && 'recoveryCooldown' in state && state.recoveryCooldown === true));
  const [email] = useState(() => (routeEmail || getFlowEmail('verification')).trim().toLowerCase());
  useEffect(() => { if (email) rememberFlowEmail('verification', email); }, [email]);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [verified, setVerified] = useState(false);
  const inFlight = useRef(false);
  const otpInput = useRef<OtpInputHandle>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    if (!/^\d{6}$/.test(otp)) { setError('Enter the complete 6-digit code.'); return; }
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      await verifyEmailRequest({ email, otp });
      clearFlow('verification');
      setVerified(true);
    } catch (requestError) {
      if (isAxiosError(requestError) && requestError.response?.status === 400) setError('That code is invalid or expired. Check it or request a new code.');
      else setError('Unable to verify your email right now. Please try again.');
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  if (verified) return (
    <AuthFrame title="Email verified" text="Your SmartFuel account is ready.">
      <Link to="/login" className="inline-flex h-11 w-full items-center justify-center rounded-control bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Sign in</Link>
    </AuthFrame>
  );

  if (!email) return (
    <AuthFrame title="Verify your email" text="Open the verification page after signing up, or sign in to continue verification.">
      <Link to="/login" className="text-sm font-semibold text-accent hover:text-accent-strong">Sign in to continue verification</Link>
    </AuthFrame>
  );

  return (
    <AuthFrame title="Verify your email" text="Confirm your email address to finish creating your account.">
      <div className="mb-6 rounded-xl border border-accent-border bg-accent-soft p-4">
        <MailCheck aria-hidden="true" className="mb-2 h-5 w-5 text-accent" />
        <p className="text-sm text-content-muted">{deliveryFailed ? 'We could not send a verification code to' : codeSent ? 'We sent a 6-digit verification code to' : 'Enter the verification code for'}</p>
        <p className="mt-1 break-all text-sm font-semibold text-content">{maskEmail(email)}</p>
      </div>
      {recoverySent && <p role="status" className="mb-5 text-sm text-success">A new verification code has been sent to your email.</p>}
      {recoveryCooldown && <p role="status" className="mb-5 text-sm text-content-muted">A code was sent recently. Enter it below or request a new one when the countdown ends.</p>}
      {deliveryFailed && <p role="alert" className="mb-5 text-sm text-danger">Request a new code below to complete verification.</p>}
      <form onSubmit={submit} className="space-y-5">
        <OtpInput ref={otpInput} label="Verification code" value={otp} onChange={(value) => { setOtp(value); setError(''); }} error={error} disabled={pending} />
        <p className="text-xs text-content-muted">Code expires in 10 minutes.</p>
        <Button disabled={pending} aria-busy={pending} size="lg" className="w-full">
          {pending && <Spinner />}<span>Verify email</span>
        </Button>
      </form>
      <div className="mt-5 border-t border-line pt-5">
        <ResendCode flow="verification" email={email} onResend={async () => { await resendVerificationRequest(email); }} onSuccess={() => { setOtp(''); setError(''); setDeliveryFailed(false); setCodeSent(true); setRecoverySent(false); setRecoveryCooldown(false); otpInput.current?.focusFirst(); }} />
      </div>
      <Link to="/login" onClick={() => clearFlow('verification')} className="mt-5 block text-center text-sm font-semibold text-accent hover:text-accent-strong">Wrong email? Back to sign in</Link>
    </AuthFrame>
  );
}
