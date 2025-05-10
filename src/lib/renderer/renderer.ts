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
	type Intersection,
	QuadraticBezierCurve3,
	BoxGeometry, 
	DoubleSide, 
	GridHelper, 
	Group, 
	MeshStandardMaterial, 
	PlaneGeometry,
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
	#virtualRoom: Group | null = null;

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
		
		// Crea la stanza virtuale
		this.createVirtualRoom();
	}

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
						let clickedObj: TemporaryObject | undefined;
						
						this.#objects.forEach((obj) => {
							obj.mesh?.traverse((child) => {
								if (child.uuid === intersections[0].object.uuid) {
									intersection = obj.mesh;
									clickedObj = obj;
								}
							});
						});
						
						if (intersection === null) throw new Error('what?');

						const sceneObject = get(objects).find((o) => o.object?.mesh === intersection);
						
						if (sceneObject) {
							const isLight = sceneObject.code.includes('XNRS') || sceneObject.code.includes('SP');
							
							if (isLight) {
								const parentProfiles = get(objects).filter(p => 
									p.subobjects.some(s => s.code === sceneObject.code)
								);
								
								if (parentProfiles.length > 0) {
									const parentProfile = parentProfiles[0];
									const lightIndex = parentProfile.subobjects.findIndex(s => s.code === sceneObject.code);
									
									if (lightIndex >= 0) {
										const light = parentProfile.subobjects[lightIndex];
										const lightFamily = Object.values(this.families).find(f => 
											f.items.some(i => i.code === light.code)
										);
										
										if (lightFamily && parentProfile.object) {
											parentProfile.subobjects = parentProfile.subobjects.toSpliced(lightIndex, 1);
											
											const profileId = parentProfile.object.id;
											window.location.href = `/${this.tenant}/${lightFamily.system}/add?` + new URLSearchParams({
												chosenFamily: lightFamily.code,
												chosenItem: light.code,
												reference: JSON.stringify({ typ: 'line', id: profileId, junction: 0 }),
											}).toString();
											return;
										}
									}
								}
							} else {
								for (let i = 0; i < sceneObject.subobjects.length; i++) {
									const subitem = sceneObject.subobjects[i];
									const isSubLight = subitem.code.includes('XNRS') || subitem.code.includes('SP');
									
									if (isSubLight && clickedObj) {
										const light = sceneObject.subobjects[i];
										const lightFamily = Object.values(this.families).find(f => 
											f.items.some(i => i.code === light.code)
										);
										
										if (lightFamily) {
											sceneObject.subobjects = sceneObject.subobjects.toSpliced(i, 1);
											
											const profileId = sceneObject.object!.id;
											window.location.href = `/${this.tenant}/${lightFamily.system}/add?` + new URLSearchParams({
												chosenFamily: lightFamily.code,
												chosenItem: light.code,
												reference: JSON.stringify({ typ: 'line', id: profileId, junction: 0 }),
											}).toString();
											return;
										}
									}
								}
							}
							
							focusSidebarElement(sceneObject);
						}
					}
				}
			});
		}

		if (this.#controls !== undefined) {
			newControls.target.copy(this.#controls.target);
			this.#controls.dispose();
		}
		this.#controls = newControls;
		this.#controls.update();

		return this;
	}

	getLights(): TemporaryObject[] {
		return this.#objects.filter(obj => {
			const isLight = obj.getCatalogEntry().code.includes('XNRS') || 
						obj.getCatalogEntry().code.includes('SP');
			return isLight;
		});
	}

	/**
	 * Versione migliorata di moveLight
	 * @param lightObj L'oggetto luce da spostare
	 * @param position La posizione lungo la curva (0-1)
	 * @returns True se lo spostamento è riuscito
	 */
	moveLight(lightObj: TemporaryObject, position: number): boolean {
		const isLight = lightObj.getCatalogEntry().code.includes('XNRS') || 
						lightObj.getCatalogEntry().code.includes('SP');
		
		if (!isLight || !lightObj.mesh) {
		console.error("Non è una luce valida o non ha un mesh");
		toast.error("Oggetto non valido per lo spostamento");
		return false;
		}

		const directResult = lightObj.moveLight(position);
		if (directResult !== null) {
		return true;
		}
		
		console.log("Spostamento diretto fallito, tentativo con reset delle connessioni");

		lightObj.resetConnections();

		const fallbackProfile = this.#objects.find(obj => 
		obj !== lightObj && 
		!obj.getCatalogEntry().code.includes('XNRS') && 
		!obj.getCatalogEntry().code.includes('SP') &&
		obj.getCatalogEntry().line_juncts.length > 0 &&
		obj.mesh
		);
		
		if (!fallbackProfile) {
		console.error("Nessun profilo disponibile per la luce");
		toast.error("Nessun profilo disponibile per la luce");
		return false;
		}
		
		console.log("Tentativo di riconnessione con profilo:", fallbackProfile.getCatalogEntry().code);

		try {
		const lineJunct = fallbackProfile.getCatalogEntry().line_juncts[0];
		const midPoint = new Vector3()
			.copy(lineJunct.point1)
			.add(lineJunct.point2)
			.multiplyScalar(0.5);

		fallbackProfile.attachLine(lightObj, midPoint, true);

		const finalResult = lightObj.moveLight(position);
		if (finalResult === null) {
			console.error("Fallimento anche dopo reset e riconnessione");
			toast.error("Impossibile spostare la luce");
			return false;
		}
		
		return true;
		} catch (error) {
		console.error("Errore durante la riconnessione della luce:", error);
		toast.error("Impossibile spostare la luce");
		return false;
		}
	}

	highlightLight(lightObj: TemporaryObject | null): void {
		this.setOpacity(1);
		
		if (lightObj) {
			for (const obj of this.#objects) {
				if (obj !== lightObj) {
					obj.setOpacity(0.4);
				}
			}
			
			lightObj.setOpacity(1);
			this.frameObject(lightObj);
		}
	}

	/**
	 * Trova un profilo valido per una luce
	 * @param lightObj L'oggetto luce
	 * @returns Un array con [profilo, indice giunzione] o [null, -1] se non trovato
	 */
	findValidProfileForLight(lightObj: TemporaryObject): [TemporaryObject | null, number] {
		const junctions = lightObj.getJunctions();
		for (let j = 0; j < junctions.length; j++) {
		const junction = junctions[j];
		if (junction !== null) {
			for (let i = 0; i < junction.getLineJunctions().length; i++) {
			if (junction.getLineJunctions()[i] === lightObj) {
				return [junction, i];
			}
			}
		}
		}

	for (const obj of this.#objects) {
		if (obj === lightObj) continue;

		const isProfile = !obj.getCatalogEntry().code.includes('XNRS') && 
							!obj.getCatalogEntry().code.includes('SP');
							
		if (isProfile && obj.getCatalogEntry().line_juncts.length > 0 && obj.mesh) {
			for (let i = 0; i < obj.getLineJunctions().length; i++) {
			if (obj.getLineJunctions()[i] === null || obj.getLineJunctions()[i] === lightObj) {
				return [obj, i];
			}
			}
		}
		}
		return [null, -1];
	}

	getLightMovementDirection(lightObj: TemporaryObject): boolean {
		if (!lightObj || !lightObj.mesh) {
		  return false;
		}
	  
		const parentProfile = this.findParentProfileForLight(lightObj);
		if (!parentProfile || !parentProfile.mesh) {
		  return false;
		}
	  
		const junctionId = this.findJunctionIdForProfile(parentProfile, lightObj);
		if (junctionId < 0) return false;
		
		const curveData = parentProfile.getCatalogEntry().line_juncts[junctionId];
		if (!curveData) return false;

		const curve = new QuadraticBezierCurve3(
		  parentProfile.mesh.localToWorld(new Vector3().copy(curveData.point1)),
		  parentProfile.mesh.localToWorld(new Vector3().copy(curveData.pointC)),
		  parentProfile.mesh.localToWorld(new Vector3().copy(curveData.point2))
		);

		const curPos = lightObj.getCurvePosition();
		const tangent = curve.getTangentAt(curPos);
		const cameraRight = new Vector3(1, 0, 0).applyQuaternion(this.#camera.quaternion);

		return tangent.dot(cameraRight) < 0;
	  }
  
	/**
	 * Find the parent profile object for a light
	 * @param lightObj The light object
	 * @return The parent profile or null if not found
	 */
	findParentProfileForLight(lightObj: TemporaryObject): TemporaryObject | null {
		for (let j = 0; j < lightObj.getJunctions().length; j++) {
		const junction = lightObj.getJunctions()[j];
		if (junction !== null) {
			for (let i = 0; i < junction.getLineJunctions().length; i++) {
			if (junction.getLineJunctions()[i] === lightObj) {
				return junction;
			}
			}
		}
		}

		for (const obj of this.getObjects()) {
		if (obj === lightObj) continue;

		const isProfile = !obj.getCatalogEntry().code.includes('XNRS') && 
						!obj.getCatalogEntry().code.includes('SP');
		
		if (isProfile && obj.getCatalogEntry().line_juncts.length > 0) {
			for (let i = 0; i < obj.getLineJunctions().length; i++) {
			if (obj.getLineJunctions()[i] === lightObj) {
				return obj;
			}
			}
		}
		}
		
		return null;
	}
  
	/**
	* Find the junction ID that connects a profile to a light
	* @param profileObj The profile object
	* @param lightObj The light object
	* @return The junction ID or -1 if not found
	*/
	findJunctionIdForProfile(profileObj: TemporaryObject, lightObj: TemporaryObject): number {
		if (!profileObj || !lightObj) return -1;
		
		for (let i = 0; i < profileObj.getLineJunctions().length; i++) {
		if (profileObj.getLineJunctions()[i] === lightObj) {
			return i;
		}
		}
		
		return -1;
	}

	raycast(pointer: Vector2, objects: Object3D[]): Intersection[] {
		const localRaycaster = new Raycaster();
		localRaycaster.setFromCamera(pointer, this.#camera);
		return localRaycaster.intersectObjects(objects, true);
	}

	getCanvasSize(): Vector2 {
		return new Vector2(this.#webgl.domElement.width, this.#webgl.domElement.height);
	}

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
		
		// Ricrea la stanza virtuale dopo aver ripulito la scena
		this.createVirtualRoom();

		return this;
	}

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
		
		// Aggiorna la stanza virtuale per centrarla rispetto agli oggetti
		this.updateVirtualRoom();
		
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

		const isProfile = obj.getCatalogEntry().line_juncts && 
                     obj.getCatalogEntry().line_juncts.length > 0;
    
		if (!isProfile) return obj;
		
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
		
		// Aggiorna la stanza virtuale
		this.updateVirtualRoom();
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
	
	/**
 * Crea una stanza virtuale con pareti semitrasparenti
 * @param size Dimensione della stanza in metri (default: 3x3x3)
 * @param centered Se true, centra la stanza rispetto agli oggetti nella scena
 */
createVirtualRoom(size: number = 3, centered: boolean = true): Renderer {
	// Rimuovi la stanza precedente se esiste
	if (this.#virtualRoom) {
	  this.#scene.remove(this.#virtualRoom);
	  this.#virtualRoom = null;
	}
  
	// Crea un nuovo gruppo per la stanza
	const room = new Group();
	this.#virtualRoom = room;
	
	// Imposta il materiale per le pareti
	const material = new MeshStandardMaterial({
	  color: 0xf0f0f0,
	  transparent: true,
	  opacity: 0.15,
	  side: DoubleSide,
	  depthWrite: false
	});
  
	// Calcola il centro e le dimensioni
	let center = new Vector3(0, 0, 0);
	
	// Dopo l'analisi dell'immagine, sembra che la scala effettiva sia circa 1 unità = 0.6cm
	// Quindi per una stanza di 3 metri, dobbiamo usare 3m / 0.006m = 500 unità
	const scaleFactor = 60; // Regolato per ottenere proporzioni corrette
	const roomSize = size * scaleFactor;
	
	if (centered && this.#objects.length > 0) {
	  // Calcola il bounding box di tutti gli oggetti
	  const bbox = new Box3();
	  
	  this.#objects.forEach(obj => {
		if (obj.mesh) {
		  bbox.expandByObject(obj.mesh);
		}
	  });
	  
	  // Ottieni il centro
	  center = bbox.getCenter(new Vector3());
	  
	  // Assicurati che il pavimento sia allineato con il fondo degli oggetti
	  const minY = bbox.min.y;
	  center.y = minY + roomSize / 2;
	} else {
	  // Se non centrata, posiziona il fondo della stanza a y=0
	  center.y = roomSize / 2;
	}
  
	// Crea le pareti (usando piani invece che un cubo per avere solo le facce esterne)
	const halfSize = roomSize / 2;
	
	// Pavimento
	const floor = new Mesh(
	  new PlaneGeometry(roomSize, roomSize),
	  new MeshStandardMaterial({
		color: 0xf5f5f5,
		transparent: true,
		opacity: 0.3,
		side: DoubleSide
	  })
	);
	floor.rotation.x = Math.PI / 2;
	floor.position.set(center.x, center.y - halfSize, center.z);
	room.add(floor);
	
	// Soffitto
	const ceiling = new Mesh(
	  new PlaneGeometry(roomSize, roomSize),
	  material.clone()
	);
	ceiling.rotation.x = Math.PI / 2;
	ceiling.position.set(center.x, center.y + halfSize, center.z);
	room.add(ceiling);
	
	// Pareti
	// Parete front
	const wallFront = new Mesh(
	  new PlaneGeometry(roomSize, roomSize),
	  material.clone()
	);
	wallFront.position.set(center.x, center.y, center.z + halfSize);
	room.add(wallFront);
	
	// Parete back
	const wallBack = new Mesh(
	  new PlaneGeometry(roomSize, roomSize),
	  material.clone()
	);
	wallBack.position.set(center.x, center.y, center.z - halfSize);
	wallBack.rotation.y = Math.PI;
	room.add(wallBack);
	
	// Parete left
	const wallLeft = new Mesh(
	  new PlaneGeometry(roomSize, roomSize),
	  material.clone()
	);
	wallLeft.position.set(center.x - halfSize, center.y, center.z);
	wallLeft.rotation.y = Math.PI / 2;
	room.add(wallLeft);
	
	// Parete right
	const wallRight = new Mesh(
	  new PlaneGeometry(roomSize, roomSize),
	  material.clone()
	);
	wallRight.position.set(center.x + halfSize, center.y, center.z);
	wallRight.rotation.y = -Math.PI / 2;
	room.add(wallRight);
  
	// Aggiungi la griglia sul pavimento
	const gridHelper = new GridHelper(roomSize, 10, 0x888888, 0xcccccc);
	gridHelper.position.set(center.x, center.y - halfSize + 0.01, center.z); // Leggermente sopra il pavimento
	room.add(gridHelper);
	
	// Aggiungi la stanza alla scena
	this.#scene.add(room);
	
	return this;
  }

	/**
	 * Aggiorna la posizione della stanza virtuale in base agli oggetti nella scena
	 */
	updateVirtualRoom(): Renderer {
	  if (this.#virtualRoom && this.#objects.length > 0) {
		this.createVirtualRoom(3, true);
	  }
	  return this;
	}

	/**
	 * Imposta la visibilità della stanza virtuale
	 * @param visible Se true, mostra la stanza virtuale; se false, la nasconde
	 */
	setVirtualRoomVisible(visible: boolean): Renderer {
	  if (this.#virtualRoom) {
		this.#virtualRoom.visible = visible;
	  } else if (visible) {
		// Se la stanza non esiste ma la visibilità è richiesta, creala
		this.createVirtualRoom();
	  }
	  return this;
	}

	/**
	 * Controlla se la stanza virtuale è attualmente visibile
	 */
	isVirtualRoomVisible(): boolean {
	  return this.#virtualRoom !== null && this.#virtualRoom.visible;
	}

	/**
	 * Modifica le dimensioni della stanza virtuale
	 * @param size Nuova dimensione della stanza in metri
	 */
	resizeVirtualRoom(size: number): Renderer {
	  return this.createVirtualRoom(size, true);
	}
}