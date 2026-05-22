import express from "express";
import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import db from "./db.js";
import { optimizeBudget } from "./optimizeBudget.js";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-for-dev";
const MODEL = "llama-3.3-70b-versatile";

// ── Rate Limiter (in‑memory, per IP) ──────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 10;       // max requests per window
const RATE_WINDOW = 60_000;  // 60 seconds

function rateLimit(req: any, res: any): boolean {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + RATE_WINDOW });
    return false; // not limited
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) {
    res.status(429).json({ error: "Too many requests. Please wait a minute." });
    return true; // limited
  }
  return false;
}

// ── Validation helper ─────────────────────────────────────────────────────────
function validateBody(req: any, res: any, fields: string[]): boolean {
  for (const f of fields) {
    if (req.body[f] === undefined || req.body[f] === null || req.body[f] === "") {
      res.status(400).json({ error: `Missing required field: ${f}` });
      return false;
    }
  }
  return true;
}

// ── Auth Middleware ──────────────────────────────────────────────────────────

function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ── AI Helper ───────────────────────────────────────────────────────────────

const FALLBACK_MODELS = [
  "llama3-70b-8192",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
  "llama-3.3-70b-versatile", // Ultimate safety net (Guaranteed active)
  "llama-3.1-8b-instant"     // Ultimate emergency net (Guaranteed active)
];

// Timeout wrapper for fetch calls
const fetchWithTimeout = async (promise: Promise<any>, ms: number) => {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("API Request Timeout")), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

async function generateAIResponse(systemPrompt: string, userPrompt: string, json = true) {
  if (!process.env.GROQ_API_KEY) {
    console.error("❌ CRITICAL: GROQ_API_KEY is missing from environment variables!");
    throw new Error("Missing GROQ_API_KEY setup in environment variables.");
  }

  const RETRIES = 2;
  const TIMEOUT_MS = 10000;
  const RETRY_DELAY_MS = 1000;

  for (const model of FALLBACK_MODELS) {
    // Attempt 1 + 2 retries = up to 3 iterations per model
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      try {
        console.log(`🧠 [AI Engine] Using model: ${model} (Attempt ${attempt + 1}/${RETRIES + 1})`);
        
        const requestPromise = groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          model: model,
          ...(json ? { response_format: { type: "json_object" as const } } : {}),
        });

        // Fail fast with 10 second timeout
        const completion = await fetchWithTimeout(requestPromise, TIMEOUT_MS) as any;
        const raw = completion.choices[0]?.message?.content || (json ? "{}" : "");
        console.log(`✅ [AI Engine] Success using model: ${model}`);
        return json ? JSON.parse(raw) : raw;
        
      } catch (err: any) {
        const errorType = err?.error?.code || err?.message || err?.status || "Network/Unknown Error";
        console.error(`⚠️ [AI Engine] Error type [${errorType}] on model: ${model}`);

        if (errorType === "invalid_api_key" || String(errorType).includes("invalid_api_key")) {
           console.error("❌ CRITICAL: Invalid API Key provided.");
           break;
        }

        const errString = String(err?.message || errorType);
        const isRecoverable = errString.includes("rate_limit_exceeded") ||
                              errString.includes("decommissioned") ||
                              errString.includes("not found") ||
                              err?.status === 429 ||
                              err?.status === 404 ||
                              err?.status === 400 ||
                              errString.includes("400") ||
                              errString.includes("Timeout") ||
                              errString.includes("network");

        if (attempt < RETRIES && isRecoverable) {
           console.log(`⏳ [AI Engine] Retrying model ${model} in ${RETRY_DELAY_MS}ms...`);
           await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
           continue;
        } else {
           console.log(`📉 [AI Engine] Fallback triggered! Model ${model} failed after retries. Rotating to next available model.`);
           break; // Move to next model
        }
      }
    }
  }

  // Safe Fallback Return completely preventing App Crashes
  console.error("❌ [AI Engine] FATAL: All fallback models in the chain failed.");
  if (json) {
     return {
        success: false,
        message: "AI service temporarily unavailable. Please try again."
     };
  }
  return "AI service temporarily unavailable. Please try again.";
}

// ── Server ──────────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/health", (_req, res) => res.json({ status: "ok", version: "2.0" }));

  // ═══════════════════════════════════════════════════════════════════════════
  // PEXELS FOOD IMAGE PROXY
  // ═══════════════════════════════════════════════════════════════════════════
  const imageCache = new Map<string, { src: string; photographer: string }[]>();

  // Simple hash to guarantee unique images per query
  function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  app.get("/api/food-image", async (req, res) => {
    try {
      const query = (req.query.query as string) || "food";
      const PEXELS_KEY = process.env.PEXELS_API_KEY;
      if (!PEXELS_KEY) {
        // Fallback to LoremFlickr (no key needed, reliable)
        return res.json({
          photos: [{ src: `https://loremflickr.com/600/400/${encodeURIComponent(query)},food?lock=${simpleHash(query)}`, photographer: "LoremFlickr" }]
        });
      }

      // Check cache first
      if (imageCache.has(query)) {
        return res.json({ photos: imageCache.get(query) });
      }

      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query + " food")}&per_page=3&orientation=landscape`,
        { headers: { Authorization: PEXELS_KEY } }
      );

      if (!response.ok) throw new Error("Pexels API error");
      const data = await response.json() as any;

      const photos = (data.photos || []).map((p: any) => ({
        src: p.src?.medium || p.src?.small || p.src?.original,
        photographer: p.photographer || "Unknown",
      }));

      // Cache the result
      imageCache.set(query, photos);

      res.json({ photos });
    } catch (error) {
      console.error("Pexels API error:", error);
      // Fallback
      res.json({
        photos: [{ src: `https://loremflickr.com/600/400/${encodeURIComponent((req.query.query as string) || "food")},food?lock=${simpleHash((req.query.query as string) || "food")}`, photographer: "LoremFlickr" }]
      });
    }
  });

  // Batch endpoint — fetch multiple food images in one call
  app.post("/api/food-images/batch", async (req, res) => {
    try {
      const { queries } = req.body as { queries: string[] };
      if (!queries || !Array.isArray(queries)) return res.status(400).json({ error: "queries array required" });

      const PEXELS_KEY = process.env.PEXELS_API_KEY;
      const results: Record<string, string> = {};

      for (const query of queries.slice(0, 20)) {
        if (imageCache.has(query) && imageCache.get(query)!.length > 0) {
          results[query] = imageCache.get(query)![0].src;
          continue;
        }

        if (PEXELS_KEY) {
          try {
            const response = await fetch(
              `https://api.pexels.com/v1/search?query=${encodeURIComponent(query + " food")}&per_page=1&orientation=landscape`,
              { headers: { Authorization: PEXELS_KEY } }
            );
            const data = await response.json() as any;
            const photo = data.photos?.[0];
            if (photo) {
              const url = photo.src?.medium || photo.src?.small;
              results[query] = url;
              imageCache.set(query, [{ src: url, photographer: photo.photographer }]);
            } else {
              results[query] = `https://loremflickr.com/600/400/${encodeURIComponent(query)},food?lock=${simpleHash(query)}`;
            }
          } catch {
            results[query] = `https://loremflickr.com/600/400/${encodeURIComponent(query)},food?lock=${simpleHash(query)}`;
          }
        } else {
          results[query] = `https://loremflickr.com/600/400/${encodeURIComponent(query)},food?lock=${simpleHash(query)}`;
        }
      }

      res.json({ images: results });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch images" });
    }
  });


  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) return res.status(400).json({ error: "All fields are required" });

      const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (existing) return res.status(400).json({ error: "Email already exists" });

      const hashed = await bcrypt.hash(password, 10);
      const info = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hashed);

      // Create default preferences
      db.prepare('INSERT OR IGNORE INTO preferences (user_id) VALUES (?)').run(info.lastInsertRowid);

      const token = jwt.sign({ id: info.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: info.lastInsertRowid, name, email } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password required" });

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token" });
    try {
      const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET) as any;
      const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(decoded.id);
      if (!user) return res.status(404).json({ error: "Not found" });
      res.json({ user });
    } catch { res.status(401).json({ error: "Invalid token" }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SMART BUDGET OPTIMIZER — TRIP PLANNER V2
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/plan-trip", async (req, res) => {
    try {
      const { budget, days, travelers, travelType, destination, transport, mood, cities } = req.body;

      const citiesStr = Array.isArray(cities) && cities.length > 0
        ? cities.map((c: any) => `${c.city} (${c.days} days)`).join(", ")
        : destination;

      const prompt = `You are an expert travel budget optimizer. Plan an optimized trip:

TRIP DETAILS:
- Budget: ₹${budget} total for ${travelers} traveler(s)
- Duration: ${days} days
- Travelers: ${travelers}
- Travel Style: ${travelType}
- Mood: ${mood || "balanced"}
- Destinations: ${citiesStr}
- Transport Preference: ${transport}

RESPOND WITH VALID JSON matching this EXACT structure:
{
  "destination": "${destination}",
  "hotelSuggestion": "Hotel name",
  "bestRoute": {
    "recommended": "cheapest type",
    "alternatives": [
      { "type": "flight", "cost": 0, "duration": "2h" },
      { "type": "train", "cost": 0, "duration": "6h" },
      { "type": "bus", "cost": 0, "duration": "8h" }
    ],
    "savings": 0
  },
  "expenses": {
    "transport": 0,
    "hotel": { "budget": 0, "premium": 0 },
    "food": { "street": 0, "restaurants": 0 },
    "entryFees": 0,
    "activities": 0,
    "total": 0
  },
  "foodSuggestions": {
    "budget": [{ "name": "Dish", "cost": 0, "location": "Place" }],
    "famous": [{ "name": "Dish", "cost": 0, "location": "Restaurant" }]
  },
  "itinerary": [{ "day": 1, "title": "Title", "activities": ["activity"] }],
  "tips": ["tip"],
  "ecoImpact": "Carbon footprint description",
  "carbonKg": 0
}

RULES:
- ALL costs in realistic INR for ${destination}.
- hotel.budget/premium = total for ${days} nights. food.street/restaurants = total for ${days} days.
- At least 2 transport alternatives, 3+ budget & 3+ famous food items, 4+ tips.
- Day-by-day itinerary for all ${days} days.
- carbonKg = estimated CO2 in kg for the entire trip.
- Mood "${mood || "balanced"}" should influence suggestions (e.g., chill = spas, adventure = trekking).`;

      const sys = "You are a travel budget optimization AI. Respond ONLY with valid JSON. All monetary values must be numbers. Realistic costs in INR (₹).";
      const raw = await generateAIResponse(sys, prompt);
      
      if (raw.success === false) {
          return res.status(503).json(raw);
      }
      
      const optimized = optimizeBudget(raw, Number(budget));
      res.json(optimized);
    } catch (error) {
      console.error("Trip planning error:", error);
      res.status(500).json({ error: "Failed to plan trip" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SAFETY SCORING
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/safety-score", async (req, res) => {
    try {
      const { destination } = req.body;
      if (!destination) return res.status(400).json({ error: "Destination required" });

      const prompt = `Analyze the travel safety of "${destination}" for tourists. Return JSON:
{
  "destination": "${destination}",
  "score": {
    "overall": 0,
    "crimeRisk": "low|moderate|high",
    "scamRisk": "low|moderate|high",
    "healthRisk": "low|moderate|high",
    "transportSafety": "safe|moderate|risky",
    "naturalDisaster": "low|moderate|high"
  },
  "commonScams": [{ "name": "", "description": "", "avoidTip": "" }],
  "emergencyNumbers": [{ "service": "", "number": "" }],
  "healthTips": [""],
  "travelAdvisory": "",
  "safeAreas": [""],
  "avoidAreas": [""]
}
Provide at least 3 scams, 3 emergency numbers, 3 health tips, 2 safe areas, 2 avoid areas. Overall score 0-100.`;

      const result = await generateAIResponse("You are a travel safety analyst AI. Respond with valid JSON only.", prompt);
      res.json(result);
    } catch (error) {
      console.error("Safety scoring error:", error);
      res.status(500).json({ error: "Failed to analyze safety" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOD DISCOVERY
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/food-discover", async (req, res) => {
    try {
      const { destination, budget, dietary } = req.body;
      if (!destination) return res.status(400).json({ error: "Destination required" });

      const prompt = `Discover the best food experiences in "${destination}" ${dietary ? `for someone with dietary preference: ${dietary}` : ''}. Budget level: ${budget || 'moderate'}. Return JSON:
{
  "destination": "${destination}",
  "hiddenGems": [{ "name": "", "type": "street|cafe|restaurant|hidden-gem", "cuisine": "", "avgCost": 0, "priceRange": { "min": 0, "max": 0 }, "location": "", "address": "", "openingHours": "10:00 AM - 11:00 PM", "isVeg": false, "spiceLevel": "mild|medium|hot|very-hot", "knownFor": "one sentence about what makes this place special", "ambiance": "casual|fine-dining|street-side|rooftop|cozy-cafe|family-friendly", "safetyScore": 8, "mustTry": [""], "tip": "", "imageSearch": "dish name food", "benefits": ["health benefit 1", "health benefit 2"], "reviews": [{ "user": "Name", "rating": 4.5, "comment": "review text", "date": "2024-01" }] }],
  "budgetPicks": [{ "name": "", "type": "street", "cuisine": "", "avgCost": 0, "priceRange": { "min": 0, "max": 0 }, "location": "", "address": "", "openingHours": "", "isVeg": false, "spiceLevel": "medium", "knownFor": "", "ambiance": "street-side", "safetyScore": 8, "mustTry": [""], "tip": "", "imageSearch": "dish name food", "benefits": [""], "reviews": [{ "user": "Name", "rating": 4, "comment": "", "date": "2024-02" }] }],
  "famousSpots": [{ "name": "", "type": "restaurant", "cuisine": "", "avgCost": 0, "priceRange": { "min": 0, "max": 0 }, "location": "", "address": "", "openingHours": "", "isVeg": false, "spiceLevel": "medium", "knownFor": "", "ambiance": "fine-dining", "safetyScore": 9, "mustTry": [""], "tip": "", "imageSearch": "dish name food", "benefits": [""], "reviews": [{ "user": "Name", "rating": 5, "comment": "", "date": "2024-03" }] }],
  "dietaryNotes": [""],
  "waterSafety": "",
  "localEtiquette": ["food etiquette tip 1", "tip 2"],
  "bestFoodAreas": ["area name 1", "area name 2"]
}
RULES:
- At least 5 items per category (hiddenGems, budgetPicks, famousSpots). Costs in INR. safetyScore 1-10.
- imageSearch: a 2-4 word search term for the dish photo (e.g., "butter chicken curry", "pav bhaji street food", "sushi platter")
- benefits: 2-3 actual health/nutritional benefits of the dish
- reviews: 2-3 realistic traveler reviews with name, rating (1-5), short comment, and month-year
- address: specific street/area address
- openingHours: typical opening hours in 12h format
- isVeg: true if vegetarian, false if non-vegetarian
- spiceLevel: one of mild, medium, hot, very-hot
- knownFor: one engaging sentence about what makes this place special
- ambiance: one of casual, fine-dining, street-side, rooftop, cozy-cafe, family-friendly
- priceRange: min and max price per person in INR
- localEtiquette: 3-4 local food etiquette tips for tourists
- bestFoodAreas: top 3-4 food zones/streets in the destination`;

      const result = await generateAIResponse("You are a food discovery AI. Respond with valid JSON only.", prompt);
      res.json(result);
    } catch (error) {
      console.error("Food discovery error:", error);
      res.status(500).json({ error: "Failed to discover food" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HOTEL INTELLIGENCE
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/hotel-intelligence", async (req, res) => {
    try {
      const { destination, budget, days } = req.body;
      if (!destination) return res.status(400).json({ error: "Destination required" });

      const prompt = `Analyze hotels in "${destination}" for a ${days || 5}-day trip within budget ₹${budget || 50000}. Return JSON:
{
  "destination": "${destination}",
  "recommended": { "name": "", "category": "mid-range", "pricePerNight": 0, "safetyScore": 8, "cleanlinessScore": 8, "locationScore": 9, "noiseLevel": "quiet", "nearbyLandmarks": [""], "tip": "" },
  "budgetOptions": [{ "name": "", "category": "budget", "pricePerNight": 0, "safetyScore": 7, "cleanlinessScore": 7, "locationScore": 7, "noiseLevel": "moderate", "nearbyLandmarks": [""], "tip": "" }],
  "premiumOptions": [{ "name": "", "category": "premium", "pricePerNight": 0, "safetyScore": 9, "cleanlinessScore": 9, "locationScore": 9, "noiseLevel": "quiet", "nearbyLandmarks": [""], "tip": "" }],
  "scamWarnings": [""],
  "tips": [""]
}
At least 2 budget and 2 premium options. Prices per night in INR. Scores 1-10.`;

      const result = await generateAIResponse("You are a hotel analysis AI. Respond with valid JSON only.", prompt);
      res.json(result);
    } catch (error) {
      console.error("Hotel intelligence error:", error);
      res.status(500).json({ error: "Failed to analyze hotels" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVITY SUGGESTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/activity-suggest", async (req, res) => {
    try {
      const { destination, days, mood, budget } = req.body;
      if (!destination) return res.status(400).json({ error: "Destination required" });

      const prompt = `Suggest activities and a packing list for "${destination}" — ${days || 5} days, mood: ${mood || "balanced"}, budget: ₹${budget || 50000}. Return JSON:
{
  "destination": "${destination}",
  "days": ${days || 5},
  "activities": [{ 
    "name": "", 
    "type": "cultural|adventure|relaxation|nightlife|nature|shopping", 
    "cost": 0, 
    "priceRange": { "min": 0, "max": 0 },
    "duration": "2h", 
    "bestTime": "morning|afternoon|evening|night|anytime", 
    "weatherDependent": false, 
    "crowdLevel": "low|moderate|high", 
    "rating": 4.5, 
    "tip": "",
    "imageSearch": "activity name place photo",
    "location": "area/locality name",
    "address": "specific address",
    "openingHours": "9:00 AM - 6:00 PM",
    "description": "2-3 sentence vivid description of this activity and why it's special",
    "difficulty": "easy|moderate|challenging",
    "ageGroup": "all-ages|adults|kids-friendly|seniors-friendly",
    "accessibility": "wheelchair-friendly|partially-accessible|not-accessible",
    "bestSeason": "summer|winter|monsoon|all-year",
    "highlights": ["highlight 1", "highlight 2", "highlight 3"],
    "benefits": ["benefit 1", "benefit 2"],
    "reviews": [{ "user": "Name", "rating": 4.5, "comment": "review text", "date": "2024-01" }],
    "nearbyFood": "nearby popular food spot name"
  }],
  "packingList": [{ "item": "", "category": "clothes|tech|documents|medicine|misc", "essential": true }],
  "weatherForecast": "Expected weather description",
  "bestTimeToVisit": "Best months to visit",
  "localTips": ["local tip 1", "local tip 2", "local tip 3"],
  "topAreas": ["top tourist area 1", "area 2"]
}
RULES:
- At least 10 activities and 12 packing items. Costs in INR.
- imageSearch: a 2-4 word term for finding a photo of this activity (e.g., "marine drive sunset mumbai", "scuba diving goa beach")
- description: engaging 2-3 sentence description of the experience
- highlights: 2-3 specific highlights or unique aspects
- benefits: 2-3 benefits (physical, mental, cultural enrichment etc.)
- reviews: 2-3 realistic traveler reviews with name, rating (1-5), short comment, and month-year
- difficulty: how physically demanding the activity is
- nearbyFood: a nearby popular food spot to visit after this activity
- localTips: 3-4 general tips for tourists at this destination
- topAreas: top 3-4 tourist areas or zones in the destination`;

      const result = await generateAIResponse("You are a travel activity planner AI. Respond with valid JSON only.", prompt);
      res.json(result);
    } catch (error) {
      console.error("Activity suggestion error:", error);
      res.status(500).json({ error: "Failed to suggest activities" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHATBOT V2 (Persistent History)
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, sessionId } = req.body;
      const sid = sessionId || crypto.randomUUID();

      // Load last 10 messages for context
      const history = db.prepare(
        'SELECT role, content FROM chat_history WHERE session_id = ? ORDER BY created_at DESC LIMIT 10'
      ).all(sid) as { role: string; content: string }[];

      const contextMessages = history.reverse().map(h => ({
        role: h.role === 'user' ? 'user' as const : 'assistant' as const,
        content: h.content,
      }));

      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "You are AeroVoyage AI — a premium travel assistant. You remember conversation context. Answer travel queries with specific, helpful advice. Suggest destinations, hotels, food, budgets, and safety tips. Be concise, friendly, and knowledgeable. Format important info with bullet points." },
          ...contextMessages,
          { role: "user", content: message },
        ],
        model: MODEL,
      });

      const reply = completion.choices[0]?.message?.content || "";

      // Save to history
      const insert = db.prepare('INSERT INTO chat_history (session_id, role, content) VALUES (?, ?, ?)');
      insert.run(sid, 'user', message);
      insert.run(sid, 'bot', reply);

      res.json({ reply, sessionId: sid });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TRIPS (Save / List / Get)
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/trips", authMiddleware, (req: any, res) => {
    try {
      const { destination, cities, mood, budget, days, travelers, data, antigravityScore, carbonKg } = req.body;
      const shareToken = crypto.randomUUID().slice(0, 8);
      const info = db.prepare(
        `INSERT INTO trips (user_id, destination, cities, mood, budget, days, travelers, data, antigravity_score, carbon_kg, share_token)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(req.userId, destination, JSON.stringify(cities || []), mood || 'balanced', budget, days, travelers, JSON.stringify(data), antigravityScore || 0, carbonKg || 0, shareToken);
      res.json({ id: info.lastInsertRowid, shareToken });
    } catch (error) {
      console.error("Save trip error:", error);
      res.status(500).json({ error: "Failed to save trip" });
    }
  });

  app.get("/api/trips", authMiddleware, (req: any, res) => {
    try {
      const trips = db.prepare('SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
      res.json({ trips });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trips" });
    }
  });

  app.get("/api/trips/shared/:token", (req, res) => {
    try {
      const trip = db.prepare('SELECT * FROM trips WHERE share_token = ?').get(req.params.token);
      if (!trip) return res.status(404).json({ error: "Trip not found" });
      res.json({ trip });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trip" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PREFERENCES
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/preferences", authMiddleware, (req: any, res) => {
    try {
      let prefs = db.prepare('SELECT * FROM preferences WHERE user_id = ?').get(req.userId) as any;
      if (!prefs) {
        db.prepare('INSERT INTO preferences (user_id) VALUES (?)').run(req.userId);
        prefs = db.prepare('SELECT * FROM preferences WHERE user_id = ?').get(req.userId);
      }
      res.json({ preferences: prefs });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  app.put("/api/preferences", authMiddleware, (req: any, res) => {
    try {
      const { defaultMood, budgetStyle, dietaryPref, interests, carbonConscious, theme } = req.body;
      db.prepare(
        `INSERT INTO preferences (user_id, default_mood, budget_style, dietary_pref, interests, carbon_conscious, theme, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           default_mood = excluded.default_mood,
           budget_style = excluded.budget_style,
           dietary_pref = excluded.dietary_pref,
           interests = excluded.interests,
           carbon_conscious = excluded.carbon_conscious,
           theme = excluded.theme,
           updated_at = excluded.updated_at`
      ).run(req.userId, defaultMood || 'chill', budgetStyle || 'moderate', JSON.stringify(dietaryPref || []), JSON.stringify(interests || []), carbonConscious ? 1 : 0, theme || 'dark');
      res.json({ success: true });
    } catch (error) {
      console.error("Preferences error:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE EDITOR (Stub)
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/edit-image", async (_req, res) => {
    res.status(400).json({ error: "Image editing requires a vision-capable API. Coming in Phase 2." });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VITE MIDDLEWARE
  // ═══════════════════════════════════════════════════════════════════════════
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 AeroVoyage V2 running on http://localhost:${PORT}`);
  });
}

startServer();
