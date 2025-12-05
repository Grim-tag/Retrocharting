'use client';

import { useState } from 'react';
import { saveTranslation } from '@/lib/api';

type FlattenedDict = Record<string, string>;

export default function TranslationsEditor({
    initialEn,
    initialFr,
    adminKey
}: {
    initialEn: FlattenedDict,
    initialFr: FlattenedDict,
    adminKey: string
}) {
    const [selectedLocale, setSelectedLocale] = useState<'en' | 'fr'>('fr');
    const [filter, setFilter] = useState('');
    const [translations, setTranslations] = useState<FlattenedDict>(selectedLocale === 'en' ? initialEn : initialFr);
    const [pending, setPending] = useState<string | null>(null);

    // Flatten keys from EN (source of truth)
    const keys = Object.keys(initialEn).sort();

    const handleSave = async (key: string, value: string) => {
        setPending(key);
        const success = await saveTranslation(selectedLocale, key, value, adminKey);
        if (success) {
            setTranslations(prev => ({ ...prev, [key]: value }));
        } else {
            alert('Failed to save. Check console.');
        }
        setPending(null);
    };

    const filteredKeys = keys.filter(k => k.toLowerCase().includes(filter.toLowerCase()));

    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 sticky top-0 bg-[#0f121e] z-10 py-4 border-b border-[#2a3142]">
                <div className="flex gap-2">
                    <button
                        onClick={() => { setSelectedLocale('en'); setTranslations(initialEn); }}
                        className={`px-4 py-2 rounded font-bold ${selectedLocale === 'en' ? 'bg-[#ff6600] text-white' : 'bg-[#1f2533] text-gray-400'}`}
                    >
                        English
                    </button>
                    <button
                        onClick={() => { setSelectedLocale('fr'); setTranslations(initialFr); }}
                        className={`px-4 py-2 rounded font-bold ${selectedLocale === 'fr' ? 'bg-[#ff6600] text-white' : 'bg-[#1f2533] text-gray-400'}`}
                    >
                        French
                    </button>
                </div>
                <input
                    type="text"
                    placeholder="Filter keys..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="flex-1 bg-[#1f2533] border border-[#2a3142] text-white px-4 py-2 rounded focus:outline-none focus:border-[#ff6600]"
                />
            </div>

            {/* Grid */}
            <div className="space-y-4">
                {filteredKeys.map(key => (
                    <div key={key} className="bg-[#1f2533] p-4 rounded border border-[#2a3142] grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-4 break-all">
                            <div className="text-xs text-[#ff6600] font-mono mb-1">KEY</div>
                            <div className="text-sm font-medium text-gray-300">{key}</div>
                        </div>
                        <div className="md:col-span-4">
                            <div className="text-xs text-gray-500 font-mono mb-1">DEFAULT (EN)</div>
                            <div className="text-sm text-gray-400">{initialEn[key]}</div>
                        </div>
                        <div className="md:col-span-4">
                            <div className="text-xs text-white font-mono mb-1">VALUE ({selectedLocale.toUpperCase()})</div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    defaultValue={translations[key] || ""}
                                    onBlur={(e) => {
                                        if (e.target.value !== translations[key]) {
                                            handleSave(key, e.target.value);
                                        }
                                    }}
                                    className="flex-1 bg-[#0f121e] text-white px-3 py-2 rounded border border-[#2a3142] focus:border-[#ff6600] focus:outline-none"
                                />
                                {pending === key && <span className="text-[#ff6600] animate-pulse">...</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {filteredKeys.length === 0 && (
                <div className="text-center text-gray-500 py-12">No keys found matching your filter.</div>
            )}
        </div>
    );
}
