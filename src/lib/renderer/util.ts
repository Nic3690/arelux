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
import { TemperatureManager } from '../config/temperatureConfig'; // NUOVO IMPORT

export async function loadModel(
	state: Renderer,
	code: string,
	variant: 'model' | 'simplified' = 'model',
): Promise<Group> {
	// USA IL CODICE BASE per le risorse (file fisici)
	const baseCode = TemperatureManager.getBaseCodeForResources(code);
	
	console.log('📂 Loading model:', { original: code, base: baseCode, variant });
	
	const path = (variant === 'model' ? 'models' : variant) + `/${baseCode}.glb`;
	const url = state.supabase.storage.from(state.tenant).getPublicUrl(path).data.publicUrl;
	
	console.log('🌐 Model URL:', url);
	
	return (await state.loader.loadAsync(url)).scene;
}

export function resizeCanvasToDisplaySize(renderer: ThreeRenderer, camera: Camera) {
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

export function resetMaterial(object: Object3D, hidden: boolean) {
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