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

    if (!user) return null;

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
                <h1 className="text-3xl font-bold mb-8 border-b border-[#3a4152] pb-4">Edit Profile</h1>

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
            </div>
        </div>
    );
}
