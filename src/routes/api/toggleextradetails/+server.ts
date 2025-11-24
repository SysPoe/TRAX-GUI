import { json } from "@sveltejs/kit";

export async function GET({ locals }) {
	await locals.session?.setData({
		...locals.session.data,
		extraDetails: !(locals.session?.data?.extraDetails ?? true) && (locals.session?.data.admin ?? false),
	});
	await locals.session?.save();
	return json({ extraDetails: locals.session?.data?.extraDetails ?? false });
}
