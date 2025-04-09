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
	type Object3DEventMap,
	type Vector3Like,
} from 'three';

/**
 * Classe base per gli oggetti manipolabili nel renderer
 */
export class TemporaryObject {
	readonly id: string;
	protected readonly state: Renderer;
	protected catalogEntry: CatalogEntry;

	protected junctionMark: Mesh<SphereGeometry, MeshBasicMaterial> | null;
	protected angle: number;
	protected junctions: (TemporaryObject | null)[];
	protected lineJunctions: (TemporaryObject | null)[];
	mesh: Group | null;

	constructor(state: Renderer) {
		this.state = state;
		this.angle = 0;
		this.mesh = null;

		this.id = crypto.randomUUID();

		this.catalogEntry = {
			code: '',
			juncts: [],
			line_juncts: [],
			power: 0,
			price_cents: 0,
			system: '',
			askForLeds: false,
		};
		this.junctions = [];
		this.lineJunctions = [];
		this.junctionMark = null;
	}

	/**
	 * Restituisce gli indici delle giunzioni disponibili (non occupate)
	 * @private
	 */
	private nullJunctions(): number[] {
		return Array.from(this.junctions.entries())
			.filter(([_, withObj]: [number, TemporaryObject | null]) => withObj === null)
			.map(([i, _]: [number, TemporaryObject | null]) => i);
	}

	/**
	 * Rimuove l'oggetto dalla scena e libera le risorse
	 * @param scene Scena da cui rimuovere l'oggetto
	 */
	dispose(scene: Scene) {
		if (!this.mesh) return;

		this.unmarkJunction();
		scene.remove(this.mesh);
		
		// Raccolta di tutti i mesh e gruppi da rimuovere
		const objects: Mesh<BufferGeometry, Material>[] = [];
		const groups: Group<Object3DEventMap>[] = [];
		
		this.mesh.traverse((o) => {
			if (o instanceof Mesh) objects.push(o);
			if (o instanceof Group) groups.push(o);
		});

		// Pulizia di tutti gli oggetti
		for (const o of objects) {
			scene.remove(o);
			o.material.dispose();
			o.geometry.dispose();
		}
		
		for (const g of groups) {
			scene.remove(g);
		}
	}

	/**
	 * Evidenzia visivamente una specifica giunzione
	 * @param index Indice della giunzione da evidenziare
	 */
	markJunction(index: number) {
		if (this.junctions.length !== this.catalogEntry.juncts.length) {
			throw new Error(
				'Errore: lunghezza junctions diversa da juncts nel catalogo'
			);
		}

		if (this.junctions.length > 0 && this.mesh) {
			index %= this.junctions.length;

			if (this.junctionMark === null) {
				this.junctionMark = new Mesh(
					new SphereGeometry(),
					new MeshBasicMaterial({ color: 0x00cc00, depthTest: false })
				);
				this.junctionMark.renderOrder = 1;
				this.state.getScene().add(this.junctionMark);
			}

			this.junctionMark.position.copy(this.catalogEntry.juncts[index]);
			this.mesh.localToWorld(this.junctionMark.position);
		}
	}

	/**
	 * Rimuove l'evidenziazione della giunzione
	 */
	unmarkJunction() {
		if (this.junctionMark !== null) {
			this.junctionMark.material.dispose();
			this.junctionMark.geometry.dispose();
			this.state.getScene().remove(this.junctionMark);
			this.junctionMark = null;
		}
	}

	/**
	 * Getter per le giunzioni
	 */
	getJunctions(): (TemporaryObject | null)[] {
		return this.junctions;
	}

	/**
	 * Getter per le giunzioni lineari
	 */
	getLineJunctions(): (TemporaryObject | null)[] {
		return this.lineJunctions;
	}

	/**
	 * Getter per l'entry del catalogo
	 */
	getCatalogEntry(): CatalogEntry {
		return this.catalogEntry;
	}

	/**
	 * Carica un modello da un file
	 * @param f File da caricare
	 * @returns -1 in caso di errore, undefined altrimenti
	 */
	async loadMesh(f: File | undefined) {
		if (f === undefined) return;

		const url = URL.createObjectURL(f);

		try {
			this.setMesh((await this.state.loader.loadAsync(url)).scene);
		} catch (e) {
			console.error('Errore durante il caricamento del modello:', e);
			return -1;
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	/**
	 * Imposta l'angolo di rotazione dell'oggetto
	 */
	setAngle(angle: number) {
		this.angle = angle;
	}

	/**
	 * Imposta i dati dell'entry del catalogo e inizializza le giunzioni
	 */
	setCatalogEntry(entry: CatalogEntry) {
		this.catalogEntry = entry;
		this.junctions = this.catalogEntry.juncts.map(() => null);
		this.lineJunctions = this.catalogEntry.line_juncts.map(() => null);
	}

	/**
	 * Imposta una nuova mesh per questo oggetto
	 */
	setMesh(mesh: Group) {
		if (this.mesh) {
			for (const j of this.junctions) if (j) this.detach(j);
			this.state.getScene().remove(this.mesh);
		}
		this.mesh = mesh;
		this.angle = 0;
		this.state.getScene().add(this.mesh);
	}

	/**
	 * Normalizza un angolo in gradi nell'intervallo [0, 360)
	 * @private
	 */
	private normalizeAngle(angle: number): number {
		return ((angle % 360) + 360) % 360;
	}

	/**
	 * Collega un altro oggetto a questo oggetto
	 * @param other L'oggetto da collegare a questo
	 * @param junctionId ID della giunzione da utilizzare (opzionale)
	 * @param dontFrame Se true, non inquadra l'oggetto dopo l'attaccamento
	 * @returns Il gruppo della giunzione che è stata collegata
	 */
	attach(other: TemporaryObject, junctionId?: number, dontFrame?: true): string {
		// Validazione
		if (!this.mesh || !other.mesh) {
			throw new Error('È possibile collegare solo se entrambi gli oggetti hanno una mesh');
		}
		
		if (other.junctions.concat(other.lineJunctions).some(j => j !== null)) {
			throw new Error('È possibile collegare solo se non già collegato a qualcosa');
		}
		
		if (junctionId !== undefined) {
			junctionId %= other.junctions.length;
			if (other.junctions[junctionId] !== null) {
				throw new Error("ID di giunzione specificato, ma è già occupato");
			}
		}

		// Trova giunzioni compatibili
		const thisCandidates = this.nullJunctions();
		const otherCandidates = junctionId !== undefined ? [junctionId] : other.nullJunctions();

		let thisJunctId = null;
		let otherJunctId = null;
		
		// Cerca corrispondenze tra i gruppi di giunzioni
		for (const thisCandidate of thisCandidates) {
			for (const otherCandidate of otherCandidates) {
				const thisGroup = this.catalogEntry.juncts[thisCandidate].group;
				const otherGroup = other.catalogEntry.juncts[otherCandidate].group;
				if (thisGroup === otherGroup) {
					thisJunctId = thisCandidate;
					otherJunctId = otherCandidate;
					break;
				}
			}
			if (thisJunctId !== null) break;
		}
		
		if (thisJunctId === null || otherJunctId === null) {
			throw new Error('Nessuna giunzione compatibile trovata');
		}

		// Collega gli oggetti reciprocamente
		this.junctions[thisJunctId] = other;
		other.junctions[otherJunctId] = this;

		// Posiziona e ruota l'altro oggetto
		const j1 = this.catalogEntry.juncts[thisJunctId];
		const j2 = other.catalogEntry.juncts[otherJunctId];
		const pos1 = new Vector3().copy(j1);
		const pos2 = new Vector3().copy(j2);

		// Calcola la rotazione necessaria
		const rotate = this.normalizeAngle(j2.angle + other.angle + 180) - 
		              this.normalizeAngle(j1.angle + this.angle);
		              
		other.mesh.rotateY(rotate * DEG2RAD);
		other.angle -= rotate;

		// Normalizza gli angoli
		other.angle = this.normalizeAngle(other.angle);
		this.angle = this.normalizeAngle(this.angle);

		// Trasforma le coordinate delle giunzioni in coordinate mondo
		this.mesh.localToWorld(pos1);
		other.mesh.localToWorld(pos2);

		// Aggiorna la posizione dell'altro oggetto
		other.mesh.position.copy({
			x: other.mesh.position.x + pos1.x - pos2.x,
			y: other.mesh.position.y + pos1.y - pos2.y,
			z: other.mesh.position.z + pos1.z - pos2.z,
		});

		// Inquadra l'oggetto se richiesto
		if (!dontFrame) this.state.frameObject(other);

		return j1.group;
	}

	/**
	 * Collega un altro oggetto a una delle giunzioni lineari di questo oggetto
	 * @param other L'oggetto da collegare
	 * @param pos La posizione in cui posizionare l'oggetto
	 * @returns Il gruppo della giunzione che è stata collegata
	 */
	attachLine(other: TemporaryObject, pos: Vector3Like): string {
		// Validazione
		if (!this.mesh || !other.mesh) {
			throw new Error('È possibile collegare solo se entrambi gli oggetti hanno una mesh');
		}
		
		if (other.junctions.concat(other.lineJunctions).some(j => j !== null)) {
			throw new Error('È possibile collegare solo se non già collegato a qualcosa');
		}

		// Usa la prima giunzione lineare e la prima giunzione disponibile dell'altro oggetto
		const thisJunctId = 0;
		const otherJunctId = other.junctions.indexOf(null);
		
		this.lineJunctions[thisJunctId] = other;
		other.junctions[otherJunctId] = this;

		// Ottieni le informazioni sulle giunzioni
		const j1 = this.catalogEntry.line_juncts[thisJunctId];
		const j2 = other.catalogEntry.juncts[otherJunctId];

		// Crea la curva bezier per la giunzione lineare
		const lampDir = this.state.angleHelper(j2.angle);
		const curve = new QuadraticBezierCurve3(
			this.mesh.localToWorld(new Vector3().copy(j1.point1)),
			this.mesh.localToWorld(new Vector3().copy(j1.pointC)),
			this.mesh.localToWorld(new Vector3().copy(j1.point2)),
		);

		// Trova il punto sulla curva più vicino alla posizione desiderata
		let minI = 0;
		let minDist = Number.MAX_VALUE;
		const points = curve.getSpacedPoints(100);
		
		for (let i = 0; i < points.length; i++) {
			const dist = points[i].distanceTo(pos);
			if (dist < minDist) {
				minDist = dist;
				minI = i;
			}
		}
		
		// Calcola la tangente alla curva nel punto scelto
		const tan = curve.getTangentAt(minI / 100);

		// Ruota l'altro oggetto per allinearlo alla tangente
		other.mesh.rotateY(tan.angleTo(lampDir));

		// Posiziona l'altro oggetto
		const pos2 = other.mesh.localToWorld(new Vector3().copy(j2));
		other.mesh.position.copy({
			x: other.mesh.position.x + pos.x - pos2.x,
			y: other.mesh.position.y + pos.y - pos2.y,
			z: other.mesh.position.z + pos.z - pos2.z,
		});

		// Inquadra l'oggetto
		this.state.frameObject(other);

		return j1.group;
	}

	/**
	 * Scollega questo oggetto da un altro oggetto
	 * @param other L'oggetto da scollegare
	 */
	detach(other: TemporaryObject) {
		// Rimuove i collegamenti dalle giunzioni normali
		for (let i = 0; i < other.junctions.length; i++) {
			if (other.junctions[i] === this) other.junctions[i] = null;
		}
		
		for (let i = 0; i < this.junctions.length; i++) {
			if (this.junctions[i] === other) this.junctions[i] = null;
		}
		
		// Rimuove i collegamenti dalle giunzioni lineari
		for (let i = 0; i < other.lineJunctions.length; i++) {
			if (other.lineJunctions[i] === this) other.lineJunctions[i] = null;
		}
		
		for (let i = 0; i < this.lineJunctions.length; i++) {
			if (this.lineJunctions[i] === other) this.lineJunctions[i] = null;
		}
	}

	/**
	 * Scollega questo oggetto da tutti gli oggetti collegati
	 */
	detachAll() {
		for (const other of this.junctions) {
			if (other) this.detach(other);
		}
		
		for (const other of this.lineJunctions) {
			if (other) this.detach(other);
		}
	}

	/**
	 * Ruota le giunzioni dell'oggetto
	 */
	rotate() {
		// Controlla che l'oggetto sia collegato a esattamente un altro oggetto
		const attachedObjects = this.junctions.filter(j => j !== null);
		if (attachedObjects.length !== 1) {
			throw new Error(
				'Un oggetto deve essere collegato a esattamente un altro oggetto prima di essere ruotato'
			);
		}

		// Ottieni l'indice della giunzione corrente e l'oggetto collegato
		const thisJunctId = this.junctions.findIndex(j => j !== null);
		const other = this.junctions[thisJunctId];
		if (other === null) throw new Error("Errore imprevisto");
		
		// Trova l'indice della giunzione dell'altro oggetto
		const otherJunctId = other.junctions.indexOf(this);

		// Controlla che entrambi gli oggetti abbiano una mesh
		if (!this.mesh || !other.mesh) {
			throw new Error('È possibile ruotare solo se entrambi gli oggetti hanno una mesh');
		}

		// Scollega gli oggetti
		this.detach(other);

		// Riattacca alla giunzione successiva
		const newJunctId = (thisJunctId + 1) % this.junctions.length;
		other.attach(this, newJunctId, true);
	}

	/**
	 * Imposta l'opacità dell'oggetto
	 * @param opacity Valore di opacità (0-1)
	 */
	setOpacity(opacity: number) {
		this.mesh?.traverse((child) => {
			if ('material' in child && child.material instanceof Material) {
				child.material.opacity = opacity;
				child.material.transparent = opacity < 1;
			}
		});
	}
}

/**
 * Classe per gli oggetti del catalogo nel renderer
 */
export class RendererObject extends TemporaryObject {
	constructor(state: Renderer, code: string, mesh: Group) {
		super(state);

		// Ottieni l'entry dal catalogo
		const entry = state.catalog[code];
		if (!entry) throw new Error(`Il catalogo non contiene l'oggetto ${code}`);
		
		// Configura l'oggetto
		this.setCatalogEntry(entry);
		this.setMesh(mesh);
		this.setAngle(0);
	}

	/**
	 * Crea un nuovo RendererObject
	 * @param state Riferimento allo stato del renderer
	 * @param code Codice dell'oggetto nel catalogo
	 * @returns Promise che risolve a una nuova istanza di RendererObject
	 */
	static async init(state: Renderer, code: string): Promise<RendererObject> {
		const mesh = await loadModel(state, code);
		return new RendererObject(state, code, mesh);
	}
}