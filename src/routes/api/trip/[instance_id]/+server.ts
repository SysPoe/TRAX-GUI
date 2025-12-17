import { TRAX, isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib/server/trax";
import { error, json } from "@sveltejs/kit";

export async function GET({ params }) {
	if (!isTRAXLoaded) {
		loadTRAX();
		throw error(503, "Loading TRAX data...");
	}

	if (isTRAXLoading) throw error(503, "Loading TRAX data...");

	const { instance_id } = params;
	const inst = TRAX.getAugmentedTripInstance(instance_id);

	if (!inst) throw error(404, "Trip instance not found");

	return json(inst);
}
