import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { loginSchema } from '@/schemas/authSchemas';
import { loginRequest } from '@/api/authApi';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/errorHandler';
import { Button, Input, Spinner } from '@/components/common';
import AuthFrame from '@/components/layout/AuthFrame';
import getReturnTo from '@/routes/getReturnTo';
import { clearFlow, rememberFlowEmail, startResendCooldown } from '@/utils/authFlow';

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({ resolver: zodResolver(loginSchema) });
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (values: Record<string, unknown>) => {
    try {
      const { data } = await loginRequest(values);
      login(data.token, data.user);
      reset();
      toast.success(data.message);
      navigate(
        getReturnTo(location.state) ?? (data.user.role === 'Admin' ? '/admin' : '/dashboard'),
        { replace: true },
      );
    } catch (e) {
      if (isAxiosError(e)) {
        const { code, email, verificationCodeSent, resendAfterSeconds } = e.response?.data ?? {};
        if ((code === 'EMAIL_NOT_VERIFIED' || code === 'EMAIL_VERIFICATION_DELIVERY_FAILED') && typeof email === 'string') {
          clearFlow('verification');
          rememberFlowEmail('verification', email);
          if (code === 'EMAIL_NOT_VERIFIED' && typeof resendAfterSeconds === 'number' && resendAfterSeconds > 0) {
            startResendCooldown('verification', email, resendAfterSeconds);
          }
          navigate('/verify-email', {
            state: {
              email,
              codeSent: verificationCodeSent === true,
              recoverySent: verificationCodeSent === true,
              recoveryCooldown: code === 'EMAIL_NOT_VERIFIED' && verificationCodeSent === false,
              deliveryFailed: code === 'EMAIL_VERIFICATION_DELIVERY_FAILED',
            },
          });
          return;
        }
      }
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <AuthFrame title="Welcome back" text="Sign in to continue managing your fuel and vehicles.">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message as string}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message as string}
          {...register('password')}
        />
        <div className="text-right">
          <Link className="text-xs font-semibold text-accent hover:text-accent-strong" to="/forgot-password">
            Forgot password?
          </Link>
        </div>
        <div className="pt-2">
          <Button disabled={isSubmitting} size="lg" className="w-full">
            {isSubmitting && <Spinner />}
            <span>Sign in</span>
          </Button>
        </div>
      </form>
      <div className="mt-6 border-t border-line pt-5 text-center">
        <p className="text-sm text-content-muted">
          Don't have an account?{' '}
          <Link
            className="font-semibold text-accent hover:text-accent-strong transition-colors"
            to="/register"
          >
            Create account
          </Link>
        </p>
      </div>
    </AuthFrame>
  );
}
