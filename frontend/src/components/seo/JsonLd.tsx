import React from 'react';

type SchemaType = 'Product' | 'CollectionPage' | 'BreadcrumbList' | 'Organization';

interface Props {
    data: Record<string, any>;
    id?: string;
}

export default function JsonLd({ data, id }: Props) {
    return (
        <script
            id={id}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}

// Helpers to generate specific schemas
export const generateProductSchema = (product: any, url: string) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.product_name,
    image: product.image_url,
    description: product.description || `Price guide and details for ${product.product_name} on ${product.console_name}.`,
    sku: product.id?.toString(),
    brand: {
        '@type': 'Brand',
        name: product.publisher || product.console_name,
    },
    // VideoGame specific properties
    category: 'Video Game',
    gamePlatform: product.console_name,
    offers: {
        '@type': 'AggregateOffer',
        url: url,
        priceCurrency: 'USD',
        lowPrice: product.loose_price || 0,
        highPrice: Math.max(product.new_price || 0, product.cib_price || 0, product.loose_price || 0),
        offerCount: product.sales_count > 0 ? product.sales_count : 1, // Use sales count as proxy
        availability: 'https://schema.org/InStock'
    },
});

export const generateBreadcrumbSchema = (items: { name: string; url: string }[]) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `https://retrocharting.com${item.url}`,
    })),
});

export const generateCollectionSchema = (name: string, description: string, url: string) => ({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: name,
    description: description,
    url: url,
});
