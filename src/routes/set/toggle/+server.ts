import { json } from "@sveltejs/kit";

export async function GET({ locals }) {
	await locals.session?.setData({
		extraDetails: !(locals.session?.data?.extraDetails ?? true),
	});
	await locals.session?.save();
	return json({ extraDetails: locals.session?.data?.extraDetails ?? true });
}
