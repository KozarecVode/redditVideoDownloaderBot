const tempFilePath = require("../constants/general").tempFilePath;
const makeid = require("./general.js").makeid;
const fs = require("fs");
const https = require("https");
const axios = require("axios");

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

const uploadFile = async (filePath, firstUrl, msg) => {
  if (filePath) {
    const urlElements = firstUrl.split("/");
    const videoTitle = urlElements && urlElements[urlElements.length - 2] ? urlElements[urlElements.length - 2] : "";
    const messageSent = await msg.channel
      .send(`Uploaded "${videoTitle}" directly`, {
        files: [filePath],
      })
      .catch(() => null);

    if (messageSent) {
      // Remove embed from original poster
      // For some reason Discord js lib doesn't allow editing other users message flags so we must call
      // discord API directly
      await axios
        .patch(
          `https://discord.com/api/channels/${msg.channel.id}/messages/${msg.id}`,
          {
            flags: 4,
          },
          { headers: { Authorization: `Bot ${process.env.TOKEN}` } }
        )
        .catch(() => null);
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

exports.uploadFile = uploadFile;
exports.downloadFile = downloadFile;
