import type { PageLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';

const schema = z
	.object({
		displayName: z.string().min(1, "This field can't be empty").max(32, 'Field too long'),
		group: z.string().min(1, "This field can't be empty").max(32, 'Field too long'),
		image: z.instanceof(File),
		visible: z.boolean(),
		hasModel: z.boolean(),
		needsColorConfig: z.boolean(),
		needsLengthConfig: z.boolean(),
		needsCurveConfig: z.boolean(),
		needsTemperatureConfig: z.boolean(),
		needsLedConfig: z.boolean(),
		ledFamily: z.string().min(1, "This field can't be empty").max(32, 'Field too long').optional(),
		isLed: z.boolean(),
		arbitraryLength: z.boolean(),
	})
	.refine(
		(val) => !(val.needsLedConfig && val.ledFamily === undefined),
		'You need to specify a LED family for this family',
	)
	.refine(
		(val) => !(val.arbitraryLength && !val.needsLengthConfig),
		"You can't have an arbitrary length without enabling length configuration",
	);

export const load: PageLoad = async () => {
	const form = await superValidate(zod(schema));

	return { form, schema };
};
