import type { Session } from "svelte-kit-sessions";

declare module "svelte-kit-sessions" {
    interface SessionData {
        extraDetails?: boolean;
		expandedAccess?: boolean;
    }
}

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
