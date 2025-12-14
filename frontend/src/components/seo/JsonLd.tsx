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
    offers: {
        '@type': 'AggregateOffer',
        url: url,
        priceCurrency: 'USD',
        lowPrice: product.loose_price || 0,
        highPrice: Math.max(product.new_price || 0, product.cib_price || 0, product.loose_price || 0),
        offerCount: product.sales_count > 0 ? product.sales_count : 1,
        availability: 'https://schema.org/InStock'
    },
});

export const generateVideoGameSchema = (product: any, url: string) => ({
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: product.product_name,
    image: product.image_url ? [product.image_url] : [],
    description: product.description || `Price guide, values, and details for ${product.product_name} on ${product.console_name}.`,
    sku: product.id?.toString(),
    gamePlatform: product.console_name,
    genre: product.genre ? product.genre.split(',').map((g: string) => g.trim()) : [],
    applicationCategory: 'Game',
    operatingSystem: product.console_name, // Often required by Google logic
    aggregateRating: product.rating ? {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        bestRating: 100,
        ratingCount: 1 // TODO: Add real rating count
    } : undefined,
    offers: {
        '@type': 'AggregateOffer',
        url: url,
        priceCurrency: 'USD',
        lowPrice: product.loose_price || 0,
        highPrice: Math.max(product.new_price || 0, product.cib_price || 0, product.loose_price || 0),
        offerCount: product.sales_count > 0 ? product.sales_count : 1,
        availability: 'https://schema.org/InStock'
    },
    author: product.developer ? {
        '@type': 'Organization',
        name: product.developer
    } : undefined,
    publisher: product.publisher ? {
        '@type': 'Organization',
        name: product.publisher
    } : undefined,
    datePublished: product.release_date
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

export const generateItemListSchema = (name: string, items: { name: string; url: string; image?: string; position: number }[]) => ({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: name,
    itemListElement: items.map((item) => ({
        '@type': 'ListItem',
        position: item.position,
        url: item.url, // Google uses 'url' inside ListItem for the link
        name: item.name,
        image: item.image
    }))
});
