const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Manual .env loader
const dotEnvPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(dotEnvPath)) {
    const envContent = fs.readFileSync(dotEnvPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val.length) process.env[key.trim()] = val.join('=').trim();
    });
}

/**
 * History Awareness: Get titles of existing games
 */
function getExistingGames() {
    const landingPath = path.join(__dirname, 'index.html');
    if (!fs.existsSync(landingPath)) return [];
    const content = fs.readFileSync(landingPath, 'utf8');
    const matches = content.matchAll(/<a href="games\/.*?">(.*?)<\/a>/g);
    return Array.from(matches).map(m => m[1]);
}

/**
 * AI Brainstorming: Concept Phase
 */
async function brainstormGameConcept(history) {
    const apiKey = process.env.BUTLER_API_KEY || process.env.GEMINI_API_KEY;
    const model = process.env.BUTLER_MODEL || "gpt-4o-mini";
    const baseUrl = process.env.BUTLER_BASE_URL || "https://api.openai.com/v1";

    if (!apiKey) return null;

    const historyStr = history.length > 0 ? history.join(', ') : 'None';
    const prompt = `You are a visionary game designer. Your goal is to brainstorm a UNIQUE, simple HTML5 game concept.
Already created games: ${historyStr}.
You MUST NOT repeat any of the above titles or their core mechanics.

Provide a JSON response:
{
  "title": "Creative Title (English)",
  "type": "Specific gameplay description (e.g. 'A side-scrolling shooter with gravity flipping')",
  "style": "Visual style description"
}
Output only JSON.`;

    try {
        console.log("[Generator] Brainstorming new concept...");
        const response = await axios.post(`${baseUrl}/chat/completions`, {
            model: model,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        }, { headers: { 'Authorization': `Bearer ${apiKey}` } });

        return JSON.parse(response.data.choices[0].message.content);
    } catch (e) {
        console.error("[Generator] Brainstorming Error:", e.message);
        return null;
    }
}

/**
 * AI Generation Helper
 */
async function callAIForGame(concept, history) {
    const apiKey = process.env.BUTLER_API_KEY || process.env.GEMINI_API_KEY;
    const model = process.env.BUTLER_MODEL || "gpt-4o-mini";
    const baseUrl = process.env.BUTLER_BASE_URL || "https://api.openai.com/v1";

    if (!apiKey) {
        console.warn("[Generator] No API Key found. Skipping AI generation.");
        return null;
    }

    const prompt = `You are a creative game developer.
Create a small, fun, single-file HTML5 game.
Title: ${concept.title}
Gameplay Concept: ${concept.type}
Visual Style: ${concept.style}

HISTORY (DO NOT REPEAT): ${history.join(', ')}

Requirements:
- Output a single complete HTML file containing all CSS and JS.
- Return ONLY the clean HTML code. No talk, no markdown markers.
- Ensure the gameplay is unique and reflects the concept provided.
- Include a Start button and a score system.
- **Monetization Integration (MANDATORY)**:
    1. Inside <head>, include: <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5510873226977158" crossorigin="anonymous"></script>
    2. At the top of <body>, include a horizontal AdSense unit:
       <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-5510873226977158" data-ad-slot="7052338247" data-ad-format="horizontal" data-full-width-responsive="true"></ins>
       <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    3. Include the Buy Me A Coffee widget script before </body>:
       <script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="aqutoqo" data-description="Support me on Buy me a coffee!" data-message="" data-color="#FFD700" data-position="Right" data-x_margin="18" data-y_margin="18"></script>
`;

    try {
        console.log(`[Generator] Requesting AI to generate: ${concept.title}...`);
        const response = await axios.post(`${baseUrl}/chat/completions`, {
            model: model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        let code = response.data.choices[0].message.content.trim();
        if (code.startsWith('```html')) code = code.replace(/```html\n?|```/g, '');
        else if (code.startsWith('```')) code = code.replace(/```\n?|```/g, '');

        return code;
    } catch (e) {
        console.error("[Generator] AI API Error:", e.message);
        return null;
    }
}

/**
 * Fallback to legacy template logic (more randomized)
 */
function generateTemplateGame(title, seed) {
    const bg = Math.random() > 0.5 ? '#0b1220' : '#1a1a1a';
    const h = Math.floor(Math.random() * 360);
    const color = `hsl(${h}, 80%, 50%)`;
    // Add more variance to fallback
    const speed = ((seed % 50) / 10 + 0.5).toFixed(2);
    const gravity = ((seed % 30) / 20 + 0.1).toFixed(2);

    const templatePath = path.join(__dirname, 'templates', 'game-template.html');
    if (!fs.existsSync(templatePath)) return "<html><body>Game template missing.</body></html>";

    let tpl = fs.readFileSync(templatePath, 'utf8');
    return tpl
        .replace(/\{\s*\{\s*TITLE\s*\}\s*\}/gs, title)
        .replace(/\{\s*\{\s*SEED\s*\}\s*\}/gs, seed)
        .replace(/\{\s*\{\s*BG\s*\}\s*\}/gs, bg)
        .replace(/\{\s*\{\s*COLOR\s*\}\s*\}/gs, color)
        .replace(/\{\s*\{\s*SPEED\s*\}\s*\}/gs, speed)
        .replace(/\{\s*\{\s*GRAVITY\s*\}\s*\}/gs, gravity);
}

/**
 * Main Execution
 */
async function generateDailyGame() {
    const history = getExistingGames();
    console.log(`[Generator] Historical games count: ${history.length}`);

    let concept = await brainstormGameConcept(history);
    
    // Safety check if brainstorming fails or returns an existing title
    if (!concept || history.includes(concept.title)) {
        console.log("[Generator] AI failed to provide a unique concept. Falling back to randomized defaults.");
        concept = {
            title: "Neon reflex " + Math.floor(Math.random() * 9999),
            type: "Dodge falling blocks that speed up over time",
            style: "Cyberpunk neon theme"
        };
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const seed = String(Math.floor(Math.random() * 1e9));
    const slug = 'game-' + seed.slice(0, 6);
    const folderName = `${dateStr}-${slug}`;

    let gameCode = await callAIForGame(concept, history);

    if (!gameCode) {
        console.log("[Generator] Falling back to template-based generation.");
        gameCode = generateTemplateGame(concept.title, seed);
    }

    const outputDir = path.join(__dirname, 'games', folderName);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(path.join(outputDir, 'index.html'), gameCode);

    updateLandingPage(folderName, concept.title, dateStr);
    console.log(`[Generator] DONE: ${folderName} - ${concept.title}`);
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
