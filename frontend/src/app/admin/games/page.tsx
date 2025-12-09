"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Types (simplified for admin view)
interface Product {
    id: number;
    product_name: string;
    console_name: string;
    image_url: string | null;
    loose_price: number | null;
    cib_price: number | null;
    new_price: number | null;
}

export default function AdminGamesPage() {
    const [games, setGames] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch Games
    useEffect(() => {
        const fetchGames = async () => {
            setIsLoading(true);
            try {
                // Determine URL based on search
                let url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/products/?limit=50`;
                if (debouncedSearch) {
                    url += `&search=${encodeURIComponent(debouncedSearch)}`;
                }

                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setGames(data);
                }
            } catch (err) {
                console.error("Failed to fetch games for admin", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGames();
    }, [debouncedSearch]);

    return (
        <div className="text-white">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold uppercase tracking-wider">Games Catalog</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Search games..."
                        className="bg-[#1f2533] border border-[#2a3142] text-white px-4 py-2 rounded focus:outline-none focus:border-[#ff6600] w-64"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button className="bg-[#ff6600] text-white px-4 py-2 rounded font-bold hover:bg-[#ff8533] transition-colors">
                        Add New Game
                    </button>
                </div>
            </div>

            <div className="bg-[#1f2533] border border-[#2a3142] rounded overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#2a3142] text-gray-300 uppercase text-xs font-bold tracking-wider">
                            <tr>
                                <th className="p-4 border-b border-[#353e54]">ID</th>
                                <th className="p-4 border-b border-[#353e54]">Cover</th>
                                <th className="p-4 border-b border-[#353e54]">Title</th>
                                <th className="p-4 border-b border-[#353e54]">Console</th>
                                <th className="p-4 border-b border-[#353e54] text-right">Loose</th>
                                <th className="p-4 border-b border-[#353e54] text-right">CIB</th>
                                <th className="p-4 border-b border-[#353e54] text-right">New</th>
                                <th className="p-4 border-b border-[#353e54] text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2a3142]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-400">Loading catalog...</td>
                                </tr>
                            ) : games.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-400">No games found.</td>
                                </tr>
                            ) : (
                                games.map((game) => (
                                    <tr key={game.id} className="hover:bg-[#252b3b] transition-colors">
                                        <td className="p-4 text-gray-500 font-mono text-sm">{game.id}</td>
                                        <td className="p-4">
                                            {game.image_url ? (
                                                <img src={game.image_url} alt="" className="w-10 h-10 object-cover rounded border border-gray-700" />
                                            ) : (
                                                <div className="w-10 h-10 bg-gray-800 rounded border border-gray-700 flex items-center justify-center text-xs text-gray-600">N/A</div>
                                            )}
                                        </td>
                                        <td className="p-4 font-bold text-white max-w-xs truncate" title={game.product_name}>
                                            {game.product_name}
                                        </td>
                                        <td className="p-4 text-gray-300 text-sm">
                                            {game.console_name}
                                        </td>
                                        <td className="p-4 text-right font-mono text-[#ff6600]">
                                            {game.loose_price ? `$${game.loose_price.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="p-4 text-right font-mono text-[#007bff]">
                                            {game.cib_price ? `$${game.cib_price.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="p-4 text-right font-mono text-[#00ff00]">
                                            {game.new_price ? `$${game.new_price.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button className="bg-[#2a3142] hover:bg-[#353e54] text-gray-200 px-3 py-1 rounded text-xs border border-[#353e54]">
                                                    Edit
                                                </button>
                                                <Link
                                                    href={`/admin/games/${game.id}/listings`}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold"
                                                >
                                                    Listings
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
