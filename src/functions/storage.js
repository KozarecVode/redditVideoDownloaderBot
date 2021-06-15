const tempFilePath = require("../constants/general").tempFilePath;
const makeid = require("./general.js").makeid;
const fs = require("fs");
const https = require("https");

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
          resolve(path);
        });
      });
    } else {
      reject(null);
    }
  });
};

const uploadFile = (filePath, firstUrl, msg) => {
  if (filePath) {
    const urlElements = firstUrl.split("/");
    const videoTitle = urlElements && urlElements[urlElements.length - 2] ? urlElements[urlElements.length - 2] : "";

    msg.channel
      .send(`Uploaded "${videoTitle}" directly`, {
        files: [filePath],
      })
      .finally(() => {
        deleteFile(filePath);
      });
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

exports.uploadFile = uploadFile;
exports.downloadFile = downloadFile;
