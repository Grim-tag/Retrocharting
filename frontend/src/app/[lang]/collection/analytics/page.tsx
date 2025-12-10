'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getPortfolioSummary, getPortfolioHistory, getPortfolioMovers } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

export default function AnalyticsPage() {
    const { token, isAuthenticated } = useAuth();
    const router = useRouter();

    const [summary, setSummary] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [movers, setMovers] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) return;

        async function loadData() {
            if (!token) return;
            setLoading(true);
            try {
                // If APIs return null/defaults, the destructured variables will hold them
                const [sumRes, histRes, movRes] = await Promise.all([
                    getPortfolioSummary(token),
                    getPortfolioHistory(token, 30),
                    getPortfolioMovers(token, 30)
                ]);
                setSummary(sumRes);
                setHistory(histRes);
                setMovers(movRes);
            } catch (e) {
                console.error("Failed to load analytics data", e);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [token, isAuthenticated]);

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0f121e] text-white">
                <p>Please log in to view your portfolio analytics.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0f121e] text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ff6600]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f121e] py-8 text-white print:bg-white print:text-black">
            <div className="max-w-[1400px] mx-auto px-4">

                {/* Header Actions */}
                <div className="flex justify-between items-center mb-8 print:hidden">
                    <div>
                        <h1 className="text-3xl font-bold">Portfolio Analytics</h1>
                        <p className="text-gray-400">Track your collection value and performance.</p>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="bg-[#2a3142] hover:bg-[#353e54] text-white font-bold py-2 px-4 rounded border border-[#3a4152]"
                    >
                        🖨️ Print Report
                    </button>
                </div>

                {/* Print Header (Only visible when printing) */}
                <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
                    <h1 className="text-4xl font-bold">Collection Valuation Report</h1>
                    <p className="text-gray-600">Generated on {new Date().toLocaleDateString()}</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Card 1: Total Value */}
                    <div className="bg-[#1f2533] p-6 rounded-xl border border-[#2a3142] print:border-black print:bg-white">
                        <h3 className="text-gray-400 uppercase text-xs font-bold mb-2 print:text-black">Total Value</h3>
                        <div className="text-4xl font-bold text-[#22c55e]">
                            {/* Check for summary existence before accessing properties */}
                            ${(summary?.total_value || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">Estimated market value today</div>
                    </div>

                    {/* Card 2: Item Count */}
                    <div className="bg-[#1f2533] p-6 rounded-xl border border-[#2a3142] print:border-black print:bg-white">
                        <h3 className="text-gray-400 uppercase text-xs font-bold mb-2 print:text-black">Total Games</h3>
                        <div className="text-4xl font-bold text-white print:text-black">
                            {summary?.item_count || 0}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">Across {summary?.console_count || 0} consoles</div>
                    </div>

                    {/* Card 3: Best Gem */}
                    <div className="bg-[#1f2533] p-6 rounded-xl border border-[#2a3142] print:border-black print:bg-white">
                        <h3 className="text-gray-400 uppercase text-xs font-bold mb-2 print:text-black">Most Valuable Item</h3>
                        {summary?.top_items && summary.top_items.length > 0 ? (
                            <div>
                                <div className="text-2xl font-bold text-white truncate print:text-black" title={summary.top_items[0].name}>
                                    {summary.top_items[0].name}
                                </div>
                                <div className="text-[#ff6600] font-bold text-xl">
                                    ${(summary.top_items[0].value || 0).toLocaleString()}
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-500">No items yet</div>
                        )}
                    </div>
                </div>

                {/* Chart Section */}
                <div className="bg-[#1f2533] p-6 rounded-xl border border-[#2a3142] mb-8 print:border-black print:bg-white print:break-inside-avoid">
                    <h3 className="text-xl font-bold mb-6 print:text-black">Value History (30 Days)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history || []}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a3142" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(str) => {
                                        if (!str) return '';
                                        const d = new Date(str);
                                        return isNaN(d.getTime()) ? '' : d.getDate().toString();
                                    }}
                                    stroke="#6b7280"
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#6b7280"
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#1f2533', borderColor: '#2a3142', color: '#fff' }}
                                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]}
                                    labelFormatter={(label) => {
                                        if (!label) return '';
                                        const d = new Date(label);
                                        return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#22c55e"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-1">
                    {/* Top Assets Table */}
                    <div className="bg-[#1f2533] p-6 rounded-xl border border-[#2a3142] print:border-black print:bg-white print:break-inside-avoid">
                        <h3 className="text-xl font-bold mb-4 print:text-black">Top 5 Most Valuable</h3>
                        {summary?.top_items?.map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between py-3 border-b border-[#2a3142] last:border-0 print:border-gray-200">
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-500 font-mono w-4">#{i + 1}</span>
                                    <div>
                                        <div className="font-bold print:text-black">{item.name}</div>
                                        <div className="text-xs text-gray-400">{item.console}</div>
                                    </div>
                                </div>
                                <div className="font-bold text-[#ff6600]">
                                    ${item.value.toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Movers Table */}
                    <div className="bg-[#1f2533] p-6 rounded-xl border border-[#2a3142] print:border-black print:bg-white print:break-inside-avoid">
                        <h3 className="text-xl font-bold mb-4 print:text-black">Top Movers (30 Days)</h3>
                        {movers?.gainers && movers.gainers.length > 0 ? (
                            movers.gainers.slice(0, 5).map((item: any, i: number) => (
                                <div key={i} className="flex items-center justify-between py-3 border-b border-[#2a3142] last:border-0 print:border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <div className="text-green-500 bg-green-500/10 px-2 py-1 rounded text-xs font-bold">
                                            +{item.pct_change}%
                                        </div>
                                        <div>
                                            <div className="font-bold print:text-black">{item.name}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-white print:text-black">${item.current_price}</div>
                                        <div className="text-xs text-green-500">+${item.abs_change}</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-gray-500 text-center py-8">No significant movement yet.</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
