'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getApiUrl } from '@/lib/api';

const API_URL = `${getApiUrl()}/api/v1`;



import { uploadCsv, bulkImport, ImportAnalysisResult } from '@/lib/api';

export default function ImportPage({ params }: { params: { lang: string } }) {
    const { lang } = params;
    const router = useRouter();
    const { token } = useAuth();
    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isImporting, setIsImporting] = useState(false); // New state
    const [analysisResult, setAnalysisResult] = useState<ImportAnalysisResult | null>(null);

    // ... existing handlers ...

    const handleImportItems = async () => {
        if (!analysisResult || !token) return;

        setIsImporting(true);
        try {
            const itemsToImport = analysisResult.matches.map(m => ({
                product_id: m.match!.id,
                condition: m.item.condition,
                paid_price: m.item.paid_price ? parseFloat(m.item.paid_price) : undefined,
                currency: m.item.currency,
                purchase_date: m.item.purchase_date,
                comment: m.item.comment
            }));

            const result = await bulkImport(itemsToImport, token);
            alert(`Success! Imported ${result.imported} items.`);
            router.push(`/${lang}/collection`);
        } catch (err) {
            console.error(err);
            alert("Import failed. Please try again.");
        } finally {
            setIsImporting(false);
        }
    };

    const handleDownloadTemplate = () => {
        window.open(`${API_URL}/import/template`, '_blank');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file || !token) return;
        setIsAnalyzing(true);
        try {
            const result = await uploadCsv(file, token);
            if (result) {
                setAnalysisResult(result);
                setStep(3);
            }
        } catch (err) {
            console.error(err);
            alert("Analysis failed. Please check your CSV format.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f121e] text-white p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Import Collection (CSV)</h1>
                    <button
                        onClick={() => router.push(`/${lang}/collection`)}
                        className="text-gray-400 hover:text-white"
                    >
                        ← Back to Collection
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Steps Sidebar */}
                    <div className="col-span-1 space-y-4">
                        <StepIndicator current={step} step={1} title="Download Template" />
                        <StepIndicator current={step} step={2} title="Upload CSV" />
                        <StepIndicator current={step} step={3} title="Review Matches" />
                    </div>

                    {/* Main Content */}
                    <div className="col-span-3 bg-[#1f2533] p-8 rounded-xl border border-[#2a3142]">
                        {step === 1 && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-[#ff6600]">Step 1: Get the Template</h2>
                                <p className="text-gray-300">
                                    To ensure your collection is imported correctly, please use our official CSV template.
                                    Fill it with your games data.
                                </p>

                                <div className="bg-[#2a3142] p-4 rounded text-sm text-gray-300 font-mono">
                                    Required Columns: Title, Platform<br />
                                    Optional: Condition, Paid Price, Currency, Notes
                                </div>

                                <button
                                    onClick={handleDownloadTemplate}
                                    className="w-full py-3 bg-[#ff6600] hover:bg-[#ff7b24] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    Download CSV Template
                                </button>

                                <div className="pt-4 border-t border-[#2a3142]">
                                    <button
                                        onClick={() => setStep(2)}
                                        className="w-full py-2 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded transition-colors"
                                    >
                                        I have my CSV ready →
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-[#ff6600]">Step 2: Upload CSV</h2>
                                <p className="text-gray-300">
                                    Upload your filled CSV file here. We will analyze it and try to match your games with our database.
                                </p>

                                <label className="block border-2 border-dashed border-gray-600 rounded-lg p-12 text-center hover:border-[#ff6600] transition-colors cursor-pointer bg-[#1f2533]/50">
                                    <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                                    <div className="text-gray-400">
                                        {file ? (
                                            <div className="text-[#ff6600] font-bold text-lg">{file.name}</div>
                                        ) : (
                                            <>
                                                <p>Drag & Drop your CSV file here</p>
                                                <p className="text-xs text-gray-500 mt-2">or click to browse</p>
                                            </>
                                        )}
                                    </div>
                                </label>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="flex-1 py-2 bg-transparent border border-gray-600 text-gray-300 hover:text-white rounded transition-colors"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        onClick={handleUpload}
                                        disabled={!file || isAnalyzing}
                                        className={`flex-1 py-2 font-bold rounded transition-colors ${!file || isAnalyzing ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-[#ff6600] hover:bg-[#ff7b24] text-white'}`}
                                    >
                                        {isAnalyzing ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                Analyzing...
                                            </span>
                                        ) : 'Analyze File'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 3 && analysisResult && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-green-500">Step 3: Review Matches</h2>
                                <p className="text-gray-300">
                                    We found <b>{analysisResult.matches.length}</b> matches and <b>{analysisResult.ambiguous.length + analysisResult.unmatched.length}</b> needing attention.
                                </p>

                                <div className="space-y-4">
                                    <div className="bg-[#2a3142]/50 p-4 rounded border border-[#2a3142]">
                                        <h3 className="font-bold text-green-400 mb-2">✅ Confirmed Matches ({analysisResult.matches.length})</h3>
                                        <div className="max-h-60 overflow-y-auto space-y-2">
                                            {analysisResult.matches.map((m, i) => (
                                                <div key={i} className="flex justify-between items-center text-sm p-2 bg-[#1f2533] rounded">
                                                    <div>
                                                        <span className="text-white font-medium">{m.item.title}</span>
                                                        <span className="text-gray-500 text-xs ml-2">({m.item.platform})</span>
                                                    </div>
                                                    <span className="text-green-500 text-xs font-mono">100% Match</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {(analysisResult.ambiguous.length > 0 || analysisResult.unmatched.length > 0) && (
                                        <div className="bg-[#2a3142]/50 p-4 rounded border border-[#ff6600]/30">
                                            <h3 className="font-bold text-[#ff6600] mb-2">⚠️ Review Required ({analysisResult.ambiguous.length + analysisResult.unmatched.length})</h3>
                                            <div className="max-h-60 overflow-y-auto space-y-2">
                                                {[...analysisResult.ambiguous, ...analysisResult.unmatched].map((m, i) => (
                                                    <div key={i} className="flex justify-between items-center text-sm p-2 bg-[#1f2533] rounded">
                                                        <div>
                                                            <div className="text-white font-medium">{m.item.title}</div>
                                                            <div className="text-gray-500 text-xs">{m.item.platform}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            {m.match ? (
                                                                <>
                                                                    <div className="text-[#ff6600] text-xs">Best Guess: {m.match.product_name}</div>
                                                                    <div className="text-gray-600 text-xs">{m.match.score}% confidence</div>
                                                                </>
                                                            ) : (
                                                                <span className="text-red-500 text-xs font-mono">No Match</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        onClick={() => setStep(2)}
                                        className="flex-1 py-2 bg-transparent border border-gray-600 text-gray-300 hover:text-white rounded transition-colors"
                                    >
                                        ← Start Over
                                    </button>
                                    <button
                                        onClick={handleImportItems}
                                        disabled={isImporting}
                                        className={`flex-1 py-2 font-bold rounded transition-colors ${isImporting ? 'bg-green-800 text-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                    >
                                        {isImporting ? 'Importing...' : `Import ${analysisResult.matches.length} Items`}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StepIndicator({ step, current, title }: { step: number; current: number; title: string }) {
    const isActive = step === current;
    const isCompleted = step < current;

    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-[#1f2533] border border-[#ff6600]' : 'opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                ${isActive ? 'bg-[#ff6600] text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}
            `}>
                {isCompleted ? '✓' : step}
            </div>
            <span className={`font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>{title}</span>
        </div>
    );
}
