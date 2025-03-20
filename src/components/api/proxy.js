import fetch from "node-fetch";

export default async (req, res) => {
  const backendUrl =
    "https://ecommercetensae.infinityfreeapp.com/backend/login.php";
  const options = {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
    },
    body: req.method === "POST" ? JSON.stringify(req.body) : null,
  };

  try {
    const response = await fetch(backendUrl, options);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
