
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
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
    const [hasPermission, setHasPermission] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Create State
    const [createForm, setCreateForm] = useState({ name: '', console: '' });

    const router = useRouter();
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const mountedRef = useRef(false);

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            mountedRef.current = true;
            resetState();
            startScanner();
        } else {
            mountedRef.current = false;
            stopScanner();
        }
        return () => {
            mountedRef.current = false;
            stopScanner();
        };
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

    const startScanner = async () => {
        // Wait a bit for UI to mount
        await new Promise(r => setTimeout(r, 100));

        const elem = document.getElementById("reader");
        if (!elem) {
            console.error("Scanner element not found");
            return;
        }

        try {
            if (scannerRef.current) {
                // Already running?
                return;
            }

            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            // Optional: formats
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.QR_CODE
                ]
            };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    handleScanSuccess(decodedText);
                },
                (errorMessage) => {
                    // Ignore transient scan errors
                    // console.log(errorMessage);
                }
            );
            setHasPermission(true);

        } catch (err: any) {
            console.error("Start Scanner Error", err);
            let msg = "Could not start camera.";
            if (err?.name === "NotAllowedError" || err?.message?.includes("permission")) {
                msg = "Camera permission denied.";
            } else if (err?.name === "NotFoundError") {
                msg = "No camera found.";
            } else if (typeof err === 'string') {
                msg = err;
            }
            setErrorMsg(msg);
            setView('error');
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (ignore) {
                // Ignore stop errors (e.g. not running)
            }
            scannerRef.current = null;
        }
    };

    const handleScanSuccess = async (code: string) => {
        if (!mountedRef.current) return;

        // Pause scanning logic implicitly by unmounting scanner via view change?
        // Actually, let's stop scanner temporarily
        await stopScanner();

        setScannedCode(code);
        setLoading(true);
        processCode(code);
    };

    const processCode = async (code: string) => {
        try {
            // Search API for this code
            const res = await apiClient.get(`/products?search=${code}`);
            const products = res.data;

            if (products && products.length > 0) {
                const product = products[0];
                onClose();
                router.push(`/products/${product.id}`);
            } else {
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
            alert("Creation failed");
            setLoading(false);
        }
    };

    const requestPermissionManual = () => {
        // html5-qrcode doesn't have a simple "request permission" independent of start
        // But re-calling startScanner might trigger it
        resetState();
        startScanner();
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
                    <div className="relative flex-1 bg-black flex flex-col">

                        {/* Reader Container */}
                        <div id="reader" className="w-full h-full bg-black"></div>

                        {/* Fallback msg if taking too long */}
                        {!hasPermission && !errorMsg && (
                            <div className="absolute inset-0 flex items-center justify-center text-white text-sm pointer-events-none">
                                <p className="bg-black/50 p-2 rounded">Initializing Camera...</p>
                            </div>
                        )}

                        {/* Overlay Text */}
                        <div className="absolute inset-x-0 bottom-4 text-center pointer-events-none">
                            <p className="text-white/90 font-bold bg-black/60 inline-block px-3 py-1 rounded text-sm animate-pulse">
                                SCANNING...
                            </p>
                        </div>
                    </div>
                )}

                {/* 2. ERROR / NOT FOUND VIEW */}
                {view === 'error' && (
                    <div className="p-6 flex flex-col h-full bg-gray-900 text-center overflow-y-auto">
                        <div className="text-red-500 text-4xl mb-4 mx-auto">⚠️</div>
                        <h3 className="text-white text-lg font-bold mb-2">
                            {scannedCode ? "Unknown Barcode" : "Scanner Issue"}
                        </h3>

                        {errorMsg && !scannedCode && (
                            <div className="bg-red-900/20 border border-red-900/50 p-3 rounded mb-6">
                                <p className="text-red-200 text-sm">{errorMsg}</p>
                            </div>
                        )}

                        {scannedCode && <p className="text-gray-400 font-mono text-xs mb-6 select-all bg-gray-800 p-2 rounded">{scannedCode}</p>}

                        {scannedCode && (
                            <div className="space-y-4 text-left">
                                <div className="p-4 bg-gray-800 rounded border border-gray-700">
                                    <p className="text-gray-300 text-sm mb-2 font-bold"> Help us build the database! 🤝</p>
                                    <p className="text-gray-400 text-xs mb-4">Link this barcode to a game so the next person finds it instantly.</p>

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Search game..."
                                            className="bg-gray-900 border border-gray-600 text-white text-sm rounded px-3 py-2 flex-1 outline-none"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                                        />
                                        <button onClick={performSearch} className="bg-blue-600 text-white px-3 py-2 rounded font-bold text-sm">Search</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-auto pt-6 space-y-3">
                            {!scannedCode && (
                                <>
                                    <button
                                        onClick={requestPermissionManual}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-bold shadow-lg"
                                    >
                                        🔓 Request Camera Access
                                    </button>
                                    {/* Keep Image Input as absolute fallback but hidden/secondary */}
                                    <label className="block w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded font-bold mt-2 border border-gray-500 cursor-pointer">
                                        📷 Upload Photo
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const html5QrCode = new Html5Qrcode("reader");
                                                    html5QrCode.scanFile(file, true)
                                                        .then(decodedText => {
                                                            handleScanSuccess(decodedText);
                                                        })
                                                        .catch(err => {
                                                            setErrorMsg("Could not read image.");
                                                        });
                                                }
                                            }}
                                        />
                                    </label>
                                </>
                            )}

                            {scannedCode && (
                                <button onClick={() => setView('create')} className="text-gray-500 text-xs underline">Game not found? Create it manually</button>
                            )}
                            <button
                                onClick={() => { resetState(); startScanner(); }}
                                className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded font-bold border border-gray-600"
                            >
                                Try Scanning Again
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. SEARCH RESULTS & 4. CREATE VIEW (Simplified for brevity, same as before) */}
                {view === 'search' && (
                    <div className="p-4 flex flex-col h-full bg-gray-900">
                        <h3 className="text-white font-bold mb-4">Select Game to Link</h3>
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {searchResults.map(p => (
                                <button key={p.id} onClick={() => linkProduct(p.id)} className="w-full text-left p-3 bg-gray-800 border border-gray-700 flex justify-between">
                                    <span className="text-white text-sm">{p.product_name}</span>
                                    <span className="text-blue-400 text-xs">LINK</span>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setView('error')} className="mt-4 w-full bg-gray-700 text-white py-2 rounded">Back</button>
                    </div>
                )}

                {view === 'create' && (
                    <div className="p-6 flex flex-col h-full bg-gray-900">
                        <h3 className="text-white font-bold mb-4">Create New</h3>
                        <input className="mb-2 bg-gray-800 text-white p-2 border border-gray-700 rounded" placeholder="Name" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
                        <input className="mb-4 bg-gray-800 text-white p-2 border border-gray-700 rounded" placeholder="Console" value={createForm.console} onChange={e => setCreateForm({ ...createForm, console: e.target.value })} />
                        <button onClick={createProduct} className="bg-green-600 text-white py-2 rounded font-bold">Create & Link</button>
                        <button onClick={() => setView('error')} className="mt-2 text-gray-400 underline">Cancel</button>
                    </div>
                )}
            </div>

            <p className="text-gray-500 mt-8 text-sm text-center max-w-xs">
                Powered by HTML5-QRCode
            </p>
        </div>
    );
}
