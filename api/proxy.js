import fetch from "node-fetch";

export default async (req, res) => {
  const backendUrl =
    "https://ecommercetensae.infinityfreeapp.com/backend/login.php";

  // Restrict to POST only, since login is typically POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req.body),
  };

  try {
    const response = await fetch(backendUrl, options);
    const data = await response.json();

    // Check if backend response indicates failure
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // Success case
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
