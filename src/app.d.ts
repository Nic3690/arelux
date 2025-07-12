import type { families } from '$lib/catalog';
import type { Database } from '$lib/dbschema';
import type { TemporaryObject } from '$lib/renderer/objects';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Vector3Like } from 'three';

declare global {
	namespace App {
		interface PageData {
			supabase: SupabaseClient<Database>;
			tenant: string;
			families: Record<string, Family>;
			catalog: Record<string, CatalogEntry>;
			settings: Settings;
			/** The junction joiners. The key represents the group of the junction, while the value represents the whole joiner */
			joiners: Record<string, JunctionJoiner[]>;
		}
		interface PageState {
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

			/** The code of the item we are editing. Used only for the admin page */
			editing?: string;
			/** The current page number, if this page has a number */
			currentPage?: number;
			isCustomLength?: boolean;
		}
	}
}

export interface Family {
	/** An opaque code representing this family */
	code: string;
	/** The name displayed in the left sidebar of /add */
	displayName: string;
	/** The system this family is in */
	system: string;
	/** The items of this family */
	items: FamilyEntry[];
	/** The group that this family is in */
	group: string;
	/** Whether items in this family need configuration before being created */
	hasModel: boolean;
	/** Whether this family is visible in the left sidebar of /add */
	visible: boolean;

	/** Whether this family has leds associated as a subfamily */
	needsLedConfig: boolean;
	/** If needsLedConfig is true, this field contains the code of the family of LEDs */
	ledFamily: string | null;
	/** If this family is a LED family */
	isLed: boolean;

	/** Whether items in this family need color configuration */
	needsColorConfig: boolean;
	needsLengthConfig: boolean;
	needsCurveConfig: boolean;
	needsTemperatureConfig: boolean;
	/** Whether item(s) in this family have an arbitrary length */
	arbitraryLength: boolean;

	/** True if any of the `needs*Config` properties are true */
	needsConfig: boolean;
}

export interface FamilyEntry {
	deg: number;
	/** The length of this object. If it's a LED segment, it represents the length of the smallest unit in which a cable can be cut */
	len: number;
	/** The radius of the curve, if this object is not a LED strip. If it's a LED strip,
	 * this represents the tolerance at the end of a strip when cut ("+5mm misura tappi + saldatura"). */
	radius: number;
	/** Length of the circumference of this object */
	total_length?: number;
	color: string;
	/** The code of the item (i.e. `keyof typeof data.catalog`) */
	code: string;
	/** The first row of description that is show on the left sidebar of / */
	desc1: string;
	/** The second row of description that is show on the left sidebar of / */
	desc2: string;
}

export interface CatalogEntry {
	code: string;
	system: string;
	price_cents: number;
	juncts: {
		x: number;
		y: number;
		z: number;
		angle: number;
		group: string;
	}[];
	line_juncts: {
		point1: Vector3Like;
		point2: Vector3Like;
		pointC: Vector3Like;
		group: string;
	}[];
	/**
	 * The impact this piece has on the global power budget. Measured in Watts.
	 * A negative value means the piece consumes power, while a positive value means it provides power.
	 */
	power: number;
	/** Whether to ask for leds when preparing the invoice */
	askForLeds: boolean;
}

export type SavedObject = {
	object?: TemporaryObject;
	/** Whether this object is hidden in the sidebar of the / page */
	hidden?: true;
	sidebarItem?: HTMLElement;

	code: string;
	/** The first row of description, as shown on the left of the / page */
	desc1: string;
	/** The second row of description, as shown on the left of the / page */
	desc2: string;
	/** If this object had an arbitrary length, its expressed here in millimeters */
	length?: number;
	customLength?: boolean;

	/** Empty unless the object is actually two or more objects */
	subobjects: SavedObject[];
	isAutoConnector?: boolean;
};

/** The settings of a tenant */
export type Settings = {
	/** The correct password that must be inserted before being allowed to download the invoice */
	password: string;
	/** Whether 3d is enabled for this tenant */
	allow3d: boolean;
	/** The primary color for this tenant */
	primaryColor: string;
};

export type JunctionJoiner = {
	group: string;
	code: string;
};
