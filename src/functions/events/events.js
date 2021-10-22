const lodash = require("lodash");
const downloadFiles = require("../storage").downloadFiles;
const uploadFile = require("../storage").uploadFile;
const extractRedditUrls = require("../general").extractRedditUrls;
const suppressEmbed = require("./eventHelpers").suppressEmbed;
const getRedditTopicJson = require("./eventHelpers").getRedditTopicJson;
const isBaseUrlAStreamingService =
  require("./eventHelpers").isBaseUrlAStreamingService;

const onNodeExit = (client) => {
  client.destroy();
};

const onMessage = async (msg) => {
  const discriminator = lodash.get(msg, "author.discriminator", null);
  const messageType = lodash.get(msg, "channel.type");

  // Check if message doesn't belong to the bot
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
        const messageSent = await msg.channel
          .send(`Sharing ${redditJson.baseUrl} directly`)
          .catch(() => null);
        if (messageSent) {
          suppressEmbed(msg);
        }
      }
      // If video is already embedable
      if (redditJson.embeddable && messageType !== "dm") {
        return;
      } else {
        const file = await downloadFiles(redditJson).catch(() => null);
        uploadFile(file, firstUrl, msg);
      }
    }
  }
};

exports.onNodeExit = onNodeExit;
exports.onMessage = onMessage;
