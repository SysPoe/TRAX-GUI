import { isTRAXLoaded, loadTRAX } from "$lib";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({}) => {
  if (!isTRAXLoaded) {
    loadTRAX();
    throw error(503, "Loading TRAX data... Please retry in a few minutes.");
  }
};
