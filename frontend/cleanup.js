const fs = require('fs');
const path = require('path');

// List of explicit directories to remove from src/app
const dirs = [
    'src/app/[lang]/games/console',
    'src/app/[lang]/games/[slug]',
    'src/app/[lang]/consoles/[slug]',
    'src/app/[lang]/accessories/[slug]',
    'src/app/[lang]/accessories/console',
    'src/app/[lang]/user',
    'src/app/admin'
];

function moveDirectory(dirPath) {
    const fullPath = path.resolve(__dirname, dirPath);
    if (!fs.existsSync(fullPath)) return;

    // Create target outside src/app
    const projectRoot = path.resolve(__dirname, 'src');
    const removedRoutesDir = path.join(projectRoot, 'removed_routes');
    if (!fs.existsSync(removedRoutesDir)) fs.mkdirSync(removedRoutesDir);

    const dirName = path.basename(fullPath);
    // Flatten name 
    const flatName = dirPath.replace(/[\/\\]/g, '_').replace('src_app_', '') + '_' + Date.now();
    const targetPath = path.join(removedRoutesDir, flatName);

    try {
        fs.renameSync(fullPath, targetPath);
        console.log(`Moved ${dirPath} to ${targetPath}`);
    } catch (e) {
        console.error(`Error moving ${dirPath}:`, e);
    }
}

// Helper to scan for any dot folders in src/app and move them too
function scanAndMoveHidden(startDir) {
    const fullStartDir = path.resolve(__dirname, startDir);
    if (!fs.existsSync(fullStartDir)) return;

    let items;
    try {
        items = fs.readdirSync(fullStartDir);
    } catch (e) {
        return;
    }

    items.forEach(item => {
        const fullPath = path.join(fullStartDir, item);
        let stats;
        try {
            stats = fs.statSync(fullPath);
        } catch (e) { return; }

        if (stats.isDirectory()) {
            if (item.startsWith('.') && item !== '.' && item !== '..') {
                const relPath = path.relative(__dirname, fullPath);
                console.log(`Found hidden dir: ${relPath}, moving...`);
                moveDirectory(relPath);
            } else {
                const relativePath = path.relative(__dirname, fullPath);
                // Prevent scanning removed_routes or weird loops
                if (!relativePath.includes('removed_routes') && !relativePath.includes('node_modules') && !relativePath.includes('.git')) {
                    scanAndMoveHidden(relativePath);
                }
            }
        }
    });
}

// 1. Process explicit list (if they exist)
dirs.forEach(moveDirectory);

// 2. Recursive scan from src/app to catch ALL dot folders
scanAndMoveHidden('src/app');
