import { useState, useEffect } from 'react';
import { CollectionItem, updateCollectionItem } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getCurrencyForLang, convertCurrency } from '@/lib/currency';

interface CollectionItemModalProps {
    item: CollectionItem | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedItem: CollectionItem) => void;
    lang: string;
}

export default function CollectionItemModal({ item, isOpen, onClose, onSave, lang }: CollectionItemModalProps) {
    const { token } = useAuth();
    const [condition, setCondition] = useState('LOOSE');
    const [notes, setNotes] = useState('');
    const [paidPriceStr, setPaidPriceStr] = useState('');
    const [userImages, setUserImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const currency = getCurrencyForLang(lang);
    const symbol = currency === 'EUR' ? '€' : '$';

    useEffect(() => {
        if (item) {
            setCondition(item.condition);
            setNotes(item.notes || '');

            // Convert stored USD price to display currency
            if (item.paid_price !== null && item.paid_price !== undefined) {
                const displayed = convertCurrency(item.paid_price, 'USD', currency);
                setPaidPriceStr(displayed.toFixed(2));
            } else {
                setPaidPriceStr('');
            }

            try {
                if (item.user_images) {
                    setUserImages(JSON.parse(item.user_images));
                } else {
                    setUserImages([]);
                }
            } catch (e) {
                setUserImages([]);
            }
        }
    }, [item, currency]);

    if (!isOpen || !item) return null;

    const handleSave = async () => {
        if (!token) return;
        setLoading(true);
        try {
            let finalPrice = undefined;
            if (paidPriceStr) {
                const numericPrice = parseFloat(paidPriceStr.replace(',', '.'));
                if (!isNaN(numericPrice)) {
                    // Convert FROM user currency TO USD
                    finalPrice = convertCurrency(numericPrice, currency, 'USD');
                }
            }

            const updated = await updateCollectionItem(token, item.id, {
                condition,
                notes,
                paid_price: finalPrice,
                user_images: JSON.stringify(userImages)
            });

            onSave(updated);
            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to save changes");
        } finally {
            setLoading(false);
        }
    };

    // Placeholder for Image Upload Handling
    // In a real scenario, this would upload to an API and return a URL.
    // For now, we'll just allow adding dummy URLs or handle file upload in next step if backend supports it.

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#1f2533] border border-[#3a4152] rounded-xl shadow-2xl max-w-md w-full p-6 text-white relative animate-fade-in-up">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    ✕
                </button>

                <h3 className="text-xl font-bold mb-4">Edit Item</h3>
                <div className="flex items-center gap-3 mb-6 bg-[#2a3142] p-3 rounded">
                    {item.image_url && <img src={item.image_url} className="w-12 h-12 rounded object-cover" />}
                    <div>
                        <div className="font-bold text-sm">{item.product_name}</div>
                        <div className="text-xs text-gray-400">{item.console_name}</div>
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
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-xs uppercase text-gray-400 mb-2">My Photos (Max 3)</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="aspect-square bg-[#0f121e] border border-[#3a4152] rounded flex items-center justify-center text-gray-500 text-xs relative overflow-hidden group">
                                {userImages[i] ? (
                                    <>
                                        <img src={userImages[i]} className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => {
                                                const newImages = [...userImages];
                                                newImages.splice(i, 1);
                                                setUserImages(newImages);
                                            }}
                                            className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-red-400 font-bold"
                                        >
                                            X
                                        </button>
                                    </>
                                ) : (
                                    <span>Empty</span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                        * Upload feature coming soon
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-xs uppercase text-gray-400 mb-2">Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-[#0f121e] border border-[#3a4152] rounded p-2 text-sm text-white focus:border-[#ff6600] outline-none"
                        rows={2}
                    />
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full bg-[#ff6600] hover:bg-[#e65c00] text-white font-bold py-3 rounded transition-colors"
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}
