const axios = require("axios");
const lodash = require("lodash");
const redditUrls = require("../constants/general").redditUrls;

const containsRedditUrl = (word = "") => {
  let contains = false;

  redditUrls.forEach((redditUrl) => {
    if (word.includes(redditUrl)) {
      contains = true;
    }
  });

  return contains;
};

const extractRedditUrls = (message = "") => {
  let url = [];
  const urlRegex = /(https?:\/\/[^ ]*)/;

  message.split(" ").forEach((word) => {
    if (containsRedditUrl(word)) {
      url.push(word.match(urlRegex)[1]);
    }
  });

  return url;
};

const makeid = (length) => {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const getHtmlAttribute = (attrName, htmlString) => {
  let value = "";

  if (htmlString) {
    const dataAttrIndexStart = htmlString.indexOf(attrName) + attrName.length + 2;
    const dataAttrIndexEnd = htmlString.indexOf(`"`, dataAttrIndexStart);
    value = dataAttrIndexStart < dataAttrIndexEnd ? htmlString.substring(dataAttrIndexStart, dataAttrIndexEnd) : "";
  }

  return value;
};

exports.containsRedditUrl = containsRedditUrl;
exports.extractRedditUrls = extractRedditUrls;
exports.makeid = makeid;
exports.getHtmlAttribute = getHtmlAttribute;
