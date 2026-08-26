import { NextResponse } from "next/server";

import {
  getDevelopmentCreator,
  importYouTubeVideoComments,
  toYouTubeIntegrationError,
} from "@/lib/youtube/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { videoId?: unknown; maxComments?: unknown };
    if (typeof body.videoId !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(body.videoId)) {
      throw new Error("invalid video");
    }
    const creator = await getDevelopmentCreator();
    const requestedLimit =
      typeof body.maxComments === "number" && Number.isFinite(body.maxComments)
        ? Math.floor(body.maxComments)
        : undefined;
    const summary = await importYouTubeVideoComments(creator.id, body.videoId, requestedLimit);
    return NextResponse.json({ summary });
  } catch (error) {
    const safeError = toYouTubeIntegrationError(error, "invalid_request");
    return NextResponse.json(
      { error: safeError.message, code: safeError.code },
      { status: safeError.status },
    );
  }
}
