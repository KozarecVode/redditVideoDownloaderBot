require("dotenv").config();

import { onMessage, onNodeExit, onReady } from "./functions/events";

//exit hook to run logic after node exists
const exitHook = require("exit-hook");

// Create Discord Client
const Discord = require("discord.js");
const client = new Discord.Client();

// Discord Events
client.on("ready", onReady.bind(this, client));
client.on("message", onMessage);

// Node events
exitHook(() => {
  console.log("logging out...");
  onNodeExit(client);
});

// Login
client.login(process.env.TOKEN);
