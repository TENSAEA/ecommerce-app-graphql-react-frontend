import fetch from "node-fetch";
import https from "https";
export default async (req, res) => {
  const backendUrl =
    "https://ecommercetensae.infinityfreeapp.com/backend/login.php";

  // Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: req.method === "POST" ? JSON.stringify(req.body) : null,
      agent: new https.Agent({
        // Bypass SSL verification
        rejectUnauthorized: false,
      }),
    });

    // Handle non-JSON responses
    const contentType = response.headers.get("content-type");
    const data = contentType?.includes("application/json")
      ? await response.json()
      : await response.text();

    res.status(response.status).json({
      status: response.status,
      data: data,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({
      error: "Proxy failed",
      message: error.message,
    });
  }
};
