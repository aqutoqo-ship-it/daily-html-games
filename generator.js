const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Random Configs for AI
 */
const GAME_TYPES = [
    "Dodging items falling from the sky",
    "Clicking moving targets as fast as possible",
    "A simple platformer where you jump over gaps",
    "A rhythm game where you click at the right time",
    "A memory matching game with shapes",
    "A typing challenge with falling words",
    "A snake game variant",
    "A top-down survival game where you escape enemies"
];

const STYLES = [
    "Cyberpunk with neon colors and dark background",
    "Retro 8-bit aesthetic with pixelated fonts",
    "Minimalist and clean white/gray UI",
    "Nature-themed with greens and soft earthy tones",
    "High-contrast black and yellow layout",
    "Glassmorphism with blurred backgrounds and vivid accents",
    "Comic book style with bold lines and vibrant colors"
];

const TITLES = [
    "Nebula Runner", "Void Clicker", "Cyber Strike", "Zen Flow",
    "Pulse Hunter", "Echo Jumper", "Grid Master", "Synth Wave",
    "Neon Reflex", "Bit Blaster", "Shadow Escape", "Spark Drift"
];

/**
 * AI Generation Helper
 */
async function callAIForGame(title, type, style) {
    const apiKey = process.env.BUTLER_API_KEY || process.env.GEMINI_API_KEY;
    const model = process.env.BUTLER_MODEL || "gpt-4o-mini";
    const baseUrl = process.env.BUTLER_BASE_URL || "https://api.openai.com/v1";

    if (!apiKey) {
        console.warn("[Generator] No API Key found. Skipping AI generation.");
        return null;
    }

    const prompt = `You are a creative game developer.
Create a small, fun, single-file HTML5 game.
Title: ${title}
Gameplay Type: ${type}
Visual Style: ${style}

Requirements:
- Output a single complete HTML file containing all CSS and JS.
- The game should be simple, intuitive, and fun.
- Use the visual style provided.
- Include a Start button and a score system.
- Ensure it works on desktop.
- Return ONLY the clean HTML code. No talk, no markdown markers.`;

    try {
        console.log(`[Generator] Requesting AI to generate: ${title} (${type})...`);
        const response = await axios.post(`${baseUrl}/chat/completions`, {
            model: model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        let code = response.data.choices[0].message.content.trim();
        // Remove markdown triple backticks if present
        if (code.startsWith('```html')) code = code.replace(/```html\n?|```/g, '');
        else if (code.startsWith('```')) code = code.replace(/```\n?|```/g, '');

        return code;
    } catch (e) {
        console.error("[Generator] AI API Error:", e.message);
        return null;
    }
}

/**
 * Fallback to legacy template logic
 */
function generateTemplateGame(title, seed) {
    const bg = Math.random() > 0.5 ? '#0b1220' : '#1a1a1a';
    const h = Math.floor(Math.random() * 360);
    const color = `hsl(${h}, 80%, 50%)`;
    const speed = (Math.random() * 1.5 + 0.8).toFixed(2);

    const templatePath = path.join(__dirname, 'templates', 'game-template.html');
    if (!fs.existsSync(templatePath)) return "<html><body>Game template missing.</body></html>";

    let tpl = fs.readFileSync(templatePath, 'utf8');
    return tpl
        .replace(/\{\s*\{\s*TITLE\s*\}\s*\}/gs, title)
        .replace(/\{\s*\{\s*SEED\s*\}\s*\}/gs, seed)
        .replace(/\{\s*\{\s*BG\s*\}\s*\}/gs, bg)
        .replace(/\{\s*\{\s*COLOR\s*\}\s*\}/gs, color)
        .replace(/\{\s*\{\s*SPEED\s*\}\s*\}/gs, speed);
}

/**
 * Main Execution
 */
async function generateDailyGame() {
    const dateStr = new Date().toISOString().slice(0, 10);
    const seed = String(Math.floor(Math.random() * 1e9));
    const slug = 'game-' + seed.slice(0, 6);
    const folderName = `${dateStr}-${slug}`;

    const title = TITLES[Math.floor(Math.random() * TITLES.length)];
    const type = GAME_TYPES[Math.floor(Math.random() * GAME_TYPES.length)];
    const style = STYLES[Math.floor(Math.random() * STYLES.length)];

    let gameCode = await callAIForGame(title, type, style);

    if (!gameCode) {
        console.log("[Generator] Falling back to template-based generation.");
        gameCode = generateTemplateGame(title, seed);
    }

    const outputDir = path.join(__dirname, 'games', folderName);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(path.join(outputDir, 'index.html'), gameCode);

    updateLandingPage(folderName, title, dateStr);
    console.log(`[Generator] DONE: ${folderName}`);
}

function updateLandingPage(slug, title, date) {
    const landingPath = path.join(__dirname, 'index.html');
    let content = fs.existsSync(landingPath) ? fs.readFileSync(landingPath, 'utf8') : getDefaultLanding();

    const newItem = `\n        <div class="game-item"><span>[${date}]</span> <a href="games/${slug}/index.html">${title}</a></div>`;
    const updatedContent = content.replace('<!-- GAMES_START -->', `<!-- GAMES_START -->${newItem}`);
    fs.writeFileSync(landingPath, updatedContent);
}

function getDefaultLanding() {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Daily HTML Games</title><style>
        body { background: #0b1220; color: #fff; font-family: sans-serif; padding: 40px; }
        .game-list { display: grid; gap: 10px; }
        .game-item { background: #1a1a1a; padding: 15px; border-radius: 8px; border-left: 4px solid gold; }
        a { color: gold; text-decoration: none; font-weight: bold; }
    </style></head><body><h1>Daily HTML Games (AI Edition)</h1><div class="game-list" id="list"><!-- GAMES_START --><!-- GAMES_END --></div></body></html>`;
}

if (require.main === module) {
    generateDailyGame();
}
