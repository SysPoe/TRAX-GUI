import { loadTRAX } from "$lib/server/trax";
import type { ServerInit } from "@sveltejs/kit";
import { sveltekitSessionHandle } from "svelte-kit-sessions";
import { config } from "dotenv";
import { existsSync } from "node:fs";

if (existsSync(".env")) {
	config();
}

export const handle = sveltekitSessionHandle({
	secret: process.env.TRAX_GUI_SESSION_SECRET ?? "SUPER_SECRET_SECRET_KEY",
});

if ((process.env.TRAX_GUI_SESSION_SECRET ?? "SUPER_SECRET_SECRET_KEY") === "SUPER_SECRET_SECRET_KEY") {
	console.error("ERROR: Using default session secret key. This is not secure and should be changed in production.");
}

export const TRAX_GUI_ADMIN_PASS = process.env.TRAX_GUI_ADMIN_PASS ?? "admin";
if (TRAX_GUI_ADMIN_PASS === "admin") {
	console.error("ERROR: Using default admin password. This is not secure and should be changed in production.");
}

export const init: ServerInit = () => {
	loadTRAX();
}