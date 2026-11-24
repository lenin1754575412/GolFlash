const http = require("http");

const API_KEY = process.env.FOOTBALL_API_KEY;
const cache = new Map();

if (!API_KEY) {
  throw new Error("Falta FOOTBALL_API_KEY");
}

function normalize(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function findPhoto(name, birth) {
  const key = normalize(name) + "|" + birth;

  if (cache.has(key)) return cache.get(key);

  if (!birth || /^[A-Z]\.\s*/.test(name)) {
    return [];
  }

  const surname = name.trim().split(/\s+/).pop();

  if (!surname || surname.length < 4) return [];

  const response = await fetch(
    "https://v3.football.api-sports.io/players/profiles?search=" +
    encodeURIComponent(surname),
    {
      headers: {
        "x-apisports-key": API_KEY
      },
      signal: AbortSignal.timeout(8000)
    }
  );

  if (!response.ok) return [];

  const data = await response.json();

  if (Object.keys(data.errors || {}).length) return [];

  const players = (data.response || [])
    .map(x => x.player)
    .filter(Boolean);

  const matches = players.filter(p => {
    const fullName = normalize(
      [p.firstname, p.lastname].filter(Boolean).join(" ")
    );

    const sameName =
      fullName === normalize(name) ||
      normalize(p.name) === normalize(name);

    const sameBirth = p.birth?.date === birth;

    return sameName && sameBirth;
  });

  if (matches.length !== 1) return [];

  const player = matches[0];

  const photos = [
    player.photo,
    `https://media.api-sports.io/football/players/${player.id}.png`
  ].filter(x => typeof x === "string" && x.startsWith("https://"));

  const result = [...new Set(photos)];

  cache.set(key, result);

  return result;
}

http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const url = new URL(req.url, "http://localhost");

    if (url.pathname !== "/photo") {
      res.statusCode = 404;
      return res.end(JSON.stringify({ photos: [] }));
    }

    const name = url.searchParams.get("name") || "";
    const birth = url.searchParams.get("birth") || "";

    const photos = await findPhoto(name, birth);

    res.end(JSON.stringify({ photos }));

  } catch {
    res.end(JSON.stringify({ photos: [] }));
  }
}).listen(3105, "0.0.0.0", () => {
  console.log("GolFlash Photo Server - puerto 3105");
});