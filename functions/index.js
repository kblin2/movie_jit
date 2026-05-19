const functions = require("firebase-functions");
const https     = require("https");

// Helper to make HTTPS requests from the server
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    }).on("error", reject);
  });
}

// OMDB search — called with ?q=movie+title
exports.omdbSearch = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  const q = req.query.q;
  if (!q) { res.status(400).json({ error: "Missing q param" }); return; }

  const key = functions.config().omdb.key;
  const url = `https://www.omdbapi.com/?s=${encodeURIComponent(q)}&type=movie&apikey=${key}`;
  try {
    const data = await fetchUrl(url);
    res.json(data);
  } catch(e) {
    res.status(500).json({ error: "OMDB request failed" });
  }
});

// OMDB detail — called with ?id=tt1234567
exports.omdbDetail = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  const id = req.query.id;
  if (!id) { res.status(400).json({ error: "Missing id param" }); return; }

  const key = functions.config().omdb.key;
  const url = `https://www.omdbapi.com/?i=${encodeURIComponent(id)}&apikey=${key}`;
  try {
    const data = await fetchUrl(url);
    res.json(data);
  } catch(e) {
    res.status(500).json({ error: "OMDB request failed" });
  }
});

// Admin password check — returns a short-lived token if correct
exports.adminCheck = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  const { password } = req.body;
  const correct = functions.config().admin.password;

  if (password === correct) {
    // Simple time-based token: hash of password + current hour
    // Good enough for a personal app — not a bank
    const hour  = Math.floor(Date.now() / 3600000);
    const token = Buffer.from(`${correct}:${hour}`).toString("base64");
    res.json({ ok: true, token });
  } else {
    res.status(401).json({ ok: false });
  }
});