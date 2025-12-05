import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { getProductById, getProductHistory } from "@/lib/api";
import ListingsTable from "@/components/ListingsTable";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import { Metadata } from "next";
import { formatConsoleName } from "@/lib/utils";
import CrossPlatformLinks from "@/components/CrossPlatformLinks";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const product = await getProductById(parseInt(id));

    if (!product) {
        return {
            title: "Product Not Found | RetroCharting",
        };
    }

    const shortConsoleName = formatConsoleName(product.console_name);

    return {
        title: `${product.product_name} ${shortConsoleName} Prices | RetroCharting`,
        description: `Current value and price history for ${product.product_name} on ${product.console_name}. Track your collection value.`,
    };
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const product = await getProductById(parseInt(id));
    const history = await getProductHistory(parseInt(id));

    if (!product) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-grow bg-[#0f121e] py-20 text-center text-white">
                    <h1 className="text-3xl font-bold">Product Not Found</h1>
                    <Link href="/video-games" className="text-[#ff6600] hover:underline mt-4 inline-block">
                        Back to Video Games
                    </Link>
                </main>
                <Footer />
            </div>
        );
    }

    const shortConsoleName = formatConsoleName(product.console_name);

    return (
        <div className="flex flex-col min-h-screen">
            <Header />

            <main className="flex-grow bg-[#0f121e] py-8">
                <div className="max-w-[1400px] mx-auto px-4">

                    {/* Breadcrumbs */}
                    <div className="text-sm text-gray-400 mb-6">
                        <Link href="/" className="hover:text-white">Home</Link>
                        <span className="mx-2">/</span>
                        <Link href="/video-games" className="hover:text-white">Video Games</Link>
                        <span className="mx-2">/</span>
                        <Link href={`/video-games/${product.console_name.toLowerCase().replace(/ /g, '-')}`} className="hover:text-white">
                            {product.console_name}
                        </Link>
                        <span className="mx-2">/</span>
                        <span className="text-white">{product.product_name}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        {/* Left: Image */}
                        <div className="md:col-span-4">
                            <div className="bg-[#1f2533] border border-[#2a3142] p-4 rounded flex items-center justify-center min-h-[400px]">
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.product_name} className="max-w-full max-h-[400px] object-contain shadow-lg" />
                                ) : (
                                    <span className="text-gray-500 font-bold text-xl">No Image</span>
                                )}
                            </div>
                        </div>

                        {/* Right: Details */}
                        <div className="md:col-span-8">
                            <h1 className="text-4xl font-bold text-white mb-2">
                                {product.product_name} {shortConsoleName} Prices
                            </h1>
                            <div className="text-[#ff6600] font-bold text-lg mb-6">{product.console_name}</div>

                            {/* Price Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                                <div className="bg-[#1f2533] border border-[#2a3142] p-6 rounded text-center">
                                    <div className="text-gray-400 text-sm uppercase tracking-wider mb-2">Loose</div>
                                    <div className="text-3xl font-bold text-white">
                                        {product.loose_price ? `$${product.loose_price.toFixed(2)}` : '-'}
                                    </div>
                                </div>
                                <div className="bg-[#1f2533] border border-[#2a3142] p-6 rounded text-center relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-[#007bff] text-white text-xs px-2 py-1">Best Value</div>
                                    <div className="text-gray-400 text-sm uppercase tracking-wider mb-2">CIB</div>
                                    <div className="text-3xl font-bold text-[#007bff]">
                                        {product.cib_price ? `$${product.cib_price.toFixed(2)}` : '-'}
                                    </div>
                                </div>
                                <div className="bg-[#1f2533] border border-[#2a3142] p-6 rounded text-center">
                                    <div className="text-gray-400 text-sm uppercase tracking-wider mb-2">New</div>
                                    <div className="text-3xl font-bold text-[#00ff00]">
                                        {product.new_price ? `$${product.new_price.toFixed(2)}` : '-'}
                                    </div>
                                </div>
                            </div>

                            {/* Cross Platform Links */}
                            <CrossPlatformLinks productId={product.id} />

                            {/* Actions */}
                            <div className="flex gap-4 mb-8">
                                <button className="flex-1 bg-[#ff6600] hover:bg-[#e65c00] text-white font-bold py-3 px-6 rounded transition-colors uppercase tracking-wide">
                                    Add to Collection
                                </button>
                                <button className="flex-1 bg-[#2a3142] hover:bg-[#353e54] text-white font-bold py-3 px-6 rounded transition-colors uppercase tracking-wide border border-[#353e54]">
                                    Add to Wishlist
                                </button>
                            </div>

                            {/* eBay Listings */}
                            <ListingsTable productId={product.id} />

                            {/* Details & Description */}
                            <div className="bg-[#1f2533] border border-[#2a3142] p-6 rounded mb-8 mt-8">
                                <h2 className="text-xl font-bold text-white mb-4">Description</h2>
                                <p className="text-gray-300 mb-6 leading-relaxed">
                                    {product.description || "No description available."}
                                </p>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500 block">Publisher</span>
                                        <span className="text-white font-medium">{product.publisher || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block">Developer</span>
                                        <span className="text-white font-medium">{product.developer || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block">Release Date</span>
                                        <span className="text-white font-medium">{product.release_date ? new Date(product.release_date).toLocaleDateString() : "-"}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block">Genre</span>
                                        <span className="text-white font-medium">{product.genre || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block">Players</span>
                                        <span className="text-white font-medium">{product.players || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block">ESRB Rating</span>
                                        <span className="text-white font-medium">{product.esrb_rating || "-"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Price History */}
                            <div className="bg-[#1f2533] border border-[#2a3142] p-6 rounded mb-8 mt-8">
                                <h2 className="text-xl font-bold text-white mb-4">Price History</h2>
                                <PriceHistoryChart history={history} />
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
