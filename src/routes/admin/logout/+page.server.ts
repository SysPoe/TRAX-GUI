import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (locals.session) {
        await locals.session.setData({
            ...locals.session.data,
            admin: false
        });
        await locals.session.save();
    }

    throw redirect(303, '/');
};