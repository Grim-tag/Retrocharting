'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addToCollection, Product } from '@/lib/api';
import { getCurrencyForLang, convertCurrency } from '@/lib/currency';

export default function AddToCollectionButton({ product, lang }: { product: Product, lang: string }) {
    const { isAuthenticated, token, login } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [condition, setCondition] = useState('LOOSE');
    const [notes, setNotes] = useState('');
    const [paidPriceStr, setPaidPriceStr] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const currency = getCurrencyForLang(lang);
    const symbol = currency === 'EUR' ? '€' : '$';

    if (!isAuthenticated) {
        return (
            <button
                onClick={() => alert("Please log in with Google first (Top Right button)")}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
                <span>+ Add to Collection</span>
            </button>
        );
    }

    const handleSave = async () => {
        if (!token) return;
        setLoading(true);
        try {
            // Logic: User inputs price in their local currency (e.g. 10 EUR)
            // Backend expects USD (or base currency).
            // We convert the input value to USD before sending.

            let finalPrice = undefined;
            if (paidPriceStr) {
                const numericPrice = parseFloat(paidPriceStr.replace(',', '.'));
                if (!isNaN(numericPrice)) {
                    // Convert FROM user currency TO USD
                    finalPrice = convertCurrency(numericPrice, currency, 'USD');
                }
            }

            await addToCollection(token, product.id, condition, notes, finalPrice);
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setIsOpen(false);
                setNotes('');
                setPaidPriceStr('');
            }, 1000);
        } catch (error: any) {
            console.error(error);
            alert(`Failed to add: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full bg-[#ff6600] hover:bg-[#e65c00] text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
                <span>+ Add to Collection</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-[#1f2533] border border-[#3a4152] rounded-xl shadow-2xl max-w-sm w-full p-6 text-white relative animate-fade-in-up">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>

                        <h3 className="text-xl font-bold mb-4">Add to Collection</h3>
                        <div className="flex items-center gap-3 mb-6 bg-[#2a3142] p-3 rounded">
                            {product.image_url && <img src={product.image_url} className="w-12 h-12 rounded object-cover" />}
                            <div>
                                <div className="font-bold text-sm">{product.product_name}</div>
                                <div className="text-xs text-gray-400">{product.console_name}</div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs uppercase text-gray-400 mb-2">Condition</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['LOOSE', 'CIB', 'NEW', 'GRADED'].map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setCondition(c)}
                                        className={`py-2 text-sm rounded border ${condition === c
                                            ? 'bg-[#ff6600] border-[#ff6600] text-white'
                                            : 'bg-[#2a3142] border-[#3a4152] text-gray-300 hover:border-gray-500'}`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs uppercase text-gray-400 mb-2">Price Paid ({symbol})</label>
                            <input
                                type="number"
                                step="0.01"
                                value={paidPriceStr}
                                onChange={(e) => setPaidPriceStr(e.target.value)}
                                className="w-full bg-[#0f121e] border border-[#3a4152] rounded p-2 text-sm text-white focus:border-[#ff6600] outline-none"
                                placeholder={`e.g. 15.00`}
                            />
                            {currency === 'EUR' && paidPriceStr && (
                                <p className="text-[10px] text-gray-500 mt-1 text-right">
                                    Saved as ~${convertCurrency(parseFloat(paidPriceStr), 'EUR', 'USD').toFixed(2)} USD
                                </p>
                            )}
                        </div>

                        <div className="mb-6">
                            <label className="block text-xs uppercase text-gray-400 mb-2">Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full bg-[#0f121e] border border-[#3a4152] rounded p-2 text-sm text-white focus:border-[#ff6600] outline-none"
                                rows={2}
                                placeholder="Details..."
                            />
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={loading || success}
                            className={`w-full font-bold py-3 rounded transition-colors ${success ? 'bg-green-600' : 'bg-[#ff6600] hover:bg-[#e65c00]'}`}
                        >
                            {loading ? 'Saving...' : success ? 'Saved!' : 'Confirm Add'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
