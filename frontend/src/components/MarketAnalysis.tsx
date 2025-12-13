"use client";

import React from 'react';
import { useCurrency } from "@/context/CurrencyContext";
import { getCurrencySymbol, convertPrice } from "@/lib/currency";
import { MODERN_SYSTEMS } from "@/data/systems";

interface MarketAnalysisProps {
    product: any;
    dict: any;
    lang: string;
}

export default function MarketAnalysis({ product, dict, lang }: MarketAnalysisProps) {
    const { currency } = useCurrency();
    const symbol = getCurrencySymbol(currency);

    // Helper for Price Formatting
    const formatPrice = (price: number | null) => {
        if (!price) return "N/A";
        const converted = convertPrice(price, currency);
        if (converted === null) return "N/A";
        return `${symbol}${converted.toFixed(2)}`;
    };

    // 1. Determine Era (Retro vs Modern)
    if (!product || !dict?.product?.seo) return null;

    // Basic logic: Check if console is in MODERN_SYSTEMS list
    const isModern = MODERN_SYSTEMS.some(sys => product.console_name?.includes(sys));
    const mode = isModern ? 'modern' : 'retro';
    const templates = dict.product.seo[mode];

    if (!templates) return null;

    // 2. Prepare Variables
    const loosePrice = product.loose_price || 0;
    const cibPrice = product.cib_price || loosePrice * 1.5; // Fallback estimate if missing
    const newPrice = product.new_price || cibPrice * 2;

    // 3. Prepare Variables safely based on mode
    let gapText = "";
    let trendText = "";
    let dealText = "";
    let popularityText = "";
    let actionText = "";
    let savePercent = 0;

    if (mode === 'retro') {
        const gapRatio = cibPrice / (loosePrice || 1);
        gapText = gapRatio > 2.5
            ? (templates.gap_high || "")
            : (templates.gap_low || "");

        const trendSeed = product.id % 3;
        trendText = trendSeed === 0 ? (templates.trend_stable || "") :
            trendSeed === 1 ? (templates.trend_up || "") : (templates.trend_down || "");
    } else {
        // Modern
        savePercent = newPrice > 0 ? Math.round(((newPrice - loosePrice) / newPrice) * 100) : 0;

        if (templates.deal_good) {
            dealText = savePercent > 20
                ? templates.deal_good.replace('{{save_percent}}', savePercent.toString())
                : (templates.deal_bad || "");
        }

        const trendSeed = product.id % 3;
        popularityText = trendSeed === 1 ? (templates.pop_high || "") : (templates.pop_neutral || "");
        actionText = savePercent > 20 ? (templates.action_buy || "") : (templates.action_wait || "");
    }

    const releaseYear = product.release_date ? new Date(product.release_date).getFullYear().toString() :
        (product.first_release_date ? new Date(product.first_release_date).getFullYear().toString() : '????');

    // 3. Generate Text
    const generateText = (template: string) => {
        return template
            .replace(/{{name}}/g, product.product_name)
            .replace(/{{console}}/g, product.console_name)
            .replace(/{{platform}}/g, product.console_name) // Alias
            .replace(/{{year}}/g, releaseYear)
            .replace(/{{loose_price}}/g, formatPrice(loosePrice))
            .replace(/{{cib_price}}/g, formatPrice(cibPrice))
            .replace(/{{new_price}}/g, formatPrice(newPrice))
            .replace(/{{gap_text}}/g, gapText)
            .replace(/{{trend_text}}/g, trendText)
            .replace(/{{deal_text}}/g, dealText)
            .replace(/{{popularity_text}}/g, popularityText)
            .replace(/{{action_text}}/g, actionText)
            .replace(/{{save_percent}}/g, savePercent.toString());
    };

    return (
        <section className="bg-[#1f2533] border-y border-[#2a3142] py-8 my-8">
            <div className="max-w-[1400px] mx-auto px-4 flex flex-col gap-8">

                {/* Block 1: The Money Question */}
                <div>
                    <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                        <span className="text-[#ff6600]">#</span>
                        {generateText(templates.h1)}
                    </h2>
                    <p className="text-gray-300 leading-relaxed text-sm text-justify">
                        {generateText(templates.value_analysis)}
                    </p>
                </div>

                {/* Block 2: The Context Question */}
                <div>
                    <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                        <span className="text-[#007bff]">?</span>
                        {generateText(templates.h2)}
                    </h2>
                    <p className="text-gray-300 leading-relaxed text-sm text-justify">
                        {generateText(templates.context_analysis)}
                    </p>
                </div>

            </div>
        </section>
    );
}
