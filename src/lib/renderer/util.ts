import {
	Camera,
	Color,
	Group,
	Mesh,
	MeshStandardMaterial,
	Object3D,
	OrthographicCamera,
	PerspectiveCamera,
	type Renderer as ThreeRenderer,
} from 'three';
import type { Renderer } from './renderer';

/**
 * Carica un modello 3D dal bucket Supabase
 * @param state Stato del renderer
 * @param code Codice del modello da caricare
 * @param variant Variante del modello (default: 'model')
 * @returns Promise che risolve alla scena del modello caricato
 */
export async function loadModel(
	state: Renderer,
	code: string,
	variant: 'model' | 'simplified' = 'model',
): Promise<Group> {
	const path = (variant === 'model' ? 'models' : variant) + `/${code}.glb`;
	const url = state.supabase.storage.from(state.tenant).getPublicUrl(path).data.publicUrl;
	return (await state.loader.loadAsync(url)).scene;
}

/**
 * Ridimensiona il canvas per corrispondere alle dimensioni di visualizzazione
 * @param renderer Renderer Three.js
 * @param camera Camera Three.js
 */
export function resizeCanvasToDisplaySize(renderer: ThreeRenderer, camera: Camera): void {
	const canvas = renderer.domElement;
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;

	renderer.setSize(width, height, false);
	
	if (camera instanceof PerspectiveCamera) {
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	} else if (camera instanceof OrthographicCamera) {
		const aspect = width / height;
		const frustumSize = 1000;
		
		camera.left = (frustumSize * aspect) / -2;
		camera.right = (frustumSize * aspect) / 2;
		camera.top = frustumSize / 2;
		camera.bottom = frustumSize / -2;
		camera.near = 0.1;
		camera.far = 10000;
		camera.updateProjectionMatrix();
	}
}

/**
 * Reimposta il materiale di un oggetto 3D
 * @param object Oggetto 3D da modificare
 * @param hidden Se true, rende il materiale invisibile; altrimenti, imposta un colore nero
 */
export function resetMaterial(object: Object3D, hidden: boolean): void {
	object.traverse((child) => {
		if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {
			if (hidden) {
				child.material.visible = false;
			} else {
				child.material.color = new Color(0x000000);
				child.material.roughness = 0.6;
			}
		}
	});
}