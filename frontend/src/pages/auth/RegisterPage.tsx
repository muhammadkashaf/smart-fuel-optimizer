import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registerSchema } from '@/schemas/authSchemas';
import { registerRequest } from '@/api/authApi';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/errorHandler';
import { Building2, UserRound } from 'lucide-react';
import { Button, Input, Spinner } from '@/components/common';
import AuthFrame from '@/components/layout/AuthFrame';

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
  } = useForm({ resolver: zodResolver(registerSchema), defaultValues: { role: 'Individual' } });
  const { login } = useAuth();
  const navigate = useNavigate();
  const selectedRole = useWatch({ control, name: 'role' });

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
    <AuthFrame
      title="Create an account"
      text="Choose how you manage vehicles, then add your details."
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full name"
            placeholder="Your full name"
            error={errors.fullName?.message as string}
            {...register('fullName')}
          />
          <Input
            label="Contact number"
            type="tel"
            placeholder="03XX XXXXXXX"
            error={errors.contactNumber?.message as string}
            {...register('contactNumber')}
          />
        </div>

        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message as string}
          {...register('email')}
        />

        <fieldset>
          <legend className="field-label mb-2">Account type</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  value: 'Individual',
                  label: 'Individual',
                  detail: 'Manage your own vehicles',
                  Icon: UserRound,
                },
                {
                  value: 'Organizational',
                  label: 'Organization',
                  detail: 'Manage an organization fleet',
                  Icon: Building2,
                },
              ] as const
            ).map(({ value, label, detail, Icon }) => (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${selectedRole === value ? 'border-accent bg-accent-soft/60' : 'border-line bg-white hover:border-slate-300'}`}
              >
                <input type="radio" value={value} className="peer sr-only" {...register('role')} />
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-accent ring-1 ring-line peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{label}</span>
                  <span className="mt-0.5 block text-xs text-content-muted">{detail}</span>
                </span>
              </label>
            ))}
          </div>
          {errors.role?.message && (
            <p className="mt-1.5 text-xs text-red-600">{errors.role.message as string}</p>
          )}
        </fieldset>

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
            <span>Create account</span>
          </Button>
        </div>
      </form>
      <div className="mt-6 border-t border-line pt-5 text-center">
        <p className="text-sm text-content-muted">
          Already have an account?{' '}
          <Link
            className="font-semibold text-accent hover:text-accent-strong transition-colors"
            to="/login"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthFrame>
  );
}
