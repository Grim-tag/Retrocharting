import React from 'react';
import Link from "next/link";

interface ProductDetailsProps {
    product: any;
    dict: any;
    lang: string;
    gamesSlug: string;
}

export default function ProductDetails({ product, dict, lang, gamesSlug }: ProductDetailsProps) {
    return (
        <div className="bg-[#1f2533] border border-[#2a3142] p-6 rounded">
            <h2 className="text-xl font-bold text-white mb-4">{dict.product.details.description}</h2>
            <p className="text-gray-300 mb-6 leading-relaxed text-sm">
                {product.description || "No description available."}
            </p>

            <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between border-b border-[#2a3142]/50 pb-2">
                    <span className="text-gray-500">{dict.product.details.publisher}</span>
                    <span className="text-white font-medium text-right">{product.publisher || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-[#2a3142]/50 pb-2">
                    <span className="text-gray-500">{dict.product.details.developer}</span>
                    <span className="text-white font-medium text-right">{product.developer || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-[#2a3142]/50 pb-2">
                    <span className="text-gray-500">{dict.product.details.release_date}</span>
                    <span className="text-white font-medium text-right">{product.release_date ? new Date(product.release_date).toLocaleDateString() : "-"}</span>
                </div>
                <div className="flex justify-between border-b border-[#2a3142]/50 pb-2">
                    <span className="text-gray-500">{dict.product.details.genre}</span>
                    <span className="text-white font-medium text-right">
                        {product.genre ? (
                            product.genre.split(',').map((g: string, i: number) => {
                                const genreName = g.trim();
                                const consoleSlug = product.console_name.toLowerCase().replace(/ /g, '-');
                                if (!genreName) return null;
                                return (
                                    <span key={i}>
                                        {i > 0 && ", "}
                                        <Link
                                            href={`/${lang}/${gamesSlug}/${consoleSlug}?genre=${encodeURIComponent(genreName)}`}
                                            className="hover:text-[#ff6600] hover:underline transition-colors"
                                        >
                                            {genreName}
                                        </Link>
                                    </span>
                                );
                            })
                        ) : "-"}
                    </span>
                </div>
                <div className="flex justify-between border-b border-[#2a3142]/50 pb-2">
                    <span className="text-gray-500">{dict.product.details.players}</span>
                    <span className="text-white font-medium text-right">{product.players || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-[#2a3142]/50 pb-2">
                    <span className="text-gray-500">{dict.product.details.rating}</span>
                    <span className="text-white font-medium text-right">{product.esrb_rating || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-[#2a3142]/50 pb-2">
                    <span className="text-gray-500">{dict.product.details.rating}</span>
                    <span className="text-white font-medium text-right">{product.esrb_rating || "-"}</span>
                </div>
                {/* Protected Data: Visible but Blurred to deter scraping */}
                <div className="flex justify-between border-b border-[#2a3142]/50 pb-2 group cursor-pointer" title="Click or Hover to Reveal">
                    <span className="text-gray-500">EAN</span>
                    <span className="text-white font-medium text-right blur-[3px] group-hover:blur-0 transition-all duration-300 select-none bg-[#2a3142]/30 px-2 rounded">
                        {product.ean || "🔒 Verified"}
                    </span>
                </div>
                <div className="flex justify-between border-b border-[#2a3142]/50 pb-2 group cursor-pointer" title="Click or Hover to Reveal">
                    <span className="text-gray-500">GTIN/UPC</span>
                    <span className="text-white font-medium text-right blur-[3px] group-hover:blur-0 transition-all duration-300 select-none bg-[#2a3142]/30 px-2 rounded">
                        {product.gtin || product.ean || "🔒 Verified"}
                    </span>
                </div>
            </div>
        </div>
    );
}
