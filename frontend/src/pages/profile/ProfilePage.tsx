import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { CircleCheck, Eye, EyeOff, LockKeyhole, Pencil, ShieldCheck, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import type { z } from 'zod';
import { changePassword, getProfile, updateProfile } from '@/api/profileApi';
import { useAuth } from '@/hooks/useAuth';
import { changePasswordSchema, profileSchema } from '@/schemas/profileSchemas';
import { Button, ErrorState, Input, PageHeader, PageSkeleton, RoleBadge, Spinner } from '@/components/common';
import StatusBadge from '@/components/common/StatusBadge';
import { getErrorMessage } from '@/utils/errorHandler';
import type { User } from '@/types';

type PasswordValues = z.infer<typeof changePasswordSchema>;
type PasswordField = keyof PasswordValues;

const formatMemberSince = (value?: string) => {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : new Intl.DateTimeFormat('en-PK', { month: 'long', year: 'numeric' }).format(date);
};

export default function ProfilePage() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [visible, setVisible] = useState<Record<PasswordField, boolean>>({ currentPassword: false, newPassword: false, confirmPassword: false });
  const passwordRequestInFlight = useRef(false);
  const {
    formState: { isSubmitting: profileSubmitting, errors: profileErrors },
    register: profileRegister,
    handleSubmit: profileHandleSubmit,
    reset: profileReset,
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', contactNumber: '' },
  });
  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const loadProfile = useCallback(() => {
    setError('');
    getProfile()
      .then((response) => {
        setProfile(response.data);
        profileReset({ fullName: response.data.fullName || '', contactNumber: response.data.contactNumber || '' });
      })
      .catch((reason) => setError(getErrorMessage(reason)));
  }, [profileReset]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const saveProfile = async (values: { fullName: string; contactNumber: string }) => {
    try {
      const { data } = await updateProfile({ fullName: values.fullName, contactNumber: values.contactNumber });
      setProfile(data.user);
      updateUser(data.user);
      profileReset({ fullName: data.user.fullName, contactNumber: data.user.contactNumber });
      setIsEditingProfile(false);
      toast.success(data.message || 'Profile updated successfully');
    } catch (reason) {
      toast.error(getErrorMessage(reason));
    }
  };

  const savePassword = async (values: PasswordValues) => {
    if (passwordRequestInFlight.current) return;
    passwordRequestInFlight.current = true;
    setPasswordError('');
    try {
      await changePassword(values);
      passwordForm.reset();
      setVisible({ currentPassword: false, newPassword: false, confirmPassword: false });
      setIsChangingPassword(false);
      toast.success('Password changed successfully.');
    } catch (reason) {
      const code = isAxiosError(reason) ? reason.response?.data?.code : undefined;
      if (code === 'CURRENT_PASSWORD_INVALID') setPasswordError('Current password is incorrect. Please try again.');
      else if (code === 'SAME_PASSWORD') setPasswordError('Choose a new password different from your current password.');
      else if (code === 'PASSWORD_CHANGED') setPasswordError('Your password changed during this request. Please try again.');
      else setPasswordError('Unable to change your password right now. Please try again.');
    } finally {
      passwordRequestInFlight.current = false;
    }
  };

  if (error) return <ErrorState message={error} retry={loadProfile} />;
  if (!profile) return <PageSkeleton />;

  const verified = profile.emailVerified !== false;
  const resetToSaved = () => profileReset({ fullName: profile.fullName || '', contactNumber: profile.contactNumber || '' });
  const closePasswordForm = () => {
    passwordForm.reset();
    setPasswordError('');
    setVisible({ currentPassword: false, newPassword: false, confirmPassword: false });
    setIsChangingPassword(false);
  };
  const visibilityControl = (field: PasswordField, label: string) => (
    <button
      type="button"
      aria-label={`${visible[field] ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
      aria-pressed={visible[field]}
      onClick={() => setVisible((previous) => ({ ...previous, [field]: !previous[field] }))}
      className="grid h-8 w-8 place-items-center rounded-md text-content-muted hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {visible[field] ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader title="Profile" subtitle="Manage your personal details and account security." />

      <section className="app-panel flex min-w-0 flex-wrap items-center gap-4 p-5 sm:p-6" aria-label="Profile summary">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-900 text-xl font-bold text-white">
          {profile.fullName?.trim().slice(0, 1).toUpperCase() || 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-slate-900">{profile.fullName}</h2>
          <p className="break-all text-sm text-content-muted">{profile.email}</p>
          <span className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium ${verified ? 'text-success' : 'text-warning'}`}>
            {verified && <CircleCheck aria-hidden="true" className="h-3.5 w-3.5" />}
            {verified ? 'Email verified' : 'Email not verified'}
          </span>
        </div>
        <RoleBadge role={profile.role} />
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className="app-panel min-w-0 p-5 sm:p-6" aria-labelledby="personal-information-title">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"><UserRound aria-hidden="true" className="h-4 w-4" /></span>
              <div>
                <h2 id="personal-information-title" className="text-base font-semibold text-slate-900">Personal information</h2>
                <p className="mt-0.5 text-sm text-content-muted">Your saved contact details.</p>
              </div>
            </div>
            {!isEditingProfile && <Button variant="secondary" size="sm" onClick={() => { resetToSaved(); setIsEditingProfile(true); }}><Pencil aria-hidden="true" className="h-4 w-4" /> Edit details</Button>}
          </div>

          {isEditingProfile ? (
            <form onSubmit={profileHandleSubmit(saveProfile)} className="mt-5 space-y-4">
              <Input label="Full name" placeholder="Your full name" error={profileErrors.fullName?.message} {...profileRegister('fullName')} />
              <Input label="Contact number" type="tel" placeholder="03XX XXXXXXX" error={profileErrors.contactNumber?.message} {...profileRegister('contactNumber')} />
              <div>
                <p className="field-label">Email address</p>
                <p className="mt-1 break-all text-sm font-medium text-slate-900">{profile.email}</p>
                <p className="mt-1 text-xs text-content-muted">Email cannot be changed here.</p>
              </div>
              <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4">
                <Button type="button" variant="secondary" onClick={() => { resetToSaved(); setIsEditingProfile(false); }} disabled={profileSubmitting}>Cancel</Button>
                <Button type="submit" disabled={profileSubmitting} aria-busy={profileSubmitting}>{profileSubmitting && <Spinner />} Save changes</Button>
              </div>
            </form>
          ) : (
            <dl className="mt-2 divide-y divide-line">
              <div className="grid gap-1 py-3 sm:grid-cols-[8rem_minmax(0,1fr)]"><dt className="text-xs font-medium text-content-muted">Full name</dt><dd className="min-w-0 break-words text-sm font-medium text-slate-900">{profile.fullName || 'Not provided'}</dd></div>
              <div className="grid gap-1 py-3 sm:grid-cols-[8rem_minmax(0,1fr)]"><dt className="text-xs font-medium text-content-muted">Contact number</dt><dd className="text-sm font-medium text-slate-900">{profile.contactNumber || 'Not provided'}</dd></div>
              <div className="grid gap-1 py-3 sm:grid-cols-[8rem_minmax(0,1fr)]"><dt className="text-xs font-medium text-content-muted">Email address</dt><dd className="min-w-0 break-all text-sm font-medium text-slate-900">{profile.email}</dd></div>
            </dl>
          )}
        </section>

        <section className="app-panel min-w-0 p-5 sm:p-6" aria-labelledby="account-information-title">
          <div className="flex items-start gap-3 border-b border-line pb-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"><ShieldCheck aria-hidden="true" className="h-4 w-4" /></span>
            <div>
              <h2 id="account-information-title" className="text-base font-semibold text-slate-900">Account information</h2>
              <p className="mt-0.5 text-sm text-content-muted">Your SmartFuel account.</p>
            </div>
          </div>
          <dl className="mt-2 divide-y divide-line">
            <div className="flex flex-wrap items-center justify-between gap-2 py-3"><dt className="text-xs font-medium text-content-muted">Account type</dt><dd><RoleBadge role={profile.role} /></dd></div>
            <div className="flex flex-wrap items-center justify-between gap-2 py-3"><dt className="text-xs font-medium text-content-muted">Email status</dt><dd><StatusBadge tone={verified ? 'success' : 'warning'}>{verified ? 'Verified' : 'Not verified'}</StatusBadge></dd></div>
            <div className="flex flex-wrap items-center justify-between gap-2 py-3"><dt className="text-xs font-medium text-content-muted">Member since</dt><dd className="text-sm font-medium text-slate-900">{formatMemberSince(profile.createdAt)}</dd></div>
          </dl>
        </section>
      </div>

      <section className="app-panel min-w-0 p-5 sm:p-6" aria-labelledby="security-title">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"><LockKeyhole aria-hidden="true" className="h-4 w-4" /></span>
            <div>
              <h2 id="security-title" className="text-base font-semibold text-slate-900">Security</h2>
              <p className="mt-0.5 text-sm text-content-muted">Keep your account secure with a strong password.</p>
            </div>
          </div>
          {!isChangingPassword && <Button variant="secondary" size="sm" onClick={() => { setPasswordError(''); setIsChangingPassword(true); }}>Change password</Button>}
        </div>
        {isChangingPassword && (
          <form onSubmit={(event) => { void passwordForm.handleSubmit(savePassword)(event); }} className="mt-5 border-t border-line pt-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <Input label="Current password" type={visible.currentPassword ? 'text' : 'password'} autoComplete="current-password" error={passwordForm.formState.errors.currentPassword?.message} endAdornment={visibilityControl('currentPassword', 'Current password')} {...passwordForm.register('currentPassword')} />
              <Input label="New password" type={visible.newPassword ? 'text' : 'password'} autoComplete="new-password" error={passwordForm.formState.errors.newPassword?.message} endAdornment={visibilityControl('newPassword', 'New password')} {...passwordForm.register('newPassword')} />
              <Input label="Confirm new password" type={visible.confirmPassword ? 'text' : 'password'} autoComplete="new-password" error={passwordForm.formState.errors.confirmPassword?.message} endAdornment={visibilityControl('confirmPassword', 'Confirm new password')} {...passwordForm.register('confirmPassword')} />
            </div>
            {passwordError && <p role="alert" className="mt-4 text-sm text-danger">{passwordError}</p>}
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button type="button" variant="secondary" disabled={passwordForm.formState.isSubmitting} onClick={closePasswordForm}>Cancel</Button>
              <Button type="submit" disabled={passwordForm.formState.isSubmitting} aria-busy={passwordForm.formState.isSubmitting}>{passwordForm.formState.isSubmitting && <Spinner />} Change password</Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
