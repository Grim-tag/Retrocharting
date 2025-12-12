"use client";

import { PriceHistoryPoint } from "@/lib/api";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";

interface PriceHistoryChartProps {
    history: PriceHistoryPoint[];
}

import { useCurrency } from "@/context/CurrencyContext";
import { getCurrencySymbol } from "@/lib/currency";

export default function PriceHistoryChart({ history }: PriceHistoryChartProps) {
    const { currency } = useCurrency();
    const symbol = getCurrencySymbol(currency);

    if (!history || history.length === 0) {
        return (
            <div className="h-[300px] bg-[#1f2533] border border-[#2a3142] rounded flex items-center justify-center text-gray-500">
                No price history available.
            </div>
        );
    }

    // Process data for chart
    // We need to group by date and have keys for each condition
    // Input: [{date: '2023-01-01', price: 10, condition: 'loose'}, ...]
    // Output: [{date: '2023-01-01', loose: 10, cib: 20, ...}, ...]

    const dataMap: Record<string, any> = {};
    const conditions = new Set<string>();

    history.forEach(point => {
        const date = point.date;
        if (!dataMap[date]) {
            dataMap[date] = { date };
        }
        dataMap[date][point.condition] = point.price;
        conditions.add(point.condition);
    });

    const data = Object.values(dataMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Colors for conditions
    const colors: Record<string, string> = {
        "loose": "#9ca3af", // gray-400
        "cib": "#007bff",   // blue
        "new": "#00ff00",   // green
        "graded": "#a855f7", // purple
        "box_only": "#f59e0b", // amber
        "manual_only": "#ef4444" // red
    };

    return (
        <div className="h-[400px] w-full bg-[#1f2533] border border-[#2a3142] p-4 rounded">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3142" />
                    <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af' }}
                        tickFormatter={(str) => new Date(str).toLocaleDateString()}
                    />
                    <YAxis
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af' }}
                        tickFormatter={(val) => `${symbol}${val}`}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1f2533', borderColor: '#2a3142', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#9ca3af' }}
                    />
                    <Legend />
                    {Array.from(conditions).map(condition => (
                        <Line
                            key={condition}
                            type="monotone"
                            dataKey={condition}
                            stroke={colors[condition] || "#fff"}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6 }}
                            connectNulls
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
