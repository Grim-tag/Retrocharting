const http = require('http');

const url = `http://localhost:8000/products?console=PC%20Games&limit=10`;

console.log(`Listing 10 PC Games...`);

http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("PC Games FOUND:", json.length);
            if (json.length > 0) {
                console.log("First Slug:", json[0].game_slug || json[0].product_name);
                console.log("Full First Item:", JSON.stringify(json[0], null, 2));
            }
        } catch (e) {
            console.error("Error parsing JSON:", e);
        }
    });
});
