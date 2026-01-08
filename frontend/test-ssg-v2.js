const http = require('http');

// Corrected URL with /api/v1
const url = `http://localhost:8000/api/v1/games/sitemap/list?limit=5&skip=0`;

console.log(`Fetching 5 Sitemap Slugs (Correct URL)...`);

http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("Slugs Found:", json.length);
            if (json.length > 0) {
                json.forEach(item => {
                    console.log(" - " + item.slug);
                });
            }
        } catch (e) {
            console.error("Error parsing JSON:", e);
        }
    });
});
