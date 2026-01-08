const http = require('http');

const query = 'Baldur';
const url = `http://localhost:8000/products?search=${query}&limit=5`;

console.log(`Searching API for: ${query}`);

http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("Search Results:", JSON.stringify(json, null, 2));
        } catch (e) {
            console.error("Error parsing JSON:", e);
        }
    });
});
