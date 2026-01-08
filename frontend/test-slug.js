const http = require('http');

const slug = 'baldur-s-gate-tales-of-the-sword-coast-pc';
const url = `http://localhost:8000/games/${slug}`;

console.log(`Checking API for slug: ${slug}`);

http.get(url, (res) => {
    let data = '';
    console.log(`Status Code: ${res.statusCode}`);

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            if (res.statusCode === 200) {
                const json = JSON.parse(data);
                console.log("Product FOUND:", json.title);
            } else {
                console.log("Product NOT FOUND or Error:", data);
            }
        } catch (e) {
            console.error("Error parsing JSON:", e);
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
