import { isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import TRAX from "translink-rail-api";

export const load: PageServerLoad = async ({ url }) => {
	if (!isTRAXLoaded) {
		loadTRAX();
		throw error(503, "Loading TRAX data... Please retry in a few minutes.");
	}

	if (isTRAXLoading) throw error(503, "Loading TRAX data... Please retry in a few minutes.");

	const type = url.searchParams.get("type");
	let data: any = null;
	let count = 0;

	if (type) {
		switch (type) {
			case "tripUpdates":
				// @ts-ignore
				data = TRAX.getTripUpdates(undefined);
				break;
			case "vehiclePositions":
				// @ts-ignore
				data = TRAX.getVehiclePositions(undefined);
				break;
			case "stopTimes":
				// @ts-ignore
				data = TRAX.getRawStopTimes();
				break;
			case "calendars":
				// @ts-ignore
				data = TRAX.getRawCalendars();
				break;
			case "calendarDates":
				// @ts-ignore
				data = TRAX.getRawCalendarDates();
				break;
			case "trips":
				// @ts-ignore
				data = TRAX.getRawTrips();
				break;
			case "stops":
				// @ts-ignore
				data = TRAX.getRawStops();
				break;
			case "routes":
				// @ts-ignore
				data = TRAX.getRawRoutes();
				break;
			default:
				break;
		}
		if (Array.isArray(data)) {
			count = data.length;
		}
	}

	return {
		type,
		data,
		count,
	};
};
