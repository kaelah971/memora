import "../load-env";

import { getYouTubeConfigStatus } from "../../lib/youtube/config";
import { toYouTubeIntegrationError } from "../../lib/youtube/errors";
import { getYouTubeTokenState } from "../../lib/youtube/tokens";
import { getDevelopmentCreator, getYouTubeConnection } from "../../lib/youtube/storage";
import { listRecentYouTubeVideos } from "../../lib/youtube/videos";

async function main(): Promise<void> {
  const config = getYouTubeConfigStatus();
  console.log("Memora YouTube doctor");
  console.log(`Google config: ${config.googleConfigured ? "configured" : "missing"}`);
  console.log(`Token storage: ${config.tokenStorageConfigured ? "configured" : "missing"}`);

  if (!config.googleConfigured || !config.tokenStorageConfigured) {
    console.error("YouTube doctor stopped before network access. Configure the documented server-side variables.");
    process.exitCode = 1;
    return;
  }

  try {
    const creator = await getDevelopmentCreator();
    const connection = await getYouTubeConnection(creator.id);
    console.log(`YouTube connection: ${connection ? "found" : "not found"}`);
    console.log(`Channel ID: ${connection?.youtube_channel_id ?? "[none]"}`);

    if (!connection) {
      console.log("Token state: unavailable");
      console.log("API connectivity: not checked");
      console.log("Recent videos query: not checked");
      process.exitCode = 1;
      return;
    }

    console.log(`Token state: ${getYouTubeTokenState(connection)}`);
    const videos = await listRecentYouTubeVideos(creator.id, 1);
    console.log("API connectivity: ok");
    console.log(`Recent videos query: ok (${videos.length} returned)`);
  } catch (error) {
    const safeError = toYouTubeIntegrationError(error);
    console.log("API connectivity: fail");
    console.log("Recent videos query: fail");
    console.error(`YouTube doctor failed [${safeError.code}].`);
    process.exitCode = 1;
  }
}

void main();
