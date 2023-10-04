const fs = require("fs");
const https = require("https");
const unirest = require("unirest");
const lodash = require("lodash");
const axios = require("axios");
const ffmpeg = require("fluent-ffmpeg");
const tempFilePath = require("../constants/general").tempFilePath;
const maxFileUploadSize = require("../constants/general").maxFileUploadSize;
const makeid = require("./general.js").makeid;
const suppressEmbed = require("./events/eventHelpers").suppressEmbed;

const downloadFiles = async (redditJson) => {
  let videoFile;
  let audioFile;
  let combinedFile;

  const baseUrl = lodash.get(redditJson, "baseUrl");
  const audioUrl = lodash.get(redditJson, "metaData.audioUrl");
  const videoUrl = lodash.get(redditJson, "metaData.videoUrl");
  const downloadUrl = baseUrl.substr(baseUrl.length - 4) === ".gif" ? baseUrl : null;

  if (downloadUrl) {
    videoFile = await downloadFile(downloadUrl, true).catch(() => null);
  } else {
    if (videoUrl) {
      videoFile = await downloadFile(videoUrl).catch(() => null);

      if (videoFile && audioUrl) {
        audioFile = await downloadFile(audioUrl).catch(() => null);
        combinedFile = await combineAudioVideo(videoFile, audioFile).catch(() => null);
      }
    }
  }

  return combinedFile ? combinedFile : videoFile;
};

const downloadFile = (downloadUrl, isGif = false) => {
  return new Promise((resolve, reject) => {
    if (downloadUrl) {
      const extension = isGif ? ".gif" : ".mp4";
      const fileName = makeid(10) + extension;
      const path = `${tempFilePath}/${fileName}`;

      https.get(downloadUrl, (res) => {
        const filePath = fs.createWriteStream(path);
        res.pipe(filePath);
        filePath.on("finish", () => {
          filePath.close();
          console.log(fileName + " was downloaded");
          resolve({ path, name: fileName, streamify: getFileSize(path) > maxFileUploadSize });
        });
      });
    } else {
      reject(null);
    }
  });
};

const uploadFile = async (file, firstUrl, msg) => {
  const filePath = file && file.path ? file.path : null;
  const streamify = file && file.streamify ? true : false;
  const fileName = file && file.name ? file.name : "";

  if (filePath) {
    let messageSent = false;
    const urlElements = firstUrl.split("/");
    const videoTitle = urlElements && urlElements[urlElements.length - 2] ? urlElements[urlElements.length - 2] : "";

    if (streamify) {
      const res = await uploadToStreamable(filePath, fileName).catch(() => null);

      if (res && res.shortcode) {
        messageSent = await msg.channel
          .send(`Streamified "${videoTitle}" https://streamable.com/${res.shortcode}`)
          .catch(() => null);
      }
    } else {
      messageSent = await msg.channel
        .send(``, {
          files: [filePath],
        })
        .catch(() => null);
    }

    if (messageSent) {
      suppressEmbed(msg);
    }

    deleteFile(filePath);
  }
};

const uploadToStreamable = async (filePath) => {
  const authToken = Buffer.from(`${process.env.STREAMABLE_EMAIL}:${process.env.STREAMABLE_PASSWORD}`).toString(
    "base64"
  );

  return new Promise((resolve, reject) => {
    unirest("POST", "https://api.streamable.com/upload")
      .headers({
        Authorization: `Basic ${authToken}`,
      })
      .attach("file", filePath)
      .end(function (res) {
        if (res.error) {
          reject(res.error);
        } else {
          // Check if uploaded file is done processing by calling GET
          // and checking the status in response every 5 seconds
          const shortCode = res.body && res.body.shortcode ? res.body.shortcode : null;

          if (shortCode) {
            let finishedProcessing = false;
            let getCounter = 0;

            const intervalObj = setInterval(async () => {
              const response = await axios.get(`https://api.streamable.com/videos/${shortCode}`).catch(() => null);
              const status = lodash.get(response, "data.status");
              const percent = lodash.get(response, "data.percent");

              if (status === 2 && percent === 100) {
                finishedProcessing = true;
              }

              getCounter++;

              if (getCounter > 60 || finishedProcessing) {
                clearInterval(intervalObj);
                resolve(res.body);
              }
            }, 5000);
          } else {
            reject(null);
          }
        }
      });
  });
};

const combineAudioVideo = (videoFile, audioFile) => {
  return new Promise((resolve, reject) => {
    if (audioFile && videoFile) {
      const fileName = makeid(10) + ".mp4";
      const filePath = `${tempFilePath}/${fileName}`;

      ffmpeg()
        .addInput(videoFile.path)
        .addInput(audioFile.path)
        .videoCodec("copy")
        .audioCodec("copy")
        .saveToFile(filePath)
        .on("error", () => {
          reject(null);
        })
        .on("end", () => {
          deleteFile(videoFile.path);
          deleteFile(audioFile.path);
          resolve({ path: filePath, name: fileName, streamify: getFileSize(filePath) > maxFileUploadSize });
        });
    } else {
      reject(null);
    }
  });
};

const getFileSize = (filePath) => {
  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats.size;
  return fileSizeInBytes / (1024 * 1024);
};

const deleteFile = (filePath) => {
  if (filePath) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(err);
    }
  }
};

exports.uploadFile = uploadFile;
exports.downloadFile = downloadFile;
exports.downloadFiles = downloadFiles;
