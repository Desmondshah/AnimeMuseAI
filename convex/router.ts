// File: convex/router.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server"; // Ensure httpAction is imported
// Import the proxy action
import { openaiProxyChatCompletions } from "./openaiProxy"; //

const http = httpRouter();

// Define the route for the OpenAI proxy.
http.route({
  path: "/openai-proxy/chat/completions", // Matches the path the SDK will request
  method: "POST",
  handler: openaiProxyChatCompletions, // The HTTP action
});

// **** START: New Hello Route ****
// Define a new simple GET route at /hello
http.route({
  path: "/hello",
  method: "GET",
  handler: httpAction(async (_ctx, _request) => {
    return new Response(JSON.stringify({ message: "Hello from Convex!" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }),
});
// **** END: New Hello Route ****


// Note: auth routes are typically added in convex/http.ts
// If you have other routes, define them here as well.

export default http;