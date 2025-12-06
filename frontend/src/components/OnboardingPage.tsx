'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateUser } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function OnboardingPage({ lang }: { lang: string }) {
    const { user, token, refreshUser } = useAuth(); // Need refreshUser to update context after API call
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!username || username.length < 3) {
            setError("Username must be at least 3 characters.");
            return;
        }

        setLoading(true);
        try {
            await updateUser(token!, { username });
            await refreshUser(); // Update local context
            router.push(`/${lang}/collection`); // Redirect to collection or home
        } catch (err: any) {
            setError("Username already taken or invalid.");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#0f121e] flex flex-col items-center justify-center p-4 text-white">
            <div className="max-w-md w-full bg-[#1f2533] border border-[#2a3142] rounded-xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <img src={user.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-[#ff6600]" />
                    <h1 className="text-2xl font-bold mb-2">Welcome!</h1>
                    <p className="text-gray-400">Please choose a unique username to start your collection.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-sm font-bold mb-2 text-gray-300">Username</label>
                        <input
                            type="text"
                            className="w-full bg-[#0f121e] border border-[#3a4152] rounded p-3 text-white focus:border-[#ff6600] outline-none transition-colors"
                            placeholder="e.g. RetroKing99"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#ff6600] hover:bg-[#e65c00] text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Setting up...' : 'Start Collecting'}
                    </button>
                </form>
            </div>
        </div>
    );
}
