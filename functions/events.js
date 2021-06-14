const lodash = require("lodash");
const deleteFile = require("./general.js").deleteFile;
const downloadFile = require("./general.js").downloadFile;
const extractRedditUrls = require("./general.js").extractRedditUrls;
const getUrlObject = require("./general.js").getUrlObject;

const onNodeExit = (client) => {
  client.destroy();
};

const onMessage = async (msg) => {
  const discriminator = lodash.get(msg, "author.discriminator", null);

  if (discriminator && discriminator != process.env.BOT_DISCRIMINATOR) {
    const messageContent = lodash.get(msg, "content", "");

    const redditUrls = extractRedditUrls(messageContent);
    const firstUrl = redditUrls[0] ? redditUrls[0] : null;

    // Only use first reddit url
    // TODO: Add support for multiple urls in the same message?
    if (firstUrl) {
      getUrlObject(firstUrl)
        .then((urlObject) => {
          if (urlObject) {
            const replyWithBaseUrl = lodash.get(urlObject, "replyWithBaseUrl", false);

            if (replyWithBaseUrl) {
              const baseUrl = lodash.get(urlObject, "baseUrl", null);
              if (baseUrl) {
                msg.channel.send(`Sharing ${baseUrl} directly`);
              }
            } else {
              const permalink = lodash.get(urlObject, "permaLink", null);
              const videoUrl = lodash.get(urlObject, "videoUrl", null);
              const audioUrl = lodash.get(urlObject, "audioUrl", null);

              // Use https://ds.redditsave.com/ to download the actual mp4 file
              if (permalink && videoUrl) {
                const downloadUrl = `https://ds.redditsave.com/download-sd.php?permalink=${permalink}&video_url=${videoUrl}&audio_url=${audioUrl}`;

                downloadFile(downloadUrl)
                  .then((filePath) => {
                    const urlElements = firstUrl.split("/");
                    const videoTitle =
                      urlElements && urlElements[urlElements.length - 2] ? urlElements[urlElements.length - 2] : "";

                    msg.channel
                      .send(`Uploaded "${videoTitle}" directly`, {
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
          }
        })
        .catch((e) => {
          console.warn(e);
        });
    }
  }
};

exports.onNodeExit = onNodeExit;
exports.onMessage = onMessage;
