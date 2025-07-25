import TRAX from 'translink-rail-api';
import { loadTRAX } from '$lib';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
    await loadTRAX();
    let stations = TRAX.getStations().map(v => v.toSerializable()).sort((a, b) => (a.stop_name || "").localeCompare((b.stop_name || "")));
    return {  stations };
}