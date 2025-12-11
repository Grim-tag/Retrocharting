'use client';

import { useAuth } from '@/context/AuthContext';
import { CollectionItem, getCollection, deleteFromCollection } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CollectionItemModal from './CollectionItemModal';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getCurrencyForLang, convertCurrency, formatCurrency } from '@/lib/currency';

export default function CollectionPage({ dict, lang }: { dict: any; lang: string }) {
    const { user, token, isAuthenticated } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState<CollectionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editItem, setEditItem] = useState<CollectionItem | null>(null);

    const currency = getCurrencyForLang(lang);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push(lang === 'en' ? '/' : `/${lang}`);
        }
    }, [isAuthenticated, loading, lang, router]);

    useEffect(() => {
        if (token) {
            getCollection(token).then(data => {
                setItems(data);
                setLoading(false);
            });
        } else {
            setTimeout(() => setLoading(false), 1000);
        }
    }, [token]);

    const handleDelete = async (id: number) => {
        if (confirm("Remove this item?")) {
            const success = await deleteFromCollection(token!, id);
            if (success) {
                setItems(items.filter(i => i.id !== id));
            }
        }
    };

    const handleUpdate = (updatedItem: CollectionItem) => {
        setItems(items.map(i => i.id === updatedItem.id ? updatedItem : i));
    };

    const totalValueUSD = items.reduce((sum, item) => sum + (item.estimated_value || 0), 0);
    const totalValueLocalized = convertCurrency(totalValueUSD, 'USD', currency);
    const totalItems = items.length;

    if (loading) return <div className="min-h-screen bg-[#1f2533] flex items-center justify-center text-white">Loading Collection...</div>;

    if (!isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-[#1f2533] text-white">
            <CollectionItemModal
                isOpen={!!editItem}
                item={editItem}
                onClose={() => setEditItem(null)}
                onSave={handleUpdate}
                lang={lang}
            />

            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* Header Stats */}
                <div className="bg-[#2a3142] rounded-lg p-6 mb-8 flex flex-col md:flex-row justify-between items-center shadow-lg border border-[#3a4152]">
                    <div className="flex items-center gap-4 mb-4 md:mb-0">
                        <img src={user?.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-[#ff6600]" />
                        <div>
                            <h1 className="text-2xl font-bold">{user?.full_name || 'My Collection'}</h1>
                            <p className="text-gray-400 text-sm">{user?.email}</p>
                        </div>
                    </div>

                    <div className="flex gap-8 text-center">
                        <div>
                            <div className="text-3xl font-bold text-[#ff6600]">{totalItems}</div>
                            <div className="text-xs uppercase tracking-wide text-gray-400">Items</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-green-400">
                                {formatCurrency(totalValueLocalized, currency)}
                            </div>
                            <div className="text-xs uppercase tracking-wide text-gray-400">Est. Value</div>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                {items.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <p className="text-xl">Your collection is empty.</p>
                        <p className="text-sm mt-2">Go browse games and click "Add to Collection"!</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-[#2a3142] rounded-lg shadow border border-[#3a4152]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#1a202c] text-gray-400 text-xs uppercase tracking-wider">
                                    <th className="p-4">Game</th>
                                    <th className="p-4">Console</th>
                                    <th className="p-4">Condition</th>
                                    <th className="p-4 text-right">Paid</th>
                                    <th className="p-4 text-right">Value</th>
                                    <th className="p-4 text-right">Profit</th>
                                    <th className="p-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#3a4152]">
                                {items.map(item => {
                                    const valueUSD = item.estimated_value || 0;
                                    const paidUSD = item.paid_price;
                                    const profitUSD = paidUSD !== null && paidUSD !== undefined ? valueUSD - paidUSD : null;

                                    const valueLoc = convertCurrency(valueUSD, 'USD', currency);
                                    const paidLoc = paidUSD !== null && paidUSD !== undefined ? convertCurrency(paidUSD, 'USD', currency) : null;
                                    const profitLoc = profitUSD !== null ? convertCurrency(profitUSD, 'USD', currency) : null;

                                    return (
                                        <tr key={item.id} className="hover:bg-[#32394d] transition-colors">
                                            <td className="p-4 flex items-center gap-3">
                                                {item.image_url && <img src={item.image_url} className="w-10 h-10 object-cover rounded" />}
                                                <span className="font-medium text-white">{item.product_name}</span>
                                                {item.user_images && <span className="text-[10px] bg-gray-700 px-1 rounded">📷</span>}
                                            </td>
                                            <td className="p-4 text-gray-300">{item.console_name}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold 
                                                    ${item.condition === 'NEW' ? 'bg-green-900 text-green-300' :
                                                        item.condition === 'CIB' ? 'bg-blue-900 text-blue-300' :
                                                            'bg-gray-700 text-gray-300'}`}>
                                                    {item.condition}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-mono text-gray-300">
                                                {paidLoc !== null ? formatCurrency(paidLoc, currency) : '-'}
                                            </td>
                                            <td className="p-4 text-right font-mono text-green-400">
                                                {formatCurrency(valueLoc, currency)}
                                            </td>
                                            <td className="p-4 text-right font-mono">
                                                {profitLoc !== null ? (
                                                    <span className={profitLoc >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                        {profitLoc > 0 ? '+' : ''}{formatCurrency(profitLoc, currency)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-600">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setEditItem(item)}
                                                        className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded transition-colors"
                                                        title="Edit Item"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1.5 text-red-400 hover:bg-red-900/30 rounded transition-colors"
                                                        title="Delete Item"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
