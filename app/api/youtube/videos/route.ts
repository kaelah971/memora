import { NextRequest, NextResponse } from "next/server";

import {
  getDevelopmentCreator,
  listRecentYouTubeVideos,
  toYouTubeIntegrationError,
} from "@/lib/youtube/server";

export async function GET(request: NextRequest) {
  try {
    const creator = await getDevelopmentCreator();
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
    const videos = await listRecentYouTubeVideos(creator.id, Number.isFinite(limit) ? limit : 20);
    return NextResponse.json({ videos });
  } catch (error) {
    const safeError = toYouTubeIntegrationError(error);
    return NextResponse.json(
      { error: safeError.message, code: safeError.code },
      { status: safeError.status },
    );
  }
}
