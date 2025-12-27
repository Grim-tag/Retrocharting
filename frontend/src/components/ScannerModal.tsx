
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

    // Debug Logs
    const [debugLogs, setDebugLogs] = useState<string[]>([]);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Create State
    const [createForm, setCreateForm] = useState({ name: '', console: '' });

    const router = useRouter();
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const mountedRef = useRef(false);

    // Helper logging
    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setDebugLogs(prev => [...prev, `[${time}] ${msg}`]);
        console.log(`[ScannerLog] ${msg}`);
    };

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
        setDebugLogs([]); // optional: keep logs? no clear them
        addLog("State reset. Scanner opening.");
    };

    const startScanner = async () => {
        // Wait a bit for UI to mount
        await new Promise(r => setTimeout(r, 200));

        // 0. Check Secure Context
        if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
            addLog("FATAL: Not in secure context (HTTPS/Localhost). Camera will fail.");
            setErrorMsg("Permission Denied (Insecure Context)");
            setView('error');
            return;
        }

        const elem = document.getElementById("reader");
        if (!elem) {
            addLog("ERROR: #reader element not found in DOM");
            return;
        }

        try {
            if (scannerRef.current) {
                addLog("Scanner instance already exists. Checking state...");
                try {
                    // If it's running, stop it first?
                    if (scannerRef.current.isScanning) {
                        await scannerRef.current.stop();
                        addLog("Stopped existing scan.");
                    }
                } catch (e) {
                    addLog("Error checking/stopping existing: " + e);
                }
            } else {
                addLog("Creating new Html5Qrcode instance.");
                scannerRef.current = new Html5Qrcode("reader");
            }

            const html5QrCode = scannerRef.current;

            // Config
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    // Html5QrcodeSupportedFormats.UPC_E,
                    // Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.QR_CODE
                ]
            };

            // 1. Directy try "environment" camera without enumeration
            // This avoids "getCameras" failing on some devices/permissions
            const startConfig = { facingMode: "environment" };
            addLog(`Direct start with config: ${JSON.stringify(startConfig)}`);

            await html5QrCode.start(
                startConfig,
                config,
                (decodedText) => {
                    handleScanSuccess(decodedText);
                },
                (errorMessage) => {
                    // Ignore transient
                }
            );

            addLog("Scanner started successfully!");
            if (mountedRef.current) {
                setHasPermission(true);
            }

        } catch (err: any) {
            addLog(`START FAIL: ${err.message || err}`);
            console.error("Start Scanner Error", err);

            let msg = "Could not start camera.";
            if (err?.name === "NotAllowedError" || err?.message?.includes("permission")) {
                msg = "Permission denied. Check browser settings.";
            } else if (err?.name === "NotFoundError") {
                msg = "No camera found.";
            } else if (typeof err === 'string') {
                msg = err;
            }

            // If it's the "Unable to query supported devices" error, it might be persistent
            if (mountedRef.current) {
                setErrorMsg(msg);
                setView('error');
            }
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                // Check if running before stop? html5-qrcode throws if not running
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (ignore) {
                // Ignore stop errors
            }
            // Do NOT nullify ref immediately if we want to reuse? 
            // Actually best to recreate instance to avoid state issues
            scannerRef.current = null;
        }
    };

    const handleScanSuccess = async (code: string) => {
        if (!mountedRef.current) return;
        addLog(`Barcode found: ${code}`);

        // Stop scanning
        await stopScanner();

        setScannedCode(code);
        setLoading(true);
        processCode(code);
    };

    const processCode = async (code: string) => {
        try {
            addLog(`Searching API for: ${code}`);
            const res = await apiClient.get(`/products?search=${code}`);
            const products = res.data;

            if (products && products.length > 0) {
                addLog("Product found! Redirecting.");
                const product = products[0];
                onClose();
                router.push(`/products/${product.id}`);
            } else {
                addLog("Product not found via scan.");
                setErrorMsg(`Unknown Game (Code: ${code})`);
                setView('error');
                setLoading(false);
            }
        } catch (e) {
            console.error("Scan Error", e);
            addLog("API Error: " + e);
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

    // File Upload Handler (Fallback)
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        addLog(`File selected: ${file.name} (${file.size} bytes)`);

        if (scannerRef.current) {
            addLog("Scanning file with existing instance...");
            scannerRef.current.scanFile(file, true)
                .then(decodedText => {
                    addLog("File scan success: " + decodedText);
                    handleScanSuccess(decodedText);
                })
                .catch(err => {
                    addLog("File scan error: " + err);
                    setErrorMsg("Could not read barcode from image.");
                });
        } else {
            // Need instance
            const tempScanner = new Html5Qrcode("reader"); // Re-use element or headless? 
            // "reader" might be hidden if not in scan view
            addLog("Creating temp scanner for file...");
            tempScanner.scanFile(file, true)
                .then(decodedText => {
                    addLog("File scan success: " + decodedText);
                    handleScanSuccess(decodedText);
                })
                .catch(err => {
                    addLog("File scan error: " + err);
                    setErrorMsg("Could not read barcode from image.");
                });
        }
    };

    const requestPermissionManual = () => {
        addLog("User requested manual restart.");
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
                                <div className="bg-black/80 p-4 rounded text-center">
                                    <p className="mb-2">Initializing Camera...</p>
                                    <div className="text-xs text-gray-400">If this takes long, check permissions.</div>
                                </div>
                            </div>
                        )}

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

                        {errorMsg?.toLowerCase().includes("permission") && (
                            <div className="bg-orange-900/40 border border-orange-500/50 p-4 rounded mb-6 text-left">
                                <h4 className="text-orange-200 font-bold mb-2 text-sm">Accès Caméra Bloqué 📷</h4>

                                <div className="space-y-4">
                                    {/* 1. Secure Context Warning */}
                                    {typeof window !== 'undefined' && !window.isSecureContext && (
                                        <div className="bg-red-900/60 p-2 rounded border border-red-500">
                                            <p className="text-red-200 text-xs font-bold">
                                                ⚠️ Connexion non sécurisée détectée.
                                            </p>
                                            <p className="text-red-300 text-[10px] mt-1">
                                                Les navigateurs bloquent la caméra sur les sites non-HTTPS (ou non-localhost).
                                                Assurez-vous d'utiliser <strong>https://</strong>.
                                            </p>
                                        </div>
                                    )}

                                    {/* 2. Site Level */}
                                    <div>
                                        <p className="text-orange-300 text-xs font-semibold mb-1">étape 1: Vérifier le site</p>
                                        <ol className="text-gray-300 text-[11px] space-y-1 list-decimal list-inside pl-1">
                                            <li>Appuyez sur l'icône à gauche de l'URL (🔒 ou ⚙️).</li>
                                            <li>Allez dans <strong>Permissions</strong>.</li>
                                            <li>Activez <strong>Caméra</strong> (ou "Autoriser").</li>
                                            <li>Rechargez la page.</li>
                                        </ol>
                                    </div>

                                    {/* 3. OS Level - CRITICAL */}
                                    <div className="bg-black/40 p-3 rounded border border-orange-500/30">
                                        <p className="text-orange-300 text-xs font-semibold mb-1">
                                            🚨 Option "Caméra" invisible ?
                                        </p>
                                        <p className="text-gray-400 text-[10px] mb-2 leading-tight">
                                            Si vous ne voyez pas l'option caméra ci-dessus, c'est que <strong>votre téléphone bloque le navigateur</strong> complètement.
                                        </p>
                                        <p className="text-white text-[11px] font-bold mb-1">Solution Android/iOS :</p>
                                        <ol className="text-gray-300 text-[11px] space-y-1 list-decimal list-inside pl-1">
                                            <li>Quittez le navigateur.</li>
                                            <li>Allez dans les <strong>Réglages du Téléphone</strong> (pas du navigateur).</li>
                                            <li>Allez dans <strong>Applications</strong> -&gt; <strong>Chrome/Safari</strong>.</li>
                                            <li>Cherchez <strong>Autorisations</strong> -&gt; <strong>Caméra</strong>.</li>
                                            <li>Choisissez "Toujours autoriser" ou "Si l'appli est active".</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        )}

                        {errorMsg && !errorMsg.includes("permission") && !scannedCode && (
                            <div className="bg-red-900/20 border border-red-900/50 p-3 rounded mb-6">
                                <p className="text-red-200 text-sm break-words">{errorMsg}</p>
                            </div>
                        )}

                        {scannedCode && <p className="text-gray-400 font-mono text-xs mb-6 select-all bg-gray-800 p-2 rounded">{scannedCode}</p>}

                        {scannedCode && (
                            <div className="space-y-4 text-left">
                                <div className="p-4 bg-gray-800 rounded border border-gray-700">
                                    <p className="text-gray-300 text-sm mb-2 font-bold"> Aidez-nous à grandir ! 🤝</p>
                                    <p className="text-gray-400 text-xs mb-4">Liez ce code-barres à un jeu pour aider les futurs collectionneurs.</p>

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Chercher le jeu..."
                                            className="bg-gray-900 border border-gray-600 text-white text-sm rounded px-3 py-2 flex-1 outline-none"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                                        />
                                        <button onClick={performSearch} className="bg-blue-600 text-white px-3 py-2 rounded font-bold text-sm">Chercher</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-auto pt-6 space-y-3">
                            {!scannedCode && (
                                <>
                                    <button
                                        onClick={async () => {
                                            // Quick permission check test
                                            try {
                                                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                                                stream.getTracks().forEach(t => t.stop());
                                                addLog("Manual permission check passed! Restarting scanner...");
                                                resetState();
                                                startScanner();
                                            } catch (e: any) {
                                                addLog("Manual permission check failed: " + e.message);
                                                alert("Toujours bloqué : " + e.message + "\n\nVérifiez les réglages Android/iOS du téléphone.");
                                            }
                                        }}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-bold shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <span>🔄</span> Tester la Permission & Réessayer
                                    </button>

                                    <label className="block w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded font-bold mt-2 border border-gray-500 cursor-pointer text-center">
                                        📷 Télécharger une Photo
                                        <input
                                            type="file"
                                            accept="image/*"
                                            id="scanner-upload-file"
                                            className="hidden"
                                            onChange={handleFileUpload}
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
                                Restart
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. SEARCH RESULTS & CREATE VIEW (Abbreviated) */}
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

            {/* Debug Logs Section */}
            <details className="mt-4 w-full max-w-sm text-center">
                <summary className="text-gray-500 text-xs cursor-pointer select-none">Show Debug Logs 🛠️</summary>
                <div className="bg-black/80 text-green-400 text-[10px] font-mono p-2 mt-2 h-32 overflow-y-auto whitespace-pre-wrap text-left rounded border border-gray-800">
                    {debugLogs.length === 0 ? "No logs yet..." : debugLogs.join('\n')}
                </div>
            </details>
        </div>
    );
}
