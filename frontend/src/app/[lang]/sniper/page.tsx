'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PlayIcon, StopIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

export default function SniperPage({ params }: { params: { lang: string } }) {
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!query) return;
        setIsRunning(true);

        try {
            // First manual fetch
            await fetchResults();

            // TODO: Implement actual polling or leave as manual refresh for v1
        } catch (error) {
            console.error("Sniper error:", error);
        } finally {
            setIsRunning(false);
        }
    };

    const fetchResults = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/sniper/search/vinted?query=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            setResults(data);
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f121e] pt-24 pb-12 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <span className="text-[#09b1ba]">🎯</span> Sniper Mode
                        </h1>
                        <p className="text-gray-400">
                            Live Scanner • Vinted
                        </p>
                    </div>
                </div>

                {/* Control Panel */}
                <div className="bg-[#1f2533] border border-[#2a3142] rounded-lg p-6 mb-8 shadow-lg">
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ex: Nintendo 64 Console, Zelda Boxed..."
                            className="flex-1 bg-[#0f121e] text-white border border-[#2a3142] rounded px-4 py-3 focus:outline-none focus:border-[#09b1ba] transition-colors"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isRunning || !query}
                            className={`px-8 py-3 rounded font-bold transition-all flex items-center gap-2 ${isRunning
                                    ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                                    : 'bg-[#09b1ba] hover:bg-[#0799a0] text-white shadow-[0_0_15px_rgba(9,177,186,0.3)]'
                                }`}
                        >
                            {isRunning ? (
                                <>
                                    <span className="animate-spin">⟳</span> Scanning...
                                </>
                            ) : (
                                <>
                                    <PlayIcon className="w-5 h-5" /> Sub-Zero Launch
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Results Grid */}
                <div className="grid grid-cols-1 gap-4">
                    {lastUpdated && (
                        <div className="text-right text-xs text-gray-500 mb-2">
                            Last scan: {lastUpdated}
                        </div>
                    )}

                    {results.map((item) => (
                        <div key={item.id} className="bg-[#1f2533]/50 border border-[#2a3142] p-4 rounded-lg flex items-center gap-4 hover:border-[#09b1ba]/50 transition-colors group animate-fade-in-up">
                            {/* Image */}
                            <div className="w-24 h-24 bg-[#0f121e] rounded flex-shrink-0 overflow-hidden relative">
                                {item.image_url ? (
                                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No Img</div>
                                )}
                                <span className="absolute top-0 left-0 bg-[#09b1ba] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-br">
                                    Vinted
                                </span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-bold text-lg truncate group-hover:text-[#09b1ba] transition-colors">
                                    {item.title}
                                </h3>
                                <div className="text-gray-400 text-sm mb-1">{item.created_at_ts || "Just now"}</div>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold text-white">
                                        {item.price} {item.currency}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#2a3142] hover:bg-[#09b1ba] text-white p-3 rounded-full transition-colors"
                            >
                                <ArrowTopRightOnSquareIcon className="w-6 h-6" />
                            </a>
                        </div>
                    ))}

                    {results.length === 0 && !isRunning && (
                        <div className="text-center py-20 text-gray-500">
                            Ready to snipe. Enter a keyword above.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
