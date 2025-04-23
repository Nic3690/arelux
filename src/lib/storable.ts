import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';

export function storable(key: string, data: any) {
	const store = writable(data);
	const { subscribe, set } = store;
	const isBrowser = typeof window !== 'undefined';

	isBrowser && localStorage[key] && set(JSON.parse(localStorage[key]));

	return {
		subscribe,
		set: (n: any) => {
			browser && (localStorage[key] = JSON.stringify(n));
			set(n);
		},
		update: (cb: (_: any) => any) => {
			const updatedStore = cb(get(store));

			browser && (localStorage[key] = JSON.stringify(updatedStore));
			set(updatedStore);
		},
	};
}
