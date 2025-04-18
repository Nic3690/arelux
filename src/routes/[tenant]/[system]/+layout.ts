import { getSupabase } from '$lib';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LayoutLoad } from './$types';
import type { Database } from '$lib/dbschema';

export let prerender = false;

async function loadModes(supabase: SupabaseClient<Database>, tenant: string, system: string): Promise<string[]> {
	const res = await supabase
		.from('families')
		.select('visible, familygroup')
		.eq('tenant', tenant)
		.eq('system', system)
		.order('familygroup')
		.throwOnError();
	return [...new Set(res.data?.filter((x) => x.visible).map((x) => x.familygroup))];
}

export const load: LayoutLoad = async ({ params }) => {
	return {
		modes: await loadModes(getSupabase(), params.tenant, params.system),
		system: params.system,
	};
};
