import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { Presence } from "@convex-dev/presence";
import { Id } from "./_generated/dataModel";

export const presence = new Presence(components.presence);

/**
 * Heartbeat
 * يتم استدعاؤها بشكل دوري لتحديث حالة المستخدم
 * لا نستقبل userId من الخارج (أمان + منع الأخطاء)
 */
export const heartbeat = mutation({
  args: {
    roomId: v.string(),
    sessionId: v.string(),
    interval: v.number(),
  },
  handler: async (ctx, { roomId, sessionId, interval }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // المستخدم غير مسجّل دخول → تجاهل بدون كراش
      return;
    }

    const userId = identity.subject as Id<"users">;

    // تحديث حالة المستخدم
    await ctx.db.patch(userId, { isOnline: true });

    return await presence.heartbeat(
      ctx,
      roomId,
      userId,
      sessionId,
      interval
    );
  },
});

/**
 * List Presence
 * إرجاع قائمة المتواجدين مع معلومات المستخدم
 */
export const list = query({
  args: { roomToken: v.string() },
  handler: async (ctx, { roomToken }) => {
    const presenceList = await presence.list(ctx, roomToken);

    const listWithUserInfo = await Promise.all(
      presenceList.map(async (entry) => {
        const user = await ctx.db.get(entry.userId as Id<"users">);

        if (!user) {
          return entry;
        }

        return {
          ...entry,
          name: user.name,
          isOnline: user.isOnline,
        };
      })
    );

    return listWithUserInfo;
  },
});

/**
 * Disconnect
 * يتم استدعاؤها عند خروج المستخدم
 */
export const disconnect = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity) {
      const userId = identity.subject as Id<"users">;
      await ctx.db.patch(userId, { isOnline: false });
    }

    return await presence.disconnect(ctx, sessionToken);
  },
});
