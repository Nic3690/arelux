import { toast } from 'svelte-sonner';
import {
	ArrowHelper,
	BufferGeometry,
	Line,
	Mesh,
	MeshBasicMaterial,
	OrthographicCamera,
	QuadraticBezierCurve3,
	Raycaster,
	SphereGeometry,
	TubeGeometry,
	Vector2,
	Vector3,
	type Camera,
	type NormalBufferAttributes,
	type Object3DEventMap,
	type Scene,
	type Vector3Like,
} from 'three';
import type { Renderer } from './renderer';
import type { CatalogEntry } from '../../app';
import type { TemporaryObject } from './objects';
type CurveMesh = Line<BufferGeometry<NormalBufferAttributes>, MeshBasicMaterial, Object3DEventMap>;

function clamp(num: number, min: number, max: number): number {
	return Math.min(Math.max(num, min), max);
}

function junctionCompatible(
	thisObj: CatalogEntry,
	otherObj: CatalogEntry,
	otherJunctId: number,
): number {
	return thisObj.juncts.findIndex((j) => j.group == otherObj.juncts[otherJunctId].group);
}

function lineJunctionCompatible(
	thisObj: CatalogEntry,
	otherObj: CatalogEntry,
	otherJunctId: number,
): number {
	return thisObj.juncts.findIndex((j) => j.group == otherObj.line_juncts[otherJunctId].group);
}

export class HandleManager {
	#state: Renderer;
	#scene: Scene;
	#raycaster: Raycaster;

	handles: TemporaryHandleMesh[] = [];
	disabledHandles: TemporaryHandleMesh[] = [];
	disabledLineHandles: LineHandleMesh[] = [];
	lineHandles: LineHandleMesh[] = [];
	angles: ArrowHelper[] = [];
	visible: boolean = false;
	curves: CurveMesh[] = [];
	hovering: TemporaryHandleMesh | LineHandleMesh | undefined;
	hoveringPoint: Vector3 | null = null;

	constructor(state: Renderer, scene: Scene) {
		this.#state = state;
		this.#scene = scene;
		this.#raycaster = new Raycaster();
	}

	/** Clear the handles and angles for the Single scene. Should probably be called during initialization */
	clear() {
		this.#scene.remove(...this.handles);
		this.#scene.remove(...this.lineHandles);
		this.#scene.remove(...this.angles);
		this.#scene.remove(...this.curves);
		this.handles.splice(0, this.handles.length);
		this.angles.splice(0, this.angles.length);
		this.curves.splice(0, this.curves.length);
		this.lineHandles.splice(0, this.lineHandles.length);

		this.#scene.remove(...this.disabledHandles);
		this.#scene.remove(...this.disabledLineHandles);
		this.disabledHandles.splice(0, this.disabledHandles.length);
		this.disabledLineHandles.splice(0, this.disabledLineHandles.length);
	}

	/** Show handles that can connect to the given object */
	selectObject(selectedCode: string): HandleManager {
		this.clear();
		const thisCatalog = this.#state.catalog[selectedCode];

		for (const other of this.#state.getObjects()) {
			Array.from(other
				.getJunctions()
				.entries())
				.filter(([_, withObj]) => withObj === null)
				.map(([i, _]) => [junctionCompatible(thisCatalog, other.getCatalogEntry(), i), i])
				.forEach(([thisJunctId, otherJunctId]) => {
					const pos = new Vector3().copy(other.getCatalogEntry().juncts[otherJunctId]);
					other.mesh?.localToWorld(pos);
					if (thisJunctId !== -1 && otherJunctId !== -1) {
						this.moveHandle(this.createHandle(thisJunctId, otherJunctId, other), pos);
					} else {
						this.moveDisabledHandle(this.createDisabledHandle(), pos);
					}
				});

			Array.from(other
				.getLineJunctions()
				.entries())
				.map(([i, _]) => [lineJunctionCompatible(thisCatalog, other.getCatalogEntry(), i), i])
				.forEach(([thisJunctId, otherJunctId]) => {
					if (thisJunctId !== -1 && otherJunctId !== -1) {
						this.createLineHandle(thisJunctId, otherJunctId, other);
					} else {
						this.createDisabledLineHandle(thisJunctId, otherJunctId, other);
					}
				});
		}

		return this;
	}

	/** Show or hide single handles and angles. Should probably be called during initialization */
	setVisible(visible: boolean) {
		for (const handle of this.angles) handle.visible = visible;
		for (const handle of this.handles) handle.visible = visible;
		for (const handle of this.lineHandles) handle.visible = visible;
		for (const handle of this.disabledHandles) handle.visible = visible;
		for (const handle of this.disabledLineHandles) handle.visible = visible;
		this.visible = visible;
	}

	/** Create and add a single, disabled, handle. */
	createDisabledHandle() {
		const handle = new TemporaryHandleMesh(true);

		this.disabledHandles.push(handle);
		this.#scene.add(handle);
		handle.visible = this.visible;
		return this.disabledHandles.length - 1;
	}

	/** Create and add a single handle. Set whether it is visible or not using `showSingleHandles()` */
	createHandle(selectedJunctId: number, otherJunctId: number, other: TemporaryObject) {
		const handle = new HandleMesh(selectedJunctId, otherJunctId, other);

		this.handles.push(handle);
		this.#scene.add(handle);
		handle.visible = this.visible;
		return this.handles.length - 1;
	}

	createLineHandle(selectedJunctId: number, otherJunctId: number, other: TemporaryObject) {
		const handle = new LineHandleMesh(selectedJunctId, otherJunctId, other);

		this.lineHandles.push(handle);
		this.#scene.add(handle);
		handle.visible = this.visible;
		return this.lineHandles.length - 1;
	}

	createDisabledLineHandle(selectedJunctId: number, otherJunctId: number, other: TemporaryObject) {
		const handle = new LineHandleMesh(selectedJunctId, otherJunctId, other, true);

		this.disabledLineHandles.push(handle);
		this.#scene.add(handle);
		handle.visible = this.visible;
		return this.disabledLineHandles.length - 1;
	}

	createTemporaryHandle() {
		const handle = new TemporaryHandleMesh();

		this.handles.push(handle);
		this.#scene.add(handle);
		handle.visible = this.visible;
		return this.handles.length - 1;
	}

	/** Create and add a single angle. Set whether it is visible or not using `showSingleHandles()` */
	createAngle() {
		const angle = new ArrowHelper(new Vector3(0, 0, 1), new Vector3(0, 0, 0), 10, 0xffffff, 2, 1.5);
		angle.visible = this.visible;
		this.angles.push(angle);
		this.#scene.add(angle);
	}
	delete(i: number) {
		this.#scene.remove(this.handles[i], this.angles[i]);
		this.handles.splice(i, 1);
		this.angles.splice(i, 1);
	}

	/** Move handle with the given index to the given position */
	moveHandle(i: number, pos: Vector3Like) {
		if (0 <= i && i < this.handles.length) this.handles[i].position.copy(pos);
		else toast.error(`Unknown handle ${i}`);
	}

	/** Move the disabled handle with the given index to the given position */
	moveDisabledHandle(i: number, pos: Vector3Like) {
		if (0 <= i && i < this.disabledHandles.length) this.disabledHandles[i].position.copy(pos);
		else toast.error(`Unknown handle ${i}`);
	}

	/** Move and reorient the angle with the given index to the given position and degrees */
	setAngle(index: number, deg: number, pos: Vector3Like) {
		this.angles[index].position.copy(pos);
		this.angles[index].setDirection(this.#state.angleHelper(deg));
	}

	/** Rescale all handles and angles based on their distance from the camera. Should be called in the renderer update loop */
	update(camera: Camera, pointer: { x: number; y: number }) {
		const minScale = 0.1;
		const maxScale = 2;
		const minZoom = 10;
		const maxZoom = 100;
		const lerp = (zoom: number) =>
			(minScale * (minZoom - zoom) + maxScale * (zoom - maxZoom)) / (minZoom - maxZoom);

		for (const handle of this.handles) {
			let scale = 1;
			if (camera instanceof OrthographicCamera) scale = lerp(clamp(camera.zoom, minZoom, maxZoom));
			handle.scale.set(scale, scale, scale);
		}

		this.handles.forEach((h) => h.material.color.set(0xfeca0a));
		this.#raycaster.setFromCamera(new Vector2().copy(pointer), camera);
		const intersectables = [
			...this.handles,
			...this.lineHandles,
			...this.disabledHandles,
			...this.disabledLineHandles,
		];
		const intersection = this.#raycaster.intersectObjects(intersectables).at(0);
		if (intersection && this.visible) {
			const handle = intersection.object as TemporaryHandleMesh | LineHandleMesh;
			if ((handle as LineHandleMesh).isLineHandle)
				(handle as LineHandleMesh).setClickedPoint(intersection.point);
			this.hovering = handle;
			this.hoveringPoint = intersection.point;

			// Cursor
			if ((handle as TemporaryHandleMesh | LineHandleMesh).isDisabled) {
				document.documentElement.style.cursor = 'not-allowed';
			} else {
				document.documentElement.style.cursor = 'pointer';
				if ((handle as TemporaryHandleMesh).isTemporaryHandle) handle.material.color.set(0xe0b000);
			}
		} else {
			this.hovering = undefined;
			this.hoveringPoint = null;
			document.documentElement.style.cursor = '';
		}
	}

	/** Draw a curve in the "single" scene */
	createCurve(end1: Vector3Like, control: Vector3Like, end2: Vector3Like): number {
		const curve = new QuadraticBezierCurve3(
			new Vector3().copy(end1),
			new Vector3().copy(control),
			new Vector3().copy(end2),
		);

		const curveSingle = new Line(
			new BufferGeometry().setFromPoints(curve.getSpacedPoints(100)),
			new MeshBasicMaterial({ color: 0xff0000 }),
		);
		this.#scene.add(curveSingle);
		this.curves.push(curveSingle);
		return this.curves.length - 1;
	}

	/** Remove a curve that was added by the "drawSingleCurve" function */
	deleteCurve(i: number) {
		if (0 <= i && i < this.curves.length) {
			this.#scene.remove(this.curves[i]);
			this.curves[i].material.dispose();
			this.curves[i].geometry.dispose();
			this.curves.splice(i, 1);
		}
	}

	updateCurve(i: number, end1: Vector3Like, control: Vector3Like, end2: Vector3Like) {
		this.deleteCurve(i);

		const curve = new QuadraticBezierCurve3(
			new Vector3().copy(end1),
			new Vector3().copy(control),
			new Vector3().copy(end2),
		);

		const curveSingle = new Line(
			new BufferGeometry().setFromPoints(curve.getSpacedPoints(100)),
			new MeshBasicMaterial({ color: 0xff0000 }),
		);
		this.#scene.add(curveSingle);
		this.curves[i] = curveSingle;
	}
}

export class TemporaryHandleMesh extends Mesh<SphereGeometry, MeshBasicMaterial> {
	readonly isTemporaryHandle: true = true;
	readonly isDisabled: boolean;

	constructor(disabled?: boolean) {
		super();

		this.isDisabled = disabled === true;
		this.material = new MeshBasicMaterial({ color: this.isDisabled ? 0xff0000 : 0xfeca0a });
		this.material.depthTest = false;
		this.geometry = new SphereGeometry(0.5, 32, 32);
		this.renderOrder = 1;
	}

	dispose() {
		this.geometry.dispose();
		this.material.dispose();
	}
}

export class HandleMesh extends TemporaryHandleMesh {
	selectedJunctId: number;
	otherJunctId: number;
	other: TemporaryObject;

	readonly isHandle: true = true;

	constructor(selectedJunctId: number, otherJunctId: number, other: TemporaryObject) {
		super();

		this.selectedJunctId = selectedJunctId;
		this.otherJunctId = otherJunctId;
		this.other = other;
	}
}

export class LineHandleMesh extends Mesh<TubeGeometry, MeshBasicMaterial> {
	readonly selectedJunctId: number;
	readonly otherJunctId: number;
	readonly other: TemporaryObject;
	clickedPoint: Vector3 | null;

	readonly isDisabled: boolean;
	readonly isLineHandle: true = true;

	constructor(
		selectedJunctId: number,
		otherJunctId: number,
		other: TemporaryObject,
		disabled?: boolean,
	) {
		super();

		const point1 = new Vector3().copy(other.getCatalogEntry().line_juncts[otherJunctId].point1);
		const pointC = new Vector3().copy(other.getCatalogEntry().line_juncts[otherJunctId].pointC);
		const point2 = new Vector3().copy(other.getCatalogEntry().line_juncts[otherJunctId].point2);
		other.mesh?.localToWorld(point1);
		other.mesh?.localToWorld(pointC);
		other.mesh?.localToWorld(point2);
		const curve = new QuadraticBezierCurve3(point1, pointC, point2);
		this.geometry = new TubeGeometry(curve, 64, 0.1, 16);

		this.isDisabled = disabled === true;
		this.material = new MeshBasicMaterial({ color: this.isDisabled ? 0xff0000 : 0xfeca0a });
		this.material.depthTest = false;
		this.material.transparent = true;
		this.renderOrder = 1;

		this.selectedJunctId = selectedJunctId;
		this.otherJunctId = otherJunctId;
		this.other = other;
		this.clickedPoint = null;
	}

	setClickedPoint(pos: Vector3) {
		this.clickedPoint = pos;
	}

	dispose() {
		this.geometry.dispose();
		this.material.dispose();
	}
}
