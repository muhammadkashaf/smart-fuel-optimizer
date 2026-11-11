import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { Eye, EyeOff, Mail } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { z } from 'zod';
import { forgotPasswordRequest, resetPasswordRequest, verifyResetOtpRequest } from '@/api/authApi';
import ResendCode from '@/components/auth/ResendCode';
import { Button, Input, OtpInput, Spinner } from '@/components/common';
import type { OtpInputHandle } from '@/components/common/OtpInput';
import AuthFrame from '@/components/layout/AuthFrame';
import { newPasswordSchema } from '@/schemas/authSchemas';
import { clearFlow, getFlowEmail, maskEmail, rememberFlowEmail } from '@/utils/authFlow';

type PasswordValues = z.infer<typeof newPasswordSchema>;

export default function ResetPasswordPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const routeEmail = state && typeof state === 'object' && 'email' in state && typeof state.email === 'string' ? state.email : '';
  const [email] = useState(() => (routeEmail || getFlowEmail('reset')).trim().toLowerCase());
  useEffect(() => { if (email) rememberFlowEmail('reset', email); }, [email]);
  const [step, setStep] = useState<'code' | 'password' | 'success'>('code');
  const [otp, setOtp] = useState('');
  const [verifiedCode, setVerifiedCode] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const inFlight = useRef(false);
  const otpInput = useRef<OtpInputHandle>(null);
  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(newPasswordSchema), defaultValues: { newPassword: '', confirmPassword: '' } });

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    if (!/^\d{6}$/.test(otp)) { setError('Enter the complete 6-digit code.'); return; }
    inFlight.current = true;
    setVerifying(true);
    setError('');
    try {
      await verifyResetOtpRequest({ email, otp });
      setVerifiedCode(otp);
      setStep('password');
    } catch (requestError) {
      if (isAxiosError(requestError) && requestError.response?.status === 400) setError('That code is invalid or expired. Check it or request a new code.');
      else setError('Unable to verify the code right now. Please try again.');
    } finally {
      inFlight.current = false;
      setVerifying(false);
    }
  };

  const resetPassword = async (values: PasswordValues) => {
    if (inFlight.current || !verifiedCode) return;
    inFlight.current = true;
    setError('');
    try {
      await resetPasswordRequest({ email, otp: verifiedCode, ...values });
      clearFlow('reset');
      setVerifiedCode('');
      passwordForm.reset();
      setStep('success');
    } catch (requestError) {
      if (isAxiosError(requestError) && requestError.response?.status === 400) {
        setError('Your reset code is invalid or expired. Request a new code.');
        setVerifiedCode('');
        setOtp('');
        setStep('code');
      } else setError('Unable to reset your password right now. Please try again.');
    } finally {
      inFlight.current = false;
    }
  };

  if (step === 'success') return (
    <AuthFrame compact title="Password changed" text="Your password has been reset successfully.">
      <Link to="/login" className="inline-flex h-11 w-full items-center justify-center rounded-control bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Sign in</Link>
    </AuthFrame>
  );

  if (!email) return (
    <AuthFrame title="Reset password" text="Start with your email address to request a reset code.">
      <Link to="/forgot-password" className="text-sm font-semibold text-accent hover:text-accent-strong">Request a reset code</Link>
    </AuthFrame>
  );

  if (step === 'password') return (
    <AuthFrame compact title="Create new password" text="Choose a new password for your SmartFuel account.">
      <form onSubmit={(event) => { void passwordForm.handleSubmit(resetPassword)(event); }} className="space-y-4">
        <Input
          label="New password"
          type={showNewPassword ? 'text' : 'password'}
          autoComplete="new-password"
          disabled={passwordForm.formState.isSubmitting}
          error={passwordForm.formState.errors.newPassword?.message}
          endAdornment={<button type="button" aria-label={showNewPassword ? 'Hide new password' : 'Show new password'} aria-pressed={showNewPassword} onClick={() => setShowNewPassword((value) => !value)} className="grid h-8 w-8 place-items-center rounded-md text-content-muted hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">{showNewPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}</button>}
          {...passwordForm.register('newPassword')}
        />
        <Input
          label="Confirm password"
          type={showConfirmPassword ? 'text' : 'password'}
          autoComplete="new-password"
          disabled={passwordForm.formState.isSubmitting}
          error={passwordForm.formState.errors.confirmPassword?.message}
          endAdornment={<button type="button" aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((value) => !value)} className="grid h-8 w-8 place-items-center rounded-md text-content-muted hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">{showConfirmPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}</button>}
          {...passwordForm.register('confirmPassword')}
        />
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="pt-1.5">
          <Button disabled={passwordForm.formState.isSubmitting} aria-busy={passwordForm.formState.isSubmitting} size="lg" className="w-full">
            {passwordForm.formState.isSubmitting && <Spinner />}<span>Reset password</span>
          </Button>
        </div>
      </form>
    </AuthFrame>
  );

  return (
    <AuthFrame title="Check your email" text="Enter the code to recover access to your account.">
      <div className="mb-6 rounded-xl border border-accent-border bg-accent-soft p-4">
        <Mail aria-hidden="true" className="mb-2 h-5 w-5 text-accent" />
        <p className="text-sm text-content-muted">We sent a 6-digit password reset code to</p>
        <p className="mt-1 break-all text-sm font-semibold text-content">{maskEmail(email)}</p>
      </div>
      <form onSubmit={verifyCode} className="space-y-5">
        <OtpInput ref={otpInput} label="Reset code" value={otp} onChange={(value) => { setOtp(value); setError(''); }} error={error} disabled={verifying} />
        <p className="text-xs text-content-muted">Code expires in 10 minutes.</p>
        <Button disabled={verifying} aria-busy={verifying} size="lg" className="w-full">
          {verifying && <Spinner />}<span>Verify code</span>
        </Button>
      </form>
      <div className="mt-5 border-t border-line pt-5">
        <ResendCode flow="reset" email={email} onResend={async () => { await forgotPasswordRequest(email); }} onSuccess={() => { setOtp(''); setError(''); otpInput.current?.focusFirst(); }} />
      </div>
      <button type="button" onClick={() => { clearFlow('reset'); navigate('/forgot-password', { replace: true }); }} className="mt-5 block w-full text-center text-sm font-semibold text-accent hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Use a different email</button>
    </AuthFrame>
  );
}
