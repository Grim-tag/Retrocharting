'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from "@/lib/client";

type AdminStats = {
    total_products: number;
    scraped_products: number;
    scraped_percentage: number;
    total_value: number;
    pending_image_migration?: number;
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

    const loadData = async () => {
        if (!token) return;
        // setLoading(true); // Don't block UI on refresh
        try {
            const [statsRes, usersRes] = await Promise.all([
                apiClient.get('/admin/stats'),
                apiClient.get('/admin/users')
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);
        } catch (error) {
            console.error("Failed to load admin data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
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
                value={stats ? `${stats.total_value.toLocaleString()}` : "-"}
                highlight
            />
            {/* Pending Migration Stat Card */}
            <StatCard
                label="Images to Migrate"
                value={stats?.pending_image_migration ? stats.pending_image_migration.toLocaleString() : "0"}
                highlight={!!stats?.pending_image_migration && stats.pending_image_migration > 0}
                status={stats?.pending_image_migration && stats.pending_image_migration > 0 ? "red" : "green"}
            />

            <div className="col-span-full mt-8 p-6 bg-[#1f2533] border border-[#2a3142] rounded">
                <h2 className="text-xl font-bold mb-4">Welcome to RetroCharting Admin</h2>
                <p className="text-gray-400">
                    Your database is currently tracking <strong>{stats?.total_products.toLocaleString() ?? 0}</strong> products.
                </p>

                <div className="mt-6 pt-6 border-t border-[#2a3142]">
                    <h3 className="text-lg font-bold mb-4 text-white">Maintenance Tools</h3>
                    <div className="flex gap-4">
                        <AutoMigrationControl
                            pendingCount={stats?.pending_image_migration}
                            onRefreshStats={loadData}
                        />
                    </div>
                </div>
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

function AutoMigrationControl({ pendingCount, onRefreshStats }: { pendingCount?: number, onRefreshStats: () => void }) {
    const [active, setActive] = useState(false);
    const [processedSession, setProcessedSession] = useState(0);
    const [status, setStatus] = useState<string>("Ready");
    const activeRef = useRef(false);

    // Toggle Handler
    const toggleMigration = () => {
        if (active) {
            // STOP
            setActive(false);
            activeRef.current = false;
            setStatus("Stopping...");
        } else {
            // START
            if (!confirm(`Start auto-migration? This will process batches of 50 until complete or stopped.`)) return;
            setActive(true);
            activeRef.current = true;
            runLoop();
        }
    };

    const runLoop = async () => {
        setStatus("Initializing...");
        let total = 0;

        while (activeRef.current) {
            try {
                setStatus(`Migrating batch... (Session total: ${total})`);

                const res = await apiClient.post('/admin/images/migrate?limit=50');
                const migrated = res.data.migrated || 0;
                total += migrated;
                setProcessedSession(total);

                // Update global stats periodically
                onRefreshStats();

                if (migrated === 0 && res.data.status === "completed") {
                    setStatus("All images migrated! 🎉");
                    setActive(false);
                    activeRef.current = false;
                    break;
                }

                // Wait 1.5s to be gentle
                setStatus(`Waiting cooldown... (Session total: ${total})`);
                await new Promise(r => setTimeout(r, 1500));

            } catch (error: any) {
                console.error("Migration loop error", error);
                setStatus("Error in batch. Retrying in 5s...");
                await new Promise(r => setTimeout(r, 5000));
            }
        }

        if (!activeRef.current && status !== "All images migrated! 🎉") {
            setStatus("Stopped by user.");
        }
    };

    return (
        <div className="flex flex-col items-start gap-3 bg-[#2a3142]/50 p-4 rounded border border-[#2a3142]">
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleMigration}
                    className={`px-6 py-2 rounded font-bold transition-colors ${active
                            ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                >
                    {active ? "STOP MIGRATION" : "START AUTO-MIGRATION"}
                </button>

                <div className="flex flex-col">
                    <span className="text-sm text-gray-300 font-mono">
                        {status}
                    </span>
                    {active && (
                        <span className="text-xs text-gray-500">Do not close this tab.</span>
                    )}
                </div>
            </div>

            <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                {/* Progress bar could go here, but total is unknown initially beyond pendingCount */}
                <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: pendingCount && pendingCount > 0 ? `${Math.min(100, (processedSession / (processedSession + pendingCount)) * 100)}%` : '0%' }}
                ></div>
            </div>

            <div className="text-xs text-gray-400 flex gap-4">
                <span>Remaining: <strong className="text-white">{pendingCount?.toLocaleString() ?? 0}</strong></span>
                <span>Session Processed: <strong className="text-green-400">{processedSession.toLocaleString()}</strong></span>
            </div>
        </div>
    );
}
