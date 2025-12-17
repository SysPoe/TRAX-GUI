import { TRAX, isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib/server/trax";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { AugmentedStop } from "translink-rail-api";

type AugmentedTripInstance = NonNullable<ReturnType<typeof TRAX.getAugmentedTripInstance>>;

function dateDiff(dateStr: string): number {
	let now = new Date(Date.now() + 10 * 3_600_000);
	now.setUTCHours(0, 0, 0, 0);
	let y = Number.parseInt(dateStr.slice(0, 4));
	let m = Number.parseInt(dateStr.slice(4, 6)) - 1;
	let d = Number.parseInt(dateStr.slice(6, 8));
	let date = new Date(Date.UTC(y, m, d));
	if (date < now) return Number.MAX_SAFE_INTEGER;
	return Math.abs(date.getTime() - now.getTime());
}

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!isTRAXLoaded) {
		loadTRAX();
		throw error(503, "Loading TRAX data... Please retry in a few minutes.");
	}

	if (isTRAXLoading) throw error(503, "Loading TRAX data... Please retry in a few minutes.");

	let { instance_id } = params;
	const inst = TRAX.getAugmentedTripInstance(instance_id);
	if (!inst) throw error(404, `Trip Instance"${instance_id}" not found`);
	let stations: Record<string, AugmentedStop> = {};
	let route = TRAX.getRawRoutes(inst.route_id)[0];
	let expressString = TRAX.express.findExpressString(inst.expressInfo);

	for (const stopTime of inst.stopTimes) {
		const scheduledStopId = stopTime.scheduled_stop?.stop_id;
		if (scheduledStopId) stations[scheduledStopId] = stopTime.scheduled_stop as AugmentedStop;

		const parentStopId = stopTime.scheduled_parent_station?.stop_id;
		if (parentStopId) stations[parentStopId] = stopTime.scheduled_parent_station as AugmentedStop;
	}

	const extraDetails = locals.session?.data?.extraDetails ?? false;
	const tripForClient: AugmentedTripInstance = extraDetails
		? (inst as AugmentedTripInstance)
		: ({ ...inst, stopTimes: inst.stopTimes.filter((v) => !v.passing) } as AugmentedTripInstance);

	return { inst: tripForClient, stations, route, expressString, extraDetails, params };
};
