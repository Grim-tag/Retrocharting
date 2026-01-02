"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function SystemTools() {
    const { token } = useAuth();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionMsg, setActionMsg] = useState("");

    useEffect(() => {
        if (token) fetchLogs();
    }, [token]);

    const fetchLogs = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://retrocharting.com'}/api/v1/admin/logs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setLogs(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const runAction = async (endpoint: string, method: string = 'GET', body: any = null) => {
        if (!confirm("Are you sure you want to run this action?")) return;

        setActionMsg(`Running ${endpoint}...`);
        try {
            const opts: any = {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };
            if (body) opts.body = JSON.stringify(body);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://retrocharting.com'}/api/v1/admin/${endpoint}`, opts);
            const data = await res.json();
            setActionMsg(`Success: ${JSON.stringify(data)}`);
            // Refresh logs if needed
            setTimeout(fetchLogs, 2000);
        } catch (e: any) {
            setActionMsg(`Error: ${e.message}`);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT: TOOLS */}
            <div className="lg:col-span-1 space-y-6">
                <h2 className="text-2xl font-bold text-[#ff6600]">Maintenance Tools</h2>

                <div className="bg-[#1f2533] p-6 rounded border border-[#2a3142] space-y-4">
                    <ToolButton
                        label="🛠️ Fix Genres (PC)"
                        desc="Standardize PC genres to match console list."
                        onClick={() => runAction('maintenance/fix-genres')}
                    />
                    <ToolButton
                        label="📦 Enrich PC Games"
                        desc="Trigger IGDB enrichment for 500 PC games."
                        onClick={() => runAction('enrich-pc-games')}
                    />
                    <ToolButton
                        label="🖼️ Migrate Images"
                        desc="Move external images to local storage (50 items)."
                        onClick={() => runAction('images/migrate', 'POST')}
                    />
                    <ToolButton
                        label="🏷️ Fix Listings Class"
                        desc="Re-run classifier on Amazon/eBay listings."
                        onClick={() => runAction('fix-listings', 'POST')}
                    />
                    <ToolButton
                        label="💾 DB Schema Migration"
                        desc="Add missing columns (EAN, Publisher...)."
                        onClick={() => runAction('db/migrate', 'POST')}
                    />
                    <div className="h-px bg-[#2a3142] my-2" />
                    <ToolButton
                        label="👻 Cleanup Ghost Games"
                        desc="Delete 30k+ empty games lingering after fusion."
                        onClick={() => runAction('consolidation/cleanup-ghosts', 'DELETE')}
                    />
                    <ToolButton
                        label="💰 Price Recovery (N64..)"
                        desc="Fetch missing CIB/New prices (Batch 5000)."
                        onClick={() => runAction('enrich/price-recovery?limit=5000', 'POST')}
                    />
                </div>

                {actionMsg && (
                    <div className="p-4 bg-black/50 text-green-400 font-mono text-xs rounded border border-green-900 break-words">
                        {actionMsg}
                    </div>
                )}
            </div>

            {/* RIGHT: LOGS */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">System Logs</h2>
                    <button onClick={() => fetchLogs()} className="text-sm text-[#ff6600] hover:underline">Refresh</button>
                </div>

                <div className="bg-[#1f2533] rounded border border-[#2a3142] overflow-hidden">
                    <table className="w-full text-xs font-mono">
                        <thead className="bg-[#161b26] text-gray-400 text-left">
                            <tr>
                                <th className="p-3">Time</th>
                                <th className="p-3">Source</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Items</th>
                                <th className="p-3">Details</th>
                                <th className="p-3">Duration</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log: any) => (
                                <tr key={log.id} className="border-b border-[#2a3142] hover:bg-[#2a3142]/50">
                                    <td className="p-3 text-gray-500">{new Date(log.start_time).toLocaleString()}</td>
                                    <td className="p-3 text-white font-bold">{log.source}</td>
                                    <td className="p-3">
                                        <span className={`px-1 rounded ${log.status === 'success' ? 'bg-green-900 text-green-200' :
                                            log.status === 'error' ? 'bg-red-900 text-red-200' : 'bg-yellow-900 text-yellow-200'
                                            }`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-gray-300">{log.items_processed} items</td>
                                    <td className="p-3 text-gray-400 max-w-xs truncate" title={log.error_message}>
                                        {log.error_message || '-'}
                                    </td>
                                    <td className="p-3 text-gray-500">{log.duration_seconds ? `${log.duration_seconds.toFixed(1)}s` : '-'}</td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">No logs found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function ToolButton({ label, desc, onClick }: any) {
    return (
        <button onClick={onClick} className="w-full text-left p-3 rounded bg-[#0f121e] hover:bg-[#161b26] border border-[#2a3142] transition-colors group">
            <div className="font-bold text-white group-hover:text-[#ff6600] transition-colors">{label}</div>
            <div className="text-xs text-gray-500">{desc}</div>
        </button>
    );
}
