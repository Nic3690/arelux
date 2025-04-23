import { invalidateAll } from '$app/navigation';
import { page } from '$app/state';
import { getSupabase } from '$lib';
import { toast } from 'svelte-sonner';

export async function deleteObject(tenant: string, code: string) {
	const supabase = getSupabase();

	await supabase
		.from('object_junctions')
		.delete()
		.eq('tenant', tenant)
		.eq('object_code', code)
		.throwOnError();
	await supabase
		.from('object_curve_junctions')
		.delete()
		.eq('tenant', tenant)
		.eq('object_code', code)
		.throwOnError();
	await supabase
		.from('family_objects')
		.delete()
		.eq('tenant', tenant)
		.eq('objectcode', code)
		.throwOnError();
	await supabase.from('objects').delete().eq('tenant', tenant).eq('code', code).throwOnError();

	invalidateAll();
}

export async function deleteFamily(tenant: string, code: string) {
	if (page.data.families[code].items.length !== 0)
		return toast.error('This family still has objects associated with it');

	await getSupabase()
		.from('families')
		.delete()
		.eq('tenant', tenant)
		.eq('code', code)
		.throwOnError();

	invalidateAll();
}

export async function createFamily(
	tenant: string,
	system: string,
	settings: {
		group: string;
		image: File;
		displayName: string;
		visible: boolean;
		hasModel: boolean;
		needsColorConfig: boolean;
		needsLengthConfig: boolean;
		needsCurveConfig: boolean;
		needsTemperatureConfig: boolean;
		needsLedConfig: boolean;
		ledFamily?: string;
		isLed: boolean;
		arbitraryLength: boolean;
	},
) {
	const supabase = getSupabase();
	const code = crypto.randomUUID().replaceAll('-', '');

	await supabase.storage
		.from(tenant)
		.upload(`families/${code}.webp`, settings.image, { upsert: true });

	await supabase
		.from('families')
		.upsert({
			code,
			tenant,
			system,
			visible: settings.visible,
			displayname: settings.displayName,
			familygroup: settings.group,
			hasmodel: settings.hasModel,
			needscolorconfig: settings.needsColorConfig,
			needslengthconfig: settings.needsLengthConfig,
			needscurveconfig: settings.needsCurveConfig,
			needstemperatureconfig: settings.needsTemperatureConfig,
			needsledconfig: settings.needsLedConfig,
			ledfamily: settings.ledFamily,
			isled: settings.isLed,
			arbitrarylength: settings.arbitraryLength,
		})
		.throwOnError();
}

export async function createSystem(tenant: string, code: string, image: File) {
	try {
		const supabase = getSupabase();
		await supabase.from('systems').upsert({ tenant, code }).throwOnError();
		const res = await supabase.storage
			.from(tenant)
			.upload(`systems/${code}.jpg`, image, { upsert: true });

		if (res.error !== null) {
			throw new Error('Failed to upload the image for the system');
		}
	} catch {
		toast.error('Something went wrong');
	}
}
