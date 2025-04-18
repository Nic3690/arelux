import type { PageLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';

const schema = z.object({
	name: z.string().min(1, "This field can't be empty").max(32, 'Field too long'),
	image: z.instanceof(File),
});

export const load: PageLoad = async () => {
	const form = await superValidate(zod(schema));
	return { form, schema };
};
