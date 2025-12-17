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
    region?: 'PAL' | 'NTSC' | 'JP' | 'NTSC-J';
    lang: string;
}

export default function ConsoleFaq({ products, systemName, region = 'NTSC', lang }: ConsoleFaqProps) {
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
            mostExpensiveName: mostExpensive?.product_name || (lang === 'fr' ? 'Édition Limitée' : 'Limited Edition')
        };
    }, [products, currency, lang]);

    if (!data) return null;

    // Translation Logic
    const t = {
        fr: {
            title: `Questions Fréquentes sur la ${systemName}`,
            pal: [
                {
                    q: `Combien coûte une ${systemName} (PAL) en Europe ?`,
                    a: `Le prix d'une ${systemName} version européenne dépend de son état. Comptez environ ${data.min} pour une console seule (en loose), et ${data.avg} pour un pack complet en bon état. Les éditions limitées spécifiques à l'Europe valent jusqu'à ${data.max}.`
                },
                {
                    q: `Les jeux ${systemName} PAL sont-ils compatibles tous pays ?`,
                    a: `Attention, les consoles ${systemName} PAL sont généralement zonées pour l'Europe (50Hz). Assurez-vous que vos jeux sont bien au format PAL pour garantir une compatibilité parfaite, sauf si la console a été modifiée.`
                },
                {
                    q: `Quelle est la ${systemName} la plus chère du catalogue ?`,
                    a: `Le modèle le plus rare recensé est la ${data.mostExpensiveName}, estimée à ${data.max}.`
                }
            ],
            jp: [
                {
                    q: `Quel est le prix d'une ${systemName} en Import Japon ?`,
                    a: `Les consoles ${systemName} japonaises (NTSC-J) sont souvent moins chères ou plus variées. Le prix moyen constaté est de ${data.avg}. L'entrée de gamme se situe à ${data.min}, mais les éditions collector exclusives au Japon peuvent monter à ${data.max}.`
                },
                {
                    q: `Faut-il un adaptateur pour une ${systemName} japonaise ?`,
                    a: `Oui, le courant au Japon est en 100-110V. Pour brancher une ${systemName} japonaise en France (220V), un convertisseur de tension est OBLIGATOIRE sous peine de griller l'alimentation.`
                },
                {
                    q: `Les jeux français passent-ils sur une ${systemName} Japonaise ?`,
                    a: `Généralement non, la ${systemName} japonaise est zonée NTSC-J. Elle ne lira que les jeux japonais, sauf utilisation d'un adaptateur ou modification de la console.`
                }
            ],
            default: [
                {
                    q: `Combien coûte une ${systemName} aujourd'hui ?`,
                    a: `Le prix d'une ${systemName} dépend grandement de son état et du modèle. Comptez environ ${data.min} pour une console seule (en loose), et ${data.avg} pour un pack complet en bon état. Les éditions collector scellées peuvent atteindre ${data.max}.`
                },
                {
                    q: `Quelle est la ${systemName} la plus chère ?`,
                    a: `Selon notre base de données actuelle, le modèle le plus coté est la ${data.mostExpensiveName}, estimée à ${data.max}. Ce prix peut varier selon la présence de la boîte d'origine et des notices.`
                },
                {
                    q: `Comment connaître la valeur de ma ${systemName} ?`,
                    a: `Utilisez RetroCharting pour rechercher votre modèle précis dans notre catalogue ci-dessus. Nous analysons les ventes réelles quotidiennement sur eBay et autres marketplaces pour vous donner une cote fiable et actualisée, basée sur ce que les acheteurs paient vraiment.`
                }
            ]
        },
        en: {
            title: `Frequently Asked Questions about ${systemName}`,
            pal: [
                {
                    q: `How much does a ${systemName} (PAL) cost in Europe?`,
                    a: `The price of a European ${systemName} depends on its condition. Expect to pay around ${data.min} for a loose console, and ${data.avg} for a complete-in-box set in good condition. Europe-specific limited editions can be worth up to ${data.max}.`
                },
                {
                    q: `Are ${systemName} PAL games region-free?`,
                    a: `Be aware that ${systemName} PAL consoles are generally region-locked to Europe (50Hz). Ensure your games are PAL format to guarantee compatibility, unless the console has been modified.`
                },
                {
                    q: `What is the most expensive ${systemName} in the catalog?`,
                    a: `The rarest model currently tracked is the ${data.mostExpensiveName}, estimated at ${data.max}.`
                }
            ],
            jp: [
                {
                    q: `What is the price of a ${systemName} Japanese Import?`,
                    a: `Japanese ${systemName} consoles (NTSC-J) are often cheaper or come in more varieties. The average tracked price is ${data.avg}. Entry-level units start at ${data.min}, but Japan-exclusive collector editions can reach ${data.max}.`
                },
                {
                    q: `Do I need an adapter for a Japanese ${systemName}?`,
                    a: `Yes, Japan uses 100-110V power. To plug a Japanese ${systemName} into a 220V outlet (Europe/UK), a step-down voltage converter is MANDATORY to avoid frying the power supply.`
                },
                {
                    q: `Do US/EU games work on a Japanese ${systemName}?`,
                    a: `Generally no, the Japanese ${systemName} is region-locked to NTSC-J. It will only play Japanese games unless you use an adapter or modify the console.`
                }
            ],
            default: [
                {
                    q: `How much is a ${systemName} worth today?`,
                    a: `The price of a ${systemName} depends heavily on its condition and model. Expect around ${data.min} for a loose console, and ${data.avg} for a complete box set. Sealed collector editions can reach ${data.max}.`
                },
                {
                    q: `What is the most expensive ${systemName}?`,
                    a: `According to our database, the most valuable model is the ${data.mostExpensiveName}, estimated at ${data.max}. Prices vary based on box and manual condition.`
                },
                {
                    q: `How do I check the value of my ${systemName}?`,
                    a: `Use RetroCharting to find your specific model in the catalog above. We track real sales daily on eBay and other marketplaces to give you a reliable, up-to-date market value based on what buyers actually pay.`
                }
            ]
        }
    };

    const dict = lang === 'fr' ? t.fr : t.en;
    let items = [];

    if (region === 'PAL') {
        items = dict.pal;
    } else if (region === 'JP' || region === 'NTSC-J') {
        items = dict.jp;
    } else {
        items = dict.default;
    }

    // Prepare JSON-LD Schema
    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': items.map(item => ({
            '@type': 'Question',
            'name': item.q,
            'acceptedAnswer': {
                '@type': 'Answer',
                'text': item.a
            }
        }))
    };

    return (
        <div className="bg-[#1f2533] border border-[#2a3142] rounded-lg p-6 mt-8">
            <JsonLd data={faqSchema} />

            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <QuestionMarkCircleIcon className="w-6 h-6 text-[#ff6600]" />
                {dict.title}
            </h2>

            <div className="space-y-6">
                {items.map((item, index) => (
                    <div key={index} className="border-b border-[#2a3142] last:border-0 pb-4 last:pb-0">
                        <h3 className="font-bold text-white mb-2 text-base">
                            {item.q}
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            {item.a}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
