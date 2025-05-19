// File: convex/router.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server"; // Ensure httpAction is imported
import { internal } from "./_generated/api"; // If you need internal actions/queries

// Import the proxy action (we'll create this file next)
import { openaiProxyChatCompletions } from "../convex/openaiProxy";

const http = httpRouter();

// Define the route for the OpenAI proxy.
// This will handle requests from your `convex/ai.ts` file
// when it uses the CONVEX_OPENAI_BASE_URL.
// The OpenAI client library, when given a baseURL like "https://.../openai-proxy",
// will append specific paths like "/chat/completions" to it.
http.route({
  path: "/openai-proxy/chat/completions", // Matches the path the SDK will request
  method: "POST",
  handler: openaiProxyChatCompletions, // The HTTP action we'll define next
});

// Note: auth routes are typically added in convex/http.ts
// If you have other routes, define them here as well.

export default http;