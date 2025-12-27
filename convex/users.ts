import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create or get user with custom name
export const createUser = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    if (!args.name.trim()) {
      throw new Error("الاسم مطلوب");
    }

    if (args.name.length < 2 || args.name.length > 20) {
      throw new Error("الاسم يجب أن يكون بين 2 و 20 حرف");
    }

    // Check if name is already taken
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_name", (q) => q.eq("name", args.name.trim()))
      .first();

    if (existingUser) {
      throw new Error("هذا الاسم مستخدم بالفعل");
    }

    const userId = await ctx.db.insert("users", {
      name: args.name.trim(),
      isOnline: true,
    });

    return userId;
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const updateOnlineStatus = mutation({
  args: { userId: v.id("users"), isOnline: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { isOnline: args.isOnline });
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});
