import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ShieldCheck,
  User as UserIcon,
  Lock,
  Mail,
  Phone,
  Calendar,
  Pencil,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getProfile, updateProfile } from '@/api/profileApi';
import { useAuth } from '@/hooks/useAuth';
import { passwordSchema, profileSchema } from '@/schemas/profileSchemas';
import {
  Button,
  ErrorState,
  Input,
  PageHeader,
  PageSkeleton,
  Spinner,
} from '@/components/common';
import { getErrorMessage } from '@/utils/errorHandler';
import type { User } from '@/types';

/** Format a date string as "Member since Mon YYYY" */
function formatMemberSince(dateStr?: string): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return `Member since ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  } catch {
    return null;
  }
}

/** Format a date string as "Last updated on Mon DD, YYYY" */
function formatLastUpdated(dateStr?: string): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return `Last updated on ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } catch {
    return null;
  }
}

export default function ProfilePage() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [error, setError] = useState('');

  // Toggle states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  // ----- Profile form (fullName + contactNumber only — email is read-only) -----
  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      contactNumber: '',
    },
  });

  const {
    formState: { isSubmitting: profileSubmitting, errors: profileErrors },
    register: profileRegister,
    handleSubmit: profileHandleSubmit,
    reset: profileReset,
  } = profileForm;

  // ----- Password form -----
  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const {
    formState: {
      isDirty: pwDirty,
      isValid: pwValid,
      isSubmitting: pwSubmitting,
      errors: pwErrors,
    },
    register: pwRegister,
    handleSubmit: pwHandleSubmit,
    reset: pwReset,
  } = passwordForm;

  useEffect(() => {
    getProfile()
      .then((r) => {
        setProfile(r.data);
        profileReset({
          fullName: r.data.fullName || '',
          contactNumber: r.data.contactNumber || '',
        });
      })
      .catch((e) => setError(getErrorMessage(e)));
  }, [profileReset]);

  if (error) return <ErrorState message={error} />;
  if (!profile) return <PageSkeleton />;

  // Start editing personal info
  const startEditingProfile = () => {
    profileReset({
      fullName: profile.fullName || '',
      contactNumber: profile.contactNumber || '',
    });
    setIsEditingProfile(true);
  };

  // Cancel editing personal info
  const cancelEditingProfile = () => {
    profileReset({
      fullName: profile.fullName || '',
      contactNumber: profile.contactNumber || '',
    });
    setIsEditingProfile(false);
  };

  // Save profile — sends only fullName and contactNumber, never email
  const saveProfile = async (values: { fullName: string; contactNumber: string }) => {
    try {
      const { data } = await updateProfile({
        fullName: values.fullName,
        contactNumber: values.contactNumber,
      });
      setProfile(data.user);
      updateUser(data.user);
      profileReset({
        fullName: data.user.fullName,
        contactNumber: data.user.contactNumber,
      });
      setIsEditingProfile(false);
      toast.success(data.message || 'Profile updated successfully');
    } catch (e) {
      toast.error(getErrorMessage(e));
      // Keep in edit mode so user input is preserved
    }
  };

  // Start editing password
  const startEditingPassword = () => {
    pwReset({
      password: '',
      confirmPassword: '',
    });
    setIsEditingPassword(true);
  };

  // Cancel editing password
  const cancelEditingPassword = () => {
    pwReset({
      password: '',
      confirmPassword: '',
    });
    setIsEditingPassword(false);
  };

  // Save password — completely independent from profile save
  const savePassword = async (values: { password: string }) => {
    try {
      const { data } = await updateProfile({ password: values.password });
      pwReset({
        password: '',
        confirmPassword: '',
      });
      setIsEditingPassword(false);
      toast.success(data.message || 'Password changed successfully');
    } catch (e) {
      toast.error(getErrorMessage(e));
      // Keep expanded so user can resolve issue
    }
  };

  const memberSince = formatMemberSince(profile.createdAt);
  const passwordLastUpdated = formatLastUpdated(profile.updatedAt);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Settings"
        subtitle="Manage your personal profile credentials and workspace security."
      />

      <div className="grid max-w-5xl gap-6 lg:grid-cols-[300px_1fr]">
        {/* Left Profile Overview Card */}
        <aside className="space-y-4">
          <div className="app-panel p-6 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-900 text-xl font-bold text-white shadow-xs ring-4 ring-slate-100">
              {profile.fullName?.slice(0, 1).toUpperCase() || 'U'}
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">{profile.fullName}</h2>
            <p className="text-xs text-content-muted mt-0.5 truncate">{profile.email}</p>

            <div className="mt-4 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{profile.role}</span>
              </span>
            </div>

            <div className="mt-6 border-t border-line pt-4 text-left space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2.5">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{profile.contactNumber || 'No phone set'}</span>
              </div>
              {memberSince && (
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{memberSince}</span>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Right Edit Panels */}
        <div className="space-y-6">
          {/* ========================================================================= */}
          {/* 1. PERSONAL DETAILS SECTION */}
          {/* ========================================================================= */}
          <section className="app-panel p-5 sm:p-7">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Personal information</h2>
                  <p className="text-xs text-content-muted">
                    {isEditingProfile
                      ? 'Update your personal details below'
                      : 'Your contact and account display information'}
                  </p>
                </div>
              </div>

              {!isEditingProfile && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={startEditingProfile}
                  aria-label="Edit personal information"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </Button>
              )}
            </div>

            {!isEditingProfile ? (
              /* READ-ONLY / DISPLAY STATE */
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-line/70 bg-slate-50/60 p-3.5">
                    <span className="field-label text-slate-500 block">Full name</span>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {profile.fullName || '—'}
                    </p>
                  </div>

                  <div className="rounded-lg border border-line/70 bg-slate-50/60 p-3.5">
                    <span className="field-label text-slate-500 block">Contact number</span>
                    <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                      {profile.contactNumber || '—'}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-line/70 bg-slate-50/60 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="field-label text-slate-500 block">Email address</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {profile.email}
                  </p>
                </div>
              </div>
            ) : (
              /* EDIT MODE STATE */
              <form onSubmit={profileHandleSubmit(saveProfile)} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Full name"
                    placeholder="Your full name"
                    error={profileErrors.fullName?.message}
                    {...profileRegister('fullName')}
                  />
                  <Input
                    label="Contact number"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    error={profileErrors.contactNumber?.message}
                    {...profileRegister('contactNumber')}
                  />
                </div>

                {/* Email — permanently read-only */}
                <div className="block">
                  <div className="flex items-center justify-between">
                    <label className="field-label text-slate-700">Email address</label>
                  </div>
                  <div className="relative mt-1.5">
                    <input
                      type="email"
                      value={profile.email}
                      readOnly
                      disabled
                      aria-label="Email address — read only"
                      className="field-control"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={cancelEditingProfile}
                    disabled={profileSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={profileSubmitting}
                  >
                    {profileSubmitting && <Spinner />}
                    <span>Save changes</span>
                  </Button>
                </div>
              </form>
            )}
          </section>

          {/* ========================================================================= */}
          {/* 2. SECURITY & CREDENTIALS SECTION */}
          {/* ========================================================================= */}
          <section className="app-panel p-5 sm:p-7">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Security &amp; credentials</h2>
                  <p className="text-xs text-content-muted">
                    {isEditingPassword
                      ? 'Create a strong, secure new password'
                      : 'Password protection and authentication settings'}
                  </p>
                </div>
              </div>

              {!isEditingPassword && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={startEditingPassword}
                  aria-label="Change account password"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Change password</span>
                </Button>
              )}
            </div>

            {!isEditingPassword ? (
              /* COLLAPSED / READ-ONLY STATE */
              <div className="mt-5 flex items-center justify-between rounded-lg border border-line/70 bg-slate-50/60 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Account password is set</p>
                    <p className="text-xs text-content-muted mt-0.5">
                      {passwordLastUpdated ? passwordLastUpdated : 'Your account is secured with a password'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* EXPANDED EDIT MODE STATE */
              <form onSubmit={pwHandleSubmit(savePassword)} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="New password"
                    type="password"
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    hint="Minimum 8 characters with numbers"
                    error={pwErrors.password?.message}
                    {...pwRegister('password')}
                  />
                  <Input
                    label="Confirm new password"
                    type="password"
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    hint="Must match the password above"
                    error={pwErrors.confirmPassword?.message}
                    {...pwRegister('confirmPassword')}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={cancelEditingPassword}
                    disabled={pwSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={pwSubmitting || !pwDirty || !pwValid}
                  >
                    {pwSubmitting && <Spinner />}
                    <span>Update password</span>
                  </Button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
