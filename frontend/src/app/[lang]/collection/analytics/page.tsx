'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getPortfolioSummary, getPortfolioHistory, getPortfolioMovers, getPortfolioDebug } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { getCurrencyForLang, convertCurrency, formatCurrency } from '@/lib/currency';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

export default function AnalyticsPage() {
    const { token, isAuthenticated } = useAuth();
    const router = useRouter();
    const params = useParams();
    const lang = (params?.lang as string) || 'en'; // Safe access options
    const currency = getCurrencyForLang(lang);

    const [summary, setSummary] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [movers, setMovers] = useState<any>(null);
    const [debugData, setDebugData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [reportDate, setReportDate] = useState('');

    useEffect(() => {
        setIsMounted(true);
        setReportDate(new Date().toLocaleDateString());
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;

        async function loadData() {
            if (!token) return;
            setLoading(true);
            try {
                const [sumRes, histRes, movRes] = await Promise.all([
                    getPortfolioSummary(token),
                    getPortfolioHistory(token, -1),
                    getPortfolioMovers(token, 30)
                ]);
                setSummary(sumRes);
                setHistory(histRes);
                setMovers(movRes);

                // If history is empty, fetch debug info
                if (!histRes || histRes.length === 0) {
                    const dbg = await getPortfolioDebug(token);
                    setDebugData(dbg);
                }

            } catch (e) {
                console.error("Failed to load analytics data", e);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [token, isAuthenticated]);

    // Prevent hydration mismatch: render nothing until client-side hydration is complete
    if (!isMounted) return null;

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

    // Convert values for display
    const totalValueLoc = convertCurrency(summary?.total_value || 0, 'USD', currency);
    const totalInvestedLoc = convertCurrency(summary?.total_invested || 0, 'USD', currency);
    const totalProfitLoc = convertCurrency(summary?.total_profit || 0, 'USD', currency);

    // Convert chart data and ensure it's valid for Recharts
    const historyLoc = Array.isArray(history) ? history.map(h => ({
        ...h,
        value: convertCurrency(h.value || 0, 'USD', currency),
        invested: convertCurrency(h.invested || 0, 'USD', currency)
    })) : [];

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
                    <p className="text-gray-600">Generated on {reportDate}</p>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Card 1: Total Value */}
                    <div className="bg-[#1f2533] p-6 rounded-xl border border-[#2a3142] print:border-black print:bg-white">
                        <h3 className="text-gray-400 uppercase text-xs font-bold mb-2 print:text-black">Total Value</h3>
                        <div className="text-3xl font-bold text-[#22c55e]">
                            {formatCurrency(totalValueLoc, currency)}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">Current market value</div>
                    </div>

                    {/* Card 2: Total Invested */}
                    <div className="bg-[#1f2533] p-6 rounded-xl border border-[#2a3142] print:border-black print:bg-white">
                        <h3 className="text-gray-400 uppercase text-xs font-bold mb-2 print:text-black">Total Invested</h3>
                        <div className="text-3xl font-bold text-white print:text-black">
                            {formatCurrency(totalInvestedLoc, currency)}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">Based on paid price</div>
                    </div>

                    {/* Card 3: Unrealized Profit */}
                    <div className="bg-[#1f2533] p-6 rounded-xl border border-[#2a3142] print:border-black print:bg-white">
                        <h3 className="text-gray-400 uppercase text-xs font-bold mb-2 print:text-black">Total Profit</h3>
                        <div className={`text-3xl font-bold ${totalProfitLoc >= 0 ? 'text-[#22c55e]' : 'text-red-500'}`}>
                            {totalProfitLoc > 0 ? '+' : ''}{formatCurrency(totalProfitLoc, currency)}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">Unrealized gains</div>
                    </div>

                    {/* Card 4: Best Gem */}
                    <div className="bg-[#1f2533] p-6 rounded-xl border border-[#2a3142] print:border-black print:bg-white">
                        <h3 className="text-gray-400 uppercase text-xs font-bold mb-2 print:text-black">Most Valuable</h3>
                        {summary?.top_items?.[0] ? (
                            <div>
                                <div className="text-lg font-bold text-white truncate print:text-black" title={summary.top_items[0].name}>
                                    {summary.top_items[0].name}
                                </div>
                                <div className="text-[#ff6600] font-bold text-xl">
                                    {formatCurrency(convertCurrency(summary.top_items[0].value, 'USD', currency), currency)}
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-500">No items yet</div>
                        )}
                    </div>
                </div>

                {/* Chart Section */}
                <div className="bg-[#1f2533] p-6 rounded-xl border border-[#2a3142] mb-8 print:border-black print:bg-white print:break-inside-avoid">
                    <h3 className="text-xl font-bold mb-6 print:text-black">Value History (Calculated from Acquisition)</h3>
                    <div className="h-[300px] w-full">
                        {isMounted && historyLoc.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historyLoc}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
                                        tickFormatter={(val) => {
                                            if (val >= 1000) return `${currency === 'EUR' ? '€' : '$'}${(val / 1000).toFixed(1)}k`;
                                            return `${currency === 'EUR' ? '€' : '$'}${val}`;
                                        }}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#1f2533', borderColor: '#2a3142', color: '#fff' }}
                                        formatter={(value: number, name: string) => {
                                            const label = name === 'value' ? 'Market Value' : 'Invested';
                                            return [formatCurrency(value, currency), label];
                                        }}
                                        labelFormatter={(label) => {
                                            if (!label) return '';
                                            const d = new Date(label);
                                            return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        name="value"
                                        stroke="#22c55e"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="invested"
                                        name="invested"
                                        stroke="#ef4444"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorInvested)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                                <p>{isMounted ? "No history data available yet." : "Loading chart..."}</p>
                                {debugData && (
                                    <div className="text-xs font-mono text-left bg-black p-4 rounded border border-gray-700 max-w-lg overflow-auto">
                                        <p className="font-bold text-[#ff6600] mb-2">DEBUG INFO:</p>
                                        <pre>{JSON.stringify(debugData, null, 2)}</pre>
                                    </div>
                                )}
                            </div>
                        )}
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
                                    {formatCurrency(convertCurrency(item.value, 'USD', currency), currency)}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Movers Table */}
                    <div className="bg-[#1f2533] p-6 rounded-xl border border-[#2a3142] print:border-black print:bg-white print:break-inside-avoid">
                        <h3 className="text-xl font-bold mb-4 print:text-black">Top Movers (30 Days)</h3>
                        {movers?.gainers && movers.gainers.length > 0 ? (
                            movers.gainers.slice(0, 5).map((item: any, i: number) => {
                                const currentLoc = convertCurrency(item.current_price, 'USD', currency);
                                const absChangeLoc = convertCurrency(item.abs_change, 'USD', currency);

                                return (
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
                                            <div className="font-bold text-white print:text-black">
                                                {formatCurrency(currentLoc, currency)}
                                            </div>
                                            <div className="text-xs text-green-500">
                                                +{formatCurrency(absChangeLoc, currency)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-gray-500 text-center py-8">No significant movement yet.</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
