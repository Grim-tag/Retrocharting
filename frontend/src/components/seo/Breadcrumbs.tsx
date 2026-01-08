"use client";

import Link from 'next/link';
import JsonLd, { generateBreadcrumbSchema } from './JsonLd';

interface BreadcrumbItem {
    label: string;
    href: string;
}

interface Props {
    items: BreadcrumbItem[];
    lang?: string;
}

export default function Breadcrumbs({ items, lang = 'en' }: Props) {
    // Always start with Home
    const fullItems = [
        {
            label: lang === 'fr' ? 'Accueil' : 'Home',
            href: lang === 'en' ? '/' : '/fr'
        },
        ...items,
    ];

    // Prepare schema data
    const schemaItems = fullItems.map(item => ({
        name: item.label,
        url: item.href,
    }));

    const schema = generateBreadcrumbSchema(schemaItems);

    return (
        <>
            <JsonLd data={schema} id="breadcrumbs-schema" />
            <nav aria-label="Breadcrumb" className="text-sm text-gray-400 mb-6 font-mono">
                <ol className="list-none p-0 inline-flex flex-wrap">
                    {fullItems.map((item, index) => {
                        const isLast = index === fullItems.length - 1;
                        return (
                            <li key={item.href} className="flex items-center">
                                {index > 0 && <span className="mx-2 text-gray-600">/</span>}
                                {isLast ? (
                                    <span className="text-white font-medium" aria-current="page">
                                        {item.label}
                                    </span>
                                ) : (
                                    <Link href={item.href} className="hover:text-[#ff6600] transition-colors">
                                        {item.label}
                                    </Link>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </nav>
            {/* 
        This is a common SEO practice:
        We render the visible breadcrumb for users, and the invisible JSON-LD for Google.
        Google loves consistency between the two.
      */}
        </>
    );
}
