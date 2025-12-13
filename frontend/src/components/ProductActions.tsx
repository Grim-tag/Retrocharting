import React from 'react';
import AddToCollectionButton from "@/components/AddToCollectionButton";
import AddToWishlistButton from "@/components/AddToWishlistButton";


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

        </>
    );
}
