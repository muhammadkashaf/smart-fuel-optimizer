import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import type { z } from 'zod';
import { forgotPasswordRequest } from '@/api/authApi';
import { Button, Input, Spinner } from '@/components/common';
import AuthFrame from '@/components/layout/AuthFrame';
import { forgotPasswordSchema } from '@/schemas/authSchemas';
import { getResendSeconds, rememberFlowEmail, startResendCooldown } from '@/utils/authFlow';

type Values = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [requestError, setRequestError] = useState('');
  const inFlight = useRef(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const submit = async ({ email }: Values) => {
    if (inFlight.current) return;
    setRequestError('');
    if (getResendSeconds('reset', email) > 0) {
      rememberFlowEmail('reset', email);
      navigate('/reset-password', { state: { email } });
      return;
    }
    inFlight.current = true;
    try {
      await forgotPasswordRequest(email);
      rememberFlowEmail('reset', email);
      startResendCooldown('reset', email);
      navigate('/reset-password', { state: { email } });
    } catch (error) {
      setRequestError(isAxiosError(error) && error.response?.status === 429
        ? 'Too many requests. Please wait a little before trying again.'
        : 'Unable to request a reset code right now. Please try again.');
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <AuthFrame title="Forgot your password?" text="Enter the email associated with your SmartFuel account and we'll send you a reset code.">
      <form onSubmit={(event) => { void handleSubmit(submit)(event); }} className="space-y-4">
        <Input label="Email address" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
        {requestError && <p role="alert" className="text-sm text-danger">{requestError}</p>}
        <Button disabled={isSubmitting} aria-busy={isSubmitting} size="lg" className="w-full">
          {isSubmitting && <Spinner />}<span>Send reset code</span>
        </Button>
      </form>
      <Link to="/login" className="mt-5 inline-block text-sm font-semibold text-accent hover:text-accent-strong">Back to sign in</Link>
    </AuthFrame>
  );
}
