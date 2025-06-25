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
	MeshStandardMaterial,
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

interface RoomDimensions {
	width: number;
	height: number;
	depth: number;
}

class RendererUtils {
	static isLight(obj: TemporaryObject): boolean {
		const code = obj.getCatalogEntry().code;
		return code.includes('XNRS') || code.includes('SP');
	}

	static isProfile(obj: TemporaryObject): boolean {
		const entry = obj.getCatalogEntry();
		return entry.line_juncts && entry.line_juncts.length > 0;
	}

	static getMinDistanceForLight(lightCode: string): number {
		if (lightCode.includes('XNRS01')) return 0.06;
		if (lightCode.includes('XNRS14')) return 0.08;
		if (lightCode.includes('XNRS31')) return 0.10;
		if (lightCode.includes('SP')) return 0.08;
		return 0.08;
	}
}

class LightManager {
	private renderer: Renderer;
	private feedbackIndicator: Mesh | null = null;

	constructor(renderer: Renderer) {
		this.renderer = renderer;
	}

	getLights(): TemporaryObject[] {
		return this.renderer.getObjects().filter(obj => RendererUtils.isLight(obj));
	}

	moveLight(lightObj: TemporaryObject, position: number): boolean {
		if (!RendererUtils.isLight(lightObj) || !lightObj.mesh) {
			toast.error("Oggetto non valido per lo spostamento");
			return false;
		}

		const directResult = lightObj.moveLight(position);
		if (directResult !== null) {
			return true;
		}
		
		lightObj.resetConnections();

		const fallbackProfile = this.renderer.getObjects().find(obj => 
			obj !== lightObj && 
			RendererUtils.isProfile(obj) &&
			obj.mesh
		);
		
		if (!fallbackProfile) {
			toast.error("Nessun profilo disponibile per la luce");
			return false;
		}
		
		try {
			const lineJunct = fallbackProfile.getCatalogEntry().line_juncts[0];
			const midPoint = new Vector3()
				.copy(lineJunct.point1)
				.add(lineJunct.point2)
				.multiplyScalar(0.5);

			fallbackProfile.attachLine(lightObj, midPoint, true);

			const finalResult = lightObj.moveLight(position);
			if (finalResult === null) {
				toast.error("Impossibile spostare la luce");
				return false;
			}
			
			return true;
		} catch (error) {
			toast.error("Impossibile spostare la luce");
			return false;
		}
	}

	isValidLightPosition(profileObj: TemporaryObject, lightObj: TemporaryObject, position: number): boolean {
		if (!RendererUtils.isLight(lightObj)) return true;

		const thisLightMinDist = RendererUtils.getMinDistanceForLight(lightObj.getCatalogEntry().code);
		const existingLights = this.getExistingLightsOnProfile(profileObj, lightObj);

		for (const existingLight of existingLights) {
			const existingPos = existingLight.getCurvePosition();
			const existingMinDist = RendererUtils.getMinDistanceForLight(existingLight.getCatalogEntry().code);
			const requiredDistance = Math.max(thisLightMinDist, existingMinDist);
			
			if (Math.abs(position - existingPos) < requiredDistance) {
				return false;
			}
		}

		return true;
	}

	findNearestValidLightPosition(profileObj: TemporaryObject, lightObj: TemporaryObject, desiredPosition: number): number {
		const minPos = 0.02;
		const maxPos = 0.98;
		
		if (this.isValidLightPosition(profileObj, lightObj, desiredPosition)) {
			return Math.max(minPos, Math.min(maxPos, desiredPosition));
		}

		const thisLightMinDist = RendererUtils.getMinDistanceForLight(lightObj.getCatalogEntry().code);
		const existingPositions = this.getExistingLightsOnProfile(profileObj, lightObj)
			.map(light => light.getCurvePosition())
			.sort((a, b) => a - b);

		let bestPosition = desiredPosition;
		let minDistanceToDesired = Infinity;

		for (let i = 0; i <= existingPositions.length; i++) {
			let spaceStart = i === 0 ? minPos : existingPositions[i - 1] + thisLightMinDist;
			let spaceEnd = i === existingPositions.length ? maxPos : existingPositions[i] - thisLightMinDist;
			
			if (spaceEnd > spaceStart) {
				let candidatePosition = Math.max(spaceStart, Math.min(spaceEnd, desiredPosition));
				let distanceToDesired = Math.abs(candidatePosition - desiredPosition);
				
				if (distanceToDesired < minDistanceToDesired) {
					minDistanceToDesired = distanceToDesired;
					bestPosition = candidatePosition;
				}
			}
		}

		return bestPosition;
	}

	updateLightPositionFeedback(lightObj: TemporaryObject | null, position: number): void {
		this.clearLightPositionFeedback();

		if (!lightObj) return;

		const parentProfile = this.findParentProfileForLight(lightObj);
		if (!parentProfile) return;

		const isValidPosition = this.isValidLightPosition(parentProfile, lightObj, position);
		const indicatorColor = isValidPosition ? 0x00ff00 : 0xff0000;
		const indicator = new Mesh(
			new SphereGeometry(0.8, 16, 16),
			new MeshBasicMaterial({ 
				color: indicatorColor, 
				transparent: true, 
				opacity: 0.7,
				depthTest: false 
			})
		);
		indicator.renderOrder = 10;

		if (parentProfile.mesh) {
			const junctionId = this.findJunctionIdForProfile(parentProfile, lightObj);
			const curveData = parentProfile.getCatalogEntry().line_juncts[junctionId];
			
			if (curveData) {
				const curve = new QuadraticBezierCurve3(
					parentProfile.mesh.localToWorld(new Vector3().copy(curveData.point1)),
					parentProfile.mesh.localToWorld(new Vector3().copy(curveData.pointC)),
					parentProfile.mesh.localToWorld(new Vector3().copy(curveData.point2))
				);
				
				const indicatorPosition = curve.getPointAt(position);
				indicator.position.copy(indicatorPosition);
				indicator.position.y += 2;
			}
		}
		this.feedbackIndicator = indicator;
		this.renderer.getScene().add(indicator);
	}

	clearLightPositionFeedback(): void {
		if (this.feedbackIndicator) {
			this.renderer.getScene().remove(this.feedbackIndicator);

			if (Array.isArray(this.feedbackIndicator.material)) {
				this.feedbackIndicator.material.forEach(mat => mat.dispose());
			} else {
				this.feedbackIndicator.material.dispose();
			}
			
			this.feedbackIndicator.geometry.dispose();
			this.feedbackIndicator = null;
		}
	}

	highlightLight(lightObj: TemporaryObject | null): void {
		this.renderer.setOpacity(1);
		
		if (lightObj) {
			for (const obj of this.renderer.getObjects()) {
				if (obj !== lightObj) {
					obj.setOpacity(0.4);
				}
			}
			
			lightObj.setOpacity(1);
			this.renderer.frameObject(lightObj);
		}
	}

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

		for (const obj of this.renderer.getObjects()) {
			if (obj === lightObj) continue;

			if (RendererUtils.isProfile(obj) && obj.mesh) {
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
		if (!lightObj?.mesh) return false;

		const parentProfile = this.findParentProfileForLight(lightObj);
		if (!parentProfile?.mesh) return false;

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
		const cameraRight = new Vector3(1, 0, 0).applyQuaternion(this.renderer.getCamera().quaternion);

		return tangent.dot(cameraRight) < 0;
	}

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

		for (const obj of this.renderer.getObjects()) {
			if (obj === lightObj) continue;

			if (RendererUtils.isProfile(obj)) {
				for (let i = 0; i < obj.getLineJunctions().length; i++) {
					if (obj.getLineJunctions()[i] === lightObj) {
						return obj;
					}
				}
			}
		}
		
		return null;
	}

	findJunctionIdForProfile(profileObj: TemporaryObject, lightObj: TemporaryObject): number {
		if (!profileObj || !lightObj) return -1;
		
		for (let i = 0; i < profileObj.getLineJunctions().length; i++) {
			if (profileObj.getLineJunctions()[i] === lightObj) {
				return i;
			}
		}
		
		return -1;
	}

	private getExistingLightsOnProfile(profileObj: TemporaryObject, excludeLight: TemporaryObject): TemporaryObject[] {
		const existingLights: TemporaryObject[] = [];
		
		for (const obj of this.renderer.getObjects()) {
			if (obj === excludeLight || !RendererUtils.isLight(obj)) continue;
			
			for (let j = 0; j < obj.getJunctions().length; j++) {
				if (obj.getJunctions()[j] === profileObj) {
					existingLights.push(obj);
					break;
				}
			}
		}

		return existingLights;
	}
}

class VirtualRoomManager {
	initializeWithStoredDimensions(initialDimensions: { width: number; height: number; depth: number; }) {
		throw new Error('Method not implemented.');
	}
	private renderer: Renderer;
	private scene: Scene;
	private virtualRoom: Group | null = null;
	private currentDimensions: RoomDimensions = { width: 3, height: 3, depth: 3 };
	virtualRoomManager: any;

	constructor(renderer: Renderer, scene: Scene) {
		this.renderer = renderer;
		this.scene = scene;
	}

	getCurrentDimensions(): RoomDimensions {
		return { ...this.currentDimensions };
	}

	setCurrentDimensions(dimensions: RoomDimensions): void {
		this.currentDimensions = dimensions;
	}

	initializeVirtualRoomWithDimensions(dimensions: RoomDimensions): void {
		this.virtualRoomManager.setCurrentDimensions(dimensions);
		this.virtualRoomManager.createRoom(dimensions, false, false);
	}

	createRoom(dimensions: number | RoomDimensions = this.currentDimensions, centered: boolean = true, visible: boolean = false): void {
		this.removeRoom();
	
		const room = new Group();
		this.virtualRoom = room;
		room.visible = visible;
	
		const material = new MeshStandardMaterial({
			color: 0xf0f0f0,
			transparent: true,
			opacity: 0.15,
			side: DoubleSide,
			depthWrite: false
		});
	
		let center = new Vector3(0, 0, 0);
		const scaleFactor = 25;
		
		let roomWidth: number, roomHeight: number, roomDepth: number;
		
		if (typeof dimensions === 'number') {
			roomWidth = roomHeight = roomDepth = dimensions * scaleFactor;
		} else {
			roomWidth = dimensions.width * scaleFactor;
			roomHeight = dimensions.height * scaleFactor;
			roomDepth = dimensions.depth * scaleFactor;
			
			this.currentDimensions = { ...dimensions };
		}
		
		if (centered && this.renderer.getObjects().length > 0) {
			const bbox = new Box3();
			
			this.renderer.getObjects().forEach((obj, index) => {
				if (obj.mesh) {
					bbox.expandByObject(obj.mesh);
				}
			});
	
			const systemCenter = bbox.getCenter(new Vector3());
			const FLOOR_OFFSET = 50.0;
			
			center.x = systemCenter.x;
			center.z = systemCenter.z;
			center.y = systemCenter.y + FLOOR_OFFSET;

		} else {
			center.y = -roomHeight / 2;
		}
	
		this.addRoomSurfaces(room, center, roomWidth, roomHeight, roomDepth, material);
		this.addGridHelpers(room, center, roomWidth, roomHeight, roomDepth);
		
		this.scene.add(room);
	}
	
	private addRoomSurfaces(room: Group, center: Vector3, width: number, height: number, depth: number, material: MeshStandardMaterial): void {
		const ceiling = new Mesh(
			new PlaneGeometry(width, depth),
			new MeshStandardMaterial({
				color: 0xf5f5f5,
				transparent: true,
				opacity: 0.1,
				side: DoubleSide,
				depthWrite: false
			})
		);
		ceiling.renderOrder = -1;
		ceiling.rotation.x = Math.PI / 2;
		ceiling.position.set(center.x, center.y + height / 2, center.z);
		room.add(ceiling);
	
		const floor = new Mesh(new PlaneGeometry(width, depth), material.clone());
		floor.rotation.x = Math.PI / 2;
		floor.position.set(center.x, center.y - height / 2, center.z);
		room.add(floor);
	
		const wallBack = new Mesh(new PlaneGeometry(width, height), material.clone());
		wallBack.position.set(center.x, center.y, center.z - depth / 2);
		wallBack.rotation.y = Math.PI;
		room.add(wallBack);
	
		const wallLeft = new Mesh(new PlaneGeometry(depth, height), material.clone());
		wallLeft.position.set(center.x - width / 2, center.y, center.z);
		wallLeft.rotation.y = Math.PI / 2;
		room.add(wallLeft);
	
		const wallRight = new Mesh(new PlaneGeometry(depth, height), material.clone());
		wallRight.position.set(center.x + width / 2, center.y, center.z);
		wallRight.rotation.y = -Math.PI / 2;
		room.add(wallRight);
	}

	update(): void {
		if (this.virtualRoom && this.renderer.getObjects().length > 0) {
			this.createRoom(this.currentDimensions, false, this.virtualRoom.visible);
		}
	}

	updateWithCentering(): void {
		if (this.virtualRoom && this.renderer.getObjects().length > 0) {
			this.createRoom(this.currentDimensions, true, this.virtualRoom.visible);
		}
	}

	setVisible(visible: boolean): void {
		if (this.virtualRoom) {
			this.virtualRoom.visible = visible;
		} else if (visible) {
			this.createRoom(this.currentDimensions, false, true);
		}
	}

	isVisible(): boolean {
		return this.virtualRoom !== null && this.virtualRoom.visible;
	}

	resize(dimensions: number | RoomDimensions): void {
		const isVisible = this.virtualRoom?.visible ?? false;
		const shouldCenter = this.renderer.getObjects().length > 0;
		this.createRoom(dimensions, shouldCenter, isVisible);
	}

	private removeRoom(): void {
		if (this.virtualRoom) {
			this.scene.remove(this.virtualRoom);
			this.virtualRoom = null;
		}
	}

	private addGridHelpers(room: Group, center: Vector3, width: number, height: number, depth: number): void {
		const gridDivisions = 10;
		
		const gridHelperCeiling = new GridHelper(Math.max(width, depth), gridDivisions, 0x888888, 0xcccccc);
		gridHelperCeiling.scale.set(
			width / Math.max(width, depth),
			1,
			depth / Math.max(width, depth)
		);
		gridHelperCeiling.position.set(center.x, center.y + height / 2 - 0.01, center.z);
		gridHelperCeiling.rotation.x = Math.PI;
		room.add(gridHelperCeiling);

		const gridHelperFloor = new GridHelper(Math.max(width, depth), gridDivisions, 0x888888, 0xcccccc);
		gridHelperFloor.scale.set(
			width / Math.max(width, depth),
			1,
			depth / Math.max(width, depth)
		);
		gridHelperFloor.position.set(center.x, center.y - height / 2 + 0.01, center.z);
		room.add(gridHelperFloor);
	}
}

class ObjectClickHandler {
	private renderer: Renderer;
	private lightManager: LightManager;

	constructor(renderer: Renderer, lightManager: LightManager) {
		this.renderer = renderer;
		this.lightManager = lightManager;
	}

	handleClick(intersections: Intersection[]): void {
		if (!intersections[0]) return;

		let intersection: Object3D | null = null;
		let clickedObj: TemporaryObject | undefined;
		
		this.renderer.getObjects().forEach((obj) => {
			obj.mesh?.traverse((child) => {
				if (child.uuid === intersections[0].object.uuid) {
					intersection = obj.mesh;
					clickedObj = obj;
				}
			});
		});
		
		if (intersection === null) throw new Error('Intersection object not found');

		const sceneObject = get(objects).find((o) => o.object?.mesh === intersection);
		
		if (sceneObject) {
			const isLight = RendererUtils.isLight(sceneObject.object!);
			
			if (isLight) {
				this.handleLightClick(sceneObject);
			} else {
				this.handleProfileClick(sceneObject, clickedObj);
			}
		}
	}

	private handleLightClick(sceneObject: any): void {
		const parentProfiles = get(objects).filter(p => 
			p.subobjects.some(s => s.code === sceneObject.code)
		);
		
		if (parentProfiles.length > 0) {
			const parentProfile = parentProfiles[0];
			const lightIndex = parentProfile.subobjects.findIndex(s => s.code === sceneObject.code);
			
			if (lightIndex >= 0) {
				const light = parentProfile.subobjects[lightIndex];
				const lightFamily = Object.values(this.renderer.families).find(f => 
					f.items.some(i => i.code === light.code)
				);
				
				if (lightFamily && parentProfile.object) {
					parentProfile.subobjects = parentProfile.subobjects.toSpliced(lightIndex, 1);
					
					const profileId = parentProfile.object.id;
					this.navigateToLightPage(lightFamily, light.code, profileId);
					return;
				}
			}
		}
		
		focusSidebarElement(sceneObject);
	}

	private handleProfileClick(sceneObject: any, clickedObj: TemporaryObject | undefined): void {
		for (let i = 0; i < sceneObject.subobjects.length; i++) {
			const subitem = sceneObject.subobjects[i];
			const isSubLight = RendererUtils.isLight({ getCatalogEntry: () => ({ code: subitem.code }) } as TemporaryObject);
			
			if (isSubLight && clickedObj) {
				const light = sceneObject.subobjects[i];
				const lightFamily = Object.values(this.renderer.families).find(f => 
					f.items.some(i => i.code === light.code)
				);
				
				if (lightFamily) {
					sceneObject.subobjects = sceneObject.subobjects.toSpliced(i, 1);
					
					const profileId = sceneObject.object!.id;
					this.navigateToLightPage(lightFamily, light.code, profileId);
					return;
				}
			}
		}
		
		focusSidebarElement(sceneObject);
	}

	private navigateToLightPage(lightFamily: Family, lightCode: string, profileId: string): void {
		window.location.href = `/${this.renderer.tenant}/${lightFamily.system}/add?` + new URLSearchParams({
			chosenFamily: lightFamily.code,
			chosenItem: lightCode,
			reference: JSON.stringify({ typ: 'line', id: profileId, junction: 0 }),
		}).toString();
	}
}

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
	
	private lightManager: LightManager;
	private virtualRoomManager: VirtualRoomManager;
	private clickHandler: ObjectClickHandler;

	#webgl!: WebGLRenderer;
	#scene: Scene;
	#camera: Camera;
	#controls: OrbitControls | undefined;
	#prevCameraPos: Vector3 | undefined;
	#prevCameraQuaternion: Quaternion | undefined;
	#pointer: Vector2;
	#helpers: ArrowHelper[] = [];
	#systemOffset: Vector3 = new Vector3(0, 0, 0);
	#originalPositions: Map<string, Vector3> = new Map();
	#hasBeenCentered: boolean = false;
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
		if (!RENDERER) {
			RENDERER = new Renderer(
				data.supabase,
				data.tenant,
				data.families,
				data.catalog,
				canvas,
				controls,
			);
		} else {
			const wasVirtualRoomVisible = RENDERER.virtualRoomManager.isVisible();
			const currentDimensions = RENDERER.virtualRoomManager.getCurrentDimensions();
			
			RENDERER.#webgl.dispose();
			RENDERER.reinitWebgl(canvas);
			RENDERER.reinitControls(controls);

			if (wasVirtualRoomVisible) {
				RENDERER.virtualRoomManager.createRoom(currentDimensions, true, true);
			}
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
		this.lightManager = new LightManager(this);
		this.virtualRoomManager = new VirtualRoomManager(this, this.#scene);
		this.clickHandler = new ObjectClickHandler(this, this.lightManager);

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

	getCurrentRoomDimensions(): RoomDimensions {
		return this.virtualRoomManager.getCurrentDimensions();
	}

	getCamera(): Camera {
		return this.#camera;
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
			this.setupControlEvents(controlsElement);
		}

		if (this.#controls !== undefined) {
			newControls.target.copy(this.#controls.target);
			this.#controls.dispose();
		}
		this.#controls = newControls;
		this.#controls.update();

		return this;
	}

	private setupControlEvents(controlsElement: HTMLElement): void {
		controlsElement.addEventListener('pointermove', (event) => {
			this.#pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
			this.#pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
		});

		controlsElement.addEventListener('pointerdown', () => {
			if (this.handles.visible && this.handles.hovering && this.#clickCallback) {
				this.handleHandleClick();
			} else {
				this.handleObjectClick();
			}
		});
	}

	private handleHandleClick(): void {
		if (!this.handles.hovering) return;

		if (this.handles.hovering.isDisabled) {
			toast.error('Questo pezzo non può essere attaccato nella posizione richiesta');
		} else if ((this.handles.hovering as HandleMesh).isHandle) {
			this.#clickCallback!(this.handles.hovering as HandleMesh);
		} else if ((this.handles.hovering as LineHandleMesh).isLineHandle) {
			this.#clickCallback!(this.handles.hovering as LineHandleMesh);
		}
	}

	private handleObjectClick(): void {
		this.#raycaster.setFromCamera(this.#pointer, this.#camera);
		const intersectables = this.#objects
			.filter((obj) => obj.mesh)
			.map((obj) => obj.mesh) as Object3D[];
		const intersections = this.#raycaster.intersectObjects(intersectables);

		if (intersections[0]) {
			this.clickHandler.handleClick(intersections);
		}
	}

	getLights(): TemporaryObject[] {
		return this.lightManager.getLights();
	}

	moveLight(lightObj: TemporaryObject, position: number): boolean {
		return this.lightManager.moveLight(lightObj, position);
	}

	isValidLightPosition(profileObj: TemporaryObject, lightObj: TemporaryObject, position: number): boolean {
		return this.lightManager.isValidLightPosition(profileObj, lightObj, position);
	}

	findNearestValidLightPosition(profileObj: TemporaryObject, lightObj: TemporaryObject, desiredPosition: number): number {
		return this.lightManager.findNearestValidLightPosition(profileObj, lightObj, desiredPosition);
	}

	updateLightPositionFeedback(lightObj: TemporaryObject | null, position: number): void {
		this.lightManager.updateLightPositionFeedback(lightObj, position);
	}

	clearLightPositionFeedback(): void {
		this.lightManager.clearLightPositionFeedback();
	}

	highlightLight(lightObj: TemporaryObject | null): void {
		this.lightManager.highlightLight(lightObj);
	}

	findValidProfileForLight(lightObj: TemporaryObject): [TemporaryObject | null, number] {
		return this.lightManager.findValidProfileForLight(lightObj);
	}

	getLightMovementDirection(lightObj: TemporaryObject): boolean {
		return this.lightManager.getLightMovementDirection(lightObj);
	}

	findParentProfileForLight(lightObj: TemporaryObject): TemporaryObject | null {
		return this.lightManager.findParentProfileForLight(lightObj);
	}

	findJunctionIdForProfile(profileObj: TemporaryObject, lightObj: TemporaryObject): number {
		return this.lightManager.findJunctionIdForProfile(profileObj, lightObj);
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
		
		const isVisible = this.virtualRoomManager.isVisible();
		this.virtualRoomManager.createRoom(this.virtualRoomManager.getCurrentDimensions(), false, isVisible);

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
	
		if (obj.mesh) {
			if (this.#objects.length === 1) {
				const bbox = new Box3().setFromObject(obj.mesh);
				const center = bbox.getCenter(new Vector3());

				obj.mesh.position.x -= center.x;
				obj.mesh.position.z -= center.z;
				obj.mesh.position.y -= bbox.max.y;
			}
			
			this.#originalPositions.set(obj.id, obj.mesh.position.clone());
		}
		
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

		if (!RendererUtils.isProfile(obj)) return obj;
		
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
		
		this.#originalPositions.delete(obj.id);
		
		if (this.#objects.indexOf(obj) > -1) {
			this.#objects.splice(this.#objects.indexOf(obj), 1);
		}
		
		if (this.#objects.length === 0) {
			this.#hasBeenCentered = false;
		}
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

	moveAllObjects(deltaX: number, deltaY: number, deltaZ: number): void {
		const delta = new Vector3(deltaX, deltaY, deltaZ);
		this.#systemOffset.add(delta);

		for (const obj of this.#objects) {
			if (obj.mesh) {
				obj.mesh.position.add(delta);
			}
		}
	}

	resetAllObjectsPosition(): void {
		if (this.#originalPositions.size === 0) {
			for (const obj of this.#objects) {
				if (obj.mesh) {
					const originalPos = obj.mesh.position.clone().sub(this.#systemOffset);
					this.#originalPositions.set(obj.id, originalPos);
				}
			}
		}

		for (const obj of this.#objects) {
			if (obj.mesh) {
				const originalPos = this.#originalPositions.get(obj.id);
				if (originalPos) {
					obj.mesh.position.copy(originalPos);
				}
			}
		}

		this.#systemOffset.set(0, 0, 0);
	}

	centerSystemInRoom(): void {
		const profiles: TemporaryObject[] = [];
		const otherObjects: TemporaryObject[] = [];

		for (const obj of this.#objects) {
			if (obj.mesh) {
				if (RendererUtils.isProfile(obj)) {
					profiles.push(obj);
				} else {
					otherObjects.push(obj);
				}
			}
		}

		if (profiles.length === 0 && otherObjects.length === 0) return;

		let systemCenter: Vector3;

		if (profiles.length > 0) {
			systemCenter = this.calculateProfilesCenter(profiles);
		} else {
			const bbox = new Box3();
			for (const obj of otherObjects) {
				if (obj.mesh) {
					bbox.expandByObject(obj.mesh);
				}
			}
			systemCenter = bbox.getCenter(new Vector3());
		}

		const roomCenter = new Vector3(0, 0, 0);
		const offset = roomCenter.clone().sub(systemCenter);
		offset.y = 0;

		for (const obj of this.#objects) {
			if (obj.mesh) {
				obj.mesh.position.add(offset);
			}
		}

		this.#systemOffset.add(offset);
	}

	private calculateProfilesCenter(profiles: TemporaryObject[]): Vector3 {
		if (profiles.length === 0) {
			return new Vector3(0, 0, 0);
		}

		if (profiles.length === 1) {
			const profile = profiles[0];
			if (!profile.mesh) return new Vector3(0, 0, 0);

			const lineJuncts = profile.getCatalogEntry().line_juncts;
			if (lineJuncts.length === 0) return new Vector3(0, 0, 0);

			const lineJunct = lineJuncts[0];
			
			const point1World = profile.mesh.localToWorld(new Vector3().copy(lineJunct.point1));
			const point2World = profile.mesh.localToWorld(new Vector3().copy(lineJunct.point2));
			
			return new Vector3()
				.addVectors(point1World, point2World)
				.multiplyScalar(0.5);
		}

		const extremePoints: Vector3[] = [];

		for (const profile of profiles) {
			if (!profile.mesh) continue;

			const lineJuncts = profile.getCatalogEntry().line_juncts;
			if (lineJuncts.length === 0) continue;

			const lineJunct = lineJuncts[0];
			
			const point1World = profile.mesh.localToWorld(new Vector3().copy(lineJunct.point1));
			const point2World = profile.mesh.localToWorld(new Vector3().copy(lineJunct.point2));
			
			extremePoints.push(point1World, point2World);
		}

		const barycenter = new Vector3();
		for (const point of extremePoints) {
			barycenter.add(point);
		}
		barycenter.divideScalar(extremePoints.length);

		return barycenter;
	}

	getSystemOffset(): Vector3 {
		return this.#systemOffset.clone();
	}

	createVirtualRoom(
		dimensions: number | RoomDimensions = this.virtualRoomManager.getCurrentDimensions(), 
		centered: boolean = true, 
		visible: boolean = false
	): Renderer {
		this.virtualRoomManager.createRoom(dimensions, centered, visible);
		return this;
	}

	updateVirtualRoom(): Renderer {
		this.virtualRoomManager.update();
		return this;
	}

	updateVirtualRoomWithCentering(): Renderer {
		this.virtualRoomManager.updateWithCentering();
		return this;
	}

	setVirtualRoomVisible(visible: boolean): Renderer {
		this.virtualRoomManager.setVisible(visible);
		return this;
	}

	isVirtualRoomVisible(): boolean {
		return this.virtualRoomManager.isVisible();
	}

	resizeVirtualRoom(dimensions: number | RoomDimensions): Renderer {
		this.virtualRoomManager.resize(dimensions);
		return this;
	}

	setCurrentRoomDimensions(dimensions: RoomDimensions): void {
		this.virtualRoomManager.setCurrentDimensions(dimensions);
	}

	debugRoomAndProfiles(): void {
		const roomDimensions = {
			larghezza: this.virtualRoomManager.getCurrentDimensions().width * 1000,
			altezza: this.virtualRoomManager.getCurrentDimensions().height * 1000,
			profondità: this.virtualRoomManager.getCurrentDimensions().depth * 1000
		};
		
		const profiles = this.#objects.filter(obj => RendererUtils.isProfile(obj));
		
		if (profiles.length > 0) {
			const savedObjects = this.getSavedObjects();
			const effectiveLengths = profiles.map(p => {
				const savedObject = savedObjects.find(obj => obj.object?.id === p.id);
				if (savedObject && savedObject.length) {
					return savedObject.length;
				}
				for (const family of Object.values(this.families)) {
					const item = family.items.find(i => i.code === p.getCatalogEntry().code);
					if (item) return item.len || 0;
				}
				return 0;
			});
			
			const maxProfileLength = Math.max(...effectiveLengths);
		}
	}

	getSavedObjects() {
		return get(objects);
	}

	scaleObject(obj: TemporaryObject, scaleFactor: number): void {
		if (!obj.mesh) {
			return;
		}

		obj.mesh.scale.setX(scaleFactor);

		const catalogEntry = obj.getCatalogEntry();
		if (catalogEntry.line_juncts) {
			for (const junction of catalogEntry.line_juncts) {
				const point1 = new Vector3().copy(junction.point1).multiplyScalar(scaleFactor);
				const point2 = new Vector3().copy(junction.point2).multiplyScalar(scaleFactor);
				junction.point1 = point1;
				junction.point2 = point2;
				
				if (junction.pointC) {
					const pointC = new Vector3().copy(junction.pointC).multiplyScalar(scaleFactor);
					junction.pointC = pointC;
				}
			}
		}

		const junctions = obj.getJunctions();
		for (let i = 0; i < junctions.length; i++) {
			const junction = junctions[i];
			if (junction && junction.mesh) {
				const junctionPos = junction.mesh.position.clone();
				junctionPos.x *= scaleFactor;
				junction.mesh.position.copy(junctionPos);
			}
		}

		const lineJunctions = obj.getLineJunctions();
		for (let i = 0; i < lineJunctions.length; i++) {
			const lineJunction = lineJunctions[i];
			if (lineJunction) {
				const newPosition = lineJunction.getCurvePosition() * scaleFactor;
				lineJunction.setCurvePosition(Math.min(0.98, Math.max(0.02, newPosition)));
			}
		}
	}
}