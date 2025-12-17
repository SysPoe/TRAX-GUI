import { TRAX } from "$lib/server/trax";
import { error, json } from "@sveltejs/kit";

export async function GET({ params }) {
	const { shape_id } = params;
	const shape = TRAX.gtfs.getShape(shape_id);

	if (!shape || shape.length === 0) throw error(404, "Shape not found");

	return json(shape);
}
