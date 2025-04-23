import { get } from 'svelte/store';
import { goto, invalidateAll } from '$app/navigation';
import type { CatalogEntry, Family, SavedObject } from '../app';
import { page } from '$app/state';
import { toast } from 'svelte-sonner';
import { tv } from 'tailwind-variants';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './dbschema';
import { PUBLIC_SUPABASE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { Renderer } from './renderer/renderer';
import { writable, type Writable } from 'svelte/store';
import { storable } from './storable';
import Handlebars from 'handlebars';
import type { Vector3Like } from 'three';
import type { RendererObject } from './renderer/objects';

export let objects: Writable<SavedObject[]> = writable([]);

/**
 * Used for handling rotation. When undefined, no object has been added. Otherwise, it is the id of the last TemporaryRendererObject added
 */
export let lastAdded: Writable<string | undefined> = writable();

/**
 * Trova il modello del catalogo con lunghezza più vicina a quella specificata
 * @param family La famiglia di prodotti
 * @param customLength La lunghezza personalizzata
 * @returns L'oggetto con codice e lunghezza più vicina
 */
export function findClosestCatalogLength(family: Family, customLength: number): {code: string, len: number} {
	if (!family || !family.items || family.items.length === 0) {
	  throw new Error("Famiglia non valida o senza elementi");
	}
	
	// Estrai tutte le lunghezze uniche dal catalogo
	const catalogItems = _.uniqWith(
	  family.items.map(item => ({
		code: item.code,
		len: item.len
	  })),
	  (a, b) => a.len === b.len
	);
	
	// Trova l'elemento con la lunghezza più vicina
	let closestItem = catalogItems[0];
	let minDifference = Math.abs(customLength - closestItem.len);
	
	for (let i = 1; i < catalogItems.length; i++) {
	  const difference = Math.abs(customLength - catalogItems[i].len);
	  if (difference < minDifference) {
		closestItem = catalogItems[i];
		minDifference = difference;
	  }
	}
	
	return closestItem;
}

export async function finishEdit(
	renderer: Renderer,
	obj: RendererObject,
	group: string | null,
	stateOverride?: {
		/** The family of items that the user chose */
		chosenFamily: string;
		/** The code of the item that the user chose to insert */
		chosenItem: string;
		/** The object that we are attaching to */
		reference:
			| { typ: 'junction'; id: string; junction: number }
			| { typ: 'line'; id: string; junction: number; pos: Vector3Like }
			| undefined;
		/** The code of a LED strip, if one was added */
		led?: string;
		/** The length of the current piece, if the current family has "arbitraryLength" */
		length?: number;
		/** Indica se la lunghezza è personalizzata */
		isCustomLength?: boolean;
	},
) {
	renderer.setScene('normal');
	const state = stateOverride ?? page.state;
	const family = page.data.families[state.chosenFamily];
	let item = family.items.find((x) => x.code == state.chosenItem);
	if (item === undefined) {
		toast.error('An internal error occurred');
		console.error("finishEdit: can't find state.chosenItem inside state.chosenFamily");
		return;
	}

	// Attach joiners if needed
	if (group && page.data.joiners[group]) {
		for (const j of page.data.joiners[group]) {
			objects.update((objs) =>
				objs.concat({
					code: j.code,
					desc1: '',
					desc2: '',
					subobjects: [],
					length: 0,
					hidden: true,
				}),
			);
		}
	}

	const subobjects: SavedObject[] = [];
	if (state.led) {
		const led = page.data.families[family.ledFamily ?? ''].items.find((x) => x.code == state.led);
		if (led === undefined) {
			toast.error('An internal error occurred');
			console.error("finishEdit: can't find state.chosenItem inside state.chosenFamily");
			return;
		}
		subobjects.push({
			code: state.led,
			subobjects: [],
			desc1: led.desc1,
			desc2: led.desc2,
			length: state.length ? state.length - led.radius : undefined,
		});
	}
	objects.update((objs) =>
		objs.concat({
			code: state.chosenItem,
			desc1: item.desc1,
			desc2: item.desc2,
			subobjects,
			length: state.length,
            // Aggiungiamo un'indicazione che è una lunghezza personalizzata
			customLength: state.isCustomLength === true,
			object: obj,
		}),
	);
	lastAdded.set(obj.id);
	goto(`/${page.data.tenant}/${page.data.system}`);
}

/**
 * Calculate the sum of all pieces' contribution to the global power budget.
 *
 * A positive number means we have power to spare (i.e. the power adapters are
 * more powerful than they need to be), while a negative number means the opposite.
 *
 * @param catalog A reference to the catalog
 *
 * @returns the total power budget, in Watts
 */
export function getPowerBudget(
	catalog: Record<string, CatalogEntry>,
	objs?: SavedObject[],
): number {
	let res = 0;
	for (const obj of objs !== undefined ? objs : get(objects)) {
		res += (catalog[obj.code].power * (obj.length ?? 1000)) / 1000;
		for (const subobj of obj.subobjects) {
			res += (catalog[subobj.code].power * (obj.length ?? 1000)) / 1000;
		}
	}
	return res;
}

export function getTotalLength(objects: SavedObject[], families: Record<string, Family>): number {
	let res = 0;
	for (const obj of objects) {
		for (const family of Object.values(families)) {
			const familyItem = family.items.find((fi) => fi.code === obj.code);
			if (familyItem && familyItem.total_length) res += familyItem.total_length;
			if (familyItem) break;
		}
	}
	return res;
}

export const button = tv({
	base: `text-center rounded-md transition-all shadow-btn
		active:scale-98 active:shadow-btn-active
		disabled:cursor-not-allowed disabled:text-black/40 disabled:shadow-none disabled:grayscale disabled:active:scale-100`,
	variants: {
		color: {
			primary: 'bg-primary disabled:bg-box',
			secondary: 'border border-secondary disabled:bg-muted',
		},
		size: {
			sm: 'px-3 py-2',
			xs: 'px-3 py-1',
			square: 'h-12',
		},
	},

	defaultVariants: {
		color: 'primary',
		size: 'sm',
	},
});

let supabase: SupabaseClient<Database> | undefined;

export function getSupabase(): SupabaseClient<Database> {
	if (supabase === undefined) {
		supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY);
	}

	return supabase;
}

export let selectedSystem = storable('system', '');

export async function selectSystem(system: string) {
	if (get(selectedSystem) !== system) {
		selectedSystem.set(system);
		await invalidateAll();
	}
}

export async function invoiceTemplate(
	supabase: SupabaseClient<Database>,
	tenant: string,
	to: string,
	items: { code: string; quantity: number }[],
): Promise<string> {
	const prices: Record<string, number> = {};
	const prices_query = await supabase
		.from('objects')
		.select('code, price_cents')
		.eq('tenant', tenant)
		.throwOnError();
	if (!prices_query.data) {
		console.error('error querying prices:', prices_query.error);
		throw prices_query.error;
	}
	for (const obj of prices_query.data) prices[obj.code] = obj.price_cents;

	const mappedItems = items
		.map((i) => ({ ...i, price: prices[i.code] / 100 }))
		.map((i) => ({ ...i, totalPrice: i.price * i.quantity }));
	const subtotale = mappedItems.reduce((a, v) => a + v.totalPrice, 0);
	const iva = 0.22;
	const totale = subtotale + subtotale * iva;

	const template = await fetch(
		supabase.storage.from(tenant).getPublicUrl(`invoice-template.html`).data.publicUrl,
	)
		.then((resp) => resp.text())
		.then((t) => Handlebars.compile(t));

	return template({
		date: new Date(Date.now()).toLocaleString().split(',')[0],
		invoice_number: '8/18/12',
		client_id: '202020',
		client_email: to,

		items: mappedItems,

		subtotale,
		iva: iva * 100,
		totale,
	});
}

export function focusSidebarElement(item: SavedObject) {
	if (!item.sidebarItem) return;
	item.sidebarItem.scrollIntoView({ behavior: 'smooth' });
	item.sidebarItem.focus();
	item.sidebarItem.classList.add('ring');
	setTimeout(() => item.sidebarItem?.classList.remove('ring'), 3000);
}
