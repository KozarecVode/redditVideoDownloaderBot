const redditUrls = ["https://old.reddit.com/r/", "https://www.reddit.com/r/","https://reddit.com/r/"];
const redditBaseUrlKey = "url_overridden_by_dest";
const replyWithBaseUrlDomains = [
  "https://streamable.com",
  "https://gfycat.com/",
  "https://imgur.com",
  "https://redgifs.com/",
  "https://i.imgur.com/",
];
const tempFilePath = "tempFiles";
const maxFileUploadSize = 8;

exports.redditUrls = redditUrls;
exports.redditBaseUrlKey = redditBaseUrlKey;
exports.tempFilePath = tempFilePath;
exports.replyWithBaseUrlDomains = replyWithBaseUrlDomains;
exports.maxFileUploadSize = maxFileUploadSize;
