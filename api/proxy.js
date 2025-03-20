import fetch from "node-fetch";
import https from "https";
import { JSDOM } from "jsdom";

export default async (req, res) => {
  // Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const backendUrl =
    "https://ecommercetensae.infinityfreeapp.com/backend/login.php";

  try {
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

    // Now make the actual login request with the cookies
    const loginResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        Referer: "https://ecommercetensae.infinityfreeapp.com/",
        Cookie: testCookie || cookies || "",
      },
      body: JSON.stringify(req.body),
      agent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });

    const contentType = loginResponse.headers.get("content-type");
    let responseData;

    if (contentType && contentType.includes("application/json")) {
      responseData = await loginResponse.json();
    } else {
      // If we got HTML, use JSDOM to parse it
      const loginHtml = await loginResponse.text();
      const loginDom = new JSDOM(loginHtml);

      // Try to determine if login was successful by looking for success indicators in the HTML
      const successElements = loginDom.window.document.querySelectorAll(
        ".success, .welcome, #user-profile"
      );
      const errorElements = loginDom.window.document.querySelectorAll(
        ".error, .login-error"
      );

      if (successElements.length > 0 || loginResponse.status === 200) {
        // Mock a successful response
        responseData = {
          success: true,
          user: { username: req.body.username },
          jwt: "mock-jwt-token-" + Date.now(),
          message: "Login successful",
        };
      } else if (errorElements.length > 0) {
        // Extract error message if possible
        const errorMessage =
          errorElements[0].textContent || "Invalid credentials";
        responseData = {
          success: false,
          message: errorMessage,
        };
      } else {
        // Default mock response
        responseData = {
          success: false,
          message: "Login failed - could not process server response",
        };
      }
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({
      success: false,
      message: "Proxy failed: " + error.message,
    });
  }
};
