import fetch from "node-fetch";
import https from "https";

export default async (req, res) => {
  // Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization"
  );

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only accept POST requests for GraphQL
  if (req.method !== "POST") {
    return res.status(405).json({
      errors: [
        { message: "Method not allowed. Use POST for GraphQL requests." },
      ],
    });
  }

  const backendUrl =
    "https://ecommercetensae.infinityfreeapp.com/backend/graphql.php";

  try {
    // Extract the Authorization header from the incoming request
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        errors: [{ message: "Unauthorized: JWT missing or invalid format" }],
      });
    }

    // Make a copy of the request body to avoid the "body used already" error
    const requestBody = JSON.parse(JSON.stringify(req.body));

    // Forward the GraphQL request to the backend
    const apiResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/json",
        Authorization: authHeader,
        Referer: "https://ecommercetensae.infinityfreeapp.com/",
      },
      body: JSON.stringify(requestBody),
      agent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });

    // Get the response as text first
    const responseText = await apiResponse.text();

    // Try to parse as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (error) {
      console.error("Failed to parse response as JSON:", responseText);
      return res.status(500).json({
        errors: [
          {
            message: "Invalid JSON response from GraphQL server",
            extensions: {
              code: "INTERNAL_SERVER_ERROR",
              responseText: responseText.substring(0, 1000), // Limit the size for security
            },
          },
        ],
      });
    }

    // Return the GraphQL response
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("GraphQL proxy error:", error);
    return res.status(500).json({
      errors: [
        {
          message: "GraphQL proxy failed: " + error.message,
        },
      ],
    });
  }
};
