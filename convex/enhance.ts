import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const upscaleImage = action({
  args: { animeId: v.id("anime"), imageUrl: v.string() },
  handler: async (ctx, args): Promise<{ url: string }> => {
    if (!process.env.CONVEX_PICSART_API_KEY) {
      throw new Error("Picsart API key not configured");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch("https://api.picsart.io/tools/1.0/upscale", {
        method: "POST",
        headers: {
          "X-Picsart-API-Key": process.env.CONVEX_PICSART_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ image_url: args.imageUrl }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Picsart error ${response.status}`);
      }

      const data = await response.json();
      const url = data?.url || data?.data?.url;
      if (!url) {
        throw new Error("Upscaled URL missing");
      }

      await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
        animeId: args.animeId,
        updates: { posterUrl: url },
        sourceApi: "picsart_upscale",
      });

      return { url };
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error("Upscale request timed out");
      }
      throw new Error(error.message || "Upscale failed");
    }
  },
});