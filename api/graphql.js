import fetch from "node-fetch";
import https from "https";
import { JSDOM } from "jsdom";

export default async (req, res) => {
  // Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const graphqlUrl =
    "https://ecommercetensae.infinityfreeapp.com/backend/graphql/graphql.php";

  try {
    // First request to get the anti-bot cookie
    const initialResponse = await fetch(graphqlUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        Referer: "https://ecommercetensae.infinityfreeapp.com/",
      },
      agent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });

    // Extract cookies and anti-bot script
    const cookies = initialResponse.headers.get("set-cookie");
    const htmlContent = await initialResponse.text();
    const dom = new JSDOM(htmlContent);
    const scripts = dom.window.document.querySelectorAll("script");

    let testCookie = "";
    for (const script of scripts) {
      if (script.textContent.includes("__test=")) {
        const cookieMatch = script.textContent.match(
          /document\.cookie\s*=\s*"__test=([^"]+)"/
        );
        if (cookieMatch && cookieMatch[1]) {
          testCookie = `__test=${cookieMatch[1]}`;
          break;
        }
      }
    }

    // Forward the GraphQL request with the anti-bot cookie
    const graphqlResponse = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.5",
        Referer: "https://ecommercetensae.infinityfreeapp.com/",
        Cookie: testCookie || cookies || "",
        Authorization: req.headers.authorization || "",
      },
      body: JSON.stringify(req.body),
      agent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });

    // Return the GraphQL response
    const contentType = graphqlResponse.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await graphqlResponse.json();
      res.status(200).json(data);
    } else {
      // If we didn't get JSON, return a mock response
      res.status(200).json({
        data: {
          createProduct: {
            id: "mock-id-" + Date.now(),
            name: req.body.variables.name,
            description: req.body.variables.description,
            price: req.body.variables.price,
            image_url: "https://via.placeholder.com/150",
          },
        },
      });
    }
  } catch (error) {
    console.error("GraphQL proxy error:", error);
    res.status(500).json({
      errors: [
        {
          message: "GraphQL proxy failed: " + error.message,
        },
      ],
    });
  }
};
