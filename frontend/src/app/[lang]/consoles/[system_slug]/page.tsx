import Link from "next/link";
import { getProductsByConsole } from "@/lib/api";
import { systems } from "@/data/systems";
import { formatConsoleName } from "@/lib/utils";

// Helper to convert slug back to system name
function getSystemNameFromSlug(slug: string): string {
    const normalizedSlug = slug.replace(/-/g, ' ').toLowerCase();
    // Find exact match case-insensitive
    const match = systems.find(s => s.toLowerCase() === normalizedSlug);
    return match || slug.replace(/-/g, ' '); // Fallback to formatted slug
}

export default async function ConsoleHardwarePage({ params }: { params: Promise<{ system_slug: string }> }) {
    const { system_slug } = await params;
    const systemName = getSystemNameFromSlug(system_slug);
    // Filter by genre="Systems" to get hardware
    const products = await getProductsByConsole(systemName, 100, "Systems");
    const shortSystemName = formatConsoleName(systemName);

    return (
        <main className="flex-grow bg-[#0f121e] py-8">
            <div className="max-w-[1400px] mx-auto px-4">

                {/* Breadcrumbs */}
                <div className="text-sm text-gray-400 mb-6">
                    <Link href="/" className="hover:text-white">Home</Link>
                    <span className="mx-2">/</span>
                    <Link href="/consoles" className="hover:text-white">Consoles</Link>
                    <span className="mx-2">/</span>
                    <span className="text-white">{systemName}</span>
                </div>

                <div className="flex items-center justify-between mb-6 bg-[#1f2533] p-4 border-l-4 border-[#ff6600]">
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wider text-white">
                            {shortSystemName} Hardware <span className="text-[#ff6600]">Prices</span>
                        </h1>
                        <p className="text-xs text-gray-400 mt-1 font-mono">
                            Live tracking of {products.length} hardware items.
                        </p>
                    </div>
                </div>

                {/* Product List */}
                <div className="bg-[#1f2533] border border-[#2a3142]">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 p-3 bg-[#2a3142] border-b border-[#2a3142] text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <div className="col-span-6 md:col-span-5">Product Name</div>
                        <div className="col-span-2 text-right hidden md:block">Loose</div>
                        <div className="col-span-2 text-right hidden md:block">CIB</div>
                        <div className="col-span-3 md:col-span-2 text-right">New</div>
                        <div className="col-span-3 md:col-span-1 text-center">Action</div>
                    </div>

                    {/* Table Rows */}
                    <div className="divide-y divide-[#2a3142]">
                        {products.length > 0 ? (
                            products.map((product) => (
                                <div key={product.id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-[#252b3b] transition-colors group relative">
                                    {/* Reuse Game Detail Page for now, or create a specific one if needed */}
                                    <Link href={`/games/${product.id}`} className="absolute inset-0 z-10" aria-label={`View details for ${product.product_name}`}></Link>

                                    {/* Name & Image */}
                                    <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                                        <div className="w-20 h-24 bg-[#0f121e] border border-[#2a3142] flex-shrink-0 flex items-center justify-center overflow-hidden">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.product_name} className="object-cover w-full h-full" />
                                            ) : (
                                                <span className="text-[#2a3142] text-xs font-bold">IMG</span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-white truncate group-hover:text-[#ff6600] transition-colors">
                                                {product.product_name}
                                            </div>
                                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{product.console_name}</div>
                                        </div>
                                    </div>

                                    {/* Prices */}
                                    <div className="col-span-2 text-right hidden md:block font-mono text-gray-300 text-sm">
                                        {product.loose_price ? `$${product.loose_price.toFixed(2)}` : '-'}
                                    </div>
                                    <div className="col-span-2 text-right hidden md:block font-mono text-[#007bff] font-bold text-sm">
                                        {product.cib_price ? `$${product.cib_price.toFixed(2)}` : '-'}
                                    </div>
                                    <div className="col-span-3 md:col-span-2 text-right font-mono text-[#00ff00] font-bold text-sm">
                                        {product.new_price ? `$${product.new_price.toFixed(2)}` : '-'}
                                    </div>

                                    {/* Action Button */}
                                    <div className="col-span-3 md:col-span-1 flex justify-end relative z-20">
                                        <button className="bg-[#2a3142] hover:bg-[#ff6600] text-white p-2 rounded-sm transition-colors">
                                            <span className="sr-only">View</span>
                                            →
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-400">
                                No hardware found for this system.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
