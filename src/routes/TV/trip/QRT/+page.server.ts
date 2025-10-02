import { isTRAXLoaded, loadTRAX } from "$lib";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import TRAX, { type TravelTrip } from "translink-rail-api";

export const load: PageServerLoad = async ({ params }) => {
    if (!isTRAXLoaded) {
        loadTRAX();
        throw error(503, "Loading TRAX data... Please retry in a few minutes.");
    }

    let services: TravelTrip[] = TRAX.getQRTTrains().sort((a, b) => new Date(a.stops[0].actualDeparture).getTime() - new Date(b.stops[0].actualDeparture).getTime());
    return { services };
};
