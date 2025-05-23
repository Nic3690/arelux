import type { CatalogEntry } from '../../app';
import type { Renderer } from './renderer';
import { loadModel } from './util';

import { DEG2RAD, RAD2DEG } from 'three/src/math/MathUtils.js';
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

	setCurvePosition(number: number) {
		this._curvePosition = number;
	}

	resetConnections(): void {
		this.#junctions = this.#catalogEntry.juncts.map(() => null);
		this.#lineJunctions = this.#catalogEntry.line_juncts.map(() => null);
	}

	moveLight(position: number): string | null {
		position = Math.max(0.01, Math.min(0.99, position));
	
		const isLight = this.getCatalogEntry().code.includes('XNRS') || 
					  this.getCatalogEntry().code.includes('SP');
					  
		if (!isLight || !this.mesh) {
		  return null;
		}
	
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
	
		if (!parentObject || parentJunctionId === -1 || !parentObject.mesh) {
		  return null;
		}
	
		this._curvePosition = position;
		
		const j1 = parentObject.getCatalogEntry().line_juncts[parentJunctionId];
		if (!j1) {
		  return null;
		}
		
		try {
		  const curve = new QuadraticBezierCurve3(
			parentObject.mesh.localToWorld(new Vector3().copy(j1.point1)),
			parentObject.mesh.localToWorld(new Vector3().copy(j1.pointC)),
			parentObject.mesh.localToWorld(new Vector3().copy(j1.point2))
		  );
	
		  const attachPoint = curve.getPointAt(position);
		  const tan = curve.getTangentAt(position);
		  
		  const junctionIndex = 0;
		  const j2 = this.getCatalogEntry().juncts[junctionIndex];
		  
		  if (!j2) {
			return null;
		  }
	
		  this.mesh.rotation.set(0, 0, 0);
		  const profileDir = tan.clone().normalize();
		  const isCurvedProfile = parentObject.getCatalogEntry().code.includes('C');
	
		  let angleY;
		  if (isCurvedProfile) angleY = Math.atan2(profileDir.x, profileDir.z) + Math.PI;
		  else angleY = Math.atan2(profileDir.z, profileDir.x);
		  this.mesh.rotation.set(0, angleY, 0);
		  const junctionAngle = this.getCatalogEntry().juncts[junctionIndex].angle * (Math.PI/180);
		  this.mesh.rotateY(junctionAngle);
	
		  const pos2 = this.mesh.localToWorld(new Vector3().copy(j2));
		  this.mesh.position.copy({
			x: this.mesh.position.x + attachPoint.x - pos2.x,
			y: this.mesh.position.y + attachPoint.y - pos2.y,
			z: this.mesh.position.z + attachPoint.z - pos2.z,
		  });
	
		  return j1.group;
		} catch (error) {
		  return null;
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
		console.log(this.#catalogEntry.code);
	}

	attach(other: TemporaryObject, junctionId?: number, dontFrame?: true): string {
		if (junctionId) junctionId %= other.#junctions.length;

		if (!this.mesh || !other.mesh)
			throw new Error('Can only attach if both objects have a mesh attached');
		if (other.#junctions.concat(other.#lineJunctions).some((j) => j !== null))
			throw new Error('Can only attach if not already attached to something');
		if (junctionId !== undefined && other.#junctions[junctionId] !== null)
			throw new Error("Specified a junction id, but it's already occupied");

		const thisCandidates = this.nullJunctions();
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

	attachLine(other: TemporaryObject, pos: Vector3Like, force: boolean = false): string {
		if (!this.mesh || !other.mesh)
			throw new Error('Can only attach if both objects have a mesh attached');
	
		if (!force && other.#junctions.concat(other.#lineJunctions).some((j) => j !== null))
			throw new Error('Can only attach if not already attached to something');
	
		const j1 = this.#catalogEntry.line_juncts[0];
		const j2 = other.#catalogEntry.juncts[other.#junctions.indexOf(null)];
	
		const curve = new QuadraticBezierCurve3(
			this.mesh.localToWorld(new Vector3().copy(j1.point1)),
			this.mesh.localToWorld(new Vector3().copy(j1.pointC)),
			this.mesh.localToWorld(new Vector3().copy(j1.point2)),
		);
	
		const MARGIN = 0.02;
	
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
		
		let finalT = minI / (points.length - 1);
		const isLight = other.getCatalogEntry().code.includes('XNRS') || 
					  other.getCatalogEntry().code.includes('SP');
	
		if (isLight) {
			const allObjects = this.#state.getObjects();
			const existingLights: TemporaryObject[] = [];
			
			for (const obj of allObjects) {
				if (obj === other) continue;
				
				const objIsLight = obj.getCatalogEntry().code.includes('XNRS') || 
								  obj.getCatalogEntry().code.includes('SP');
				
				if (objIsLight) {
					for (let j = 0; j < obj.getJunctions().length; j++) {
						if (obj.getJunctions()[j] === this) {
							existingLights.push(obj);
							break;
						}
					}
				}
			}
	
			const getMinDistanceForLight = (lightCode: string): number => {
				if (lightCode.includes('XNRS01')) return 0.08;
				if (lightCode.includes('XNRS14')) return 0.10;
				if (lightCode.includes('XNRS31')) return 0.12;
				if (lightCode.includes('SP')) return 0.10;
				return 0.08;
			};
	
			const thisLightMinDist = getMinDistanceForLight(other.getCatalogEntry().code);
	
			for (const light of existingLights) {
				const lightPos = light.getCurvePosition();
				const existingLightMinDist = getMinDistanceForLight(light.getCatalogEntry().code);
				
				const requiredDistance = Math.max(thisLightMinDist, existingLightMinDist);
				const distance = Math.abs(finalT - lightPos);
				
				if (distance < requiredDistance) {
					let newT = lightPos + requiredDistance;
					if (newT <= 0.98) {
						finalT = newT;
					} else {
						newT = lightPos - requiredDistance;
						if (newT >= 0.02) {
							finalT = newT;
						} else {
							throw new Error('Spazio insufficiente per posizionare la luce. Prova in un altro punto del profilo.');
						}
					}
					
					let hasConflict = false;
					for (const otherLight of existingLights) {
						if (otherLight === light) continue;
						const otherPos = otherLight.getCurvePosition();
						const otherMinDist = getMinDistanceForLight(otherLight.getCatalogEntry().code);
						const otherRequiredDist = Math.max(thisLightMinDist, otherMinDist);
						
						if (Math.abs(finalT - otherPos) < otherRequiredDist) {
							hasConflict = true;
							break;
						}
					}
					
					if (hasConflict) {
						throw new Error('Impossibile posizionare la luce: troppo vicino ad altre luci esistenti.');
					}
					
					break;
				}
			}
		}
	
		const thisJunctId = 0;
		const otherJunctId = other.#junctions.indexOf(null);
		this.#lineJunctions[thisJunctId] = other;
		other.#junctions[otherJunctId] = this;
		
		other.setCurvePosition(finalT);
	
		const tan = curve.getTangentAt(finalT);
		const attachPoint = curve.getPointAt(finalT);
	
		if (isLight) {
			other.mesh.rotation.set(0, 0, 0);
			const profileDir = tan.clone().normalize();
			const isCurvedProfile = this.getCatalogEntry().code.includes('C');
	
			let angleY;
			if (isCurvedProfile) angleY = Math.atan2(profileDir.x, profileDir.z) + Math.PI;
			else angleY = Math.atan2(profileDir.z, profileDir.x);
			other.mesh.rotation.set(0, angleY, 0);
			const junctionAngle = other.getCatalogEntry().juncts[0].angle * (Math.PI/180);
			other.mesh.rotateY(junctionAngle);
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
	}

	static async init(state: Renderer, code: string): Promise<RendererObject> {
		const mesh = await loadModel(state, code);
		
		console.log("Codice: ", code);
		
		const entry = state.catalog[code];
		if (entry) {

		  console.log("JUNCTIONS:", entry.juncts.length);
		  entry.juncts.forEach((j, index) => {
			console.log(`Junction #${index}:`, {
			  position: { x: j.x, y: j.y, z: j.z },
			  angle: j.angle,
			  group: j.group
			});
		  });

		  console.log("LINE JUNCTIONS:", entry.line_juncts.length);
		  entry.line_juncts.forEach((lj, index) => {
			console.log(`Line Junction #${index}:`, {
			  point1: lj.point1,
			  pointC: lj.pointC,
			  point2: lj.point2,
			  group: lj.group
			});
		  });
		} else {
		  console.error("Nessuna voce di catalogo trovata per", code);
		}
		console.log("=============================");
		
		return new RendererObject(state, code, mesh);
	  }
}