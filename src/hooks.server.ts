import { sveltekitSessionHandle } from "svelte-kit-sessions";

export const handle = sveltekitSessionHandle({
	secret: process.env.TRAX_GUI_SESSION_SECRET ?? "SUPER_SECRET_SECRET_KEY",
});

if ((process.env.TRAX_GUI_SESSION_SECRET ?? "SUPER_SECRET_SECRET_KEY") === "SUPER_SECRET_SECRET_KEY") {
	console.error("ERROR: Using default session secret key. This is not secure and should be changed in production.");
}
