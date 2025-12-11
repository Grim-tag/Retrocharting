'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateUser } from '@/lib/api';

export default function ProfilePage({ dict, lang }: { dict: any; lang: string }) {
    const { user, token, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        username: user?.username || '',
        full_name: user?.full_name || ''
    });

    const [deleteConfirm, setDeleteConfirm] = useState(false);

    if (!user) return null;

    const handleDeleteAccount = async () => {
        if (!confirm("Are you sure? This is irreversible.")) return;
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/v1/auth/me`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                // Logout/Redirect logic here? Ideally force logout.
                window.location.href = '/';
            } else {
                alert("Failed to delete account.");
            }
        } catch (e) {
            console.error(e);
            alert("Error deleting account.");
        }
    };

    const xp = user.xp || 0;
    const rank = user.rank || "Loose";
    // Simple Next Rank Logic (duplicated from backend for UI, or we could fetch it)
    // For now hardcoded purely visual based on ranges
    const RANKS = [
        { name: "Loose", min: 0 },
        { name: "Notice Only", min: 500 },
        { name: "Boxed", min: 1500 },
        { name: "CIB", min: 5000 },
        { name: "Mint", min: 15000 },
        { name: "Factory Sealed", min: 30000 },
        { name: "Graded", min: 50000 }
    ];
    let nextRank = RANKS.find(r => r.min > xp);
    let prevRank = [...RANKS].reverse().find(r => r.min <= xp);

    // safe fallback
    if (!prevRank) prevRank = RANKS[0];

    const nextLimit = nextRank ? nextRank.min : xp; // Cap if max
    const prevLimit = prevRank.min;
    const progress = nextRank
        ? Math.min(100, Math.max(0, ((xp - prevLimit) / (nextLimit - prevLimit)) * 100))
        : 100;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await updateUser(token!, formData);
            await refreshUser();
            setSuccess("Profile updated successfully!");
        } catch (err) {
            setError("Failed to update profile. Username might be taken.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#1f2533] text-white py-12 px-4">
            <div className="max-w-2xl mx-auto bg-[#2a3142] rounded-lg shadow-xl p-8 border border-[#3a4152]">
                <h1 className="text-3xl font-bold mb-8 border-b border-[#3a4152] pb-4">My Agent Profile</h1>

                {/* Gamification Card */}
                <div className="bg-[#151922] p-6 rounded-lg border border-[#3a4152] mb-8 relative overflow-hidden">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <div className="text-sm text-gray-400">Current Rank</div>
                            <div className="text-3xl font-bold text-[#ff6600]">{rank}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold">{xp.toLocaleString()} <span className="text-sm font-normal text-gray-400">RP</span></div>
                            {nextRank && <div className="text-xs text-gray-500">Next: {nextRank.name} ({nextRank.min.toLocaleString()} RP)</div>}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#2a3142] rounded-full h-4 overflow-hidden mb-2">
                        <div
                            className="bg-gradient-to-r from-[#ff6600] to-[#ff8533] h-4 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="text-xs text-center text-gray-500 uppercase tracking-widest">
                        {progress.toFixed(0)}% to next rank
                    </div>
                </div>

                <div className="flex items-center gap-6 mb-8">
                    <img src={user.avatar_url} alt="You" className="w-24 h-24 rounded-full border-4 border-[#ff6600]" />
                    <div>
                        <div className="text-sm text-gray-400 uppercase tracking-wide">Google Account</div>
                        <div className="text-lg font-medium">{user.email}</div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-gray-300 text-sm font-bold mb-2">Username (Pseudo)</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                            className="w-full bg-[#1f2533] border border-[#3a4152] rounded p-3 text-white focus:border-[#ff6600] outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-300 text-sm font-bold mb-2">Full Name</label>
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full bg-[#1f2533] border border-[#3a4152] rounded p-3 text-white focus:border-[#ff6600] outline-none"
                        />
                    </div>

                    {error && <div className="bg-red-900/50 text-red-200 p-3 rounded">{error}</div>}
                    {success && <div className="bg-green-900/50 text-green-200 p-3 rounded">{success}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#ff6600] hover:bg-[#e65c00] text-white font-bold py-3 rounded transition-colors"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>

                <div className="mt-12 pt-8 border-t border-[#3a4152]">
                    <h3 className="text-xl font-bold text-red-500 mb-4">Danger Zone</h3>
                    <p className="text-gray-400 mb-4 text-sm">
                        Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <button
                        onClick={handleDeleteAccount}
                        className="border border-red-500 text-red-500 hover:bg-red-500/10 px-6 py-2 rounded transition-colors"
                    >
                        Delete My Account
                    </button>
                </div>
            </div>
        </div>
    );
}
