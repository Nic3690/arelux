import type { LayoutLoad } from './$types';
import type { CatalogEntry, Family, JunctionJoiner, Settings } from '../../app';
import { error } from '@sveltejs/kit';
import { getSupabase } from '$lib';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/dbschema';

export const ssr = false;

async function loadSettings(supabase: SupabaseClient<Database>, tenant: string): Promise<Settings> {
	const url = supabase.storage.from(tenant).getPublicUrl('settings.json').data.publicUrl;

	return await fetch(url).then((resp) => resp.json());
}

async function loadJoiners(
	supabase: SupabaseClient<Database>,
	tenant: string,
): Promise<Record<string, JunctionJoiner[]>> {
	const result = await supabase
		.from('joiners')
		.select('*')
		.eq('tenant', tenant)
		.throwOnError()
		.then((r) => r.data);

	if (result === null) error(500, 'Something went wrong');

	const joiners: Record<string, JunctionJoiner[]> = {};
	for (const r of result) {
		if (!joiners[r.group_code]) joiners[r.group_code] = [];
		joiners[r.group_code].push({ group: r.group_code, code: r.object_code });
	}
	return joiners;
}

async function loadCatalog(
	supabase: SupabaseClient<Database>,
	tenant: string,
): Promise<Record<string, CatalogEntry>> {
	const catalog: Record<string, CatalogEntry> = {};

	const objs = await supabase
		.from('objects')
		.select('code, power, system, price_cents')
		.eq('tenant', tenant)
		.throwOnError();
	for (const element of objs.data ?? [])
		catalog[element.code] = { juncts: [], line_juncts: [], ...element, askForLeds: false };

	const junctions = await supabase
		.from('view_junctions')
		.select('*')
		.eq('tenant', tenant)
		.throwOnError();

	for (const element of junctions.data ?? []) {
		catalog[element.code ?? '']?.juncts.push({
			group: element.groups ?? '',
			x: element.x ?? -1,
			y: element.y ?? -1,
			z: element.z ?? -1,
			angle: element.angle ?? 0,
		});
	}

	const curves = await supabase.from('view_curves').select(`*`).eq('tenant', tenant).throwOnError();
	for (const element of curves.data ?? []) {
		catalog[element.code ?? '']?.line_juncts.push({
			group: element.groups ?? '',
			point1: {
				x: element.j1x ?? -1,
				y: element.j1y ?? -1,
				z: element.j1z ?? -1,
			},
			point2: {
				x: element.j2x ?? -1,
				y: element.j2y ?? -1,
				z: element.j2z ?? -1,
			},
			pointC: {
				x: element.jcx ?? -1,
				y: element.jcy ?? -1,
				z: element.jcz ?? -1,
			},
		});
	}

	return catalog;
}

async function loadFamilies(
	supabase: SupabaseClient<Database>,
	catalog: Record<string, CatalogEntry>,
	tenant: string,
): Promise<Record<string, Family>> {
	const result = (await supabase.from('families').select('*').eq('tenant', tenant).throwOnError())
		.data;

	if (result === null) error(500, 'Something went wrong');

	let res: Record<string, Family> = {};
	for (const family of result) {
		if (family.needsledconfig && family.ledfamily === null)
			console.error(`Family ${family.code} needs LED config but has no LED family specified`);

		for (const familycode of family.code.split('+'))
			res[familycode] = {
				code: family.code,
				group: family.familygroup,
				system: family.system,
				displayName: family.displayname,
				hasModel: family.hasmodel,
				visible: family.visible,
				ledFamily: family.ledfamily,
				needsColorConfig: family.needscolorconfig,
				needsTemperatureConfig: family.needstemperatureconfig,
				needsCurveConfig: family.needscurveconfig,
				needsLengthConfig: family.needslengthconfig,
				needsLedConfig: family.needsledconfig,
				needsConfig:
					family.needscolorconfig ||
					family.needscurveconfig ||
					family.needslengthconfig ||
					family.needstemperatureconfig ||
					family.needsledconfig,
				isLed: family.isled,
				arbitraryLength: family.arbitrarylength,
				items: [],
			};
	}

	const result2 = (
		await supabase.from('family_objects').select('*').eq('tenant', tenant).throwOnError()
	).data;
	if (result2 === null) error(500, 'Something went wrong');

	for (const element of result2) {
		for (const familycode of element.familycode.split('+')) {
			let total_length: number | undefined;
			if (element.angle && element.radius) {
				total_length = (element.angle * Math.PI * element.radius) / 180;
			}
			if (element.angle === 0 && element.radius) {
				total_length = element.radius;
			}

			if (res[familycode].displayName.includes('sospensione')) {
				catalog[element.objectcode].askForLeds = true;
			}

			res[familycode].items.push({
				code: element.objectcode,
				deg: element.angle ?? -1,
				len: element.len ?? -1,
				radius: element.radius ?? -1,
				color: element.color ?? '',
				desc1: element.desc1,
				desc2: element.desc2,
				total_length,
			});
		}
	}

	return res;
}

async function loadSystems(supabase: SupabaseClient<Database>, tenant: string): Promise<string[]> {
	const result = (await supabase.from('systems').select('code').eq('tenant', tenant).throwOnError())
		.data;
	if (result === null) error(500, 'Something went wrong');
	return result.map((x) => x.code);
}

export const load: LayoutLoad = async ({ params }) => {
	const supabase = getSupabase();
	const tenant = params.tenant;
	if (!(await supabase.storage.listBuckets()).data?.some((x) => x.name === tenant)) error(404);

	const catalog = await loadCatalog(supabase, tenant);

	const [families, systems, joiners, settings] = await Promise.all([
		loadFamilies(supabase, catalog, tenant),
		loadSystems(supabase, tenant),
		loadJoiners(supabase, tenant),
		loadSettings(supabase, tenant),
	]);

	return {
		supabase,
		catalog,
		tenant,
		families,
		systems,
		joiners,
		settings,
	};
};
