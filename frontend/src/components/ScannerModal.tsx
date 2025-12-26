
import React, { useState, useEffect } from 'react';
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import { apiClient } from "@/lib/client";
import { useRouter } from 'next/navigation';

interface ScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ViewState = 'scan' | 'error' | 'search' | 'create';

export default function ScannerModal({ isOpen, onClose }: ScannerModalProps) {
    const [view, setView] = useState<ViewState>('scan');
    const [scannedCode, setScannedCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Create State
    const [createForm, setCreateForm] = useState({ name: '', console: '' });

    const router = useRouter();

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            resetState();
        }
    }, [isOpen]);

    const resetState = () => {
        setView('scan');
        setScannedCode(null);
        setErrorMsg(null);
        setLoading(false);
        setSearchQuery("");
        setSearchResults([]);
        setCreateForm({ name: '', console: '' });
    };

    const handleScan = async (err: any, result: any) => {
        if (result && !scannedCode && !loading && view === 'scan') {
            const code = result.text;
            setScannedCode(code);
            setLoading(true);

            try {
                // Search API for this code
                const res = await apiClient.get(`/products?search=${code}`);
                const products = res.data;

                if (products && products.length > 0) {
                    // Match found! Redirect
                    const product = products[0];
                    onClose();
                    router.push(`/products/${product.id}`);
                } else {
                    // Not found -> Go to custom Error/Link view
                    setErrorMsg(`Unknown Game (Code: ${code})`);
                    setView('error');
                    setLoading(false);
                }
            } catch (e) {
                console.error("Scan Error", e);
                setErrorMsg("Network Error checking code.");
                setView('error');
                setLoading(false);
            }
        }
    };

    const handleError = (err: any) => {
        console.error("Scanner Error:", err);
        let msg = "Camera error.";
        if (err?.name === "NotAllowedError" || err?.message?.includes("permission")) {
            msg = "Camera permission denied. Check settings.";
        } else if (err?.name === "NotFoundError") {
            msg = "No camera found.";
        } else if (err?.message) {
            msg = err.message;
        }
        setErrorMsg(msg);
        setView('error');
        setLoading(false);
    };

    // Actions
    const performSearch = async () => {
        if (searchQuery.length < 2) return;
        setLoading(true);
        try {
            const res = await apiClient.get(`/products?search=${searchQuery}&limit=5`);
            setSearchResults(res.data);
            setView('search');
        } catch (e) {
            alert("Search failed");
        }
        setLoading(false);
    };

    const linkProduct = async (productId: number) => {
        if (!scannedCode) return;
        if (!confirm("Link this barcode to this game?")) return;

        setLoading(true);
        try {
            await apiClient.post(`/products/${productId}/ean`, null, { params: { ean: scannedCode } });
            alert("Linked! Redirecting...");
            onClose();
            router.push(`/products/${productId}`);
        } catch (e) {
            alert("Link failed");
            setLoading(false);
        }
    };

    const createProduct = async () => {
        if (!scannedCode || !createForm.name || !createForm.console) return;
        setLoading(true);
        try {
            const res = await apiClient.post(`/products/contribute`, null, {
                params: {
                    product_name: createForm.name,
                    console_name: createForm.console,
                    ean: scannedCode
                }
            });
            alert("Created & Linked! Redirecting...");
            onClose();
            router.push(`/products/${res.data.id}`);
        } catch (e) {
            alert("Creation failed: " + ((e as any).response?.data?.detail || "Unknown error"));
            setLoading(false);
        }
    };

    const requestCameraPermission = async () => {
        try {
            setLoading(true);
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            // Permission granted! Stop stream immediately (scanner will restart it)
            stream.getTracks().forEach(track => track.stop());
            setErrorMsg(null);
            setView('scan'); // Retry scan view
            setLoading(false);
        } catch (err: any) {
            console.error("Manual Permission Error:", err);
            setErrorMsg("Permission still denied. Please check browser settings (Lock icon > Site Settings > Camera).");
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">

            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white p-2 bg-gray-800/80 rounded-full hover:bg-gray-700 z-50"
            >
                ✕
            </button>

            <div className="w-full max-w-sm bg-black rounded-xl overflow-hidden relative border border-gray-700 shadow-2xl min-h-[400px] flex flex-col">

                {/* 1. SCAN VIEW */}
                {view === 'scan' && (
                    <div className="relative flex-1 bg-black">
                        {!loading ? (
                            <>
                                <BarcodeScannerComponent
                                    width="100%"
                                    height="100%"
                                    onUpdate={handleScan}
                                    onError={handleError}
                                    videoConstraints={{ facingMode: 'environment' }}
                                />
                                <div className="absolute inset-0 border-2 border-red-500/50 m-12 rounded pointer-events-none"></div>
                                <div className="absolute inset-x-0 bottom-4 text-center pointer-events-none">
                                    <p className="text-white/90 font-bold bg-black/60 inline-block px-3 py-1 rounded text-sm animate-pulse">SCANNING...</p>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                                <p className="absolute mt-16 text-white text-xs">Checking permission...</p>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. ERROR / NOT FOUND VIEW */}
                {view === 'error' && (
                    <div className="p-6 flex flex-col h-full bg-gray-900 text-center overflow-y-auto">
                        <div className="text-red-500 text-4xl mb-4 mx-auto">⚠️</div>
                        <h3 className="text-white text-lg font-bold mb-2">
                            {scannedCode ? "Unknown Barcode" : "Camera Access Needed"}
                        </h3>

                        {/* Error Message */}
                        {errorMsg && !scannedCode && (
                            <div className="bg-red-900/20 border border-red-900/50 p-3 rounded mb-6">
                                <p className="text-red-200 text-sm">{errorMsg}</p>
                            </div>
                        )}

                        {/* Scanner Code Display */}
                        {scannedCode && <p className="text-gray-400 font-mono text-xs mb-6 select-all bg-gray-800 p-2 rounded">{scannedCode}</p>}

                        {scannedCode && (
                            <div className="space-y-4 text-left">
                                <div className="p-4 bg-gray-800 rounded border border-gray-700">
                                    <p className="text-gray-300 text-sm mb-2 font-bold"> Help us build the database! 🤝</p>
                                    <p className="text-gray-400 text-xs mb-4">Link this barcode to a game so the next person finds it instantly.</p>

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Search game (e.g. Mario)"
                                            className="bg-gray-900 border border-gray-600 text-white text-sm rounded px-3 py-2 flex-1 outline-none focus:border-blue-500"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                                        />
                                        <button
                                            onClick={performSearch}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-bold text-sm"
                                        >
                                            Search
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-auto pt-6 space-y-3">
                            {!scannedCode && (
                                <button
                                    onClick={requestCameraPermission}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-bold shadow-lg"
                                >
                                    🔓 Request Camera Access
                                </button>
                            )}

                            {scannedCode && (
                                <button
                                    onClick={() => setView('create')}
                                    className="text-gray-500 text-xs underline hover:text-gray-300"
                                >
                                    Game not found? Create it manually
                                </button>
                            )}
                            <button
                                onClick={resetState}
                                className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded font-bold border border-gray-600"
                            >
                                Try Scanning Again
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. SEARCH RESULTS VIEW */}
                {view === 'search' && (
                    <div className="p-4 flex flex-col h-full bg-gray-900">
                        <h3 className="text-white font-bold mb-4">Select Game to Link</h3>
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {searchResults.length === 0 ? (
                                <p className="text-gray-400 text-center py-8">No results found.</p>
                            ) : (
                                searchResults.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => linkProduct(p.id)}
                                        className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 flex justify-between items-center group"
                                    >
                                        <div>
                                            <div className="text-white font-bold text-sm">{p.product_name}</div>
                                            <div className="text-gray-400 text-xs">{p.console_name}</div>
                                        </div>
                                        <span className="text-blue-400 opacity-0 group-hover:opacity-100 font-bold text-xs">LINK →</span>
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="pt-4 flex gap-2">
                            <button onClick={() => setView('error')} className="flex-1 bg-gray-800 text-white py-2 rounded">Back</button>
                            <button onClick={() => setView('create')} className="flex-1 bg-gray-800 text-white py-2 rounded">Create New</button>
                        </div>
                    </div>
                )}

                {/* 4. CREATE VIEW */}
                {view === 'create' && (
                    <div className="p-6 flex flex-col h-full bg-gray-900">
                        <h3 className="text-white font-bold mb-2">Create New Entry</h3>
                        <p className="text-gray-400 text-xs mb-6">Double check! Only create if the game truly doesn't exist.</p>

                        <div className="space-y-4 flex-1">
                            <div>
                                <label className="text-gray-500 text-xs block mb-1">Barcode (EAN)</label>
                                <input type="text" value={scannedCode || ''} disabled className="w-full bg-gray-800 text-gray-400 px-3 py-2 rounded border border-gray-700" />
                            </div>
                            <div>
                                <label className="text-gray-500 text-xs block mb-1">Game Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-500 outline-none"
                                    placeholder="e.g. Zelda Ocarina of Time"
                                    value={createForm.name}
                                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-gray-500 text-xs block mb-1">Console</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-500 outline-none"
                                    placeholder="e.g. Nintendo 64"
                                    value={createForm.console}
                                    onChange={e => setCreateForm({ ...createForm, console: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="pt-6 flex gap-2">
                            <button onClick={() => setView('error')} className="flex-1 bg-gray-800 text-white py-2 rounded">Cancel</button>
                            <button
                                onClick={createProduct}
                                disabled={!createForm.name || !createForm.console || loading}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-bold disabled:opacity-50"
                            >
                                {loading ? "Creating..." : "Create & Link"}
                            </button>
                        </div>
                    </div>
                )}

            </div>

            <p className="text-gray-500 mt-8 text-sm text-center max-w-xs">
                Ensure you are on <strong>HTTPS</strong> and have allowed camera access.
            </p>
        </div>
    );
}
