import fetch from "node-fetch";
import https from "https";
import { JSDOM } from "jsdom";
import FormData from "form-data";
import { Buffer } from "buffer";

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
    console.log("Making initial request to get anti-bot cookie...");
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

    // Log response status and headers
    console.log("Initial response status:", initialResponse.status);
    console.log("Initial response headers:", initialResponse.headers.raw());

    // Extract cookies and anti-bot script
    const cookies = initialResponse.headers.get("set-cookie");
    console.log("Cookies from initial response:", cookies);

    const htmlContent = await initialResponse.text();

    // Log a snippet of the HTML (first 500 chars) to avoid flooding logs
    console.log(
      "Initial HTML response (first 500 chars):",
      htmlContent.substring(0, 500)
    );

    // Check for common anti-bot patterns
    const hasAntiBotScript =
      htmlContent.includes("aes.js") ||
      htmlContent.includes("__test=") ||
      htmlContent.includes("slowAES");

    console.log("Anti-bot script detected:", hasAntiBotScript);

    const dom = new JSDOM(htmlContent);
    const scripts = dom.window.document.querySelectorAll("script");
    console.log("Number of script tags found:", scripts.length);

    let testCookie = "";
    for (const script of scripts) {
      if (script.textContent.includes("__test=")) {
        console.log(
          "Found anti-bot script content:",
          script.textContent.substring(0, 200)
        );

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
      console.log("Trying to extract test cookie from HTML...");
      const cookieMatch = htmlContent.match(
        /document\.cookie\s*=\s*"__test=([^"]+)"/
      );
      if (cookieMatch && cookieMatch[1]) {
        testCookie = `__test=${cookieMatch[1]}`;
        console.log("Extracted test cookie from HTML:", testCookie);
      } else {
        console.log("Could not extract test cookie from HTML");
      }
    }

    // Check for redirect
    const hasRedirect =
      htmlContent.includes("location.href") ||
      htmlContent.includes("window.location");

    console.log("Redirect detected:", hasRedirect);

    if (hasRedirect) {
      const locationMatch = htmlContent.match(/location\.href\s*=\s*"([^"]+)"/);
      if (locationMatch && locationMatch[1]) {
        const redirectUrl = locationMatch[1];
        console.log("Found redirect URL:", redirectUrl);

        // Follow the redirect
        console.log("Following redirect...");
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

        const redirectCookies = redirectResponse.headers.get("set-cookie");
        console.log("Cookies from redirect:", redirectCookies);

        if (redirectCookies) {
          if (testCookie) {
            testCookie = `${testCookie}; ${redirectCookies}`;
          } else {
            testCookie = redirectCookies;
          }
          console.log("Updated cookies after redirect:", testCookie);
        }
      }
    }

    // Check what GraphQL operation was requested
    const operation = req.body.operationName || "";
    const query = req.body.query || "";
    const variables = req.body.variables || {};

    console.log("GraphQL operation:", operation);
    console.log("GraphQL query:", query.substring(0, 200)); // Log first 200 chars of query
    console.log("GraphQL variables:", variables);

    // For GetProducts query, try multiple approaches
    if (query.includes("GetProducts") || operation === "GetProducts") {
      console.log("Processing GetProducts operation...");

      // Try approach 1: Standard GraphQL request
      console.log("Approach 1: Making standard GraphQL request...");
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

      console.log("GraphQL response status:", graphqlResponse.status);
      console.log("GraphQL response headers:", graphqlResponse.headers.raw());

      const contentType = graphqlResponse.headers.get("content-type");
      console.log("GraphQL response content type:", contentType);

      if (contentType && contentType.includes("application/json")) {
        // We got a proper JSON response, return it directly
        const data = await graphqlResponse.json();
        console.log("GraphQL JSON response:", data);
        res.status(200).json(data);
        return;
      }

      // We got HTML instead of JSON
      const responseHtml = await graphqlResponse.text();
      console.log(
        "GraphQL HTML response (first 500 chars):",
        responseHtml.substring(0, 500)
      );

      // Analyze the HTML response
      const responseDom = new JSDOM(responseHtml);
      const title = responseDom.window.document.querySelector("title");
      const h1 = responseDom.window.document.querySelector("h1");
      const errorElements = responseDom.window.document.querySelectorAll(
        ".error, .message-error, .alert-danger"
      );

      console.log("HTML title:", title ? title.textContent : "No title");
      console.log("HTML h1:", h1 ? h1.textContent : "No h1");
      console.log("Error elements found:", errorElements.length);

      let errorDetails = "Unknown error";

      if (errorElements.length > 0) {
        errorDetails = errorElements[0].textContent.trim();
      } else if (responseHtml.includes("Access denied")) {
        errorDetails = "Access denied. Authentication may be required.";
      } else if (responseHtml.includes("Not found")) {
        errorDetails = "Endpoint not found.";
      } else if (responseHtml.includes("CloudFlare")) {
        errorDetails = "CloudFlare protection detected.";
      } else if (responseHtml.includes("captcha")) {
        errorDetails = "CAPTCHA challenge detected.";
      } else if (responseHtml.includes("blocked")) {
        errorDetails = "Request blocked by server security.";
      } else if (responseHtml.includes("Please wait")) {
        errorDetails = "Rate limiting or anti-bot protection active.";
      }

      console.log("Error details extracted from HTML:", errorDetails);

      // Try approach 2: Use a different endpoint
      console.log("Approach 2: Trying alternative products endpoint...");
      const productsUrl =
        "https://ecommercetensae.infinityfreeapp.com/backend/get_products.php";

      const productsResponse = await fetch(productsUrl, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.5",
          Referer: "https://ecommercetensae.infinityfreeapp.com/",
          Cookie: testCookie || cookies || "",
          Authorization: req.headers.authorization || "",
        },
        agent: new https.Agent({
          rejectUnauthorized: false,
        }),
      });

      console.log(
        "Products endpoint response status:",
        productsResponse.status
      );
      const productsContentType = productsResponse.headers.get("content-type");
      console.log("Products endpoint content type:", productsContentType);

      if (
        productsContentType &&
        productsContentType.includes("application/json")
      ) {
        // We got JSON products
        const productsData = await productsResponse.json();
        console.log("Products JSON response:", productsData);

        // Format as GraphQL response
        res.status(200).json({
          data: {
            products: Array.isArray(productsData) ? productsData : [],
          },
        });
        return;
      }

      // Approach 3: Try with different content type
      console.log("Approach 3: Trying with different content type...");
      const formDataResponse = await fetch(graphqlUrl, {
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

      console.log("Form data response status:", formDataResponse.status);
      const formDataContentType = formDataResponse.headers.get("content-type");
      console.log("Form data content type:", formDataContentType);

      if (
        formDataContentType &&
        formDataContentType.includes("application/json")
      ) {
        const formData = await formDataResponse.json();
        console.log("Form data JSON response:", formData);
        res.status(200).json(formData);
        return;
      }

      // If all approaches failed, return detailed error
      console.log("All approaches failed. Returning error with details.");
      res.status(200).json({
        data: {
          products: [],
        },
        errors: [
          {
            message: `Could not fetch products from backend. ${errorDetails}`,
            details: {
              htmlTitle: title ? title.textContent : "No title",
              htmlHeading: h1 ? h1.textContent : "No heading",
              statusCode: graphqlResponse.status,
              contentType: contentType || "No content type",
              antiBot: hasAntiBotScript ? "Detected" : "Not detected",
              redirect: hasRedirect ? "Detected" : "Not detected",
              cookiesReceived: cookies ? "Yes" : "No",
              testCookieExtracted: testCookie ? "Yes" : "No",
            },
          },
        ],
      });
      return;
    }

    // For other GraphQL operations, forward the request normally
    console.log("Processing other GraphQL operation:", operation);
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
      console.log(
        "GraphQL HTML response (first 500 chars):",
        responseHtml.substring(0, 500)
      );

      // Analyze the HTML response
      const responseDom = new JSDOM(responseHtml);
      const title = responseDom.window.document.querySelector("title");
      const h1 = responseDom.window.document.querySelector("h1");
      const errorElements = responseDom.window.document.querySelectorAll(
        ".error, .message-error, .alert-danger"
      );

      console.log("HTML title:", title ? title.textContent : "No title");
      console.log("HTML h1:", h1 ? h1.textContent : "No h1");
      console.log("Error elements found:", errorElements.length);

      let errorDetails = "Unknown error";

      if (errorElements.length > 0) {
        errorDetails = errorElements[0].textContent.trim();
      } else if (responseHtml.includes("Access denied")) {
        errorDetails = "Access denied. Authentication may be required.";
      } else if (responseHtml.includes("Not found")) {
        errorDetails = "Endpoint not found.";
      } else if (responseHtml.includes("CloudFlare")) {
        errorDetails = "CloudFlare protection detected.";
      } else if (responseHtml.includes("captcha")) {
        errorDetails = "CAPTCHA challenge detected.";
      } else if (responseHtml.includes("blocked")) {
        errorDetails = "Request blocked by server security.";
      } else if (responseHtml.includes("Please wait")) {
        errorDetails = "Rate limiting or anti-bot protection active.";
      }

      console.log("Error details extracted from HTML:", errorDetails);

      // Handle different operations with appropriate fallbacks
      if (operation === "AddProduct" || query.includes("createProduct")) {
        console.log("Handling AddProduct operation with fallback...");

        // Try to use the create_product.php endpoint directly
        try {
          console.log("Trying direct product creation endpoint...");
          const formData = new FormData();

          // Add product details to form data
          formData.append("name", variables.name || "");
          formData.append("description", variables.description || "");
          formData.append("price", variables.price || 0);

          // Handle image if present
          if (variables.image && variables.image.startsWith("data:image")) {
            console.log("Processing image for upload...");
            const base64Data = variables.image.split(",")[1];
            const imageBuffer = Buffer.from(base64Data, "base64");
            const imageType = variables.image.split(";")[0].split("/")[1];
            formData.append("image", imageBuffer, `product_image.${imageType}`);
          }

          const productUrl =
            "https://ecommercetensae.infinityfreeapp.com/backend/create_product.php";

          console.log("Sending product creation request...");
          const productResponse = await fetch(productUrl, {
            method: "POST",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
              Accept: "application/json",
              "Accept-Language": "en-US,en;q=0.5",
              Referer: "https://ecommercetensae.infinityfreeapp.com/",
              Cookie: testCookie || cookies || "",
              Authorization: req.headers.authorization || "",
            },
            body: formData,
            agent: new https.Agent({
              rejectUnauthorized: false,
            }),
          });

          console.log(
            "Product creation response status:",
            productResponse.status
          );
          const productContentType =
            productResponse.headers.get("content-type");
          console.log(
            "Product creation response content type:",
            productContentType
          );

          if (
            productContentType &&
            productContentType.includes("application/json")
          ) {
            const productData = await productResponse.json();
            console.log("Product creation JSON response:", productData);

            // Return GraphQL-formatted response
            res.status(200).json({
              data: {
                createProduct: {
                  id: productData.id || "new-" + Date.now(),
                  name: variables.name,
                  description: variables.description,
                  price: parseFloat(variables.price),
                  image_url: productData.image_url || variables.image,
                },
              },
            });
            return;
          }

          // Parse HTML response
          const productHtml = await productResponse.text();
          console.log(
            "Product creation HTML response (first 500 chars):",
            productHtml.substring(0, 500)
          );

          const productDom = new JSDOM(productHtml);
          const productSuccessElements =
            productDom.window.document.querySelectorAll(
              ".success, .message-success, .alert-success"
            );
          const productErrorElements =
            productDom.window.document.querySelectorAll(
              ".error, .message-error, .alert-danger"
            );

          let productSuccess =
            productResponse.status === 200 &&
            !productHtml.includes("error") &&
            !productHtml.includes("failed");
          let productMessage = "Unknown response";

          if (productSuccessElements.length > 0) {
            productMessage = productSuccessElements[0].textContent.trim();
            productSuccess = true;
          } else if (productErrorElements.length > 0) {
            productMessage = productErrorElements[0].textContent.trim();
            productSuccess = false;
          } else if (productHtml.includes("success")) {
            productMessage = "Product created successfully";
            productSuccess = true;
          }

          console.log("Product creation success:", productSuccess);
          console.log("Product creation message:", productMessage);

          if (productSuccess) {
            // Return success response
            res.status(200).json({
              data: {
                createProduct: {
                  id: "new-" + Date.now(),
                  name: variables.name,
                  description: variables.description,
                  price: parseFloat(variables.price),
                  image_url: variables.image,
                },
              },
            });
          } else {
            // Return error response
            res.status(200).json({
              errors: [
                {
                  message: `Failed to create product: ${productMessage}`,
                  details: {
                    statusCode: productResponse.status,
                    contentType: productContentType || "No content type",
                    htmlResponse: productHtml.substring(0, 200) + "...",
                  },
                },
              ],
            });
          }
        } catch (productError) {
          console.error("Product creation error:", productError);

          // Return fallback response
          res.status(200).json({
            data: {
              createProduct: {
                id: "mock-" + Date.now(),
                name: variables.name,
                description: variables.description,
                price: parseFloat(variables.price),
                image_url: variables.image,
              },
            },
            errors: [
              {
                message:
                  "Warning: Product may not have been saved to database due to error",
                details: {
                  error: productError.message,
                  originalError: errorDetails,
                },
              },
            ],
          });
        }
      } else {
        // For other operations, return detailed error
        res.status(200).json({
          errors: [
            {
              message: `GraphQL operation "${operation}" failed: ${errorDetails}`,
              details: {
                operation: operation,
                query: query.substring(0, 100) + "...",
                htmlTitle: title ? title.textContent : "No title",
                htmlHeading: h1 ? h1.textContent : "No heading",
                statusCode: graphqlResponse.status,
                contentType: contentType || "No content type",
                antiBot: hasAntiBotScript ? "Detected" : "Not detected",
                redirect: hasRedirect ? "Detected" : "Not detected",
                cookiesReceived: cookies ? "Yes" : "No",
                testCookieExtracted: testCookie ? "Yes" : "No",
                htmlSnippet: responseHtml.substring(0, 200) + "...",
              },
            },
          ],
        });
      }
    }
  } catch (error) {
    console.error("GraphQL proxy error:", error);

    // Return detailed error information
    res.status(500).json({
      errors: [
        {
          message: "GraphQL proxy failed: " + error.message,
          details: {
            stack: error.stack,
            name: error.name,
            code: error.code,
          },
        },
      ],
    });
  }
};
