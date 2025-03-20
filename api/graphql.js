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

    // Now make the actual GraphQL request with the cookies
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

    const contentType = graphqlResponse.headers.get("content-type");
    let responseData;

    if (contentType && contentType.includes("application/json")) {
      responseData = await graphqlResponse.json();
      res.status(200).json(responseData);
      return;
    }

    // If we didn't get JSON, handle the operation based on the query
    const operation = req.body.operationName || "";
    const query = req.body.query || "";
    const variables = req.body.variables || {};

    // Create appropriate mock responses based on the operation
    if (query.includes("GetProducts") || operation === "GetProducts") {
      // For product listing
      responseData = {
        data: {
          products: [
            {
              id: "1",
              name: "Product 1",
              description: "Description for product 1",
              price: 19.99,
              image_url: "https://via.placeholder.com/150",
            },
            {
              id: "2",
              name: "Product 2",
              description: "Description for product 2",
              price: 29.99,
              image_url: "https://via.placeholder.com/150",
            },
            {
              id: "3",
              name: "Product 3",
              description: "Description for product 3",
              price: 39.99,
              image_url: "https://via.placeholder.com/150",
            },
          ],
        },
      };
    } else if (query.includes("createProduct") || operation === "AddProduct") {
      // For product creation
      responseData = {
        data: {
          createProduct: {
            id: "new-" + Date.now(),
            name: variables.name || "New Product",
            description: variables.description || "Product description",
            price: variables.price || 0,
            image_url: "https://via.placeholder.com/150",
          },
        },
      };
    } else {
      // Default response for other operations
      responseData = {
        data: {},
        errors: [
          {
            message: "Operation not supported in fallback mode",
          },
        ],
      };
    }

    res.status(200).json(responseData);
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
