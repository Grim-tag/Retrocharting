'use client';

import { useEffect, useState } from 'react';
import { getApiUrl } from "@/lib/api";
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

type AdminStats = {
    total_products: number;
    scraped_products: number;
    scraped_percentage: number;
    total_value: number;
};

type AdminUser = {
    id: number;
    email: string;
    username: string | null;
    rank: string;
    xp: number;
    is_admin: boolean;
    created_at: string;
    last_active: string | null;
    ip_address: string | null;
};

export default function AdminDashboard() {
    const { token } = useAuth();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            if (!token) return;
            const apiUrl = getApiUrl();
            setLoading(true);
            try {
                const [statsRes, usersRes] = await Promise.all([
                    axios.get(`${apiUrl}/api/v1/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${apiUrl}/api/v1/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setStats(statsRes.data);
                setUsers(usersRes.data);
            } catch (error) {
                console.error("Failed to load admin data", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [token]);

    if (loading) {
        return <div className="text-white p-8">Loading dashboard data...</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
                label="Total Products"
                value={stats ? stats.total_products.toLocaleString() : "-"}
            />
            <StatCard
                label="Scraped Data"
                value={stats ? `${stats.scraped_percentage}%` : "-"}
                subtext={stats ? `${stats.scraped_products.toLocaleString()} items` : undefined}
            />
            <StatCard
                label="Total Value (CIB)"
                value={stats ? `$${stats.total_value.toLocaleString()}` : "-"}
                highlight
            />
            <StatCard
                label="System Status"
                value={stats ? "Online" : "Offline"}
                status={stats ? "green" : "red"}
            />

            <div className="col-span-full mt-8 p-6 bg-[#1f2533] border border-[#2a3142] rounded">
                <h2 className="text-xl font-bold mb-4">Welcome to RetroCharting Admin</h2>
                <p className="text-gray-400">
                    Your database is currently tracking <strong>{stats?.total_products.toLocaleString() ?? 0}</strong> products.
                </p>
            </div>

            <UserList users={users} />
        </div>
    );
}

function UserList({ users }: { users: AdminUser[] }) {
    return (
        <div className="col-span-full p-6 bg-[#1f2533] border border-[#2a3142] rounded">
            <h3 className="text-lg font-bold mb-4 text-white">User Management ({users.length})</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="text-xs uppercase bg-[#2a3142] text-gray-200">
                        <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Rank / XP</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Joined</th>
                            <th className="px-4 py-3">Last Active</th>
                            <th className="px-4 py-3">IP Address</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a3142]">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-[#2a3142]/50">
                                <td className="px-4 py-3 text-white">#{user.id}</td>
                                <td className="px-4 py-3">
                                    <div className="text-white font-medium">{user.username || "No Pseudo"}</div>
                                    <div className="text-xs">{user.email}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-[#ff6600] font-bold">{user.rank}</span>
                                    <div className="text-xs">{user.xp.toLocaleString()} XP</div>
                                </td>
                                <td className="px-4 py-3">
                                    {user.is_admin ? (
                                        <span className="px-2 py-1 rounded bg-purple-900 text-purple-200 text-xs">Admin</span>
                                    ) : (
                                        <span className="px-2 py-1 rounded bg-gray-700 text-gray-300 text-xs">User</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3">
                                    {user.last_active ? new Date(user.last_active).toLocaleString() : "Never"}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-400">
                                    {user.ip_address || "-"}
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                    No users found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatCard({ label, value, subtext, highlight, status }: { label: string; value: string; subtext?: string; highlight?: boolean; status?: "green" | "red" }) {
    return (
        <div className="bg-[#1f2533] p-6 rounded border border-[#2a3142]">
            <div className="text-gray-400 text-sm uppercase tracking-wider mb-2 flex justify-between">
                {label}
                {status && (
                    <span className={`h-2 w-2 rounded-full ${status === "green" ? "bg-green-500" : "bg-red-500"}`}></span>
                )}
            </div>
            <div className={`text-3xl font-bold ${highlight ? "text-[#ff6600]" : "text-white"}`}>{value}</div>
            {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
        </div>
    );
}
total_products: number;
scraped_products: number;
scraped_percentage: number;
total_value: number;
};

async function getStats(): Promise<AdminStats | null> {
    try {
        const apiUrl = getApiUrl();
        const secretKey = process.env.ADMIN_SECRET_KEY || "admin_secret_123";

        const res = await fetch(`${apiUrl}/api/v1/admin/stats`, {
            cache: 'no-store', // Always fetch fresh data for admin
            headers: {
                'X-Admin-Key': secretKey
            }
        });
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Failed to fetch admin stats", error);
        return null;
    }
}

export default async function AdminDashboard() {
    const stats = await getStats();

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
                label="Total Products"
                value={stats ? stats.total_products.toLocaleString() : "-"}
            />
            <StatCard
                label="Scraped Data"
                value={stats ? `${stats.scraped_percentage}%` : "-"}
                subtext={stats ? `${stats.scraped_products.toLocaleString()} items` : undefined}
            />
            <StatCard
                label="Total Value (CIB)"
                value={stats ? `$${stats.total_value.toLocaleString()}` : "-"}
                highlight
            />
            <StatCard
                label="System Status"
                value={stats ? "Online" : "Offline"}
                status={stats ? "green" : "red"}
            />

            <div className="col-span-full mt-8 p-6 bg-[#1f2533] border border-[#2a3142] rounded">
                <h2 className="text-xl font-bold mb-4">Welcome to RetroCharting Admin</h2>
                <p className="text-gray-400">
                    Your database is currently tracking <strong>{stats?.total_products.toLocaleString() ?? 0}</strong> items.
                </p>
            </div>

            <UserList />
        </div>
    );
}

type AdminUser = {
    id: number;
    email: string;
    username: string | null;
    rank: string;
    xp: number;
    is_admin: boolean;
    created_at: string;
    last_active: string | null;
    ip_address: string | null;
};

async function getUsers(): Promise<AdminUser[]> {
    try {
        const apiUrl = getApiUrl();
        const secretKey = process.env.ADMIN_SECRET_KEY || "admin_secret_123";

        const res = await fetch(`${apiUrl}/api/v1/admin/users`, {
            cache: 'no-store',
            headers: {
                'X-Admin-Key': secretKey
            }
        });
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Failed to fetch users", error);
        return [];
    }
}

async function UserList() {
    const users = await getUsers();

    return (
        <div className="col-span-full p-6 bg-[#1f2533] border border-[#2a3142] rounded">
            <h3 className="text-lg font-bold mb-4 text-white">User Management ({users.length})</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="text-xs uppercase bg-[#2a3142] text-gray-200">
                        <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Rank / XP</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Joined</th>
                            <th className="px-4 py-3">Last Active</th>
                            <th className="px-4 py-3">IP Address</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a3142]">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-[#2a3142]/50">
                                <td className="px-4 py-3 text-white">#{user.id}</td>
                                <td className="px-4 py-3">
                                    <div className="text-white font-medium">{user.username || "No Pseudo"}</div>
                                    <div className="text-xs">{user.email}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-[#ff6600] font-bold">{user.rank}</span>
                                    <div className="text-xs">{user.xp.toLocaleString()} XP</div>
                                </td>
                                <td className="px-4 py-3">
                                    {user.is_admin ? (
                                        <span className="px-2 py-1 rounded bg-purple-900 text-purple-200 text-xs">Admin</span>
                                    ) : (
                                        <span className="px-2 py-1 rounded bg-gray-700 text-gray-300 text-xs">User</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3">
                                    {user.last_active ? new Date(user.last_active).toLocaleString() : "Never"}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-400">
                                    {user.ip_address || "-"}
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                    No users found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatCard({ label, value, subtext, highlight, status }: { label: string; value: string; subtext?: string; highlight?: boolean; status?: "green" | "red" }) {
    return (
        <div className="bg-[#1f2533] p-6 rounded border border-[#2a3142]">
            <div className="text-gray-400 text-sm uppercase tracking-wider mb-2 flex justify-between">
                {label}
                {status && (
                    <span className={`h-2 w-2 rounded-full ${status === "green" ? "bg-green-500" : "bg-red-500"}`}></span>
                )}
            </div>
            <div className={`text-3xl font-bold ${highlight ? "text-[#ff6600]" : "text-white"}`}>{value}</div>
            {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
        </div>
    );
}
