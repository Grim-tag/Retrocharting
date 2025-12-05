"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRelatedProducts, Product } from "@/lib/api";

export default function CrossPlatformLinks({ productId }: { productId: number }) {
    const [related, setRelated] = useState<Product[]>([]);

    useEffect(() => {
        async function fetchRelated() {
            const data = await getRelatedProducts(productId);
            setRelated(data);
        }
        fetchRelated();
    }, [productId]);

    if (related.length === 0) {
        return null;
    }

    return (
        <div className="bg-[#1f2533] border border-[#2a3142] rounded p-4 mt-4 text-center">
            <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wide">
                Also available on
            </h3>
            <div className="flex flex-wrap justify-center gap-2">
                {related.map((product) => (
                    <Link
                        key={product.id}
                        href={`/games/${product.id}`}
                        className="bg-[#2a3142] hover:bg-[#ff6600] text-gray-300 hover:text-white text-xs font-medium py-1.5 px-3 rounded transition-colors"
                    >
                        {product.console_name}
                    </Link>
                ))}
            </div>
        </div>
    );
}
