
import { StreamChat } from "stream-chat";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";
import { apiError, ok } from "@/app/lib/api/response";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !user.sub) {
      return apiError("UNAUTHORIZED","Failed to get the user! ", 401);
    }

    const serverClient = StreamChat.getInstance(
      process.env.NEXT_PUBLIC_STREAM_KEY!,
      process.env.STREAM_SECRET
    );

    await serverClient.upsertUser({
       id:user.sub,
       name:user.email || user.sub,
       email: user.email,
    });

    const token = serverClient.createToken(user.sub);
    return ok({ 
      token, 
      userId: user.sub,
      email: user.email 
    });
  } catch (error) {
    console.log("eror chat token ka :",error);
    return apiError("INTERNAL_ERROR", "failed to get the user internal error !", 500);
  }
}