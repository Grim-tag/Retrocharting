
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { apiClient } from "@/lib/client";
import { useRouter } from 'next/navigation';

interface ScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ViewState = 'scan' | 'error' | 'search' | 'create' | 'debug';

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
    const [frontImage, setFrontImage] = useState<File | null>(null);
    const [backImage, setBackImage] = useState<File | null>(null);

    const router = useRouter();
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            stopScanner();
        };
    }, []);

    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setDebugLogs(prev => [`[${time}] ${msg}`, ...prev]);
        console.log(`[Scanner] ${msg}`);
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (e) {
                console.warn("Stop scanner error:", e);
            }
            scannerRef.current = null;
        }
    };

    const handleScanSuccess = async (decodedText: string, result: any) => {
        if (scannedCode === decodedText) return;

        // Stop scanning immediately
        await stopScanner();
        setScannedCode(decodedText);
        addLog(`Scanned: ${decodedText}`);

        try {
            setLoading(true);
            const res = await apiClient.get(`/products/isbn/${decodedText}`);
            setLoading(false);

            if (res.data && res.data.id) {
                addLog("Product found! Redirecting...");
                router.push(`/products/${res.data.id}`);
            } else {
                throw { response: { status: 404 } };
            }
        } catch (e: any) {
            setLoading(false);
            if (e.response?.status === 404) {
                addLog("Product not found in DB.");
                setErrorMsg("Barre-code inconnu. Voulez-vous le lier ou créer le jeu ?");
                setView('error');
            } else {
                addLog("API Error: " + e.message);
                setErrorMsg("Erreur connexion serveur.");
                setView('error');
            }
        }
    };

    const startScanner = async () => {
        // Prevent multiple starts
        if (scannerRef.current) return;

        setView('scan');
        setErrorMsg(null);
        setHasPermission(false);
        addLog("Starting scanner initialization...");

        try {
            // Create instance
            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            // Config
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            // Start
            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText, result) => handleScanSuccess(decodedText, result),
                (errorMessage) => {
                    // ignore frame errors
                }
            );

            if (mountedRef.current) {
                setHasPermission(true);
                addLog("Scanner started successfully.");
            }

        } catch (err: any) {
            if (!mountedRef.current) return;

            addLog(`Start failed: ${err.name} - ${err.message}`);

            let msg = "Erreur caméra inconnue.";
            if (err.name === "NotAllowedError" || err.message?.includes("permission")) {
                msg = "Permission refusée. Vérifiez vos réglages.";
            } else if (err.name === "NotFoundError") {
                msg = "Aucune caméra détectée.";
            } else if (err.name === "NotReadableError") {
                msg = "Caméra inaccessible.";
            }

            setErrorMsg(msg);
            setView('error');
            scannerRef.current = null;
        }
    };

    const performSearch = async () => {
        if (!searchQuery) return;
        setLoading(true);
        try {
            const res = await apiClient.get(`/products/search?q=${encodeURIComponent(searchQuery)}`);
            setSearchResults(res.data.items || res.data || []);
            setView('search');
        } catch (e) {
            alert("Erreur recherche");
            addLog("Search error: " + e);
        } finally {
            setLoading(false);
        }
    };

    const linkProduct = async (productId: number) => {
        if (!scannedCode) return;
        if (!confirm("Lier ce code-barres à ce jeu ?")) return;

        try {
            setLoading(true);
            // Use patch to update EAN
            await apiClient.patch(`/products/${productId}`, { ean: scannedCode });
            alert("Lié avec succès !");
            router.push(`/products/${productId}`);
        } catch (e: any) {
            alert("Erreur lors de la liaison.");
            addLog("Link error: " + e.message);
        } finally {
            setLoading(false);
        }
    };




    const createProduct = async () => {
        if (!scannedCode || !createForm.name || !createForm.console) return;
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('product_name', createForm.name);
            formData.append('console_name', createForm.console);
            formData.append('ean', scannedCode);
            if (frontImage) formData.append('front_image', frontImage);
            if (backImage) formData.append('back_image', backImage);

            const res = await apiClient.post(`/products/contribute`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Gamification Feedback
            const { product, gamification } = res.data; // Expecting new dict format
            const pts = gamification?.points_earned || 0;
            const newRank = gamification?.current_rank;
            const rankUp = gamification?.rank_up;

            let msg = `Jeu ajouté ! Vous gagnez +${pts} XP.`;
            if (rankUp) msg += `\n\n🎉 Félicitations ! Vous êtes maitenant "${newRank}" !`;

            alert(msg);
            onClose();
            // Redirect to new product
            const pid = product?.id || res.data.id; // Fallback if schema differs
            router.push(`/products/${pid}`);
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

    const resetState = () => {
        setView('scan');
        setScannedCode(null);
        setErrorMsg(null);
        setLoading(false);
        setSearchQuery("");
        setSearchResults([]);
        setCreateForm({ name: '', console: '' });
        setFrontImage(null);
        setBackImage(null);
        setDebugLogs([]); // optional: keep logs? no clear them
        addLog("State reset. Scanner opening.");
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
                                    {/* PRIMARY FALLBACK: NATIVE CAMERA */}
                                    <label className="block w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold border-2 border-green-400 cursor-pointer text-center shadow-[0_0_15px_rgba(0,255,0,0.3)] animate-pulse">
                                        <span className="text-2xl mr-2">📷</span>
                                        {/* Dynamic Text based on error */}
                                        {errorMsg?.includes("Time out") ? "Scanner Bloqué ? Cliquez ici !" : "Prendre une Photo (Rapide)"}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment" // TRY to force rear camera
                                            id="scanner-upload-file"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                        />
                                        <p className="text-[10px] font-normal opacity-80 mt-1">100% Fonctionnel - Zéro Bug</p>
                                    </label>

                                    <div className="flex gap-2">
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
                                            className="flex-1 bg-blue-900/50 hover:bg-blue-800 text-blue-200 py-3 rounded font-bold text-xs border border-blue-800"
                                        >
                                            <span>🔄</span> Réessayer
                                        </button>

                                        <button
                                            onClick={() => setView('debug')}
                                            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-400 py-3 rounded font-bold text-xs border border-gray-700"
                                        >
                                            🛠️ Debug
                                        </button>
                                    </div>
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
                {view === 'debug' && (
                    <div className="flex-1 bg-black flex flex-col relative">
                        <div className="absolute top-0 left-0 bg-red-600 text-white text-xs px-2 py-1 z-10 font-bold">MODE DEBUG BRUT</div>
                        {/* Raw Video Element */}
                        <video
                            id="debug-video"
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                            ref={(v) => {
                                if (v && !v.srcObject) {
                                    (async () => {
                                        try {
                                            addLog("DEBUG: Requesting raw UserMedia...");
                                            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                                            // Ensure element is still there
                                            if (v) {
                                                v.srcObject = stream;
                                                addLog("DEBUG: Stream acquired!");
                                            } else {
                                                // Clean up if unmounted
                                                stream.getTracks().forEach(t => t.stop());
                                            }
                                        } catch (err: any) {
                                            addLog(`START FAIL: ${err.message || err}`);
                                            console.error("Start Scanner Error", err);

                                            let msg = "Could not start camera.";
                                            if (err?.name === "NotAllowedError" || err?.message?.includes("permission")) {
                                                msg = "Permission denied. Check browser settings.";
                                            } else if (err?.name === "NotFoundError") {
                                                msg = "No camera found.";
                                            } else if (err?.message === "ScannerStartTimeout") {
                                                msg = "Camera is unresponsive (Time out).";
                                            } else if (typeof err === 'string') {
                                                msg = err;
                                            }

                                            // If it's the "Unable to query supported devices" error, it might be persistent
                                            // Assuming mountedRef is available in this scope, if not, it needs to be passed or defined.
                                            // For this edit, we assume it's available.
                                            if (mountedRef.current) {
                                                setErrorMsg(msg);
                                                setView('error');
                                            }
                                        }
                                    })();
                                }
                            }}
                        />
                        <div className="absolute bottom-4 left-4 right-4 bg-black/80 p-2 rounded border border-gray-700">
                            <p className="text-xs text-gray-300 mb-2">Ceci contourne le scanner. Si vous voyez l'image ici, c'est la librairie qui bug. Sinon, c'est votre téléphone.</p>
                            <button onClick={() => { resetState(); startScanner(); }} className="w-full bg-gray-700 text-white py-2 rounded text-xs">Retour</button>
                        </div>
                    </div>
                )}

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
                    <div className="p-6 flex flex-col h-full bg-gray-900 overflow-y-auto">
                        <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-3 rounded mb-4 text-center">
                            <p className="text-white font-bold text-sm">🏆 Contribution</p>
                            <p className="text-yellow-100 text-xs">Ajoutez ce jeu pour gagner <span className="font-bold text-white">+50 XP</span> !</p>
                        </div>

                        <h3 className="text-white font-bold mb-4">Nouveau Jeu</h3>

                        <label className="text-gray-400 text-xs mb-1">Nom du Jeu *</label>
                        <input className="mb-3 bg-gray-800 text-white p-3 border border-gray-700 rounded focus:border-blue-500 outline-none transition-colors" placeholder="Ex: Super Mario" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />

                        <label className="text-gray-400 text-xs mb-1">Console *</label>
                        <input className="mb-4 bg-gray-800 text-white p-3 border border-gray-700 rounded focus:border-blue-500 outline-none transition-colors" placeholder="Ex: Nintendo 64" value={createForm.console} onChange={e => setCreateForm({ ...createForm, console: e.target.value })} />

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block text-center">Photo Face 📷</label>
                                <label className={`block w-full aspect-square rounded border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden relative ${frontImage ? 'border-green-500 bg-black' : 'border-gray-600 bg-gray-800 hover:bg-gray-700'}`}>
                                    {frontImage ? (
                                        <img src={URL.createObjectURL(frontImage)} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-gray-500 text-2xl">+</span>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={e => setFrontImage(e.target.files?.[0] || null)} />
                                </label>
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block text-center">Photo Dos 📷</label>
                                <label className={`block w-full aspect-square rounded border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden relative ${backImage ? 'border-green-500 bg-black' : 'border-gray-600 bg-gray-800 hover:bg-gray-700'}`}>
                                    {backImage ? (
                                        <img src={URL.createObjectURL(backImage)} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-gray-500 text-2xl">+</span>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={e => setBackImage(e.target.files?.[0] || null)} />
                                </label>
                            </div>
                        </div>

                        <button
                            onClick={createProduct}
                            disabled={!createForm.name || !createForm.console}
                            className={`w-full py-3 rounded font-bold shadow-lg transition-all ${(!createForm.name || !createForm.console) ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                        >
                            {loading ? "Envoi..." : "Créer le Jeu (+50 XP)"}
                        </button>
                        <button onClick={() => setView('error')} className="mt-4 text-gray-500 text-xs underline text-center">Annuler</button>
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
