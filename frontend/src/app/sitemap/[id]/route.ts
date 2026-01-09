import { NextResponse } from 'next/server';
import { routeMap } from '@/lib/route-config';
import { systems } from '@/data/systems';

export const dynamic = 'force-static'; // Must be static for export

export async function generateStaticParams() {
    // Nuclear Mode removed: Determine actual number of sitemaps
    try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const BASE_API = API_URL.endsWith('/api/v1') ? API_URL : API_URL + '/api/v1';

        const res = await fetch(`${BASE_API}/games/count`, { next: { revalidate: 60 } });
        if (res.ok) {
            const total = await res.json();
            const pageSize = 10000;
            const numSitemaps = Math.ceil(total / pageSize) || 1;

            const params = [];
            for (let i = 0; i < numSitemaps; i++) {
                params.push({ id: `${i}.xml` });
            }
            console.log(`[Sitemap] Generated ${numSitemaps} sitemap IDs.`);
            return params;
        }
    } catch (e) {
        console.error("Sitemap Params Error:", e);
    }

    return [{ id: '0.xml' }];
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
    // Check for potential .xml extension if URL rewriting didn't strip it? 
    // Actually, [id] captures "0.xml".
    const idStr = params.id.replace('.xml', '');
    const id = parseInt(idStr);
    const BASE_URL = 'https://retrocharting.com';
    const limit = 10000;
    const skip = id * limit;

    // Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // --- STATIC CONTENT (Only for ID 0) ---
    if (id === 0) {
        // Simple static routes (Homepage, Categories)
        const staticUrls = [
            '/', '/en', '/fr',
            '/games', '/fr/games',
            '/consoles', '/fr/consoles',
            '/accessories', '/fr/accessories',
        ];

        staticUrls.forEach(u => {
            xml += '  <url>\n';
            xml += `    <loc>${BASE_URL}${u}</loc>\n`;
            xml += '    <changefreq>daily</changefreq>\n';
            xml += '    <priority>0.9</priority>\n';
            xml += '  </url>\n';
        });

        // Add Accessories Console Pages (Static list from systems.ts)
        const langs = ['en', 'fr'];

        // Flatten grouped systems
        const allSystems = Object.values(systems).flat(); // systems is array from systems.ts? No, it's exported as 'systems' array and 'groupedSystems' object.
        // systems variable in this file might be the array.
        // Checking import: import { systems } from '@/data/systems'; -> This is the array.

        systems.forEach(sys => {
            const cleanSlug = sys.toLowerCase().replace(/ /g, '-');
            langs.forEach(lang => {
                // e.g. /accessories/xbox-one
                const base = routeMap['accessories']?.[lang] || 'accessories';
                const path = lang === 'en' ? `/${base}/${cleanSlug}` : `/${lang}/${base}/${cleanSlug}`;

                xml += '  <url>\n';
                xml += `    <loc>${BASE_URL}${path}</loc>\n`;
                xml += '    <changefreq>monthly</changefreq>\n';
                xml += '    <priority>0.8</priority>\n';
                xml += '  </url>\n';
            });
        });
    }

    // --- DYNAMIC CONTENT (Games) ---
    try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const BASE_API = API_URL.endsWith('/api/v1') ? API_URL : API_URL + '/api/v1';

        const apiUrl = `${BASE_API}/games/sitemap/list?limit=${limit}&skip=${skip}`;
        const res = await fetch(apiUrl, { next: { revalidate: 3600 } });

        if (res.ok) {
            const games = await res.json();
            const langs = ['en', 'fr'];
            console.log(`[Sitemap ${id}] Added ${games.length} games.`);

            games.forEach((game: any) => {
                langs.forEach(lang => {
                    let routeKey = 'games';
                    if (game.genre === 'Accessories' || game.genre === 'Controllers') {
                        routeKey = 'accessories';
                    } else if (game.genre === 'Systems') {
                        routeKey = 'consoles';
                    }

                    const base = routeMap[routeKey]?.[lang] || routeKey;

                    // Unified URL Construction
                    const path = lang === 'en'
                        ? `/${routeKey}/${game.slug}`
                        : `/${lang}/${base}/${game.slug}`;

                    xml += '  <url>\n';
                    xml += `    <loc>${BASE_URL}${path}</loc>\n`;
                    xml += '    <changefreq>weekly</changefreq>\n';
                    xml += '  </url>\n';
                });
            });
        }
    } catch (e) {
        console.error(`Sitemap Child ${id} Error:`, e);
    }
    // console.log(`[Sitemap] Dynamic generation disabled for ID ${id}.`);

    xml += '</urlset>';

    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/xml',
        },
    });
}
