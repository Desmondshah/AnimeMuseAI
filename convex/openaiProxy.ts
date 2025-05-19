// File: convex/openaiProxy.ts
"use node"; // Required for using fetch and environment variables securely

import { httpAction } from "./_generated/server";

export const openaiProxyChatCompletions = httpAction(async (_ctx, request) => {
  const openAIKey = process.env.CONVEX_OPENAI_API_KEY;
  if (!openAIKey) {
    console.error("CONVEX_OPENAI_API_KEY environment variable is not set.");
    return new Response("OpenAI API key is not configured on the server.", {
      status: 500,
    });
  }

  // The actual OpenAI API endpoint for chat completions
  const openaiUrl = "https://api.openai.com/v1/chat/completions";

  try {
    // Get the body from the incoming request (sent by the OpenAI SDK)
    const requestBody = await request.text(); // Get raw text to forward

    // Forward the request to OpenAI
    const openaiResponse = await fetch(openaiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIKey}`,
        // Forward any other important headers if necessary,
        // e.g., "OpenAI-Organization" if you use it.
        // For most cases, Content-Type and Authorization are key.
      },
      body: requestBody, // Forward the exact body
    });

    // Read the response from OpenAI
    const responseBody = await openaiResponse.text(); // Get raw text to forward back

    // Construct a new Response to send back to the calling Convex action
    // Make sure to forward the status and important headers from OpenAI's response
    const headers = new Headers();
    headers.set("Content-Type", openaiResponse.headers.get("Content-Type") || "application/json");
    // Forward other relevant headers from openaiResponse.headers if needed

    return new Response(responseBody, {
      status: openaiResponse.status,
      statusText: openaiResponse.statusText,
      headers: headers,
    });

  } catch (error) {
    console.error("Error in OpenAI proxy:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(`Error proxying request to OpenAI: ${errorMessage}`, {
      status: 500,
    });
  }
});