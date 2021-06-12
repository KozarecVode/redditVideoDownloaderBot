require("dotenv").config();
const onMessage = require("./functions/events.js").onMessage;
const onNodeExit = require("./functions/events.js").onNodeExit;
const exitHook = require("exit-hook");
const Discord = require("discord.js");

// Create Discord Client
const client = new Discord.Client();

// Discord Events
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("message", function (msg) {
  onMessage(msg);
});

// Node events
exitHook(() => {
  console.log("logging out...");
  onNodeExit(client);
});

// Login
client.login(process.env.TOKEN);
