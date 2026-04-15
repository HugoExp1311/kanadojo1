'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/Auth/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, isAdmin } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const userData = await login(username, password);
      
      // Redirect based on role (check the returned user data)
      if (userData?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/flashcard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background-color)] px-4">
      <div className="w-full max-w-md">
        <div className="bg-[var(--card-color)] rounded-3xl p-8 shadow-sm border border-[var(--border-color)]">
          <h1 className="text-3xl font-black text-[var(--main-color)] mb-2 text-center">
            Welcome Back
          </h1>
          <p className="text-[var(--secondary-color)] text-center mb-8">
            Sign in to access your flashcards
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-bold text-[var(--secondary-color)] mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-[var(--secondary-color)] mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-500 text-sm font-medium text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 rounded-xl bg-[var(--main-color)] text-[var(--background-color)] font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--secondary-color)]">
              Need an account? Contact an administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
