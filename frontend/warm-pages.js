const http = require('http');
const https = require('https');

// Configuration
const SITE_URL = process.env.SITE_URL || 'https://retrocharting.com';
const API_URL = process.env.API_URL || 'https://retrocharting-backend.onrender.com/api/v1';
const CONCURRENT_REQUESTS = 10; // Nombre de requêtes parallèles
const DELAY_MS = 100; // Délai entre chaque batch

// Stats
let totalPages = 0;
let generatedPages = 0;
let errors = 0;

console.log(`🔥 Page Warmer Started`);
console.log(`Site: ${SITE_URL}`);
console.log(`API: ${API_URL}`);
console.log(`Concurrency: ${CONCURRENT_REQUESTS}`);
console.log('');

// Fonction pour faire une requête HTTP/HTTPS
function fetchPage(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const startTime = Date.now();

        client.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const duration = Date.now() - startTime;
                if (res.statusCode === 200) {
                    generatedPages++;
                    console.log(`✅ [${generatedPages}/${totalPages}] ${url} (${duration}ms)`);
                    resolve();
                } else {
                    errors++;
                    console.log(`❌ [${generatedPages}/${totalPages}] ${url} - Status ${res.statusCode}`);
                    resolve(); // Continue même en cas d'erreur
                }
            });
        }).on('error', (err) => {
            errors++;
            console.error(`❌ Error: ${url} - ${err.message}`);
            resolve(); // Continue même en cas d'erreur
        });
    });
}

// Fonction pour traiter un batch de pages
async function processBatch(urls) {
    await Promise.all(urls.map(url => fetchPage(url)));
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
}

// Fonction principale
async function warmAllPages() {
    try {
        console.log('📡 Fetching all game slugs from API...');

        // Récupérer tous les slugs depuis l'API
        const allSlugs = [];
        let skip = 0;
        const limit = 10000;

        while (true) {
            const apiUrl = `${API_URL}/games/sitemap/list?limit=${limit}&skip=${skip}`;
            const response = await new Promise((resolve, reject) => {
                const client = apiUrl.startsWith('https') ? https : http;
                client.get(apiUrl, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => resolve(JSON.parse(data)));
                }).on('error', reject);
            });

            if (!response || response.length === 0) break;

            allSlugs.push(...response.map(g => g.slug));
            skip += limit;
            console.log(`  Loaded ${allSlugs.length} slugs...`);

            if (response.length < limit) break;
        }

        console.log(`\n✅ Found ${allSlugs.length} games\n`);

        // Générer les URLs pour EN et FR
        const urls = [];
        for (const slug of allSlugs) {
            const baseSlug = slug.replace(/-prices-value$/, '').replace(/-prix-cotes$/, '');
            urls.push(`${SITE_URL}/games/${baseSlug}-prices-value`);
            urls.push(`${SITE_URL}/fr/games/${baseSlug}-prix-cotes`);
        }

        totalPages = urls.length;
        console.log(`🎯 Total pages to warm: ${totalPages}\n`);

        // Traiter par batches
        for (let i = 0; i < urls.length; i += CONCURRENT_REQUESTS) {
            const batch = urls.slice(i, i + CONCURRENT_REQUESTS);
            await processBatch(batch);
        }

        console.log('\n✅ Warming complete!');
        console.log(`   Generated: ${generatedPages}`);
        console.log(`   Errors: ${errors}`);
        console.log(`   Total: ${totalPages}`);

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Lancer le warmer
warmAllPages();
