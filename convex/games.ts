import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Generate random game code
function generateGameCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Shuffle array utility
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const createGame = mutation({
  args: {
    userId: v.id("users"),
    maxPlayers: v.number(),
    mafiaCount: v.number(),
    hasDoctor: v.boolean(),
    hasDetective: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.maxPlayers < 4 || args.maxPlayers > 20) {
      throw new Error("الحد الأقصى للاعبين يجب أن يكون بين 4 و 20");
    }

    if (args.mafiaCount >= args.maxPlayers / 2) {
      throw new Error("عدد المافيا كثير جداً");
    }

    let code: string;
    let existingGame;
    
    // Generate unique code
    do {
      code = generateGameCode();
      existingGame = await ctx.db
        .query("games")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
    } while (existingGame);

    const gameId = await ctx.db.insert("games", {
      code,
      hostId: args.userId,
      maxPlayers: args.maxPlayers,
      status: "waiting",
      phase: "day",
      currentDay: 1,
      settings: {
        mafiaCount: args.mafiaCount,
        hasDoctor: args.hasDoctor,
        hasDetective: args.hasDetective,
      },
    });

    // Add host as first player
    await ctx.db.insert("players", {
      gameId,
      userId: args.userId,
      role: "citizen", // Will be assigned when game starts
      isAlive: true,
    });

    return { gameId, code };
  },
});

export const joinGame = mutation({
  args: { 
    code: v.string(),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!game) throw new Error("الغرفة غير موجودة");
    if (game.status !== "waiting") throw new Error("اللعبة بدأت بالفعل");

    // Check if already in game
    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("by_user_game", (q) => q.eq("userId", args.userId).eq("gameId", game._id))
      .first();

    if (existingPlayer) throw new Error("أنت موجود في هذه الغرفة بالفعل");

    // Check if game is full
    const playerCount = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", game._id))
      .collect();

    if (playerCount.length >= game.maxPlayers) {
      throw new Error("الغرفة ممتلئة");
    }

    await ctx.db.insert("players", {
      gameId: game._id,
      userId: args.userId,
      role: "citizen", // Will be assigned when game starts
      isAlive: true,
    });

    return game._id;
  },
});

export const startGame = mutation({
  args: { 
    gameId: v.id("games"),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("الغرفة غير موجودة");
    if (game.hostId !== args.userId) throw new Error("فقط المضيف يمكنه بدء اللعبة");
    if (game.status !== "waiting") throw new Error("اللعبة بدأت بالفعل");

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    if (players.length < 4) throw new Error("نحتاج على الأقل 4 لاعبين");

    // Assign roles
    const roles: Array<"mafia" | "doctor" | "detective" | "citizen"> = [];
    
    // Add mafia
    for (let i = 0; i < game.settings.mafiaCount; i++) {
      roles.push("mafia");
    }
    
    // Add special roles
    if (game.settings.hasDoctor) roles.push("doctor");
    if (game.settings.hasDetective) roles.push("detective");
    
    // Fill rest with citizens
    while (roles.length < players.length) {
      roles.push("citizen");
    }

    const shuffledRoles = shuffleArray(roles);

    // Update players with roles
    for (let i = 0; i < players.length; i++) {
      await ctx.db.patch(players[i]._id, {
        role: shuffledRoles[i],
      });
    }

    // Update game status
    await ctx.db.patch(args.gameId, {
      status: "playing",
      phase: "day",
    });

    // Add welcome message
    await ctx.db.insert("gameMessages", {
      gameId: args.gameId,
      message: "اللعبة بدأت! مرحلة النهار - ناقشوا واختاروا من تريدون إعدامه",
      type: "system",
      phase: "day",
      day: 1,
    });
  },
});

export const getGame = query({
  args: { 
    gameId: v.id("games"),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) return null;

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const currentPlayer = players.find(p => p.userId === args.userId);

    const playersWithUsers = await Promise.all(
      players.map(async (player) => {
        const user = await ctx.db.get(player.userId);
        return {
          ...player,
          user: user ? { name: user.name, isOnline: user.isOnline } : null,
        };
      })
    );

    return {
      ...game,
      players: playersWithUsers,
      currentPlayer,
      playerCount: players.length,
    };
  },
});

export const getGameMessages = query({
  args: { 
    gameId: v.id("games"),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_user_game", (q) => q.eq("userId", args.userId).eq("gameId", args.gameId))
      .first();

    if (!currentPlayer) return [];

    const messages = await ctx.db
      .query("gameMessages")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Filter messages based on player role and game phase
    return messages.filter(message => {
      if (message.type === "system" || message.type === "player") return true;
      if (message.type === "mafia" && currentPlayer.role === "mafia") return true;
      return false;
    });
  },
});

export const vote = mutation({
  args: { 
    gameId: v.id("games"),
    targetId: v.id("players"),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game || game.status !== "playing") throw new Error("اللعبة غير نشطة");

    const voter = await ctx.db
      .query("players")
      .withIndex("by_user_game", (q) => q.eq("userId", args.userId).eq("gameId", args.gameId))
      .first();

    if (!voter || !voter.isAlive) throw new Error("لا يمكنك التصويت");

    const target = await ctx.db.get(args.targetId);
    if (!target || !target.isAlive) throw new Error("الهدف غير صحيح");

    // Update vote
    await ctx.db.patch(voter._id, { votedFor: args.targetId });

    // Record action
    await ctx.db.insert("gameActions", {
      gameId: args.gameId,
      playerId: voter._id,
      action: "vote",
      targetId: args.targetId,
      phase: game.phase === "day" || game.phase === "night" ? game.phase : "day",
      day: game.currentDay,
    });
  },
});

export const investigate = mutation({
  args: { 
    gameId: v.id("games"),
    targetId: v.id("players"),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game || game.status !== "playing" || game.phase !== "night") {
      throw new Error("يمكن التحقيق فقط في الليل");
    }

    const detective = await ctx.db
      .query("players")
      .withIndex("by_user_game", (q) => q.eq("userId", args.userId).eq("gameId", args.gameId))
      .first();

    if (!detective || detective.role !== "detective" || !detective.isAlive) {
      throw new Error("فقط المحقق الحي يمكنه التحقيق");
    }

    const target = await ctx.db.get(args.targetId);
    if (!target || !target.isAlive) throw new Error("الهدف غير صحيح");

    // Record investigation
    await ctx.db.insert("gameActions", {
      gameId: args.gameId,
      playerId: detective._id,
      action: "investigate",
      targetId: args.targetId,
      phase: "night",
      day: game.currentDay,
    });

    // Add result message for detective
    const result = target.role === "mafia" ? "مافيا" : "بريء";
    const targetUser = await ctx.db.get(target.userId);
    await ctx.db.insert("gameMessages", {
      gameId: args.gameId,
      playerId: detective._id,
      message: `نتيجة التحقيق: ${targetUser?.name} هو ${result}`,
      type: "system",
      phase: "night",
      day: game.currentDay,
    });
  },
});
