import { get } from "lodash";
import { deleteFile, downloadFile, extractRedditUrls, getUrlObject } from "./general";

export const onReady = (client) => {
  console.log(`Successfully logged in as ${client.user.tag}!`);
};

export const onNodeExit = (client) => {
  client.destroy();
};

export const onMessage = async (msg) => {
  const discriminator = get(msg, "author.discriminator", null);

  if (discriminator && discriminator != process.env.BOT_DISCRIMINATOR) {
    const messageContent = get(msg, "content", "");
    const redditUrls = extractRedditUrls(messageContent);
    const firstUrl = redditUrls[0] ? redditUrls[0] : null;

    // Only use first reddit url
    // TODO: Add support for multiple urls in the same message?
    if (firstUrl) {
      getUrlObject(firstUrl)
        .then((urlObject) => {
          if (urlObject) {
            const permalink = get(urlObject, "permaLink", null);
            const videoUrl = get(urlObject, "videoUrl", null);
            const audioUrl = get(urlObject, "audioUrl", null);

            // Use https://ds.redditsave.com/ to download the actual mp4 file
            if (permalink && videoUrl) {
              const downloadUrl = `https://ds.redditsave.com/download-sd.php?permalink=${permalink}&video_url=${videoUrl}&audio_url=${audioUrl}`;

              downloadFile(downloadUrl)
                .then((filePath) => {
                  const urlElements = firstUrl.split("/");
                  const videoTitle =
                    urlElements && urlElements[urlElements.length - 2] ? urlElements[urlElements.length - 2] : "";

                  msg.channel
                    .send(`Uploaded "${videoTitle}" directly for user convenience`, {
                      files: [filePath],
                    })
                    .finally(() => {
                      deleteFile(filePath);
                    });
                })
                .catch((e) => {
                  console.warn("Unable to download file", e);
                });
            }
          }
        })
        .catch((e) => {
          console.warn(e);
        });
    }
  }
};