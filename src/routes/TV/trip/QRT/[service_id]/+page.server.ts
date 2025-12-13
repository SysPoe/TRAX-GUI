import { isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import TRAX, { type TravelTrip } from "translink-rail-api";

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!isTRAXLoaded) {
		loadTRAX();
		throw error(503, "Loading TRAX data... Please retry in a few minutes.");
	}

	if (isTRAXLoading) throw error(503, "Loading TRAX data... Please retry in a few minutes.");

	let { service_id } = params;

	let service: TravelTrip | undefined = TRAX.getQRTTrains().find((v) => v.serviceId == service_id);
	if (!service) throw error(404, `Service '${service_id}' not found`);

	const extraDetails = locals.session?.data?.extraDetails ?? false;
	if (!extraDetails && service.stopsWithPassing)
		service = { ...service, stopsWithPassing: service.stopsWithPassing.filter((v) => v.isStop) };

	return { service, extraDetails };
};
