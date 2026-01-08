const http = require('http');

// Check the SUFFIXED version
const slug = 'baldur-s-gate-tales-of-the-sword-coast-pc-prices-value';
const url = `http://localhost:8000/api/v1/games/${slug}`;

console.log(`Checking API for SUFFIXED slug: ${slug}`);

http.get(url, (res) => {
    let data = '';
    console.log(`Status Code: ${res.statusCode}`);
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        if (res.statusCode === 200) console.log("FOUND!");
        else console.log("NOT FOUND");
    });
});
