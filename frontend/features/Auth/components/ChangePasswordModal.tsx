'use client';

import { useState } from 'react';
import { useAuth } from '@/features/Auth/AuthContext';

export default function ChangePasswordModal({ 
  onClose 
}: { 
  onClose: () => void;
}) {
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/profile/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-[var(--card-color)] rounded-3xl p-8 max-w-md w-full border border-[var(--border-color)]">
          <div className="text-center">
            <div className="text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-[var(--main-color)] mb-2">
              Password Changed!
            </h2>
            <p className="text-[var(--secondary-color)]">
              Your password has been updated successfully.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--card-color)] rounded-3xl p-8 max-w-md w-full border border-[var(--border-color)]">
        <h2 className="text-2xl font-bold text-[var(--main-color)] mb-6">
          Change Password
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[var(--secondary-color)] mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--secondary-color)] mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]"
              required
              disabled={isLoading}
              minLength={8}
            />
            <p className="text-xs text-[var(--secondary-color)] mt-1">
              Minimum 8 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--secondary-color)] mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]"
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-500 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 rounded-xl border border-[var(--border-color)] text-[var(--secondary-color)] font-bold hover:bg-[var(--background-color)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 bg-[var(--main-color)] text-[var(--background-color)] rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
