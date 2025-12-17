import { isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib/server/trax";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = (async ({ locals }: { locals: App.Locals }) => {
	if (!isTRAXLoaded) {
		loadTRAX();
		throw error(503, "Loading TRAX data... Please retry in a few minutes.");
	}

	if (isTRAXLoading) throw error(503, "Loading TRAX data... Please retry in a few minutes.");

	return {
		extraDetails: locals.session?.data?.extraDetails ?? locals.session?.data?.admin ?? false,
		admin: locals.session?.data?.admin ?? false
	}
}) satisfies PageServerLoad;
