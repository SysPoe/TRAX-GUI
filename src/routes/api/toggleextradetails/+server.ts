import { json } from "@sveltejs/kit";

export async function GET({ locals }) {
	let extraDetails = !(locals.session?.data?.extraDetails ?? false);
	await locals.session?.setData({
		...locals.session.data,
		extraDetails,
	});
	await locals.session?.save();
	return json({ extraDetails });
}
