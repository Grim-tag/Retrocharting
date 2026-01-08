
const axios = require('axios');

async function testSlugs() {
    const API_URL = 'http://localhost:8000/api/v1';
    console.log("Testing getAllSlugs against", API_URL);

    let allSlugs = [];
    let skip = 0;
    const limit = 5000; // Smaller batch to be safe
    let keepFetching = true;
    let count = 0;

    // We emulate api.ts logic but with explicit logging
    while (keepFetching && count < 20) {
        console.log(`Fetching batch ${count + 1} (skip=${skip})...`);
        try {
            const res = await axios.get(`${API_URL}/games/sitemap/list`, {
                params: { limit, skip }
            });
            const batch = res.data;
            if (batch.length > 0) {
                console.log(`Received ${batch.length} items.`);
                allSlugs = [...allSlugs, ...batch];
                skip += limit;
                if (batch.length < limit) keepFetching = false;
            } else {
                keepFetching = false;
            }
        } catch (e) {
            console.error("Error:", e.message);
            keepFetching = false;
        }
        count++;
    }

    console.log(`Total slugs fetched: ${allSlugs.length}`);

    // Check for the problematic slug
    // "/fr/games/007-first-light-ps5-cote-prix-90704" -> slug part "007-first-light-ps5-cote-prix-90704" ?? 
    // Wait, the slug in generateStaticParams is just the "slug" part.
    // The route is /[lang]/games/[slug]
    // The error says missing param: "/fr/games/007-first-light-ps5-cote-prix-90704"
    // This implies the [slug] param value is `007-first-light-ps5-cote-prix-90704`.

    // Let's find if "007-first-light-ps5-cote-prix-90704" exists in allSlugs.slug

    const target = "007-first-light-ps5-cote-prix-90704";
    const found = allSlugs.find(s => s.slug === target);

    if (found) {
        console.log("SUCCESS: Found target slug:", found);
    } else {
        console.log("FAILURE: Target slug NOT found.");
        // Does ID 90704 exist?
        // Note: getAllSlugs returns { slug, title, console, genre } from sitemap endpoint.
        // It does NOT iterate IDs directly unless we check partial slug matches.

        // Let's check for "90704" in any slug
        const partial = allSlugs.find(s => s.slug && s.slug.includes("90704"));
        if (partial) {
            console.log("Found similar slug:", partial.slug);
        }
    }
}

testSlugs();
