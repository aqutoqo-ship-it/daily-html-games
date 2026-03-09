const fs = require('fs');
const path = require('path');

/**
 * Random Parameter Generators
 */
function randSeed() { return String(Math.floor(Math.random() * 1e9)); }
function randColor() {
    const h = Math.floor(Math.random() * 360);
    return `hsl(${h}, 80%, 50%)`;
}
function slugFromSeed(s) { return 'game-' + s.slice(0, 6); }

/**
 * Core Generation Logic
 */
function generateDailyGame() {
    const dateStr = new Date().toISOString().slice(0, 10);
    const seed = randSeed();
    const slug = slugFromSeed(seed);
    const folderName = `${dateStr}-${slug}`;

    // Aesthetic params
    const titles = [
        "Shape Sniper", "Neon Clicker", "Reflex Mastery", "Color Hunter",
        "Swift Strike", "Echo Popper", "Void Chaser", "Pulse Runner"
    ];
    const title = `${titles[Math.floor(Math.random() * titles.length)]} (${slug})`;
    const bg = Math.random() > 0.5 ? '#0b1220' : '#1a1a1a';
    const color = randColor();
    const speed = (Math.random() * 1.5 + 0.8).toFixed(2);

    const templatePath = path.join(__dirname, 'templates', 'game-template.html');
    let tpl = fs.readFileSync(templatePath, 'utf8');

    // Inject parameters
    const output = tpl
        .replace(/\{\s*\{\s*TITLE\s*\}\s*\}/gs, title)
        .replace(/\{\s*\{\s*SEED\s*\}\s*\}/gs, seed)
        .replace(/\{\s*\{\s*BG\s*\}\s*\}/gs, bg)
        .replace(/\{\s*\{\s*COLOR\s*\}\s*\}/gs, color)
        .replace(/\{\s*\{\s*SPEED\s*\}\s*\}/gs, speed);

    const outputDir = path.join(__dirname, 'games', folderName);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(outputPath, output);

    updateLandingPage(folderName, title, dateStr);

    console.log(`[Generator] Game generated: ${folderName}`);
    return { folderName, title, dateStr };
}

/**
 * Update the main landing page with the new game entry
 */
function updateLandingPage(slug, title, date) {
    const landingPath = path.join(__dirname, 'index.html');
    let content = '';

    if (fs.existsSync(landingPath)) {
        content = fs.readFileSync(landingPath, 'utf8');
    } else {
        content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Daily HTML Games</title>
    <style>
        body { background: #0b1220; color: #fff; font-family: sans-serif; padding: 40px; }
        .game-list { display: grid; gap: 10px; }
        .game-item { background: #1a1a1a; padding: 15px; border-radius: 8px; border-left: 4px solid gold; }
        a { color: gold; text-decoration: none; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Daily HTML Games (English Edition)</h1>
    <div class="game-list" id="list"><!-- GAMES_START --><!-- GAMES_END --></div>
</body>
</html>`;
    }

    const newItem = `
        <div class="game-item">
            <span>[${date}]</span> 
            <a href="games/${slug}/index.html">${title}</a>
        </div>`;

    const updatedContent = content.replace('<!-- GAMES_START -->', `<!-- GAMES_START -->${newItem}`);
    fs.writeFileSync(landingPath, updatedContent);
}

// Execute if run directly
if (require.main === module) {
    generateDailyGame();
}
