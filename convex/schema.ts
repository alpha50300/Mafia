import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const applicationTables = {
  users: defineTable({
    name: v.optional(v.string()),
    isOnline: v.optional(v.boolean()),
    isAnonymous: v.optional(v.boolean()),
  }).index("by_name", ["name"]),

  games: defineTable({
    code: v.string(),
    hostId: v.id("users"),
    maxPlayers: v.number(),
    status: v.union(v.literal("waiting"), v.literal("playing"), v.literal("finished")),
    phase: v.union(v.literal("day"), v.literal("night"), v.literal("voting"), v.literal("investigation")),
    currentDay: v.number(),
    settings: v.object({
      mafiaCount: v.number(),
      hasDoctor: v.boolean(),
      hasDetective: v.boolean(),
    }),
  }).index("by_code", ["code"]),

  players: defineTable({
    gameId: v.id("games"),
    userId: v.id("users"),
    role: v.union(
      v.literal("mafia"), 
      v.literal("doctor"), 
      v.literal("detective"), 
      v.literal("citizen")
    ),
    isAlive: v.boolean(),
    votedFor: v.optional(v.id("players")),
    investigatedBy: v.optional(v.id("players")),
  }).index("by_game", ["gameId"])
    .index("by_user_game", ["userId", "gameId"]),

  gameActions: defineTable({
    gameId: v.id("games"),
    playerId: v.id("players"),
    action: v.union(
      v.literal("vote"), 
      v.literal("kill"), 
      v.literal("heal"), 
      v.literal("investigate")
    ),
    targetId: v.optional(v.id("players")),
    phase: v.union(v.literal("day"), v.literal("night")),
    day: v.number(),
  }).index("by_game_phase", ["gameId", "phase", "day"]),

  gameMessages: defineTable({
    gameId: v.id("games"),
    playerId: v.optional(v.id("players")),
    message: v.string(),
    type: v.union(v.literal("system"), v.literal("player"), v.literal("mafia")),
    phase: v.union(v.literal("day"), v.literal("night")),
    day: v.number(),
  }).index("by_game", ["gameId"]),
};

export default defineSchema({
  ...applicationTables,
});
