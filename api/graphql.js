import fetch from "node-fetch";
import https from "https";
import { JSDOM } from "jsdom";

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

    // First request to get the anti-bot cookie
    const initialResponse = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        Referer: "https://ecommercetensae.infinityfreeapp.com/",
        Authorization: authHeader,
      },
      agent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });

    // Extract cookies from the initial response
    const cookies = initialResponse.headers.get("set-cookie");

    // Get the HTML content to extract the anti-bot script
    const htmlContent = await initialResponse.text();

    // Use JSDOM to parse the HTML and extract script content
    const dom = new JSDOM(htmlContent);
    const scripts = dom.window.document.querySelectorAll("script");

    // Extract the cookie value from the script if possible
    let testCookie = "";
    for (const script of scripts) {
      if (script.textContent.includes("__test=")) {
        // Try to extract the cookie value using regex
        const cookieMatch = script.textContent.match(
          /document\.cookie\s*=\s*"__test=([^"]+)"/
        );
        if (cookieMatch && cookieMatch[1]) {
          testCookie = `__test=${cookieMatch[1]}`;
          break;
        }
      }
    }

    // Make a copy of the request body to avoid the "body used already" error
    const requestBody = JSON.parse(JSON.stringify(req.body));

    // Now make the actual GraphQL request with the cookies
    const apiResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.5",
        Referer: "https://ecommercetensae.infinityfreeapp.com/",
        Cookie: testCookie || cookies || "",
        Authorization: authHeader,
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
      console.error("Failed to parse JSON:", error);
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
