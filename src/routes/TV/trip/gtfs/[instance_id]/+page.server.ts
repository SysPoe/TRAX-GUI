import TRAX from "translink-rail-api";
import { isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { SerializableAugmentedStop } from "translink-rail-api";

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
	let inst = TRAX.getAugmentedTripInstance(instance_id);
	if (!inst) throw error(404, `Trip Instance"${instance_id}" not found`);
	let stations: { [stop_id: string]: SerializableAugmentedStop } = {};
	let route = TRAX.getRawRoutes(inst.route_id)[0];
	let expressString = TRAX.express.findExpressString(inst.expressInfo);

	for (const stopTime of inst.stopTimes) {
		stations[stopTime.scheduled_stop?.stop_id as any as string] = stopTime.scheduled_stop?.toSerializable() as any;
		if (stopTime.scheduled_parent_station)
			stations[stopTime.scheduled_parent_station?.stop_id as any as string] =
				stopTime.scheduled_parent_station?.toSerializable() as any;
	}

	let serialized = inst.toSerializable();

	const extraDetails = locals.session?.data?.extraDetails ?? false;
	if (!extraDetails)
		serialized.stopTimes = serialized.stopTimes.filter((v) => !v.passing);

	return { inst: serialized, stations, route, expressString, extraDetails, params };
};
