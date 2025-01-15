interface URLRequest {
  url: string;
}

interface URLResponse {
  shortUrl: string;
  originalUrl: string;
}

// Helper function to decode pkarr response
function decodePkarrResponse(responseText: string): string {
  const urlPattern = /(https?:\/\/[^\s]+)$/;
  const match = responseText.match(urlPattern);
  if (!match) {
    throw new Error("Could not extract URL from response");
  }
  return match[1];
}

// Generate a random identifier from URL
function generateIdentifier(url: string): string {
  return Buffer.from(url).toString('base64url').slice(0, 32);
}

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    // Enable CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle OPTIONS requests for CORS
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(req.url);
    
    try {
      // Health check endpoint
      if (url.pathname === "/health" && req.method === "GET") {
        return Response.json({
          status: "healthy",
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders });
      }
      
      // Shorten URL endpoint
      if (url.pathname === "/shorten" && req.method === "POST") {
        const body: URLRequest = await req.json();
        
        if (!body.url) {
          return new Response("URL is required", { status: 400 });
        }
        
        // Generate identifier
        const identifier = generateIdentifier(body.url);
        
        // Create pkarr URL
        const pkarrUrl = `https://relay.pkarr.org/${identifier}`;
        
        // Simulate pkarr response
        const result: URLResponse = {
          shortUrl: pkarrUrl,
          originalUrl: body.url
        };
        
        return Response.json(result, { headers: corsHeaders });
      }
      
      // Expand URL endpoint with redirection
      if (url.pathname.startsWith("/expand/") && req.method === "GET") {
        const identifier = url.pathname.replace("/expand/", "");
        const pkarrUrl = `https://relay.pkarr.org/${identifier}`;
        
        const response = await fetch(pkarrUrl);
        
        if (!response.ok) {
          return new Response("URL not found", { status: 404 });
        }
        
        const text = await response.text();
        const originalUrl = decodePkarrResponse(text);
        
        // Redirect to the original URL
        return new Response(null, {
          status: 302,
          headers: {
            "Location": originalUrl,
            ...corsHeaders
          }
        });
      }
      
      return new Response("Not Found", { status: 404 });
      
    } catch (error) {
      console.error(error);
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }
});

console.log(`🦊 Server is running at http://localhost:${server.port}`);
