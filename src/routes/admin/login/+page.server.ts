import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { TRAX_GUI_ADMIN_PASS } from "../../../hooks.server";

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.session?.data?.admin) {
		throw redirect(303, "/admin");
	}

	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const password = data.get("password");

		if (password !== TRAX_GUI_ADMIN_PASS) {
			return fail(400, { incorrect: true });
		}

		if (locals.session) {
			await locals.session?.setData({
				...locals.session.data,
				admin: true,
				extraDetails: true,
			});
			await locals.session?.save();
		}

		throw redirect(303, "/admin");
	},
};
