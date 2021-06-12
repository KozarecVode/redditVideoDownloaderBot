import dotenv from "dotenv";
import { onMessage, onReady } from "./functions/events";

// Init dotenv for reading .env file
dotenv.config();

// Create Discord Client
const Discord = require("discord.js");
const client = new Discord.Client();

// Events
client.on("ready", onReady.bind(this, client));
client.on("message", onMessage);

// Login
client.login(process.env.TOKEN);
