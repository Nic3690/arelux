<script lang="ts">
	import { onMount } from 'svelte';
	import { Renderer } from '$lib/renderer/renderer';
	import ConfigCurveShape from '$lib/config/ConfigCurveShape.svelte';
	import { type Family, type FamilyEntry } from '../../../app.js';

	let canvas: HTMLCanvasElement;
	let { data } = $props();

	// onMount(async () => {
	// 	const renderer = Renderer.get(data, canvas, canvas)
	// 		.setCamera(canvas, {
	// 			is3d: true,
	// 			isOrtographic: true,
	// 		})
	// 		.resetScene();
	// 	const obj1 = await renderer.addObject('XNS01C');
	// 	const obj2 = await renderer.addObject('XNS01L');
	// 	const obj3 = await renderer.addObject('XNS01C');
	// 	obj1.attach(obj2);
	// 	obj2.attach(obj3, 1);

	// 	const obj11 = await renderer.addObject('XNS01C');
	// 	const obj12 = await renderer.addObject('XNS01L');
	// 	const obj13 = await renderer.addObject('XNS02C');
	// 	obj11.mesh!.position.add({ x: 50, y: 0, z: 0 });
	// 	obj11.attach(obj12);
	// 	obj12.attach(obj13, 1);

	// 	const pos = { x: 41.68700273928794, y: 42.587684608697955, z: -16.15848253079963 };
	// 	const lamp = await renderer.addObject('XNRS31WWR SP SBK');
	// 	obj11.attachLine(lamp, pos);

	// 	const pos2 = { x: 35.1349784076018, y: 42.83787539758211, z: 3.081438078158218 };
	// 	const lamp2 = await renderer.addObject('XNRS31WW SP SBK');
	// 	obj12.attachLine(lamp2, pos2);

	// 	const obj21 = await renderer.addObject('XNR01C');
	// 	const obj22 = await renderer.addObject('XNR01EAC');
	// 	const obj23 = await renderer.addObject('XNR01L+Verticale');
	// 	const obj24 = await renderer.addObject('XNR01IAC');
	// 	const obj25 = await renderer.addObject('XNR01L');
	// 	obj21.mesh!.position.add({ x: 100, y: 0, z: 0 });

	// 	obj21.attach(obj22);
	// 	obj22.attach(obj23);
	// 	obj23.attach(obj24);
	// 	obj24.attach(obj25);

	// 	const obj31 = await renderer.addObject('XNS02C');
	// 	const obj32 = await renderer.addObject('XNS02C');
	// 	obj31.mesh!.position.sub({ x: 50, y: 0, z: 0 });
	// 	obj31.attach(obj32, 0);
	// 	obj32.rotate();
	// 	obj32.rotate();

	// 	const obj41 = await renderer.addObject('XNR01C');
	// 	const obj42 = await renderer.addObject('XNR01IAC');
	// 	obj41.mesh!.position.sub({ x: 100, y: 0, z: 0 });
	// 	obj41.attach(obj42);

	// 	renderer.handles.selectObject('XNRS31WW SP SBK');
	// 	renderer.handles.setVisible(true);
	// 	renderer.frameObject(obj42);

	// 	// const j0 = obj13.getCatalogEntry().juncts[0];
	// 	// const j1 = obj13.getCatalogEntry().juncts[1];
	// 	// const angle0 = j0.angle + obj13.getAngle();
	// 	// const angle1 = j1.angle + obj13.getAngle();
	// 	// renderer.arrowHelper(
	// 	// obj13.mesh!.localToWorld(new Vector3().copy(j0)),
	// 	// renderer.angleHelper(angle0),
	// 	// 0xff0000,
	// 	// );
	// 	// renderer.arrowHelper(
	// 	// obj13.mesh!.localToWorld(new Vector3().copy(j1)),
	// 	// renderer.angleHelper(angle1),
	// 	// 0x00ff00,
	// 	// );

	// 	// const gizmoPos = new Vector3();
	// 	// renderer.arrowHelper(gizmoPos, renderer.angleHelper(0));
	// 	// renderer.arrowHelper(gizmoPos, renderer.angleHelper(90), 0x00ff00);
	// 	// renderer.arrowHelper(gizmoPos, renderer.angleHelper(180), 0x0000ff);

	// 	// const angle1 = 270;
	// 	// const obj3 = await renderer.addObject('XNS01C');
	// 	// obj3.mesh!.rotateY(-angle1 * DEG2RAD);
	// 	// obj3.setAngle(angle1);

	// 	// const angle2 = -270;
	// 	// const obj4 = await renderer.addObject('XNS01C');
	// 	// obj4.mesh!.rotateY(-angle2 * DEG2RAD);
	// 	// obj4.setAngle(angle2);

	// 	// const origin = obj3.getAngle() + obj3.getCatalogEntry().juncts[0].angle;
	// 	// const destination = obj4.getAngle() + obj4.getCatalogEntry().juncts[1].angle;
	// 	// obj4.mesh!.rotateY((180 + destination - origin) * DEG2RAD);
	// 	// obj4.setAngle(obj4.getAngle() - (180 + destination - origin));

	// 	// const angle3 = obj3.getCatalogEntry().juncts[0].angle + obj3.getAngle();
	// 	// const angle4 = obj4.getCatalogEntry().juncts[1].angle + obj4.getAngle();
	// 	// console.log('obj3 angle:', angle3, 'obj4 angle:', angle4);
	// 	// console.log(obj3.getCatalogEntry().juncts);
	// 	// renderer.arrowHelper(
	// 	// obj3.mesh!.localToWorld(new Vector3().copy(obj3.getCatalogEntry().juncts[0])),
	// 	// renderer.angleHelper(angle3),
	// 	// );
	// 	// renderer.arrowHelper(
	// 	// obj4.mesh!.localToWorld(new Vector3().copy(obj4.getCatalogEntry().juncts[1])),
	// 	// renderer.angleHelper(angle4),
	// 	// 0x00ff00,
	// 	// );
	// });

	const items: FamilyEntry[] = [
		{
			len: 0,
			deg: 30,
			radius: 30,
			color: '',
			desc1: '',
			desc2: '',
			code: '',
			total_length: 0,
		},
	];
</script>

<ConfigCurveShape family={data.families['profili-superficiali']} />

<!-- <canvas bind:this={canvas} class="hidden h-dvh w-full"></canvas> -->
