const lodash = require("lodash");
const downloadFile = require("./storage.js").downloadFile;
const uploadFile = require("./storage.js").uploadFile;
const extractRedditUrls = require("./general.js").extractRedditUrls;
const getDownloadUrl = require("./eventHelpers.js").getDownloadUrl;
const getRedditTopicJson = require("./eventHelpers").getRedditTopicJson;
const isBaseUrlAStreamingService = require("./eventHelpers").isBaseUrlAStreamingService;

const onNodeExit = (client) => {
  client.destroy();
};

const onMessage = async (msg) => {
  const discriminator = lodash.get(msg, "author.discriminator", null);

  // Check if message belongs to the bot
  if (discriminator && discriminator != process.env.BOT_DISCRIMINATOR) {
    const messageContent = lodash.get(msg, "content", "");
    const redditUrls = extractRedditUrls(messageContent);
    const firstUrl = redditUrls[0] ? redditUrls[0] : null;
    const redditJson = await getRedditTopicJson(firstUrl).catch(() => null);

    if (redditJson) {
      // Check if base url belongs to a file hosting domain (eg: streamable)
      // In that case there is no need to download the file. The bot should just reply
      // with streamable (or other) url.
      if (isBaseUrlAStreamingService(redditJson.baseUrl)) {
        msg.channel.send(`Sharing ${redditJson.baseUrl} directly`);
      } else {
        // Use https://ds.redditsave.com/ to download the actual mp4 file
        const downloadUrl = await getDownloadUrl(redditJson, firstUrl).catch(() => null);
        const filePath = await downloadFile(downloadUrl).catch(() => null);

        uploadFile(filePath, firstUrl, msg);
      }
    }
  }
};

exports.onNodeExit = onNodeExit;
exports.onMessage = onMessage;
