import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registerSchema } from '@/schemas/authSchemas';
import { registerRequest } from '@/api/authApi';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/errorHandler';
import { Button, Input, Select, Spinner } from '@/components/common';
import AuthFrame from '@/components/layout/AuthFrame';

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({ resolver: zodResolver(registerSchema), defaultValues: { role: 'Individual' } });
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (values: Record<string, unknown>) => {
    try {
      const payload = { ...values };
      delete payload.confirmPassword;
      const { data } = await registerRequest(payload);
      login(data.token, data.user);
      reset();
      toast.success(data.message);
      navigate('/dashboard');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <AuthFrame title="Create your account" text="Start monitoring and organizing your fleet today.">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full name"
            placeholder="Alex Morgan"
            error={errors.fullName?.message as string}
            {...register('fullName')}
          />
          <Input
            label="Contact number"
            type="tel"
            placeholder="+1 (555) 000-0000"
            error={errors.contactNumber?.message as string}
            {...register('contactNumber')}
          />
        </div>

        <Input
          label="Email address"
          type="email"
          placeholder="name@company.com"
          error={errors.email?.message as string}
          {...register('email')}
        />

        <Select label="Account role" error={errors.role?.message as string} {...register('role')}>
          <option value="Individual">Individual (Owner / Driver)</option>
          <option value="Admin">Fleet Administrator</option>
        </Select>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message as string}
            {...register('password')}
          />
          <Input
            label="Confirm password"
            type="password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message as string}
            {...register('confirmPassword')}
          />
        </div>

        <div className="pt-2">
          <Button disabled={isSubmitting} size="lg" className="w-full">
            {isSubmitting && <Spinner />}
            <span>Create workspace account</span>
          </Button>
        </div>
      </form>
      <div className="mt-6 border-t border-line pt-5 text-center">
        <p className="text-sm text-content-muted">
          Already have an account?{' '}
          <Link className="font-semibold text-accent hover:text-accent-strong transition-colors" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </AuthFrame>
  );
}

