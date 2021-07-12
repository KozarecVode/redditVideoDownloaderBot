const lodash = require("lodash");
const axios = require("axios");
const mpdParser = require("mpd-parser");
const request = require("request");
const replyWithBaseUrlDomains = require("../../constants/general").replyWithBaseUrlDomains;
const redditBaseUrlKey = require("../../constants/general").redditBaseUrlKey;

const getRedditTopicJson = async (url) => {
  let obj = null;
  const json = await axios.get(url + ".json").catch(() => null);
  const baseUrl = lodash.get(json, "data[0].data.children[0].data." + redditBaseUrlKey, null);

  const fallbackUrl =
    lodash.get(json, "data[0].data.children[0].data.secure_media.reddit_video.fallback_url", "") ||
    lodash.get(
      json,
      "data[0].data.children[0].data.crosspost_parent_list[0].secure_media.reddit_video.fallback_url",
      ""
    );

  const metaDataUrl =
    lodash.get(json, "data[0].data.children[0].data.secure_media.reddit_video.dash_url", "") ||
    lodash.get(json, "data[0].data.children[0].data.crosspost_parent_list[0].secure_media.reddit_video.dash_url", "");

  const metaData = await getMetadata(metaDataUrl, fallbackUrl).catch(() => null);

  if (json) {
    obj = {
      baseUrl,
      fallbackUrl,
      metaData,
    };
  }

  return obj;
};

const parseMetadata = (metaData, fallbackUrl) => {
  let parsedMetaData = null;

  if (fallbackUrl && metaData) {
    let audioUrl;
    let videoUrl;
    let audioPlaylistUrl;
    let videoPlaylistUrl;
    let videoHeight;

    //https://v.redd.it/r2hq10ubbvy21/DASH_1080?source=fallback
    const splitFallback = fallbackUrl.split("?source=fallback")[0].split("/");
    const audioPlaylists = lodash.get(metaData, "mediaGroups.AUDIO.audio.main.playlists", []);
    const videoPlaylists = lodash.orderBy(
      lodash.get(metaData, "playlists", []),
      (item) => lodash.get(item, "attributes.RESOLUTION.height", 0),
      ["asc"]
    );
    console.log("videoplaylist", videoPlaylists);

    // Get audio URL
    for (let i = 0; i < audioPlaylists.length; i++) {
      audioPlaylistUrl = lodash.get(audioPlaylists[i], "sidx.uri", "").replace("/", "");

      if (audioPlaylistUrl) {
        splitFallback[splitFallback.length - 1] = audioPlaylistUrl + "?source=fallback";
        audioUrl = splitFallback.join("/");
        break;
      }
    }

    // Get Video URL
    for (let i = 0; i < videoPlaylists.length; i++) {
      videoHeight = lodash.get(videoPlaylists[i], "attributes.RESOLUTION.height");
      videoPlaylistUrl = lodash.get(videoPlaylists[i], "sidx.uri", "").replace("/", "");

      if (videoHeight === 360 || videoHeight === 480 || videoHeight === 720) {
        splitFallback[splitFallback.length - 1] = videoPlaylistUrl + "?source=fallback";
        videoUrl = splitFallback.join("/");
        break;
      }
    }

    parsedMetaData = { audioUrl, videoUrl: videoUrl ? videoUrl : fallbackUrl };
  }

  return parsedMetaData;
};

const getMetadata = (url, fallbackUrl) => {
  return new Promise(async (resolve, reject) => {
    const text = await getTextFromRemoteFile(url).catch(() => null);

    if (text) {
      resolve(parseMetadata(mpdParser.parse(text, { url }), fallbackUrl));
    } else {
      reject(null);
    }
  });
};

const getTextFromRemoteFile = (url) => {
  return new Promise((resolve, reject) => {
    request.get(url, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        resolve(body);
      } else {
        reject(null);
      }
    });
  });
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

exports.isBaseUrlAStreamingService = isBaseUrlAStreamingService;
exports.getRedditTopicJson = getRedditTopicJson;
exports.suppressEmbed = suppressEmbed;
