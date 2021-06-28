const tempFilePath = require("../constants/general").tempFilePath;
const maxFileUploadSize = require("../constants/general").maxFileUploadSize;
const makeid = require("./general.js").makeid;
const suppressEmbed = require("./eventHelpers.js").suppressEmbed;
const fs = require("fs");
const https = require("https");
const unirest = require("unirest");

const downloadFile = (downloadUrl) => {
  return new Promise((resolve, reject) => {
    if (downloadUrl) {
      const fileName = makeid(10) + ".mp4";
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
          .send(`Streamified ${videoTitle} directly https://streamable.com/${res.shortcode}`)
          .catch(() => null);
      }
    } else {
      messageSent = await msg.channel
        .send(`Uploaded "${videoTitle}" directly`, {
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

const deleteFile = (filePath) => {
  if (filePath) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(err);
    }
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
          // Embed is not immediately available
          // Wait 4 seconds...
          setTimeout(() => {
            resolve(res.body);
          }, 4000);
        }
      });
  });
};

const getFileSize = (filePath) => {
  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats.size;
  return fileSizeInBytes / (1024 * 1024);
};

exports.uploadFile = uploadFile;
exports.downloadFile = downloadFile;
