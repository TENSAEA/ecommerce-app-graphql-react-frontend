import fetch from "node-fetch";
import https from "https";

export default async (req, res) => {
  // Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
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

    // Make an initial request to get cookies
    const initialResponse = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/json",
        Authorization: authHeader,
      },
      agent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });

    // Extract cookies from the initial response
    const cookies = initialResponse.headers.get("set-cookie");

    // Make a copy of the request body to avoid the "body used already" error
    const requestBody = JSON.stringify(req.body);

    // Forward the GraphQL request to the backend with cookies
    const apiResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/json",
        Authorization: authHeader,
        Cookie: cookies, // Include the cookies in the request
        Referer: "https://ecommercetensae.infinityfreeapp.com/",
      },
      body: requestBody,
      agent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });

    // Get the response as text to log it
    const responseText = await apiResponse.text();
    console.log("Raw response from backend:", responseText); // Log the raw response

    // Try to parse the response as JSON
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
    return res.status(apiResponse.status).json(responseData);
  } catch (error) {
    console.error("GraphQL proxy error:", error);
    return res.status(500).json({
      errors: [{ message: "GraphQL proxy failed: " + error.message }],
    });
  }
};
