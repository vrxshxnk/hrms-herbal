import { StreamChat } from "stream-chat";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";
import { apiError, ok } from "@/app/lib/api/response";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !user.sub) {
      return apiError("UNAUTHORIZED", "Failed to get the user!", 401);
    }

    const body = await request.json();
    const { targetUserId, targetName, targetEmail } = body;

    if (!targetUserId) {
      return apiError("BAD_REQUEST", "targetUserId is required", 400);
    }

    if (targetUserId === user.sub) {
      return apiError("BAD_REQUEST", "Cannot start a conversation with yourself", 400);
    }

    const serverClient = StreamChat.getInstance(
      process.env.NEXT_PUBLIC_STREAM_KEY!,
      process.env.STREAM_SECRET
    );

    // Make sure both users exist in Stream before creating the channel
    await serverClient.upsertUsers([
      { id: user.sub, name: user.email || user.sub, },
      { id: targetUserId, name: targetName || targetEmail || targetUserId, email: targetEmail },
    ]);

    // Deterministic channel id so re-clicking the same employee reuses the same DM
    const members = [user.sub, targetUserId].sort();
    const channelId = `dm-${members.join("-")}`.slice(0, 64);

    const channel = serverClient.channel("messaging", channelId, {
      members,
      created_by_id: user.sub,
    } as any);

    await channel.create();

    return ok({ channelId, channelType: "messaging" });
  } catch (error) {
    console.error("chat/start error:", error);
    return apiError("INTERNAL_ERROR", "failed to start conversation", 500);
  }
}