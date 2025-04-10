import {
	WebGLRenderer,
	Scene,
	Cache,
	PerspectiveCamera,
	Vector3,
	Box3,
	Sphere,
	Mesh,
	SphereGeometry,
	MeshBasicMaterial,
	type Vector3Like,
	type ColorRepresentation,
	Color,
	BufferGeometry,
	OrthographicCamera,
	Camera,
	Quaternion,
	ArrowHelper,
	Line,
	LineBasicMaterial,
	Vector2,
	MOUSE,
	PMREMGenerator,
	DataTexture,
	Raycaster,
	Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DEG2RAD } from 'three/src/math/MathUtils.js';

import type { Database } from '$lib/dbschema';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogEntry, Family } from '../../app';
import { RendererObject, TemporaryObject } from './objects';
import { resizeCanvasToDisplaySize } from './util';
import { HandleManager, HandleMesh, LineHandleMesh } from './handles';
import { ExtrudedObject } from './extruded';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { toast } from 'svelte-sonner';
import { get } from 'svelte/store';
import { focusSidebarElement, objects } from '$lib';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const CAMERA_FOV: number = 70;
let RENDERER: Renderer | undefined = undefined;
let exr: DataTexture | undefined = undefined;

async function loadExr() {
	if (exr === undefined) exr = await new EXRLoader().loadAsync('/footprint_court_2k.exr');
	return exr;
}

export class Renderer {
	readonly supabase: SupabaseClient<Database>;
	readonly tenant: string;
	readonly families: Record<string, Family>;
	readonly catalog: Record<string, CatalogEntry>;

	readonly loader: GLTFLoader;
	handles: HandleManager;

	#webgl!: WebGLRenderer;
	#scene: Scene;
	#camera: Camera;
	#controls: OrbitControls | undefined;
	#prevCameraPos: Vector3 | undefined;
	#prevCameraQuaternion: Quaternion | undefined;
	#pointer: Vector2;
	#helpers: ArrowHelper[] = [];

	#objects: TemporaryObject[] = [];
	#clickCallback: ((_: HandleMesh | LineHandleMesh) => any) | undefined;

	#scenes: {
		normal: { scene: Scene; handles: HandleManager; objects: TemporaryObject[] };
		single: { scene: Scene; handles: HandleManager; objects: TemporaryObject[] };
	};

	#raycaster: Raycaster;

	static get(
		data: {
			supabase: SupabaseClient<Database>;
			tenant: string;
			families: Record<string, Family>;
			catalog: Record<string, CatalogEntry>;
		},
		canvas: HTMLCanvasElement,
		controls: HTMLElement,
	): Renderer {
		if (!RENDERER)
			RENDERER = new Renderer(
				data.supabase,
				data.tenant,
				data.families,
				data.catalog,
				canvas,
				controls,
			);
		else {
			RENDERER.#webgl.dispose();
			RENDERER.reinitWebgl(canvas);
			RENDERER.reinitControls(controls);
		}

		return RENDERER;
	}

	/** PRIVATE */
	constructor(
		supabase: SupabaseClient<Database>,
		tenant: string,
		families: Record<string, Family>,
		catalog: Record<string, CatalogEntry>,
		canvas: HTMLCanvasElement,
		controls: HTMLElement,
	) {
		this.supabase = supabase;
		this.tenant = tenant;
		this.families = families;
		this.catalog = catalog;

		this.#scene = new Scene();
		this.#camera = new PerspectiveCamera(CAMERA_FOV);
		this.#camera.position.set(100, 100, 100);
		this.#camera.lookAt(new Vector3());
		this.#pointer = new Vector2();

		this.handles = new HandleManager(this, this.#scene);
		this.reinitWebgl(canvas);
		this.reinitControls(controls);
		this.#raycaster = new Raycaster();

		Cache.enabled = true;
		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath('/');
		this.loader = new GLTFLoader();
		this.loader.setDRACOLoader(dracoLoader);

		const singleScene = new Scene();
		this.#scenes = {
			normal: { scene: this.#scene, objects: this.#objects, handles: this.handles },
			single: { scene: singleScene, objects: [], handles: new HandleManager(this, this.#scene) },
		};
	}

	/** PRIVATE */
	reinitWebgl(canvas: HTMLCanvasElement) {
		this.#webgl = new WebGLRenderer({ canvas, antialias: true });
		this.#webgl.setClearColor(0xffffff);
		this.#webgl.setPixelRatio(window.devicePixelRatio);
		this.#webgl.setAnimationLoop(() => {
			resizeCanvasToDisplaySize(this.#webgl, this.#camera);
			this.handles.update(this.#camera, this.#pointer);
			this.#webgl.render(this.#scene, this.#camera);
			this.#raycaster.setFromCamera(this.#pointer, this.#camera);
		});

		loadExr().then((texture) => {
			const pmremGenerator = new PMREMGenerator(this.#webgl);
			const envMap = pmremGenerator.fromEquirectangular(texture).texture;
			for (const scene of Object.values(this.#scenes)) scene.scene.environment = envMap;
			pmremGenerator.dispose();
		});
	}

	/** PRIVATE */
	reinitControls(controlsElement: HTMLElement): Renderer {
		const newControls = new OrbitControls(this.#camera, controlsElement);
		newControls.minZoom = 10;
		newControls.maxDistance = 1000;
		newControls.mouseButtons = {
			LEFT: MOUSE.PAN,
			MIDDLE: MOUSE.DOLLY,
			RIGHT: MOUSE.ROTATE,
		};

		if (controlsElement !== this.#controls?.domElement) {
			controlsElement.addEventListener('pointermove', (event) => {
				this.#pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
				this.#pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
			});
			controlsElement.addEventListener('pointerdown', () => {
				if (this.handles.visible && this.handles.hovering && this.#clickCallback) {
					if (this.handles.hovering.isDisabled)
						toast.error('Questo pezzo non può essere attaccato nella posizione richiesta');
					else if ((this.handles.hovering as HandleMesh).isHandle) {
						this.#clickCallback(this.handles.hovering as HandleMesh);
					} else if ((this.handles.hovering as LineHandleMesh).isLineHandle) {
						const hover = this.handles.hovering as LineHandleMesh;
						this.#clickCallback(hover);
					}
				} else {
					this.#raycaster.setFromCamera(this.#pointer, this.#camera);
					const intersectables = this.#objects
						.filter((obj) => obj.mesh)
						.map((obj) => obj.mesh) as Object3D[];
					const intersections = this.#raycaster.intersectObjects(intersectables);

					if (intersections[0]) {
						let intersection: Object3D | null = null;
						this.#objects.find((obj) => {
							obj.mesh?.traverse((child) => {
								if (child.uuid === intersections[0].object.uuid) intersection = obj.mesh;
							});
						});
						if (intersection === null) throw new Error('what?');

						const object = get(objects).find((o) => o.object?.mesh === intersection);
						if (object) focusSidebarElement(object);
					}
				}
			});
		}

		if (this.#controls !== undefined) {
			newControls.target.copy(this.#controls.target);
			this.#controls.dispose();
		}
		this.#controls = newControls;
		// setCameraLock(isCameraLocked);
		this.#controls.update();

		return this;
	}

	/** PRIVATE */
	getCanvasSize(): Vector2 {
		return new Vector2(this.#webgl.domElement.width, this.#webgl.domElement.height);
	}

	/** PRIVATE */
	getScene(): Scene {
		return this.#scene;
	}

	setScene(scene: 'normal' | 'single'): Renderer {
		this.#scene = this.#scenes[scene].scene;
		this.handles = this.#scenes[scene].handles;
		this.#objects = this.#scenes[scene].objects;
		return this;
	}

	resetScene(): Renderer {
		for (const element of this.#objects) {
			element.dispose(this.#scene);
		}

		for (const element of this.#helpers) {
			element.dispose();
			this.#scene.remove(element);
		}

		this.handles.clear();

		return this;
	}

	/**
	 * Set the background color of the scene
	 * @param color An hexadecimal number representing the color in RGB format
	 */
	setBackground(color: ColorRepresentation): Renderer {
		this.#scene.background = new Color(color);
		return this;
	}

	setCamera(
		controlsElement: HTMLElement,
		options: { is3d?: boolean; isOrtographic?: boolean },
	): Renderer {
		if (options.isOrtographic !== undefined) {
			if (options.isOrtographic) {
				const newCamera = new OrthographicCamera();
				newCamera.position.copy(this.#camera.position);
				newCamera.quaternion.copy(this.#camera.quaternion);
				newCamera.near = 0;
				newCamera.far = 1000;
				this.#camera = newCamera;
			} else {
				const newCamera = new PerspectiveCamera();
				newCamera.position.copy(this.#camera.position);
				newCamera.quaternion.copy(this.#camera.quaternion);
				newCamera.far = 10000;
				this.#camera = newCamera;
			}
			this.reinitControls(controlsElement);
		}

		if (options.is3d !== undefined && this.#controls !== undefined) {
			const is3d = options.is3d;

			if (is3d && this.#prevCameraPos !== undefined && this.#prevCameraQuaternion !== undefined) {
				this.#camera.position.copy(this.#prevCameraPos);
				this.#camera.quaternion.copy(this.#prevCameraQuaternion);
			}

			if (!is3d && this.#prevCameraPos === undefined && this.#prevCameraQuaternion === undefined) {
				this.#prevCameraPos = this.#camera.position.clone();
				this.#prevCameraQuaternion = this.#camera.quaternion.clone();
				this.#camera.position.set(0, 100, 0);
				this.#camera.lookAt(new Vector3());
			}

			if (is3d) {
				this.#controls.minPolarAngle = 0;
				this.#controls.maxDistance = Infinity;
			} else {
				this.#controls.minPolarAngle = Math.PI;
				this.#controls.maxDistance = 100;
			}
			this.#controls.update();
		}

		return this;
	}

	setClickCallback(callback: ((_: HandleMesh | LineHandleMesh) => any) | undefined) {
		this.#clickCallback = callback;
	}

	addTemporaryObject(): TemporaryObject {
		this.#objects.push(new TemporaryObject(this));
		this.frameObject(this.#objects[this.#objects.length - 1]);
		return this.#objects[this.#objects.length - 1];
	}

	addExtrudedObject(code: string, length: number): TemporaryObject {
		this.#objects.push(ExtrudedObject.init(this, code, length));
		this.frameObject(this.#objects[this.#objects.length - 1]);
		return this.#objects[this.#objects.length - 1];
	}

	async addObject(code: string): Promise<TemporaryObject> {
		const obj = await RendererObject.init(this, code);
		this.#objects.push(obj);
		this.frameObject(obj);
		return obj;
	}

	getObjects(): TemporaryObject[] {
		return this.#objects;
	}

	getObjectById(id: string): TemporaryObject | undefined {
		return this.#objects.find((obj) => obj.id === id);
	}

	frameObject(obj: TemporaryObject): TemporaryObject {
		if (!obj.mesh) return obj;

		const bbox = new Box3().setFromObject(obj.mesh);
		const center = bbox.getCenter(new Vector3());
		let bsphere = bbox.getBoundingSphere(new Sphere(center));
		bsphere.center.copy(center);

		var radius = bsphere.radius;
		var cog = obj.mesh.localToWorld(center.clone());
		var fov = CAMERA_FOV;
		this.#camera.position.set(
			cog.x,
			cog.y + (1.1 * radius) / Math.tan((fov * Math.PI) / 360),
			cog.z + (1.1 * radius) / Math.tan((fov * Math.PI) / 360),
		);
		this.#controls?.target.copy(center);
		this.#controls?.update();
		return obj;
	}

	removeObject(obj: TemporaryObject) {
		obj.detachAll();
		obj.dispose(this.#scene);
		if (this.#objects.indexOf(obj) > -1) this.#objects.splice(this.#objects.indexOf(obj), 1);
	}

	moveCamera(x: number, y: number, z: number) {
		const target = this.#controls?.target.clone() ?? new Vector3();
		this.#camera.position.copy(target.add({ x, y, z }));
		this.#controls?.update();
	}

	pointHelper(pos: Vector3Like, color: ColorRepresentation = 0xff0000) {
		const obj = new Mesh(new SphereGeometry(0.3), new MeshBasicMaterial({ color }));
		obj.position.copy(pos);
		this.#scene.add(obj);
		return obj;
	}

	arrowHelper(pos: Vector3Like, dir: Vector3, color: ColorRepresentation = 0xff0000) {
		const obj = new ArrowHelper(dir, new Vector3().copy(pos), 30, color);
		obj.renderOrder = 1;
		this.#scene.add(obj);
		this.#helpers.push(obj);
	}

	lineHelper(points: Vector3[], color: ColorRepresentation = 0xff0000) {
		const obj = new Line(
			new BufferGeometry().setFromPoints(points),
			new LineBasicMaterial({ color }),
		);
		obj.renderOrder = 1;
		this.#scene.add(obj);
		return obj;
	}

	angleHelper(angle: number): Vector3 {
		return new Vector3(-Math.sin(angle * DEG2RAD), 0, Math.cos(angle * DEG2RAD));
	}

	setOpacity(opacity: number) {
		for (const obj of this.#objects) obj.setOpacity(opacity);
	}
}
