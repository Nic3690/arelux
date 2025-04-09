import {
	ExtrudeGeometry,
	Group,
	LineCurve3,
	Mesh,
	MeshStandardMaterial,
	Shape,
	Vector3,
	type Vector3Like
} from 'three';
import { TemporaryObject } from './objects';
import type { Renderer } from './renderer';

// Forma predefinita per oggetti estrusi (rettangolo 0.5 x 1.5)
const DEFAULT_SHAPE = new Shape()
	.moveTo(-0.25, 0)
	.lineTo(-0.25, 1.5)
	.lineTo(0.25, 1.5)
	.lineTo(0.25, 0)
	.lineTo(-0.25, 0);

/**
 * Classe per la creazione di oggetti estrusi nel renderer
 */
export class ExtrudedObject extends TemporaryObject {
	/**
	 * Crea un nuovo oggetto estruso
	 * @param state Riferimento allo stato del renderer
	 * @param code Codice dell'oggetto nel catalogo
	 * @param shape Forma da estrudere
	 * @param depth Profondità dell'estrusione
	 */
	constructor(state: Renderer, code: string, shape: Shape, depth: number) {
		super(state);

		// Crea la geometria estrusa
		const extrudePath = new LineCurve3(new Vector3(), new Vector3(depth, 0, 0));
		const geometry = new ExtrudeGeometry(shape, { depth, extrudePath });
		const material = new MeshStandardMaterial();
		
		// Crea la mesh e il gruppo
		const mesh = new Group();
		mesh.add(new Mesh(geometry, material));
		this.setMesh(mesh);
		this.setAngle(0);

		// Ottieni e clona l'entry dal catalogo
		const entry = this.getClonedCatalogEntry(state, code);
		
		// Calcola nuove giunzioni basate sulla geometria estrusa
		this.setupJunctions(entry, extrudePath);
		
		// Imposta l'entry di catalogo per questo oggetto
		this.setCatalogEntry(entry);
	}

	/**
	 * Clone e restituisce un'entry di catalogo
	 * @private
	 */
	private getClonedCatalogEntry(state: Renderer, code: string) {
		const entry = state.catalog[code];
		if (!entry) throw new Error(`Catalogo non contiene l'oggetto ${code}`);
		return JSON.parse(JSON.stringify(entry));
	}

	/**
	 * Configura le giunzioni per l'oggetto estruso
	 * @private
	 */
	private setupJunctions(entry: any, extrudePath: LineCurve3) {
		const v1: Vector3Like = { 
			x: extrudePath.v1.x, 
			y: extrudePath.v1.y, 
			z: extrudePath.v1.z 
		};
		
		const v2: Vector3Like = { 
			x: extrudePath.v2.x, 
			y: extrudePath.v2.y, 
			z: extrudePath.v2.z 
		};
		
		// Aggiorna le giunzioni normali
		entry.juncts = [
			{ ...v1, group: entry.juncts[0].group, angle: 270 },
			{ ...v2, group: entry.juncts[0].group, angle: 90 }
		];
		
		// Aggiorna le giunzioni lineari
		entry.line_juncts = [
			{ 
				group: entry.line_juncts[0].group, 
				point1: v1, 
				point2: v2, 
				pointC: v2 
			}
		];
	}

	/**
	 * Crea un nuovo oggetto estruso con la forma predefinita
	 * @param state Riferimento allo stato del renderer
	 * @param code Codice dell'oggetto nel catalogo
	 * @param length Lunghezza dell'estrusione
	 * @returns Una nuova istanza di ExtrudedObject
	 */
	static init(state: Renderer, code: string, length: number): ExtrudedObject {
		return new ExtrudedObject(state, code, DEFAULT_SHAPE, length);
	}
}