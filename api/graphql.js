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

    // Log the initial HTML response
    console.log("Initial HTML response:", htmlContent);

    const dom = new JSDOM(htmlContent);
    const scripts = dom.window.document.querySelectorAll("script");

    // Extract the test cookie from the script
    let testCookie = "";
    for (const script of scripts) {
      if (script.textContent.includes("__test=")) {
        console.log("Found anti-bot script:", script.textContent);

        // Try to extract the cookie value using regex
        const cookieMatch = script.textContent.match(
          /document\.cookie\s*=\s*"__test=([^"]+)"/
        );
        if (cookieMatch && cookieMatch[1]) {
          testCookie = `__test=${cookieMatch[1]}`;
          console.log("Extracted test cookie:", testCookie);
          break;
        }
      }
    }

    // If we couldn't extract the test cookie from script, try to find it in the HTML
    if (!testCookie) {
      const cookieMatch = htmlContent.match(
        /document\.cookie\s*=\s*"__test=([^"]+)"/
      );
      if (cookieMatch && cookieMatch[1]) {
        testCookie = `__test=${cookieMatch[1]}`;
        console.log("Extracted test cookie from HTML:", testCookie);
      }
    }

    // If we have the aes.js script in the HTML, we need to execute it to generate the cookie
    if (
      htmlContent.includes('src="/aes.js"') &&
      htmlContent.includes("slowAES.decrypt")
    ) {
      console.log(
        "Anti-bot protection requires executing JavaScript to generate cookie"
      );

      // Extract the parameters for the AES decryption
      const aMatch = htmlContent.match(/var\s+a\s*=\s*toNumbers\("([^"]+)"\)/);
      const bMatch = htmlContent.match(/var\s+b\s*=\s*toNumbers\("([^"]+)"\)/);
      const cMatch = htmlContent.match(/var\s+c\s*=\s*toNumbers\("([^"]+)"\)/);

      if (aMatch && bMatch && cMatch) {
        console.log("Found AES parameters:", {
          a: aMatch[1],
          b: bMatch[1],
          c: cMatch[1],
        });

        // In a real implementation, we would need to execute the AES decryption
        // For now, we'll try a different approach
      }
    }

    // Try to follow the redirect URL if present
    let redirectUrl = "";
    const locationMatch = htmlContent.match(/location\.href\s*=\s*"([^"]+)"/);
    if (locationMatch && locationMatch[1]) {
      redirectUrl = locationMatch[1];
      console.log("Found redirect URL:", redirectUrl);

      // Make a request to the redirect URL to get the proper cookies
      const redirectResponse = await fetch(redirectUrl, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          Referer: "https://ecommercetensae.infinityfreeapp.com/",
          Cookie: testCookie || cookies || "",
        },
        agent: new https.Agent({
          rejectUnauthorized: false,
        }),
      });

      // Get additional cookies from the redirect
      const redirectCookies = redirectResponse.headers.get("set-cookie");
      if (redirectCookies) {
        console.log("Got additional cookies from redirect:", redirectCookies);
        if (testCookie) {
          testCookie = `${testCookie}; ${redirectCookies}`;
        } else {
          testCookie = redirectCookies;
        }
      }
    }

    // Forward the GraphQL request with all the cookies we've collected
    console.log(
      "Sending GraphQL request with cookies:",
      testCookie || cookies || ""
    );

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

    // Check if we got a JSON response
    const contentType = graphqlResponse.headers.get("content-type");
    console.log("GraphQL response content type:", contentType);

    if (contentType && contentType.includes("application/json")) {
      // We got a proper JSON response, return it directly
      const data = await graphqlResponse.json();
      console.log("GraphQL JSON response:", data);
      res.status(200).json(data);
    } else {
      // We got HTML instead of JSON
      const responseHtml = await graphqlResponse.text();
      console.log("GraphQL HTML response:", responseHtml);

      // Try one more approach - make a direct request to the backend PHP file
      // This time with a different content type
      const finalResponse = await fetch(graphqlUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.5",
          Referer: "https://ecommercetensae.infinityfreeapp.com/",
          Cookie: testCookie || cookies || "",
          Authorization: req.headers.authorization || "",
        },
        body: `query=${encodeURIComponent(JSON.stringify(req.body))}`,
        agent: new https.Agent({
          rejectUnauthorized: false,
        }),
      });

      const finalContentType = finalResponse.headers.get("content-type");
      console.log("Final response content type:", finalContentType);

      if (finalContentType && finalContentType.includes("application/json")) {
        const data = await finalResponse.json();
        console.log("Final JSON response:", data);
        res.status(200).json(data);
      } else {
        // If we still didn't get JSON, we need to inform the client
        // But also provide the operation-specific response

        // Check what GraphQL operation was requested
        const operation = req.body.operationName || "";
        const query = req.body.query || "";

        console.log("GraphQL operation:", operation);
        console.log("GraphQL query:", query);

        if (query.includes("GetProducts") || operation === "GetProducts") {
          // For product listing, return a basic structure
          res.status(200).json({
            data: {
              products: [],
            },
            errors: [
              {
                message:
                  "Could not fetch products from backend. Anti-bot protection could not be bypassed.",
              },
            ],
          });
        } else if (
          query.includes("createProduct") ||
          operation === "AddProduct"
        ) {
          // For product creation, return a failure
          res.status(200).json({
            errors: [
              {
                message:
                  "Could not create product. Anti-bot protection could not be bypassed.",
              },
            ],
          });
        } else {
          // Default error response
          res.status(500).json({
            errors: [
              {
                message:
                  "Backend returned HTML instead of JSON. Anti-bot protection could not be bypassed.",
              },
            ],
          });
        }
      }
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
