import { get } from "lodash";
import { redditBaseUrlKey, redditUrls, tempFilePath, videoQualities } from "../constants/general";

const fs = require("fs");
const https = require("https");
const axios = require("axios");

export const containsRedditUrl = (word = "") => {
  let contains = false;

  redditUrls.forEach((redditUrl) => {
    if (word.includes(redditUrl)) {
      contains = true;
    }
  });

  return contains;
};

export const extractRedditUrls = (message = "") => {
  let url = [];
  const urlRegex = /(https?:\/\/[^ ]*)/;

  message.split(" ").forEach((word) => {
    if (containsRedditUrl(word)) {
      url.push(word.match(urlRegex)[1]);
    }
  });

  return url;
};

export const getUrlObject = (url) => {
  return axios
    .get(url + ".json")
    .then(async (data) => {
      if (data && data.data) {
        const baseUrl = get(data, "data[0].data.children[0].data." + redditBaseUrlKey, null);
        const fallbackUrl = get(data, "data[0].data.children[0].data.secure_media.reddit_video.fallback_url", "");
        let quality = getQualityFromFallbackUrl(fallbackUrl);

        if (baseUrl && quality) {
          // Check if lower quality is available because discord only allows a max upload of 8MB
          if (quality === "1080" || quality === "720" || quality === "480") {
            const response = await axios.get(baseUrl + "/DASH_360.mp4");

            if (response) {
              quality = "360";
            }
          }

          let obj = {
            permaLink: url,
            videoUrl: baseUrl + "/DASH_" + quality + ".mp4",
          };

          // Check if video has audio by sending request to /DASH_AUDIO_mp4
          return axios
            .get(baseUrl + "/DASH_audio.mp4")
            .then(() => {
              return {
                permaLink: url,
                videoUrl: baseUrl + "/DASH_" + quality + ".mp4",
                audioUrl: baseUrl + "/DASH_audio.mp4",
              };
            })
            .catch(() => {
              return {
                permaLink: url,
                videoUrl: baseUrl + "/DASH_" + quality + ".mp4",
                audioUrl: false,
              };
            });
        } else {
          console.warn("Unable to get base url from reddit topic: " + url + ".json");
          return null;
        }
      }
    })
    .catch((e) => {
      console.warn("Unable to get necessarry data from reddit topic: " + url + ".json error:", e);
    });
};

export const downloadFile = (downloadUrl) => {
  return new Promise((resolve) => {
    const fileName = makeid(10) + ".mp4";
    const path = `${tempFilePath}/${fileName}`;

    https.get(downloadUrl, (res) => {
      const filePath = fs.createWriteStream(path);
      res.pipe(filePath);
      filePath.on("finish", () => {
        filePath.close();
        console.log(fileName + " was downloaded");
        resolve(path);
      });
    });
  });
};

export const makeid = (length) => {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export const deleteFile = (filePath) => {
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error(err);
  }
};

export const getQualityFromFallbackUrl = (url) => {
  let quality = null;

  if (url) {
    const strIndexBegin = url.indexOf("_") + 1;
    const strIndexEnd = url.indexOf(".mp4");
    quality = url.substring(strIndexBegin, strIndexEnd);
  }

  return videoQualities.includes(quality) ? quality : null;
};
