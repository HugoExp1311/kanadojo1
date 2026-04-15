'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/Auth/AuthContext';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function AdminPage() {
  const { isAdmin, isAuthenticated, token, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [cloningUser, setCloningUser] = useState<User | null>(null);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [error, setError] = useState('');

  // Redirect if not admin - but wait for auth to load first
  useEffect(() => {
    if (authLoading) return; // Don't redirect while still loading auth state

    if (!isAuthenticated) {
      router.push('/login');
    } else if (!isAdmin) {
      router.push('/flashcard');
    }
  }, [isAuthenticated, isAdmin, authLoading, router]);

  // Fetch users
  useEffect(() => {
    if (isAdmin && token) {
      fetchUsers();
    }
  }, [isAdmin, token]);

  const fetchUsers = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setUsers(data.users);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      // Refresh user list
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-[var(--secondary-color)]">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[var(--main-color)] mb-2">
            Admin Dashboard
          </h1>
          <p className="text-[var(--secondary-color)]">
            Manage users and system settings
          </p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-[var(--secondary-color)] hover:bg-[var(--card-color)] transition-colors"
        >
          Logout
        </button>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-500 font-medium">{error}</p>
        </div>
      )}

      <div className="bg-[var(--card-color)] rounded-3xl p-8 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[var(--main-color)]">
            Users ({users.length})
          </h2>
          <div className="flex w-full sm:w-auto items-center gap-4">
            <input
              type="text"
              placeholder="Search users..."
              value={searchUserQuery}
              onChange={(e) => setSearchUserQuery(e.target.value)}
              className="flex-1 sm:w-64 px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--secondary-color)] focus:outline-none focus:border-[var(--main-color)]"
            />
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2.5 bg-[var(--main-color)] text-[var(--background-color)] rounded-xl font-bold hover:opacity-90 transition-opacity shrink-0"
            >
              + Create User
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-[var(--secondary-color)]">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--secondary-color)]">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="text-left py-3 px-4 font-bold text-[var(--main-color)]">Username</th>
                  <th className="text-left py-3 px-4 font-bold text-[var(--main-color)]">Email</th>
                  <th className="text-left py-3 px-4 font-bold text-[var(--main-color)]">Role</th>
                  <th className="text-left py-3 px-4 font-bold text-[var(--main-color)]">Created</th>
                  <th className="text-right py-3 px-4 font-bold text-[var(--main-color)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u =>
                  u.username.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
                  u.email.toLowerCase().includes(searchUserQuery.toLowerCase())
                ).map((user) => (
                  <tr key={user.id} className="border-b border-[var(--border-color)]">
                    <td className="py-3 px-4 text-[var(--secondary-color)] font-medium">{user.username}</td>
                    <td className="py-3 px-4 text-[var(--secondary-color)]">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'admin'
                        ? 'bg-purple-500/20 text-purple-500'
                        : 'bg-blue-500/20 text-blue-500'
                        }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--secondary-color)]">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setCloningUser(user)}
                          className="px-3 py-1 text-sm rounded-lg bg-[var(--main-color)]/10 text-[var(--main-color)] border border-[var(--main-color)]/20 hover:bg-[var(--main-color)]/20 transition-colors"
                        >
                          Clone Deck
                        </button>
                        <button
                          onClick={() => setEditingUser(user)}
                          className="px-3 py-1 text-sm rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="px-3 py-1 text-sm rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchUsers();
          }}
          token={token!}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            fetchUsers();
          }}
          token={token!}
        />
      )}

      {cloningUser && (
        <CloneDeckModal
          user={cloningUser}
          users={users}
          onClose={() => setCloningUser(null)}
          token={token!}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onSuccess, token }: {
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [useRandomPassword, setUseRandomPassword] = useState(false);
  const [role, setRole] = useState('user');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username,
          email,
          password: useRandomPassword ? undefined : password,
          role
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      const data = await response.json();

      if (data.generatedPassword) {
        setGeneratedPassword(data.generatedPassword);
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (generatedPassword) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-[var(--card-color)] rounded-3xl p-8 max-w-md w-full border border-[var(--border-color)]">
          <h2 className="text-2xl font-bold text-[var(--main-color)] mb-4">
            User Created Successfully!
          </h2>
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <p className="text-sm font-bold text-[var(--secondary-color)] mb-2">Generated Password:</p>
            <p className="text-2xl font-black text-[var(--main-color)] mb-2 break-all">{generatedPassword}</p>
            <p className="text-xs text-[var(--secondary-color)]">⚠️ Save this password - it won't be shown again!</p>
          </div>
          <button
            onClick={onSuccess}
            className="w-full py-3 bg-[var(--main-color)] text-[var(--background-color)] rounded-xl font-bold hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--card-color)] rounded-3xl p-8 max-w-md w-full border border-[var(--border-color)]">
        <h2 className="text-2xl font-bold text-[var(--main-color)] mb-6">
          Create New User
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[var(--secondary-color)] mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--secondary-color)] mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                checked={useRandomPassword}
                onChange={(e) => setUseRandomPassword(e.target.checked)}
                className="rounded"
                disabled={isLoading}
              />
              <span className="text-sm font-bold text-[var(--secondary-color)]">
                Generate random password
              </span>
            </label>

            {!useRandomPassword && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]"
                required={!useRandomPassword}
                disabled={isLoading}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--secondary-color)] mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]"
              disabled={isLoading}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
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
              {isLoading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onSuccess, token }: {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}) {
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user.role);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username,
          email,
          ...(password ? { password } : {}),
          role
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--card-color)] rounded-3xl p-8 max-w-md w-full border border-[var(--border-color)]">
        <h2 className="text-2xl font-bold text-[var(--main-color)] mb-6">
          Edit User: {user.username}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[var(--secondary-color)] mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--secondary-color)] mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--secondary-color)] mb-2">
              New Password (Optional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep unchanged"
              className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--secondary-color)] mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]"
              disabled={isLoading}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
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
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface FlashcardSummary {
  id: number;
  lessonName: string;
  cardCount: number;
  user: { id: string; username: string };
}

function CloneDeckModal({ user: sourceUser, onClose, token, users }: {
  user: User;
  onClose: () => void;
  token: string;
  users: User[];
}) {
  const [targetUserId, setTargetUserId] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [sourceFlashcardId, setSourceFlashcardId] = useState('');
  const [cloneAllFromSource, setCloneAllFromSource] = useState(false);
  const [newLessonName, setNewLessonName] = useState('');

  const [flashcards, setFlashcards] = useState<FlashcardSummary[]>([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const possibleTargetUsers = users.filter(u => u.id !== sourceUser.id);
  const filteredTargetUsers = userSearchQuery
    ? possibleTargetUsers.filter(u =>
      u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
    )
    : possibleTargetUsers;

  // Fetch decks for the focused SOURCE user
  useEffect(() => {
    const fetchUserDecks = async () => {
      setIsLoadingDecks(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/admin/flashcards`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Filter down to just this source user's decks
          const userDecks = data.flashcards.filter((f: FlashcardSummary) => String(f.user.id) === String(sourceUser.id));
          setFlashcards(userDecks);
        }
      } catch (e) {
        console.error('Failed to fetch flashcards', e);
      } finally {
        setIsLoadingDecks(false);
      }
    };
    fetchUserDecks();
  }, [sourceUser.id, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) {
      setError('Please select a target user to receive the decks.');
      return;
    }
    if (!cloneAllFromSource && !sourceFlashcardId) {
      setError('Please select a specific deck or choose to clone all.');
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      const payload = {
        sourceFlashcardIds: cloneAllFromSource ? 'all' : [sourceFlashcardId],
        sourceUserId: cloneAllFromSource ? sourceUser.id : undefined,
        newLessonName: newLessonName || undefined
      };

      const response = await fetch(`${apiUrl}/admin/users/${targetUserId}/clone-decks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clone deck(s)');
      }

      const data = await response.json();
      const targetUserObj = users.find(u => String(u.id) === targetUserId);
      const targetName = targetUserObj ? targetUserObj.username : targetUserId;

      if (cloneAllFromSource) {
        setSuccess(`Success! Cloned all ${data.clonedCount} deck(s) to ${targetName}. Copied ${data.cardCount} cards and ${data.readingCount} readings.`);
      } else {
        setSuccess(`Success! Cloned ${data.clonedCount} deck(s). Copied ${data.cardCount} cards & ${data.readingCount} readings.`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--card-color)] rounded-3xl p-6 max-w-lg w-full border border-[var(--border-color)] max-h-[85vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-[var(--main-color)] mb-2">
          Clone deck from {sourceUser.username}
        </h2>
        <p className="text-sm text-[var(--secondary-color)] mb-6">
          Pick which decks you want to copy from <strong>{sourceUser.username}</strong>, and who should receive them.
        </p>

        {success ? (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-medium">
              {success}
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-[var(--main-color)] text-[var(--background-color)] rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Target User Selection — search bar */}
            <div>
              <label className="block text-sm font-bold text-[var(--secondary-color)] mb-2">
                1. Select Target User (Recipient)
              </label>

              {targetUserId ? (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--main-color)]/40 bg-[var(--main-color)]/10">
                  <div>
                    <div className="font-bold text-[var(--main-color)] text-sm">
                      {possibleTargetUsers.find(u => String(u.id) === targetUserId)?.username}
                    </div>
                    <div className="text-xs text-[var(--secondary-color)] opacity-70">
                      {possibleTargetUsers.find(u => String(u.id) === targetUserId)?.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setTargetUserId(''); setUserSearchQuery(''); }}
                    className="ml-3 text-[var(--secondary-color)] hover:text-red-400 transition-colors text-lg leading-none"
                    title="Clear selection"
                  >✕</button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Search by username or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--main-color)] focus:outline-none focus:ring-2 focus:ring-[var(--main-color)] mb-2"
                    disabled={isLoading}
                  />
                  <div className="h-24 overflow-y-auto border border-[var(--border-color)] rounded-xl bg-[var(--background-color)] p-1">
                    {filteredTargetUsers.length === 0 ? (
                      <p className="p-3 text-sm text-[var(--secondary-color)] text-center">No users found.</p>
                    ) : (
                      filteredTargetUsers.map(u => (
                        <div
                          key={u.id}
                          onClick={() => setTargetUserId(String(u.id))}
                          className="p-3 rounded-lg cursor-pointer transition-colors hover:bg-[var(--card-color)] border border-transparent"
                        >
                          <div className="font-bold text-[var(--main-color)] text-sm">{u.username}</div>
                          <div className="text-xs text-[var(--secondary-color)] opacity-70">{u.email}</div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Deck Selection */}
            <div>
              <label className="block text-sm font-bold text-[var(--secondary-color)] mb-2">
                2. Select Deck(s) from {sourceUser.username} to Clone
              </label>

              <div className="mb-3">
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-[var(--border-color)] hover:bg-[var(--background-color)] transition-colors">
                  <input
                    type="radio"
                    name="cloneMode"
                    checked={cloneAllFromSource}
                    onChange={() => {
                      setCloneAllFromSource(true);
                      setSourceFlashcardId('');
                    }}
                    className="w-4 h-4 text-[var(--main-color)]"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-[var(--main-color)]">Clone ALL Decks ({flashcards.length})</div>
                    <div className="text-xs text-[var(--secondary-color)]">Copies every flashcard deck {sourceUser.username} owns.</div>
                  </div>
                </label>
              </div>

              <div className="mb-2">
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-[var(--border-color)] hover:bg-[var(--background-color)] transition-colors">
                  <input
                    type="radio"
                    name="cloneMode"
                    checked={!cloneAllFromSource}
                    onChange={() => setCloneAllFromSource(false)}
                    className="w-4 h-4 text-[var(--main-color)]"
                  />
                  <div className="flex-1 text-sm font-bold text-[var(--secondary-color)]">
                    Clone specific deck
                  </div>
                </label>
              </div>

              {!cloneAllFromSource && (
                <div className="h-28 overflow-y-auto border border-[var(--border-color)] rounded-xl bg-[var(--background-color)] p-1">
                  {isLoadingDecks ? (
                    <p className="p-3 text-sm text-[var(--secondary-color)] text-center">Loading decks...</p>
                  ) : flashcards.length === 0 ? (
                    <p className="p-3 text-sm text-[var(--secondary-color)] text-center">This user has no decks.</p>
                  ) : (
                    flashcards.map(deck => (
                      <div
                        key={deck.id}
                        onClick={() => setSourceFlashcardId(String(deck.id))}
                        className={`p-3 rounded-lg cursor-pointer flex justify-between items-center transition-colors ${sourceFlashcardId === String(deck.id)
                          ? 'bg-[var(--main-color)]/20 border border-[var(--main-color)]/30'
                          : 'hover:bg-[var(--card-color)] border border-transparent'
                          }`}
                      >
                        <div>
                          <div className="font-bold text-[var(--main-color)] text-sm">{deck.lessonName}</div>
                          <div className="text-xs text-[var(--secondary-color)] opacity-70">
                            ID: {deck.id} • {deck.cardCount} cards
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* New Name (Only for single deck clones) */}
            {!cloneAllFromSource && sourceFlashcardId && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-sm font-bold text-[var(--secondary-color)] mb-2">
                  3. New Lesson Name (Optional)
                </label>
                <input
                  type="text"
                  value={newLessonName}
                  onChange={(e) => setNewLessonName(e.target.value)}
                  placeholder="Leave blank to keep original name"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]"
                  disabled={isLoading}
                />
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-500 text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
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
                disabled={isLoading || (!cloneAllFromSource && !sourceFlashcardId)}
                className="flex-1 py-3 bg-[var(--main-color)] text-[var(--background-color)] rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? 'Cloning...' : cloneAllFromSource ? 'Clone All Decks' : 'Clone Single Deck'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
