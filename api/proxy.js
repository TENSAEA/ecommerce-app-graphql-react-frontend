import fetch from "node-fetch";
import https from "https";

export default async (req, res) => {
  const backendUrl =
    "https://ecommercetensae.infinityfreeapp.com/backend/login.php";

  // Security headers for Vercel proxy
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // CORS configuration (restrict to your frontend only)
  const allowedOrigin =
    "https://ecommerce-app-graphql-react-frontend-vercel.vercel.app";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Validate request method
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Clone and validate request body
    const body = JSON.stringify(req.body);
    if (!isValidLoginBody(req.body)) {
      return res.status(400).json({ error: "Invalid request format" });
    }

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; MyCommerceApp/1.0)", // Required to bypass anti-bot
        "X-Forwarded-For":
          req.headers["x-forwarded-for"] || req.socket.remoteAddress,
      },
      body: body,
      agent: new https.Agent({
        rejectUnauthorized: false, // Temporary SSL bypass
        keepAlive: true,
      }),
      timeout: 10000, // 10-second timeout
    });

    // Handle security challenges
    const contentType = response.headers.get("content-type") || "";
    const responseData = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    // Check for anti-bot HTML response
    if (typeof responseData === "string" && responseData.includes("/aes.js")) {
      return res.status(403).json({
        error: "Security challenge triggered",
        solution: "Contact hosting provider to whitelist Vercel IPs",
      });
    }

    // Forward response
    return res.status(response.status).json({
      status: response.status,
      data: responseData,
    });
  } catch (error) {
    console.error("Proxy Error:", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      error: "Gateway Error",
      message:
        process.env.NODE_ENV === "production"
          ? "Contact support"
          : error.message,
    });
  }
};

// Validation helper
function isValidLoginBody(body) {
  return (
    body &&
    typeof body.username === "string" &&
    typeof body.password === "string" &&
    body.username.length >= 3 &&
    body.password.length >= 8
  );
}
