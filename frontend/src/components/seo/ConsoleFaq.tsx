'use client';

import { useMemo } from 'react';
import { Product } from '@/lib/api';
import { formatPrice } from '@/lib/currency';
import { useCurrency } from '@/context/CurrencyContext';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import JsonLd from '@/components/seo/JsonLd';

interface ConsoleFaqProps {
    products: Product[];
    systemName: string;
}

export default function ConsoleFaq({ products, systemName }: ConsoleFaqProps) {
    const { currency } = useCurrency();

    const data = useMemo(() => {
        const validProducts = products.filter(p => (p.loose_price || 0) > 0);
        if (validProducts.length === 0) return null;

        const prices = validProducts.map(p => p.loose_price || 0);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const total = prices.reduce((a, b) => a + b, 0);
        const avg = total / prices.length;
        const mostExpensive = validProducts.find(p => (p.loose_price || 0) === max);

        return {
            min: formatPrice(min, currency),
            max: formatPrice(max, currency),
            avg: formatPrice(avg, currency),
            mostExpensiveName: mostExpensive?.product_name || 'Édition Limitée'
        };
    }, [products, currency]);

    if (!data) return null;

    const faqItems = [
        {
            question: `Combien coûte une ${systemName} aujourd'hui ?`,
            answer: `Le prix d'une ${systemName} dépend grandement de son état et du modèle. Comptez environ ${data.min} pour une console seule (en loose), et ${data.avg} pour un pack complet en bon état. Les éditions collector scellées peuvent atteindre ${data.max}.`
        },
        {
            question: `Quelle est la ${systemName} la plus chère ?`,
            answer: `Selon notre base de données actuelle, le modèle le plus coté est la ${data.mostExpensiveName}, estimée à ${data.max}. Ce prix peut varier selon la présence de la boîte d'origine et des notices.`
        },
        {
            question: `Comment connaître la valeur de ma ${systemName} ?`,
            answer: `Utilisez RetroCharting pour rechercher votre modèle précis dans notre catalogue ci-dessus. Nous analysons les ventes réelles quotidiennement sur eBay et autres marketplaces pour vous donner une cote fiable et actualisée, basée sur ce que les acheteurs paient vraiment.`
        }
    ];

    // Prepare JSON-LD Schema
    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': faqItems.map(item => ({
            '@type': 'Question',
            'name': item.question,
            'acceptedAnswer': {
                '@type': 'Answer',
                'text': item.answer
            }
        }))
    };

    return (
        <div className="bg-[#1f2533] border border-[#2a3142] rounded-lg p-6 mt-8">
            <JsonLd data={faqSchema} />

            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <QuestionMarkCircleIcon className="w-6 h-6 text-[#ff6600]" />
                Questions Fréquentes sur la {systemName}
            </h2>

            <div className="space-y-6">
                {faqItems.map((item, index) => (
                    <div key={index} className="border-b border-[#2a3142] last:border-0 pb-4 last:pb-0">
                        <h3 className="font-bold text-white mb-2 text-base">
                            {item.question}
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            {item.answer}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
