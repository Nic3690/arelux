import {
	ExtrudeGeometry,
	Group,
	LineCurve3,
	Mesh,
	MeshStandardMaterial,
	Shape,
	Vector3,
} from 'three';
import { TemporaryObject } from './objects';
import type { Renderer } from './renderer';
import { resetMaterial } from './util';

const defaultShape = new Shape();
defaultShape.moveTo(-0.25, 0);
defaultShape.lineTo(-0.25, 1.5);
defaultShape.lineTo(0.25, 1.5);
defaultShape.lineTo(0.25, 0);
defaultShape.lineTo(-0.25, 0);

export class ExtrudedObject extends TemporaryObject {
	constructor(state: Renderer, code: string, shape: Shape, depth: number) {
		super(state);

		const extrudePath = new LineCurve3(new Vector3(), new Vector3(depth, 0, 0));
		const geometry = new ExtrudeGeometry(shape, { depth, extrudePath });
		const material = new MeshStandardMaterial();
		const mesh = new Group();
		mesh.add(new Mesh(geometry, material));
		this.setMesh(mesh);
		this.setAngle(0);

		let entry = state.catalog[code];
		if (!entry) throw new Error(`Catalog doesn't contain object ${code}`);
		entry = JSON.parse(JSON.stringify(entry));

		// Calculate new junctions
		const v1 = { x: extrudePath.v1.x, y: extrudePath.v1.y, z: extrudePath.v1.z };
		const v2 = { x: extrudePath.v2.x, y: extrudePath.v2.y, z: extrudePath.v2.z };
		entry.juncts = [
			{ ...v1, group: entry.juncts[0].group, angle: 270 },
			{ ...v2, group: entry.juncts[0].group, angle: 90 },
		];
		entry.line_juncts = [{ group: entry.line_juncts[0].group, point1: v1, point2: v2, pointC: v2 }];

		this.setCatalogEntry(entry);

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
	static init(state: Renderer, code: string, length: number): ExtrudedObject {
		return new ExtrudedObject(state, code, defaultShape, length);
	}
}
