import fetch from "node-fetch";
import https from "https";
import { JSDOM } from "jsdom";
import FormData from "form-data";

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

    // Check what GraphQL operation was requested
    const operation = req.body.operationName || "";
    const query = req.body.query || "";
    const variables = req.body.variables || {};

    // For product creation, we need to handle the image upload differently
    if (query.includes("createProduct") || operation === "AddProduct") {
      // For product creation, we need to convert the GraphQL mutation to a form submission
      // that the backend can understand

      // Create a FormData object for the product creation
      const formData = new FormData();
      formData.append("name", variables.name);
      formData.append("description", variables.description);
      formData.append("price", variables.price);

      // Handle the image - convert base64 to binary if needed
      if (variables.image && variables.image.startsWith("data:image")) {
        // Extract the base64 data
        const base64Data = variables.image.split(",")[1];
        const imageBuffer = Buffer.from(base64Data, "base64");

        // Determine the image type
        const imageType = variables.image.split(";")[0].split("/")[1];
        formData.append("image", imageBuffer, `product_image.${imageType}`);
      }

      // Send the form data to the product creation endpoint
      const productUrl =
        "https://ecommercetensae.infinityfreeapp.com/backend/create_product.php";

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
          // Let form-data set its own content-type with boundary
        },
        body: formData,
        agent: new https.Agent({
          rejectUnauthorized: false,
        }),
      });

      // Check if we got a successful response
      const productContentType = productResponse.headers.get("content-type");
      let productData;

      if (
        productContentType &&
        productContentType.includes("application/json")
      ) {
        productData = await productResponse.json();
      } else {
        // Parse HTML response
        const productHtml = await productResponse.text();
        console.log("Product creation HTML response:", productHtml); // Log HTML for debugging

        const productDom = new JSDOM(productHtml);

        // Check for success indicators in the HTML
        const successElements = productDom.window.document.querySelectorAll(
          ".success, .message-success, .alert-success"
        );
        const errorElements = productDom.window.document.querySelectorAll(
          ".error, .message-error, .alert-danger"
        );

        let message = "";
        let success =
          productResponse.status === 200 &&
          !productHtml.includes("error") &&
          !productHtml.includes("failed");

        if (successElements.length > 0) {
          message = successElements[0].textContent.trim();
          success = true;
        } else if (errorElements.length > 0) {
          message = errorElements[0].textContent.trim();
          success = false;
        }

        productData = {
          success: success,
          message:
            message ||
            (success
              ? "Product created successfully"
              : "Failed to create product"),
        };
      }

      // Format the response as a GraphQL response
      if (productData.success) {
        // Create a successful GraphQL response
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
      } else {
        // Create an error GraphQL response
        res.status(200).json({
          errors: [
            {
              message: productData.message || "Failed to create product",
            },
          ],
        });
      }

      return;
    }

    // For other GraphQL operations, forward the request normally
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
    if (contentType && contentType.includes("application/json")) {
      // We got a proper JSON response, return it directly
      const data = await graphqlResponse.json();
      res.status(200).json(data);
    } else {
      // We got HTML instead of JSON
      const responseHtml = await graphqlResponse.text();
      console.log("GraphQL HTML response:", responseHtml); // Log HTML for debugging

      // Check for error messages in the HTML
      const responseDom = new JSDOM(responseHtml);
      const errorElements = responseDom.window.document.querySelectorAll(
        ".error, .message-error, .alert-danger"
      );
      let errorMessage = "Backend returned HTML instead of JSON";

      if (errorElements.length > 0) {
        errorMessage = errorElements[0].textContent.trim();
      } else if (responseHtml.includes("Access denied")) {
        errorMessage = "Access denied. Authentication may be required.";
      } else if (responseHtml.includes("Not found")) {
        errorMessage = "Endpoint not found.";
      }

      // For GetProducts query, try to fetch products from the products endpoint
      if (query.includes("GetProducts") || operation === "GetProducts") {
        // Try to fetch products from the products endpoint
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

        const productsContentType =
          productsResponse.headers.get("content-type");

        if (
          productsContentType &&
          productsContentType.includes("application/json")
        ) {
          // We got JSON products
          const productsData = await productsResponse.json();

          // Format as GraphQL response
          res.status(200).json({
            data: {
              products: Array.isArray(productsData) ? productsData : [],
            },
          });
        } else {
          // Couldn't get products, try to parse HTML for products
          const productsHtml = await productsResponse.text();
          console.log("Products HTML response:", productsHtml); // Log HTML for debugging

          // Try to extract products from HTML if possible
          // This is a fallback and might not work reliably
          const productsDom = new JSDOM(productsHtml);
          const productElements = productsDom.window.document.querySelectorAll(
            ".product, .product-item"
          );

          if (productElements.length > 0) {
            // Try to extract product data from HTML elements
            const extractedProducts = Array.from(productElements).map(
              (el, index) => {
                const nameEl = el.querySelector(".product-name, .name, h3, h4");
                const priceEl = el.querySelector(".product-price, .price");
                const descEl = el.querySelector(
                  ".product-description, .description, p"
                );
                const imgEl = el.querySelector("img");

                return {
                  id: el.id || `extracted-${index}`,
                  name: nameEl ? nameEl.textContent.trim() : `Product ${index}`,
                  description: descEl
                    ? descEl.textContent.trim()
                    : "No description available",
                  price: priceEl
                    ? parseFloat(priceEl.textContent.replace(/[^0-9.]/g, ""))
                    : 0,
                  image_url: imgEl
                    ? imgEl.src
                    : "https://via.placeholder.com/150",
                };
              }
            );

            res.status(200).json({
              data: {
                products: extractedProducts,
              },
            });
          } else {
            // Return empty array with error
            res.status(200).json({
              data: {
                products: [],
              },
              errors: [
                {
                  message:
                    "Could not fetch products from backend. " + errorMessage,
                },
              ],
            });
          }
        }
      } else {
        // For other operations, return appropriate error
        res.status(200).json({
          errors: [
            {
              message: errorMessage + " for operation: " + operation,
            },
          ],
        });
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
