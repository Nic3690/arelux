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
	},
) {
	renderer.setScene('normal');
	const state = stateOverride ?? page.state;
	const family = page.data.families[state.chosenFamily];
	
	// Verifica che l'item esista prima di accedervi
	const item = family.items.find((x) => x.code == state.chosenItem);
	if (item === undefined) {
		toast.error('Errore interno: elemento non trovato nella famiglia selezionata');
		console.error("finishEdit: can't find state.chosenItem inside state.chosenFamily");
		return;
	}

	// TODO: if (state.length) scaleObject(objectId, state.length, item);

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
		// Anche qui verifichiamo che l'elemento LED esista
		const led = page.data.families[family.ledFamily ?? '']?.items.find((x) => x.code == state.led);
		if (led === undefined) {
			toast.error('Errore interno: LED non trovato nella famiglia specificata');
			console.error("finishEdit: can't find LED item inside LED family");
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
			object: obj,
		}),
	);
	
	lastAdded.set(obj.id);
	goto(`/${page.data.tenant}/${page.data.system}`);
}

/**
 * Calcola il bilancio energetico totale di tutti i pezzi.
 * 
 * Un valore positivo indica un surplus di energia (gli adattatori hanno più potenza 
 * di quella necessaria), mentre un valore negativo indica il contrario.
 * 
 * @param catalog Riferimento al catalogo
 * @param objs Oggetti salvati (opzionale)
 * @returns Bilancio energetico totale in Watt
 */
export function getPowerBudget(
	catalog: Record<string, CatalogEntry>,
	objs?: SavedObject[]
  ): number {
	const objectsToCalculate = objs ?? get(objects);
	
	return objectsToCalculate.reduce((totalPower, obj) => {
	  // Potenza dell'oggetto principale
	  const objPower = (catalog[obj.code].power * (obj.length ?? 1000)) / 1000;
	  
	  // Potenza degli oggetti secondari
	  const subObjPower = obj.subobjects.reduce((subTotal, subobj) => {
		return subTotal + (catalog[subobj.code].power * (obj.length ?? 1000)) / 1000;
	  }, 0);
	  
	  return totalPower + objPower + subObjPower;
	}, 0);
  }

/**
 * Calcola la lunghezza totale di tutti gli oggetti
 * 
 * @param objects Oggetti salvati
 * @param families Record delle famiglie disponibili
 * @returns Lunghezza totale in mm
 */
export function getTotalLength(objects: SavedObject[], families: Record<string, Family>): number {
	return objects.reduce((totalLength, obj) => {
	  // Cerca l'oggetto in tutte le famiglie
	  for (const family of Object.values(families)) {
		const familyItem = family.items.find(fi => fi.code === obj.code);
		
		if (familyItem?.total_length) {
		  return totalLength + familyItem.total_length;
		}
		
		if (familyItem) {
		  break; // Esci dal ciclo se l'oggetto è stato trovato ma non ha total_length
		}
	  }
	  
	  return totalLength;
	}, 0);
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

/**
 * Genera un template di fattura HTML utilizzando Handlebars
 * 
 * @param supabase Client Supabase
 * @param tenant Tenant corrente
 * @param to Email del destinatario
 * @param items Elementi da includere nella fattura
 * @returns Promise che risolve con l'HTML della fattura
 */
export async function invoiceTemplate(
	supabase: SupabaseClient<Database>,
	tenant: string,
	to: string,
	items: { code: string; quantity: number }[]
  ): Promise<string> {
	// Ottieni i prezzi dal database
	const prices: Record<string, number> = {};
	const prices_query = await supabase
	  .from('objects')
	  .select('code, price_cents')
	  .eq('tenant', tenant)
	  .throwOnError();
	  
	if (!prices_query.data) {
	  const error = prices_query.error || new Error('Errore nella query dei prezzi');
	  console.error('Errore nella query dei prezzi:', error);
	  throw error;
	}
	
	// Popola la mappa dei prezzi
	prices_query.data.forEach(obj => {
	  prices[obj.code] = obj.price_cents;
	});
  
	// Calcola i totali
	const mappedItems = items.map(i => ({
	  ...i,
	  price: prices[i.code] / 100,
	  totalPrice: (prices[i.code] / 100) * i.quantity
	}));
	
	const subtotale = mappedItems.reduce((acc, item) => acc + item.totalPrice, 0);
	const iva = 0.22;
	const totale = subtotale * (1 + iva);
  
	// Carica e compila il template
	const templateUrl = supabase.storage
	  .from(tenant)
	  .getPublicUrl(`invoice-template.html`).data.publicUrl;
	  
	const templateResponse = await fetch(templateUrl);
	const templateText = await templateResponse.text();
	const template = Handlebars.compile(templateText);
  
	// Compila il template con i dati
	return template({
	  date: new Date().toLocaleDateString(),
	  invoice_number: '8/18/12',
	  client_id: '202020',
	  client_email: to,
	  items: mappedItems,
	  subtotale,
	  iva: iva * 100,
	  totale
	});
  }  

/**
 * Evidenzia un elemento nella sidebar
 * 
 * @param item Oggetto da evidenziare
 */
export function focusSidebarElement(item: SavedObject): void {
	if (!item.sidebarItem) return;
	
	// Scorrimento fluido fino all'elemento
	item.sidebarItem.scrollIntoView({ behavior: 'smooth' });
	item.sidebarItem.focus();
	
	// Aggiungi effetto evidenziazione temporaneo
	item.sidebarItem.classList.add('ring');
	setTimeout(() => {
	  item.sidebarItem?.classList.remove('ring');
	}, 3000);
  }
