require("dotenv").config();
const onMessage = require("./functions/events/events").onMessage;
const onNodeExit = require("./functions/events/events").onNodeExit;
const exitHook = require("exit-hook");
const Discord = require("discord.js");
const http = require("http");

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


http
  .createServer(function (req, res) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.write("Ok!");
    res.end();
  })
  .listen(8080);
