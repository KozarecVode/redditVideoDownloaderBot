const lodash = require("lodash");
const axios = require("axios");
const replyWithBaseUrlDomains = require("../constants/general").replyWithBaseUrlDomains;
const videoQualities = require("../constants/general").videoQualities;
const redditBaseUrlKey = require("../constants/general").redditBaseUrlKey;

const getRedditTopicJson = async (url) => {
  let obj = null;
  const json = await axios.get(url + ".json").catch(() => null);

  if (json) {
    obj = {
      baseUrl: lodash.get(json, "data[0].data.children[0].data." + redditBaseUrlKey, null),
      fallbackUrl: lodash.get(json, "data[0].data.children[0].data.secure_media.reddit_video.fallback_url", ""),
    };
  }

  return obj;
};

const getDownloadUrl = async (redditJson = {}, redditTopicUrl) => {
  const baseUrl = redditJson.baseUrl;
  const fallbackUrl = redditJson.fallbackUrl;
  let downloadUrl = "";
  let quality = getQualityFromFallbackUrl(fallbackUrl);

  if (baseUrl && quality) {
    // Check if lower quality is available because discord only allows a max upload of 8MB
    if (quality === "1080" || quality === "720" || quality === "480") {
      const response = await axios.get(baseUrl + "/DASH_360.mp4").catch(() => null);

      if (response) {
        quality = "360";
      }
    }

    // Check if video has audio via  direct GET
    const hasAudio = await axios.get(baseUrl + "/DASH_audio.mp4").catch(() => null);
    const videoUrl = baseUrl + "/DASH_" + quality + ".mp4";
    const audioUrl = hasAudio ? baseUrl + "/DASH_audio.mp4" : false;

    downloadUrl = videoUrl
      ? `https://ds.redditsave.com/download-sd.php?permalink=${redditTopicUrl}&video_url=${videoUrl}&audio_url=${audioUrl}`
      : "";
  }

  return downloadUrl;
};

const getQualityFromFallbackUrl = (url) => {
  let quality = null;

  if (url) {
    const strIndexBegin = url.indexOf("_") + 1;
    const strIndexEnd = url.indexOf(".mp4");
    quality = url.substring(strIndexBegin, strIndexEnd);
  }

  return videoQualities.includes(quality) ? quality : null;
};

const isBaseUrlAStreamingService = (baseUrl) => {
  let returnedValue = false;

  replyWithBaseUrlDomains.forEach((item) => {
    if (baseUrl.includes(item)) {
      returnedValue = true;
    }
  });

  return returnedValue;
};

// Remove embed from original message
// For some reason Discord js lib doesn't allow editing other users message flags so we must call
// discord API directly
const suppressEmbed = (msg) => {
  axios
    .patch(
      `https://discord.com/api/channels/${msg.channel.id}/messages/${msg.id}`,
      {
        flags: 4, //SUPPRESS_EMBED: 1 << 2 (4)
      },
      { headers: { Authorization: `Bot ${process.env.TOKEN}` } }
    )
    .catch(() => null);
};
exports.getDownloadUrl = getDownloadUrl;
exports.isBaseUrlAStreamingService = isBaseUrlAStreamingService;
exports.getRedditTopicJson = getRedditTopicJson;
exports.suppressEmbed = suppressEmbed;
