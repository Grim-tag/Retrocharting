import React from 'react';
import AddToCollectionButton from "@/components/AddToCollectionButton";
import AddToWishlistButton from "@/components/AddToWishlistButton";
import WhyThisPrice from "@/components/WhyThisPrice";

interface ProductActionsProps {
    product: any;
    lang: string;
    dict: any;
}

export default function ProductActions({ product, lang, dict }: ProductActionsProps) {
    return (
        <>
            <div className="flex flex-col gap-3 mt-6">
                <AddToCollectionButton product={product} lang={lang} />
                <AddToWishlistButton
                    product={product}
                    lang={lang}
                    label={dict.product.actions.add_wishlist}
                />
            </div>
            <div className="mt-6">
                <WhyThisPrice salesCount={product.sales_count || 0} dict={dict} />
            </div>
        </>
    );
}
