"use server";

import { z } from "zod";
import { createSafeAction } from "@/lib/actions/safe-action";
import { actionSuccess } from "@/lib/actions/types";
import { markAsRead, markAllAsRead } from "@/services/notification";

export const markNotificationAsRead = createSafeAction<string>({
  schema: z.string().uuid(),
  handler: async (notificationId, ctx) => {
    await markAsRead(notificationId, ctx.userId);
    return actionSuccess();
  },
});

export const markAllNotificationsAsRead = createSafeAction({
  handler: async (_input, ctx) => {
    await markAllAsRead(ctx.userId);
    return actionSuccess();
  },
});
