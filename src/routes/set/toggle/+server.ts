import { json } from "@sveltejs/kit";

export function GET({ locals }) {
	locals.session.setData({
		extraDetails: !(locals.session?.data?.extraDetails ?? false),
	});
	locals.session.save();
	return json({ extraDetails: locals.session?.data?.extraDetails ?? false });
}
