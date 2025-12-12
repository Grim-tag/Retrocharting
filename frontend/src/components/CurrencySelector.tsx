
"use client";

import { useCurrency } from "@/context/CurrencyContext";
import { SUPPORTED_CURRENCIES, CurrencyCode } from "@/lib/currency";

export default function CurrencySelector() {
    const { currency, setCurrency } = useCurrency();

    return (
        <div className="relative inline-block text-left">
            <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="bg-[#1f2533] text-white text-xs border border-[#2a3142] rounded px-2 py-1 focus:outline-none focus:border-[#ff6600] cursor-pointer"
            >
                {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                    </option>
                ))}
            </select>
        </div>
    );
}
