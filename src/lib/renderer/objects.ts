import type { CatalogEntry } from '../../app';
import type { Renderer } from './renderer';
import { loadModel } from './util';

import { DEG2RAD } from 'three/src/math/MathUtils.js';
import {
	BufferGeometry,
	Group,
	Material,
	Mesh,
	MeshBasicMaterial,
	Object3D,
	QuadraticBezierCurve3,
	Scene,
	SphereGeometry,
	Vector3,
	Box3,
	Quaternion,
	Matrix4,
	type Object3DEventMap,
	type Vector3Like,
} from 'three';

export class TemporaryObject {
	readonly id: string;
	readonly #state: Renderer;
	#catalogEntry: CatalogEntry;
	private _curvePosition: number = 0.5;

	#junctionMark: Mesh<SphereGeometry, MeshBasicMaterial> | null;
	#angle: number;
	#junctions: (TemporaryObject | null)[];
	#lineJunctions: (TemporaryObject | null)[];
	mesh: Group | null;

	constructor(state: Renderer) {
		this.#state = state;
		this.#angle = 0;
		this.mesh = null;

		this.id = crypto.randomUUID();

		this.#catalogEntry = {
			code: '',
			juncts: [],
			line_juncts: [],
			power: 0,
			price_cents: 0,
			system: '',
			askForLeds: false,
		};
		this.#junctions = [];
		this.#lineJunctions = [];
		this.#junctionMark = null;
	}

	private nullJunctions(): number[] {
		return Array.from(this.#junctions.entries())
			.filter(([_, withObj]) => withObj === null)
			.map(([i, _]) => i);
	}

	dispose(scene: Scene) {
		if (!this.mesh) return;

		this.unmarkJunction();

		scene.remove(this.mesh);
		let groups: Group<Object3DEventMap>[] = [];
		let objects: Mesh<BufferGeometry, Material>[] = [];
		this.mesh.traverse((o) => {
			if (o instanceof Mesh) objects.push(o);
			if (o instanceof Group) groups.push(o);
		});

		for (const o of objects) {
			scene.remove(o);
			o.material.dispose();
			o.geometry.dispose();
		}
		for (const g of groups) {
			scene.remove(g);
		}
	}

	markJunction(index: number) {
		if (this.#junctions.length !== this.#catalogEntry.juncts.length)
			throw new Error(
				'Assertion failed: this.#junctions.length !== this.#catalogEntry.juncts.length',
			);

		if (this.#junctions.length > 0 && this.mesh) {
			index %= this.#junctions.length;

			if (this.#junctionMark === null) {
				this.#junctionMark = new Mesh(
					new SphereGeometry(),
					new MeshBasicMaterial({ color: 0x00cc00, depthTest: false }),
				);
				this.#junctionMark.renderOrder = 1;
				this.#state.getScene().add(this.#junctionMark);
			}

			this.#junctionMark.position.copy(this.#catalogEntry.juncts[index]);
			this.mesh.localToWorld(this.#junctionMark.position);
		}
	}

	unmarkJunction() {
		if (this.#junctionMark !== null) {
			this.#junctionMark.material.dispose();
			this.#junctionMark.geometry.dispose();
			this.#state.getScene().remove(this.#junctionMark);
			this.#junctionMark = null;
		}
	}

	getJunctions(): (TemporaryObject | null)[] {
		return this.#junctions;
	}

	getLineJunctions(): (TemporaryObject | null)[] {
		return this.#lineJunctions;
	}

	getCatalogEntry(): CatalogEntry {
		return this.#catalogEntry;
	}

	getCurvePosition(): number {
		return this._curvePosition;
	}

	/**
	 * Moves a light object along the curve it's attached to
	 * @param position A value between 0 and 1 representing the position along the curve
	 * @returns The group of the junction used for attachment or null if movement failed
	 */
	moveLight(position: number): string | null {
		position = Math.max(0, Math.min(1, position));
		this._curvePosition = position;
		
		let parentObject: TemporaryObject | null = null;
		let parentJunctionId = -1;
		
		for (let j = 0; j < this.#junctions.length; j++) {
			const junction = this.#junctions[j];
			if (junction !== null) {
				for (let i = 0; i < junction.#lineJunctions.length; i++) {
					if (junction.#lineJunctions[i] === this) {
						parentObject = junction;
						parentJunctionId = i;
						break;
					}
				}
				if (parentObject) break;
			}
		}

		if (!parentObject || parentJunctionId === -1 || !this.mesh || !parentObject.mesh) {
			console.error('Unable to move light: not properly attached to any profile');
			return null;
		}

		const j1 = parentObject.#catalogEntry.line_juncts[parentJunctionId];
		if (!j1) return null;

		const curve = new QuadraticBezierCurve3(
			parentObject.mesh.localToWorld(new Vector3().copy(j1.point1)),
			parentObject.mesh.localToWorld(new Vector3().copy(j1.pointC)),
			parentObject.mesh.localToWorld(new Vector3().copy(j1.point2))
		);

		const attachPoint = curve.getPointAt(position);
		const tan = curve.getTangentAt(position);

		const thisJunctId = this.#junctions.findIndex(j => j === parentObject);
		if (thisJunctId === -1) return null;
		
		const j2 = this.#catalogEntry.juncts[thisJunctId];

		const isLight = this.getCatalogEntry().code.includes('XNRS') || 
					this.getCatalogEntry().code.includes('SP');
	
		if (isLight) {
		this.mesh.rotation.set(0, 0, 0);
	
		const profileDir = tan.clone().normalize();
		const angleY = Math.atan2(profileDir.z, profileDir.x);
	
		this.mesh.rotation.set(0, angleY, 0);

		if (this.getCatalogEntry().code.includes('XNRS14')) {
			this.mesh.rotateY(Math.PI/2);
		}
		else if (this.getCatalogEntry().code.includes('XNRS15')) {
			this.mesh.rotateY(-Math.PI/4);
		}
		else if (this.getCatalogEntry().code.includes('XNRS31')) {
		}
		else if (this.getCatalogEntry().code.includes('XNRS32')) {
			this.mesh.rotateY(Math.PI/2);
		}
		}

		const pos2 = this.mesh.localToWorld(new Vector3().copy(j2));
		this.mesh.position.copy({
			x: this.mesh.position.x + attachPoint.x - pos2.x,
			y: this.mesh.position.y + attachPoint.y - pos2.y,
			z: this.mesh.position.z + attachPoint.z - pos2.z,
		});

		return j1.group;
	}

	/**
	 * Set a new mesh for this object. Note that this detaches the object from any junctions it was attached to
	 */
	async loadMesh(f: File | undefined) {
		if (f === undefined) return;

		const url = URL.createObjectURL(f);

		try {
			this.setMesh((await this.#state.loader.loadAsync(url)).scene);
		} catch (e) {
			console.error('Error loading model:', e);
			return -1;
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	setAngle(angle: number) {
		this.#angle = angle;
	}

	setCatalogEntry(entry: CatalogEntry) {
		this.#catalogEntry = entry;
		this.#junctions = this.#catalogEntry.juncts.map(() => null);
		this.#lineJunctions = this.#catalogEntry.line_juncts.map(() => null);
	}

	setMesh(mesh: Group) {
		if (this.mesh) {
			for (const j of this.#junctions) if (j) this.detach(j);
			this.#state.getScene().remove(this.mesh);
		}
		this.mesh = mesh;
		this.#angle = 0;
		this.#state.getScene().add(this.mesh);
	}

	/**
	 * Attach another object to this object
	 * @param other The object that should be moved to attach to this object.
	 * @returns The group of the junction that was joined
	 */
	attach(other: TemporaryObject, junctionId?: number, dontFrame?: true): string {
		if (junctionId) junctionId %= other.#junctions.length;

		if (!this.mesh || !other.mesh)
			throw new Error('Can only attach if both objects have a mesh attached');
		if (other.#junctions.concat(other.#lineJunctions).some((j) => j !== null))
			throw new Error('Can only attach if not already attached to something');
		if (junctionId !== undefined && other.#junctions[junctionId] !== null)
			throw new Error("Specified a junction id, but it's already occupied");

		const thisCandidates = this.nullJunctions();
		// Only junctionId if it's provided, otherwise all junctions
		const otherCandidates = junctionId !== undefined ? [junctionId] : other.nullJunctions();

		let thisJunctId = null;
		let otherJunctId = null;
		for (const thisCandidate of thisCandidates) {
			for (const otherCandidate of otherCandidates) {
				const thisGroup = this.getCatalogEntry().juncts[thisCandidate].group;
				const otherGroup = other.getCatalogEntry().juncts[otherCandidate].group;
				if (thisGroup === otherGroup) {
					thisJunctId = thisCandidate;
					otherJunctId = otherCandidate;
					break;
				}
			}
			if (thisJunctId !== null) break;
		}
		if (thisJunctId === null || otherJunctId === null)
			throw new Error('No compatible junctions found');

		this.#junctions[thisJunctId] = other;
		other.#junctions[otherJunctId] = this;

		const j1 = this.#catalogEntry.juncts[thisJunctId];
		const j2 = other.#catalogEntry.juncts[otherJunctId];
		const pos1 = new Vector3().copy(j1);
		const pos2 = new Vector3().copy(j2);

		const canonicalize = (angle: number) => ((angle % 360) + 360) % 360;
		const rotate =
			canonicalize(j2.angle + other.#angle + 180) - canonicalize(j1.angle + this.#angle);
		other.mesh.rotateY(rotate * DEG2RAD);
		other.#angle -= rotate;

		other.#angle = canonicalize(other.#angle);
		this.#angle = canonicalize(this.#angle);

		this.mesh.localToWorld(pos1);
		other.mesh.localToWorld(pos2);

		other.mesh.position.copy({
			x: other.mesh.position.x + pos1.x - pos2.x,
			y: other.mesh.position.y + pos1.y - pos2.y,
			z: other.mesh.position.z + pos1.z - pos2.z,
		});

		if (!dontFrame) this.#state.frameObject(other);
		
		return j1.group;
	}

	attachLine(other: TemporaryObject, pos: Vector3Like): string {
		if (!this.mesh || !other.mesh)
			throw new Error('Can only attach if both objects have a mesh attached');
		if (other.#junctions.concat(other.#lineJunctions).some((j) => j !== null))
			throw new Error('Can only attach if not already attached to something');
	
		const thisJunctId = 0;
		const otherJunctId = other.#junctions.indexOf(null);
		this.#lineJunctions[thisJunctId] = other;
		other.#junctions[otherJunctId] = this;
	
		const j1 = this.#catalogEntry.line_juncts[thisJunctId];
		const j2 = other.#catalogEntry.juncts[otherJunctId];
	
		const curve = new QuadraticBezierCurve3(
			this.mesh.localToWorld(new Vector3().copy(j1.point1)),
			this.mesh.localToWorld(new Vector3().copy(j1.pointC)),
			this.mesh.localToWorld(new Vector3().copy(j1.point2)),
		);

		const MARGIN = 0.05;
	
		let minI = 0;
		let minDist = 9001;
		const points = curve.getSpacedPoints(200);
    
		for (let i = 0; i < points.length; i++) {
			const t = i / (points.length - 1);
			if (t < MARGIN || t > (1 - MARGIN)) continue;
			
			const dist = points[i].distanceTo(pos);
			if (dist < minDist) {
				minDist = dist;
				minI = i;
			}
		}
		
		const t = minI / (points.length - 1);
		other._curvePosition = t;
		const tan = curve.getTangentAt(t);
		const attachPoint = curve.getPointAt(t);
		const isLight = other.getCatalogEntry().code.includes('XNRS') || 
					   other.getCatalogEntry().code.includes('SP');

		if (isLight) {
			other.mesh.rotation.set(0, 0, 0);

			const profileDir = tan.clone().normalize();
			const angleY = Math.atan2(profileDir.z, profileDir.x);

			other.mesh.rotation.set(0, angleY, 0);

			if (other.getCatalogEntry().code.includes('XNRS14')) {
				other.mesh.rotateY(Math.PI/2);
			}
			else if (other.getCatalogEntry().code.includes('XNRS15')) {
				other.mesh.rotateY(-Math.PI/4);
			}
			else if (other.getCatalogEntry().code.includes('XNRS31')) {
			}
			else if (other.getCatalogEntry().code.includes('XNRS32')) {
				other.mesh.rotateY(Math.PI/2);
			}
		}
	
		const pos2 = other.mesh.localToWorld(new Vector3().copy(j2));
		other.mesh.position.copy({
			x: other.mesh.position.x + attachPoint.x - pos2.x,
			y: other.mesh.position.y + attachPoint.y - pos2.y,
			z: other.mesh.position.z + attachPoint.z - pos2.z,
		});
	
		this.#state.frameObject(other);
		
		return j1.group;
	}

	detach(other: TemporaryObject) {
		for (let i = 0; i < other.#junctions.length; i++) {
			const j = other.#junctions[i];
			if (j === this) other.#junctions[i] = null;
		}
		for (let i = 0; i < this.#junctions.length; i++) {
			const j = this.#junctions[i];
			if (j === other) this.#junctions[i] = null;
		}
		for (let i = 0; i < other.#lineJunctions.length; i++) {
			const j = other.#lineJunctions[i];
			if (j === this) other.#lineJunctions[i] = null;
		}
		for (let i = 0; i < this.#lineJunctions.length; i++) {
			const j = this.#lineJunctions[i];
			if (j === other) this.#lineJunctions[i] = null;
		}
	}

	detachAll() {
		for (const other of this.#junctions) {
			if (other) this.detach(other);
		}
		for (const other of this.#lineJunctions) {
			if (other) this.detach(other);
		}
	}

	rotate() {
		if (this.#junctions.filter((j) => j !== null).length !== 1)
			throw new Error(
				'An object needs to be attached to exactly one other object before being rotated',
			);

		const thisJunctId = this.#junctions.findIndex((j) => j !== null);
		const other = this.#junctions[thisJunctId];
		if (other === null) throw new Error('What?');
		const otherJunctId = other.#junctions.indexOf(this);

		if (!this.mesh || !other.mesh)
			throw new Error('Can only rotate if both objects have a mesh attached');

		this.detach(other);

		const newJunctId = (thisJunctId + 1) % this.#junctions.length;
		other.attach(this, newJunctId, true);
	}

	setOpacity(opacity: number) {
		this.mesh?.traverse((child) => {
			if ('material' in child && child.material instanceof Material) {
				child.material.opacity = opacity;
				child.material.transparent = true;
			}
		});
	}
}

export class RendererObject extends TemporaryObject {
	constructor(state: Renderer, code: string, mesh: Group) {
		super(state);

		const entry = state.catalog[code];
		if (!entry) throw new Error(`Catalog doesn't contain object ${code}`);
		this.setCatalogEntry(entry);

		this.setMesh(mesh);
		this.setAngle(0);

		// TODO: remove this
		// resetMaterial(mesh, false);

		// TODO: support line junctions

		// TODO: actually use the simplified model
	}

	/**
	 * Crea un nuovo RendererObject. Dovresti usare questo metodo statico, piuttosto del costruttore
	 * @param state un riferimento allo stato del renderer
	 * @param code Il codice dell'oggetto in catalogo
	 * @returns Un istanza di RendererObject
	 */
	static async init(state: Renderer, code: string): Promise<RendererObject> {
		const mesh = await loadModel(state, code);
		
		// Qui passiamo anche il codice al metodo
		this.normalizeModelOrientation(mesh, code);
		
		return new RendererObject(state, code, mesh);
	  }
	  

	private static normalizeModelOrientation(mesh: Group, code: string): void {
		mesh.rotation.set(0, 0, 0);

		// CASO 1: PROFILI (tutti i tipi)
		if (code.includes('XNS') || code.includes('XNR')) {
		mesh.rotation.set(0, 0, 0);
		} 
		// CASO 2: LUCI
		else if (code.includes('XNRS') || code.includes('SP')) {
		mesh.rotation.set(0, 0, 0);
		mesh.rotateX(-Math.PI/2);
		}

		if (code.includes('XNRS14')) {
		mesh.rotateY(Math.PI);
		} 
		else if (code.includes('XNRS15')) {
		mesh.rotateY(Math.PI/2);
		}
		else if (code.includes('XNRS31')) {
		mesh.rotateY(-Math.PI/2);
		}
	}
}