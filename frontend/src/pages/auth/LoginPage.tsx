import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loginSchema } from '@/schemas/authSchemas';
import { loginRequest } from '@/api/authApi';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/errorHandler';
import { Button, Input, Spinner } from '@/components/common';
import AuthFrame from '@/components/layout/AuthFrame';

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({ resolver: zodResolver(loginSchema) });
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (values: Record<string, unknown>) => {
    try {
      const { data } = await loginRequest(values);
      login(data.token, data.user);
      reset();
      toast.success(data.message);
      navigate(data.user.role === 'Admin' ? '/admin/users' : '/dashboard');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <AuthFrame title="Sign in to your account" text="Welcome back. Enter your credentials to access your vehicle records.">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
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
        <div className="pt-2">
          <Button disabled={isSubmitting} size="lg" className="w-full">
            {isSubmitting && <Spinner />}
            <span>Sign in to workspace</span>
          </Button>
        </div>
      </form>
      <div className="mt-6 border-t border-line pt-5 text-center">
        <p className="text-sm text-content-muted">
          Don't have an account?{' '}
          <Link className="font-semibold text-accent hover:text-accent-strong transition-colors" to="/register">
            Create account
          </Link>
        </p>
      </div>
    </AuthFrame>
  );
}
