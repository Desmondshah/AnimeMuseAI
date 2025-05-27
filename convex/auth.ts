// convex/auth.ts
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous"; // Import Anonymous provider
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel"; // Added for type safety

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password,
    Anonymous, // Add Anonymous provider here
  ],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId as Id<"users">); // Cast to Id<"users">
    if (!user) {
      return null;
    }
    return user;
  },
});