import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { getProfile, updateProfile } from '@/api/profileApi';
import { useAuth } from '@/hooks/useAuth';
import { profileSchema } from '@/schemas/profileSchemas';
import {
  Button,
  ErrorState,
  Input,
  PageHeader,
  PageSkeleton,
  RoleBadge,
  Spinner,
} from '@/components/common';
import { getErrorMessage } from '@/utils/errorHandler';
import type { User } from '@/types';

export default function ProfilePage() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const {
    formState: { isSubmitting: profileSubmitting, errors: profileErrors },
    register: profileRegister,
    handleSubmit: profileHandleSubmit,
    reset: profileReset,
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', contactNumber: '' },
  });

  const loadProfile = useCallback(() => {
    setError('');
    getProfile()
      .then((response) => {
        setProfile(response.data);
        profileReset({
          fullName: response.data.fullName || '',
          contactNumber: response.data.contactNumber || '',
        });
      })
      .catch((reason) => setError(getErrorMessage(reason)));
  }, [profileReset]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (error) return <ErrorState message={error} retry={loadProfile} />;
  if (!profile) return <PageSkeleton />;

  const resetToSaved = () =>
    profileReset({
      fullName: profile.fullName || '',
      contactNumber: profile.contactNumber || '',
    });

  const saveProfile = async (values: { fullName: string; contactNumber: string }) => {
    try {
      const { data } = await updateProfile({
        fullName: values.fullName,
        contactNumber: values.contactNumber,
      });
      setProfile(data.user);
      updateUser(data.user);
      profileReset({ fullName: data.user.fullName, contactNumber: data.user.contactNumber });
      setIsEditingProfile(false);
      toast.success(data.message || 'Profile updated successfully');
    } catch (reason) {
      toast.error(getErrorMessage(reason));
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Profile" subtitle="Manage your account information." />

      <section
        className="app-panel flex min-w-0 flex-wrap items-center gap-4 p-5 sm:p-6"
        aria-label="Account identity"
      >
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-900 text-xl font-bold text-white">
          {profile.fullName?.slice(0, 1).toUpperCase() || 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-slate-900">{profile.fullName}</h2>
          <p className="break-all text-sm text-content-muted">{profile.email}</p>
        </div>
        <RoleBadge role={profile.role} />
      </section>

      <section className="app-panel p-5 sm:p-6" aria-labelledby="account-details-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 id="account-details-title" className="text-base font-semibold text-slate-900">
              Account details
            </h2>
            <p className="mt-0.5 text-sm text-content-muted">Your saved account information.</p>
          </div>
          {!isEditingProfile && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                resetToSaved();
                setIsEditingProfile(true);
              }}
            >
              <Pencil aria-hidden="true" className="h-4 w-4" /> Edit details
            </Button>
          )}
        </div>

        {isEditingProfile ? (
          <form onSubmit={profileHandleSubmit(saveProfile)} className="mt-5 space-y-5">
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
                placeholder="03XX XXXXXXX"
                error={profileErrors.contactNumber?.message}
                {...profileRegister('contactNumber')}
              />
            </div>
            <div>
              <p className="field-label">Email address</p>
              <p className="mt-1 break-all text-sm text-slate-700">{profile.email}</p>
              <p className="mt-1 text-xs text-content-muted">Email cannot be changed here.</p>
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  resetToSaved();
                  setIsEditingProfile(false);
                }}
                disabled={profileSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={profileSubmitting}>
                {profileSubmitting && <Spinner />} Save changes
              </Button>
            </div>
          </form>
        ) : (
          <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div>
              <dt className="field-label">Full name</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {profile.fullName || 'Not provided'}
              </dd>
            </div>
            <div>
              <dt className="field-label">Contact number</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {profile.contactNumber || 'Not provided'}
              </dd>
            </div>
            <div>
              <dt className="field-label">Email address</dt>
              <dd className="mt-1 break-all text-sm font-medium text-slate-900">{profile.email}</dd>
            </div>
            <div>
              <dt className="field-label">Account role</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{profile.role}</dd>
            </div>
          </dl>
        )}
      </section>
    </div>
  );
}
