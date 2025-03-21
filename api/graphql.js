import fetch from "node-fetch";
import https from "https";

export default async (req, res) => {
  // Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Apollo-Require-Preflight"
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
      // For development purposes, we could provide a mock response
      // This helps when testing without a valid JWT
      if (process.env.NODE_ENV === "development") {
        const query = req.body.query || "";

        // Check if this is a products query
        if (query.includes("products")) {
          return res.status(200).json({
            data: {
              products: [
                {
                  id: "1",
                  name: "Mock Product",
                  description: "This is a mock product for development",
                  price: 19.99,
                  image_url: "https://via.placeholder.com/150",
                },
              ],
            },
          });
        }

        // Check if this is a createProduct mutation
        if (query.includes("createProduct")) {
          const variables = req.body.variables || {};
          return res.status(200).json({
            data: {
              createProduct: {
                id: "new-mock-id",
                name: variables.name || "New Product",
                description: variables.description || "Mock description",
                price: variables.price || 0,
                image_url: variables.image || "",
              },
            },
          });
        }
      }

      return res.status(401).json({
        errors: [{ message: "Unauthorized: JWT missing or invalid format" }],
      });
    }

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
      body: JSON.stringify(req.body),
      agent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });

    // Get the response as JSON
    let responseData;
    try {
      responseData = await apiResponse.json();
    } catch (error) {
      // If the response is not valid JSON, create a proper GraphQL error response
      return res.status(500).json({
        errors: [
          {
            message: "Invalid response from GraphQL server",
            extensions: {
              code: "INTERNAL_SERVER_ERROR",
              responseText: await apiResponse.text(),
            },
          },
        ],
      });
    }

    // Check if the response contains GraphQL errors
    if (responseData.errors) {
      console.error("GraphQL errors:", JSON.stringify(responseData.errors));
    }

    // Return the GraphQL response
    return res.status(apiResponse.status).json(responseData);
  } catch (error) {
    console.error("GraphQL proxy error:", error);
    return res.status(500).json({
      errors: [
        {
          message: "GraphQL proxy failed: " + error.message,
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        },
      ],
    });
  }
};
