"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

export default function UsersTable() {
    const { token } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) fetchUsers();
    }, [token]);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://retrocharting.com'}/api/v1/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setUsers(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-gray-400 p-8 text-center">Loading Users...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#ff6600]">User Management</h2>

            <div className="bg-[#1f2533] rounded border border-[#2a3142] overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="text-gray-400 bg-[#161b26] border-b border-[#2a3142]">
                        <tr>
                            <th className="py-3 px-6">ID</th>
                            <th className="py-3 px-6">User</th>
                            <th className="py-3 px-6">Rank</th>
                            <th className="py-3 px-6">Role</th>
                            <th className="py-3 px-6">Joined</th>
                            <th className="py-3 px-6">Last Active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.id} className="border-b border-[#2a3142] hover:bg-[#2a3142]/50">
                                <td className="py-3 px-6 text-gray-500">#{u.id}</td>
                                <td className="py-3 px-6">
                                    <div className="font-bold text-white">{u.email}</div>
                                    <div className="text-xs text-gray-400">{u.username || 'No username'}</div>
                                </td>
                                <td className="py-3 px-6">
                                    <span className="bg-gray-700 px-2 py-1 rounded text-xs">{u.rank || 'Novice'}</span>
                                    <span className="ml-2 text-xs text-gray-500">{u.xp} XP</span>
                                </td>
                                <td className="py-3 px-6">
                                    {u.is_admin ? (
                                        <span className="text-red-400 font-bold border border-red-900 bg-red-900/20 px-2 py-1 rounded text-xs">ADMIN</span>
                                    ) : (
                                        <span className="text-gray-400">User</span>
                                    )}
                                </td>
                                <td className="py-3 px-6 text-gray-400">
                                    {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '-'}
                                </td>
                                <td className="py-3 px-6 text-gray-400">
                                    {u.last_active ? format(new Date(u.last_active), 'MMM d, HH:mm') : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
