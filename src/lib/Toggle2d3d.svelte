<script lang="ts">
	import { Dialog, Separator } from 'bits-ui';
	import { fade } from 'svelte/transition';
	import { flyAndScale } from '$shad/utils';
	import X from 'phosphor-svelte/lib/X';
	import House from 'phosphor-svelte/lib/House';
	import ArrowsHorizontal from 'phosphor-svelte/lib/ArrowsHorizontal';
	import Download from 'phosphor-svelte/lib/Download';
	import { objects } from '$lib';
	import { get } from 'svelte/store';
	import { page } from '$app/state';
	import { Renderer } from './renderer/renderer';
	import { browser } from '$app/environment';
	import { QuadraticBezierCurve3, Vector3, Scene, Group, Mesh } from 'three';
	import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
	import { virtualRoomVisible, virtualRoomDimensions } from './virtualRoomStore';
	import { arc } from './config/svgutils';
	import { CarProfile } from 'phosphor-svelte';

	let { 
		is3d = $bindable(page.data.settings.allow3d), 
		renderer,
		virtualRoomDisabled = false
	}: { 
		is3d?: boolean; 
		renderer?: Renderer | undefined;
		virtualRoomDisabled?: boolean;
	} = $props();

	let showVirtualRoom = $state($virtualRoomVisible);
	let showRoomSettings = $state(false);
	let showDownloadDialog = $state(false);
	let showHelpDialog = $state(false);

	let roomWidth = $state($virtualRoomDimensions.width);
	let roomHeight = $state($virtualRoomDimensions.height);
	let roomDepth = $state($virtualRoomDimensions.depth);
	
	let tempRoomWidth = $state(roomWidth);
	let tempRoomHeight = $state(roomHeight);
	let tempRoomDepth = $state(roomDepth);

	$effect(() => {
		virtualRoomVisible.set(showVirtualRoom);
	});

	$effect(() => {
		virtualRoomDimensions.set({
			width: roomWidth,
			height: roomHeight,
			depth: roomDepth
		});
	});
	
	$effect(() => {
		if (renderer) {
			const dimensions = {
				width: roomWidth / 10,
				height: roomHeight / 10,
				depth: roomDepth / 10
			};
			
			renderer.setCurrentRoomDimensions(dimensions);
			
			if (renderer.isVirtualRoomVisible()) {
				renderer.resizeVirtualRoom(dimensions);
			}
		}
	});

	let rendererInitialized = $state(false);
	$effect(() => {
		if (renderer && !rendererInitialized) {
			const initialDimensions = {
				width: roomWidth / 10,
				height: roomHeight / 10,
				depth: roomDepth / 10
			};

			renderer.setCurrentRoomDimensions(initialDimensions);
			renderer.createVirtualRoom(initialDimensions, false, showVirtualRoom);
			
			rendererInitialized = true;
		}
	});
	
	function toggleVirtualRoom() {
		if (virtualRoomDisabled) return;
		
		showVirtualRoom = !showVirtualRoom;
		virtualRoomVisible.set(showVirtualRoom);

		if (renderer) {
			renderer.debugRoomAndProfiles();
			if (showVirtualRoom) {
				const dimensions = { 
					width: roomWidth / 10, 
					height: roomHeight / 10, 
					depth: roomDepth / 10 
				};
				renderer.setCurrentRoomDimensions(dimensions);
				renderer.resizeVirtualRoom(dimensions);
			}
			renderer.setVirtualRoomVisible(showVirtualRoom);
		}
	}

	function openRoomSettings() {
		if (renderer) {
			const current = renderer.getCurrentRoomDimensions();
			roomWidth = current.width * 10;
			roomHeight = current.height * 10;
			roomDepth = current.depth * 10;
		}
		
		tempRoomWidth = roomWidth;
		tempRoomHeight = roomHeight;
		tempRoomDepth = roomDepth;
		showRoomSettings = true;
	}

	function confirmRoomSettings() {
		roomWidth = tempRoomWidth;
		roomHeight = tempRoomHeight;
		roomDepth = tempRoomDepth;
		
		const dimensions = {
			width: roomWidth / 10,
			height: roomHeight / 10,
			depth: roomDepth / 10
		};

		virtualRoomDimensions.set({
			width: roomWidth,
			height: roomHeight,
			depth: roomDepth
		});
		
		if (renderer) {
			renderer.setCurrentRoomDimensions(dimensions);

			if (showVirtualRoom) {
				renderer.resizeVirtualRoom(dimensions);
			}
		}
		
		showRoomSettings = false;
	}

	function cancelRoomSettings() {
		tempRoomWidth = roomWidth;
		tempRoomHeight = roomHeight;
		tempRoomDepth = roomDepth;
		showRoomSettings = false;
	}

	function handleDownload2D() {
		showDownloadDialog = false;
		
		if (!renderer) {
			console.error('Renderer non disponibile');
			return;
		}

		generateProfilesPDF();
	}

// Funzione completa generateProfilesPDF() - VERSIONE DEFINITIVA

function generateProfilesPDF() {
    import('jspdf').then(({ jsPDF }) => {
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const savedObjects = get(objects).filter((obj: any) => !obj.hidden);
        
        const profiles = savedObjects.filter((obj: any) => {
            if (!obj.object && !obj.code) return false;
            
            const catalogEntry = renderer!.catalog[obj.code];
            if (!catalogEntry) return false;
            
            const hasLineJuncts = catalogEntry.line_juncts && catalogEntry.line_juncts.length > 0;
            const hasMultipleJuncts = catalogEntry.juncts && catalogEntry.juncts.length >= 2;
            
            return hasLineJuncts || hasMultipleJuncts;
        });

        if (profiles.length === 0) {
            console.warn('Nessun profilo trovato nella configurazione');
            return;
        }

        const profileData = [];
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (const profile of profiles) {
            const rendererObj = profile.object;
            if (!rendererObj || !rendererObj.mesh) continue;

            const catalogEntry = rendererObj.getCatalogEntry();
            
            // CASO 1: Profili XNET con line_juncts (dati precisi)
            if (catalogEntry.line_juncts && catalogEntry.line_juncts.length > 0) {
                const lineJunct = catalogEntry.line_juncts[0];
                
                const point1World = rendererObj.mesh.localToWorld(new Vector3().copy(lineJunct.point1));
                const point2World = rendererObj.mesh.localToWorld(new Vector3().copy(lineJunct.point2));
                const pointCWorld = rendererObj.mesh.localToWorld(new Vector3().copy(lineJunct.pointC));
                
                const effectiveLength = profile.length || 2500;
                
                const midPoint = new Vector3().addVectors(point1World, point2World).multiplyScalar(0.5);
                const distanceFromMid = pointCWorld.distanceTo(midPoint);
                const isCurved = distanceFromMid > 0.01; // Soglia molto bassa per XNET

                // Trova metadati famiglia per lunghezza arco
                let curveAngle = 0;
                let curveRadius = 0;
                for (const family of Object.values(renderer!.families)) {
                    const familyItem = family.items.find(item => item.code === profile.code);
                    if (familyItem && familyItem.deg > 0 && familyItem.radius > 0) {
                        curveAngle = familyItem.deg;
                        curveRadius = familyItem.radius;
                        break;
                    }
                }

                profileData.push({
                    point1: { x: point1World.x, z: point1World.z },
                    point2: { x: point2World.x, z: point2World.z },
                    pointC: { x: pointCWorld.x, z: pointCWorld.z },
                    length: effectiveLength,
                    code: profile.code,
                    isCurved,
                    curveType: 'lineJunct',
                    curveAngle,
                    curveRadius
                });

                // Calcola bounding box
                if (isCurved) {
                    const curve = new QuadraticBezierCurve3(point1World, pointCWorld, point2World);
                    for (let i = 0; i <= 20; i++) {
                        const point = curve.getPointAt(i / 20);
                        minX = Math.min(minX, point.x);
                        maxX = Math.max(maxX, point.x);
                        minZ = Math.min(minZ, point.z);
                        maxZ = Math.max(maxZ, point.z);
                    }
                } else {
                    minX = Math.min(minX, point1World.x, point2World.x);
                    maxX = Math.max(maxX, point1World.x, point2World.x);
                    minZ = Math.min(minZ, point1World.z, point2World.z);
                    maxZ = Math.max(maxZ, point1World.z, point2World.z);
                }
            } 
            // CASO 2: Profili XFREES e altri con solo juncts (calcolo da metadati)
            else if (catalogEntry.juncts && catalogEntry.juncts.length >= 2) {
                const junct1 = catalogEntry.juncts[0];
                const junct2 = catalogEntry.juncts[catalogEntry.juncts.length - 1];
                
                const point1World = rendererObj.mesh.localToWorld(new Vector3().copy(junct1));
                const point2World = rendererObj.mesh.localToWorld(new Vector3().copy(junct2));
                
                const effectiveLength = profile.length || point1World.distanceTo(point2World) * 1000;
                
                // Trova metadati della famiglia
                let isCurved = false;
                let curveAngle = 0;
                let curveRadius = 0;

                for (const family of Object.values(renderer!.families)) {
                    const familyItem = family.items.find(item => item.code === profile.code);
                    if (familyItem && familyItem.deg > 0 && familyItem.radius > 0) {
                        isCurved = true;
                        curveAngle = familyItem.deg;
                        curveRadius = familyItem.radius;
                        break;
                    }
                }

                // Calcola il punto di controllo matematicamente corretto
                let pointCWorld;
                if (isCurved) {
                    // PRIMA: prova a determinare la direzione corretta dai juncts multipli
                    let curveDirection = 1; // Default
                    
                    if (catalogEntry.juncts.length > 2) {
                        // Se ci sono più juncts, usa quello centrale per determinare la direzione
                        const middleIndex = Math.floor(catalogEntry.juncts.length / 2);
                        const middleJunct = catalogEntry.juncts[middleIndex];
                        const middleWorld = rendererObj.mesh.localToWorld(new Vector3().copy(middleJunct));
                        
                        // Calcola dove dovrebbe essere il punto centrale di una linea retta
                        const midLine = new Vector3().addVectors(point1World, point2World).multiplyScalar(0.5);
                        
                        // Determina da che lato è il punto centrale reale
                        const chordDirection = new Vector3().subVectors(point2World, point1World).normalize();
                        const toMiddle = new Vector3().subVectors(middleWorld, midLine);
                        const normal = new Vector3(-chordDirection.z, 0, chordDirection.x);
                        
                        // Se il prodotto scalare è negativo, la curvatura va nell'altra direzione
                        const dotProduct = toMiddle.dot(normal);
                        curveDirection = dotProduct >= 0 ? 1 : -1;
                        
                        console.log('🧭 Direction from geometry:', {
                            middleWorld,
                            midLine,
                            toMiddle,
                            normal,
                            dotProduct,
                            curveDirection
                        });
                    } else {
                        // Fallback: usa l'orientamento del mesh per determinare la direzione
                        const meshRotationY = rendererObj.mesh.rotation.y;
                        // Adatta la direzione basandosi sulla rotazione del mesh
                        curveDirection = Math.sin(meshRotationY) >= 0 ? 1 : -1;
                        
                        console.log('🧭 Direction from mesh rotation:', {
                            meshRotationY,
                            sin: Math.sin(meshRotationY),
                            curveDirection
                        });
                    }
                    
                    pointCWorld = calculateBezierControlPoint(point1World, point2World, curveAngle, curveRadius, curveDirection);
                    
                    // DEBUG: verifica che il punto di controllo sia lontano dalla linea
                    const midLine = new Vector3().addVectors(point1World, point2World).multiplyScalar(0.5);
                    const distanceFromLine = pointCWorld.distanceTo(midLine);
                    console.log('🎯 XFREES Curve Debug:', {
                        code: profile.code,
                        angle: curveAngle,
                        radius: curveRadius,
                        point1: point1World,
                        point2: point2World,
                        pointC: pointCWorld,
                        distanceFromLine: distanceFromLine,
                        chordLength: point1World.distanceTo(point2World),
                        curveDirection
                    });
                } else {
                    pointCWorld = point2World.clone(); // Linea retta
                }

                profileData.push({
                    point1: { x: point1World.x, z: point1World.z },
                    point2: { x: point2World.x, z: point2World.z },
                    pointC: { x: pointCWorld.x, z: pointCWorld.z },
                    length: effectiveLength,
                    code: profile.code,
                    isCurved,
                    curveType: 'juncts',
                    curveAngle,
                    curveRadius
                });

                // Calcola bounding box
                if (isCurved) {
                    const curve = new QuadraticBezierCurve3(point1World, pointCWorld, point2World);
                    for (let i = 0; i <= 20; i++) {
                        const point = curve.getPointAt(i / 20);
                        minX = Math.min(minX, point.x);
                        maxX = Math.max(maxX, point.x);
                        minZ = Math.min(minZ, point.z);
                        maxZ = Math.max(maxZ, point.z);
                    }
                } else {
                    minX = Math.min(minX, point1World.x, point2World.x);
                    maxX = Math.max(maxX, point1World.x, point2World.x);
                    minZ = Math.min(minZ, point1World.z, point2World.z);
                    maxZ = Math.max(maxZ, point1World.z, point2World.z);
                }
            }
        }

        // Calcola layout PDF
        const pageWidth = 297;
        const pageHeight = 210;
        const margin = 20;
        const drawArea = {
            width: pageWidth - 2 * margin,
            height: pageHeight - 2 * margin - 40
        };

        const scaleX = drawArea.width / (maxX - minX);
        const scaleZ = drawArea.height / (maxZ - minZ);
        const scale = Math.min(scaleX, scaleZ) * 0.9;
        const offsetX = margin + (drawArea.width - (maxX - minX) * scale) / 2;
        const offsetY = margin + (drawArea.height - (maxZ - minZ) * scale) / 2;

        function worldToPDF(worldX: number, worldZ: number): { x: number; y: number } {
            return {
                x: offsetX + (worldX - minX) * scale,
                y: offsetY + (worldZ - minZ) * scale
            };
        }

        pdf.setLineWidth(0.5);
        pdf.setDrawColor(0, 0, 0);
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(8);

        // Disegna i profili
        for (const profile of profileData) {
            if (profile.isCurved) {
                // Gestione curve: sempre con Bézier quadratica
                const point1_3d = new Vector3(profile.point1.x, 0, profile.point1.z);
                const point2_3d = new Vector3(profile.point2.x, 0, profile.point2.z);
                const pointC_3d = new Vector3(profile.pointC.x, 0, profile.pointC.z);
                
                const curve = new QuadraticBezierCurve3(point1_3d, pointC_3d, point2_3d);
                const segments = 60; // Più segmenti per curve smooth
                
                for (let i = 0; i < segments; i++) {
                    const t1 = i / segments;
                    const t2 = (i + 1) / segments;
                    
                    const p1 = curve.getPointAt(t1);
                    const p2 = curve.getPointAt(t2);
                    
                    const pdf1 = worldToPDF(p1.x, p1.z);
                    const pdf2 = worldToPDF(p2.x, p2.z);
                    
                    pdf.line(pdf1.x, pdf1.y, pdf2.x, pdf2.y);
                }
                
                // Posiziona testo al centro della curva
                const midPoint = curve.getPointAt(0.5);
                const midPDF = worldToPDF(midPoint.x, midPoint.z);

                // Calcola lunghezza arco reale
                let realLength = profile.length;
                if (profile.curveAngle > 0 && profile.curveRadius > 0) {
                    realLength = (profile.curveAngle / 360) * 2 * Math.PI * profile.curveRadius;
                }

                const curveText = `${Math.round(realLength)}mm (curvo)`;
                pdf.text(curveText, midPDF.x, midPDF.y - 3, { align: 'center' });
                
            } else {
                // Gestione linee rette
                const startPDF = worldToPDF(profile.point1.x, profile.point1.z);
                const endPDF = worldToPDF(profile.point2.x, profile.point2.z);

                pdf.line(startPDF.x, startPDF.y, endPDF.x, endPDF.y);

                const midX = (startPDF.x + endPDF.x) / 2;
                const midY = (startPDF.y + endPDF.y) / 2;

                const lengthText = `${Math.round(profile.length)}mm`;
                
                const angle = Math.atan2(endPDF.y - startPDF.y, endPDF.x - startPDF.x);
                const degrees = angle * 180 / Math.PI;
                
                const textOffset = 3;
                const offsetX = -Math.sin(angle) * textOffset;
                const offsetY = Math.cos(angle) * textOffset;
                
                pdf.text(lengthText, midX + offsetX, midY + offsetY, { 
                    align: 'center',
                    angle: degrees > 90 || degrees < -90 ? degrees + 180 : degrees
                });
            }
        }

        // Calcola dimensioni totali
        const totalWidth = (maxX - minX) * 1000;
        const totalLength = (maxZ - minZ) * 1000;

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        
        const dimensionsText = `Dimensioni totali: ${Math.round(totalWidth)}mm × ${Math.round(totalLength)}mm`;
        const textWidth = pdf.getTextWidth(dimensionsText);
        
        pdf.text(dimensionsText, (pageWidth - textWidth) / 2, pageHeight - 15);

        pdf.setFontSize(16);
        pdf.text('Configurazione Profili - Vista dall\'alto', pageWidth / 2, 15, { align: 'center' });

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        pdf.save(`configurazione-2d-${timestamp}.pdf`);
        
    }).catch(error => {
        console.error('Errore durante la generazione del PDF:', error);
    });
}

// Funzione matematicamente corretta per calcolare il punto di controllo Bézier
function calculateBezierControlPoint(point1: Vector3, point2: Vector3, angleInDegrees: number, radiusInMM: number, curveDirection: number = 1): Vector3 {
    console.log('🧮 Calculating Bezier control point:', { angleInDegrees, radiusInMM, curveDirection });
    
    const midPoint = new Vector3().addVectors(point1, point2).multiplyScalar(0.5);
    const chordVector = new Vector3().subVectors(point2, point1);
    const chordLength = chordVector.length();
    const chordDirection = chordVector.normalize();
    
    // Vettore normale (perpendicolare alla corda) - direzione base
    const normal = new Vector3(-chordDirection.z, 0, chordDirection.x);
    
    // CORREZIONE: Calcola il raggio reale dal profilo 3D, non dai metadati
    let realRadius;
    
    if (angleInDegrees >= 170) {
        // Per semicerchi: raggio = metà della corda
        realRadius = chordLength / 2;
        console.log('🌙 Semicircle: using real radius from chord length:', realRadius);
    } else {
        // Per archi < 180°: calcola raggio dalla formula geometrica
        // chord = 2 * radius * sin(angle/2)
        // quindi: radius = chord / (2 * sin(angle/2))
        const angleRad = (angleInDegrees * Math.PI) / 180;
        const halfAngle = angleRad / 2;
        realRadius = chordLength / (2 * Math.sin(halfAngle));
        console.log('📐 Arc: calculated real radius:', realRadius, 'vs metadata radius:', radiusInMM / 1000);
    }
    
    // Per un semicerchio (180°), il punto di controllo è al centro del cerchio
    // che è a distanza = raggio dal punto medio della corda
    let controlDistance;
    
    if (angleInDegrees >= 170) {
        // Semicerchio: punto di controllo al centro del cerchio
        controlDistance = realRadius;
    } else {
        // Arco normale: usa la sagitta moltiplicata per il fattore Bézier
        const angleRad = (angleInDegrees * Math.PI) / 180;
        const halfAngle = angleRad / 2;
        const sagitta = realRadius * (1 - Math.cos(halfAngle));
        
        // Per Bézier quadratica che approssima un arco circolare
        controlDistance = sagitta * (4/3);
    }
    
    // APPLICA LA DIREZIONE CORRETTA
    const controlPoint = midPoint.clone().add(normal.multiplyScalar(controlDistance * curveDirection));
    
    console.log('✅ Final control point calculation:', {
        chordLength,
        realRadius,
        controlDistance,
        curveDirection,
        controlPoint,
        'offset ratio': controlDistance / chordLength
    });
    
    return controlPoint;
}

	function handleDownload3D() {
		showDownloadDialog = false;
		
		if (!renderer) {
			console.error('Renderer non disponibile');
			return;
		}

		generate3DGLTF();
	}

	async function generate3DGLTF() {
		try {
			const exportScene = new Scene();
			const objects = renderer!.getObjects();
			
			if (objects.length === 0) {
				console.warn('Nessun oggetto nella configurazione');
				return;
			}

			const mainGroup = new Group();
			mainGroup.name = 'Configurazione_Arelux';

			for (let i = 0; i < objects.length; i++) {
				const obj = objects[i];
				
				if (!obj.mesh) {
					console.warn(`Oggetto ${i} non ha una mesh, saltato`);
					continue;
				}

				const clonedMesh = obj.mesh.clone();
				clonedMesh.name = `${obj.getCatalogEntry().code}_${i}`;
				
				clonedMesh.traverse((child) => {
					if (child instanceof Mesh && child.material) {
						if (Array.isArray(child.material)) {
							child.material = child.material.map(mat => mat.clone());
						} else {
							child.material = child.material.clone();
						}
					}
				});

				clonedMesh.position.copy(obj.mesh.position);
				clonedMesh.rotation.copy(obj.mesh.rotation);
				clonedMesh.scale.copy(obj.mesh.scale);
				
				clonedMesh.userData = {
					originalCode: obj.getCatalogEntry().code,
					objectType: 'configuration_item',
					power: obj.getCatalogEntry().power,
					system: obj.getCatalogEntry().system,
					exportTimestamp: new Date().toISOString()
				};

				mainGroup.add(clonedMesh);
			}

			mainGroup.userData = {
				configurationType: 'arelux_configuration',
				totalObjects: objects.length,
				exportedBy: 'Arelux_Configurator',
				exportDate: new Date().toISOString(),
				version: '1.0'
			};

			exportScene.add(mainGroup);

			const exporter = new GLTFExporter();
			
			const options = {
				binary: false,
				embedImages: true,
				animations: [],
				includeCustomExtensions: false,
				onlyVisible: true,
				truncateDrawRange: true,
				forcePowerOfTwoTextures: false,
				maxTextureSize: 2048
			};

			exporter.parse(
				exportScene,
				(gltfData) => {
					const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
					const filename = `configurazione-3d-${timestamp}.gltf`;
					
					const jsonString = JSON.stringify(gltfData, null, 2);
					const blob = new Blob([jsonString], { type: 'application/json' });
					
					const url = URL.createObjectURL(blob);
					const link = document.createElement('a');
					link.href = url;
					link.download = filename;
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					URL.revokeObjectURL(url);

					exportScene.clear();
					mainGroup.clear();
				},
				(error) => {
					console.error('❌ Errore durante l\'esportazione GLTF:', error);
				},
				options
			);

		} catch (error) {
			console.error('❌ Errore durante la generazione del file 3D:', error);
		}
	}

	$effect(() => {
		if (renderer) {
			renderer.setVirtualRoomVisible(showVirtualRoom);
		}
	});

	$effect(() => {
		if (virtualRoomDisabled && showVirtualRoom && renderer) {
			showVirtualRoom = false;
			renderer.setVirtualRoomVisible(false);
		}
	});
</script>

<div class="main">
	{#if page.data.settings.allow3d}
		<input type="checkbox" id="toggle" class="toggleCheckbox" bind:checked={is3d} />
		<label for="toggle" class="toggleContainer border border-[#e8e8e8]">
			<div><span>2D</span></div>
			<div><span>3D</span></div>
		</label>
	{/if}

	{#if is3d}
	<button 
		class={`h-12 w-12 font-bold flex items-center justify-center text-center rounded-md transition-all shadow-btn active:scale-98 active:shadow-btn-active disabled:cursor-not-allowed disabled:text-black/40 disabled:shadow-none disabled:grayscale disabled:active:scale-100 border border-gray-300 ${showVirtualRoom ? 'bg-yellow-400' : 'bg-white hover:bg-yellow-400'}`}
		onclick={toggleVirtualRoom}
		disabled={virtualRoomDisabled}
		title={virtualRoomDisabled 
			? "Aggiungi degli oggetti per attivare la stanza virtuale" 
			: (showVirtualRoom ? "Nascondi stanza virtuale" : "Mostra stanza virtuale")
		}
	>
		<House size={20} />
	</button>

	<button 
		class="h-12 w-12 font-bold flex items-center justify-center text-center rounded-md transition-all shadow-btn active:scale-98 active:shadow-btn-active disabled:cursor-not-allowed disabled:text-black/40 disabled:shadow-none disabled:grayscale disabled:active:scale-100 border border-gray-300 bg-white hover:bg-yellow-400"
		onclick={openRoomSettings}
		title="Modifica dimensioni stanza"
	>
		<ArrowsHorizontal size={20} />
	</button>
	{/if}

	<button 
		class="h-12 w-12 font-bold mt-2 text-center rounded-md transition-all shadow-btn active:scale-98 active:shadow-btn-active disabled:cursor-not-allowed disabled:text-black/40 disabled:shadow-none disabled:grayscale disabled:active:scale-100 border border-gray-300 bg-white hover:bg-yellow-400 flex items-center justify-center"
		onclick={() => showHelpDialog = true}
		title="Aiuto e informazioni"
	>
		<span class="text-xl">?</span>
	</button>

	<Dialog.Root bind:open={showHelpDialog}>
		<Dialog.Portal>
			<Dialog.Overlay
				transition={fade}
				transitionConfig={{ duration: 150 }}
				class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
			/>
			<Dialog.Content
				transition={flyAndScale}
				class="fixed left-[50%] top-[50%] z-50 w-full max-w-[94%] translate-x-[-50%] translate-y-[-50%] rounded bg-background p-5 shadow-popover outline-none lg:w-3/5"
			>
				<Dialog.Title class="flex w-full items-center text-left text-2xl font-bold">
					Come funziona il configuratore:
				</Dialog.Title>
				<Separator.Root class="-mx-5 mb-3 mt-3 block h-px bg-muted" />

				<Dialog.Description>
					Lorem ipsum dolor sit amet consectetur adipisicing elit. Architecto in ab esse, laboriosam
					quod quam impedit ipsa eum, dignissimos dolore nobis mollitia odit cum nostrum iusto. Quo
					error repellendus atque!

					<h2 class="mb-2 mt-2 text-xl font-bold">Funzioni base:</h2>

					Lorem ipsum dolor sit amet consectetur adipisicing elit. Saepe rerum quibusdam aspernatur
					nobis reiciendis necessitatibus autem deleniti. Asperiores et sequi quidem.

					<ul class="mt-2 flex w-full place-content-between">
						<li>PROFILI</li>
						<li>CONNETTORI</li>
						<li>LUCI</li>
						<li>ACCESSORI</li>
						<li>PREVENTIVO</li>
					</ul>

					<h2 class="mb-2 mt-2 text-xl font-bold">Legenda simboli:</h2>

					<h2 class="mb-2 mt-4 text-xl font-bold">Stanza virtuale:</h2>
					<p>La stanza virtuale è un riferimento visivo che aiuta a visualizzare le dimensioni reali degli elementi. Può essere attivata o disattivata con il pulsante della casa.</p>
				</Dialog.Description>

				<Dialog.Close
					class="absolute right-5 top-5 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-98"
					onclick={() => showHelpDialog = false}
				>
					<div>
						<X class="size-5 text-foreground" />
						<span class="sr-only">Close</span>
					</div>
				</Dialog.Close>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>

	<!-- Pulsante Download -->
	<button 
		class="h-12 w-12 font-bold flex items-center justify-center text-center rounded-md transition-all shadow-btn active:scale-98 active:shadow-btn-active disabled:cursor-not-allowed disabled:text-black/40 disabled:shadow-none disabled:grayscale disabled:active:scale-100 border border-gray-300 bg-white hover:bg-yellow-400"
		onclick={() => showDownloadDialog = true}
		title="Scarica configurazione"
	>
		<Download size={20} />
	</button>

	<Dialog.Root bind:open={showDownloadDialog}>
		<Dialog.Portal>
			<Dialog.Overlay
				transition={fade}
				transitionConfig={{ duration: 150 }}
				class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
			/>
			<Dialog.Content
				transition={flyAndScale}
				class="fixed left-[50%] top-[50%] z-50 w-full max-w-[94%] translate-x-[-50%] translate-y-[-50%] rounded bg-background p-5 shadow-popover outline-none lg:w-2/5"
			>
				<Dialog.Title class="flex w-full items-center text-left text-2xl font-bold">
					Scarica Configurazione
				</Dialog.Title>
				<Separator.Root class="-mx-5 mb-3 mt-3 block h-px bg-muted" />

				<Dialog.Description>
					<p class="mb-6">Scegli il formato per scaricare la tua configurazione:</p>
					
					<div class="flex flex-col gap-4">
						<button 
							class="w-full py-4 text-lg text-center rounded-md transition-all shadow-btn active:scale-98 active:shadow-btn-active disabled:cursor-not-allowed disabled:text-black/40 disabled:shadow-none disabled:grayscale disabled:active:scale-100 bg-yellow-400 hover:bg-yellow-300"
							onclick={handleDownload2D}
						>
							Scarica schema tecnico PDF in 2D
						</button>

						<button 
							class="w-full py-4 text-lg text-center rounded-md transition-all shadow-btn active:scale-98 active:shadow-btn-active disabled:cursor-not-allowed disabled:text-black/40 disabled:shadow-none disabled:grayscale disabled:active:scale-100 bg-yellow-400 hover:bg-yellow-300"
							onclick={handleDownload3D}
						>
							Scarica modello tridimensionale GLTF in 3D
						</button>
					</div>

					<div class="mt-6 flex gap-3">
						<button 
							class="flex-1 text-center rounded-md transition-all shadow-btn active:scale-98 active:shadow-btn-active disabled:cursor-not-allowed disabled:text-black/40 disabled:shadow-none disabled:grayscale disabled:active:scale-100 border border-gray-300 bg-white hover:bg-gray-100 py-2"
							onclick={() => showDownloadDialog = false}
						>
							Annulla
						</button>
					</div>
				</Dialog.Description>

				<Dialog.Close
					class="absolute right-5 top-5 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-98"
					onclick={() => showDownloadDialog = false}
				>
					<div>
						<X class="size-5 text-foreground" />
						<span class="sr-only">Close</span>
					</div>
				</Dialog.Close>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>

	<Dialog.Root bind:open={showRoomSettings}>
		<Dialog.Portal>
			<Dialog.Overlay
				transition={fade}
				transitionConfig={{ duration: 150 }}
				class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
			/>
			<Dialog.Content
				transition={flyAndScale}
				class="fixed left-[50%] top-[50%] z-50 w-full max-w-[94%] translate-x-[-50%] translate-y-[-50%] rounded bg-background p-5 shadow-popover outline-none lg:w-2/5"
			>
				<Dialog.Title class="flex w-full items-center text-left text-2xl font-bold">
					Impostazioni Stanza Virtuale
				</Dialog.Title>
				<Separator.Root class="-mx-5 mb-3 mt-3 block h-px bg-muted" />

				<Dialog.Description>
					<p class="mb-4">Modifica le dimensioni della stanza virtuale per adattarla al tuo progetto:</p>
					
					<div class="flex flex-col gap-4">
						<div class="flex items-center">
							<label for="tempRoomWidth" class="mr-2 w-24">Larghezza:</label>
							<input 
								id="tempRoomWidth" 
								type="range" 
								min="10" 
								max="100" 
								step="1" 
								class="slider-yellow w-40 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
								bind:value={tempRoomWidth}
							/>
							<span class="ml-2 w-16 text-right">{(tempRoomWidth / 10).toFixed(1)}m</span>
						</div>
						<div class="flex items-center">
							<label for="tempRoomHeight" class="mr-2 w-24">Altezza:</label>
							<input 
								id="tempRoomHeight" 
								type="range" 
								min="20" 
								max="50" 
								step="1" 
								class="slider-yellow w-40 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
								bind:value={tempRoomHeight}
							/>
							<span class="ml-2 w-16 text-right">{(tempRoomHeight / 10).toFixed(1)}m</span>
						</div>
						<div class="flex items-center">
							<label for="tempRoomDepth" class="mr-2 w-24">Profondità:</label>
							<input 
								id="tempRoomDepth" 
								type="range" 
								min="10" 
								max="100" 
								step="1" 
								class="slider-yellow w-40 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
								bind:value={tempRoomDepth}
							/>
							<span class="ml-2 w-16 text-right">{(tempRoomDepth / 10).toFixed(1)}m</span>
						</div>
					</div>

					<div class="mt-6 flex gap-3">
						<button 
							class="flex-1 text-center rounded-md transition-all shadow-btn active:scale-98 active:shadow-btn-active disabled:cursor-not-allowed disabled:text-black/40 disabled:shadow-none disabled:grayscale disabled:active:scale-100 border border-gray-300 bg-white hover:bg-gray-100 py-2"
							onclick={cancelRoomSettings}
						>
							Annulla
						</button>
						<button 
							class="flex-1 text-center rounded-md transition-all shadow-btn active:scale-98 active:shadow-btn-active disabled:cursor-not-allowed disabled:text-black/40 disabled:shadow-none disabled:grayscale disabled:active:scale-100 bg-yellow-400 hover:bg-yellow-300 py-2"
							onclick={confirmRoomSettings}
						>
							Conferma
						</button>
					</div>
				</Dialog.Description>

				<Dialog.Close
					class="absolute right-5 top-5 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-98"
					onclick={cancelRoomSettings}
				>
					<div>
						<X class="size-5 text-foreground" />
						<span class="sr-only">Close</span>
					</div>
				</Dialog.Close>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
</div>

<style>
	.main {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		grid-row: span 2;
		width: 50px;

		user-select: none;
	}

	.toggleContainer {
		grid-row: span 2;

		background: #e8e8e8;
		color: hsl(var(--primary));

		color: rgba(0, 0, 0, 127);

		position: relative;
		display: grid;
		grid-template-rows: repeat(2, 1fr);
		height: 96px;
		border-radius: 10px;
		font-weight: bold;
		cursor: pointer;

		font-size: 25px;
		font-family: 'Acumin Pro';
	}
	.toggleContainer::before {
		content: '';
		position: absolute;
		width: 100%;
		height: 50%;
		left: 0%;
		border-radius: 10px;
		background: white;
		transition: all 0.3s;
	}
	.toggleCheckbox:checked + .toggleContainer::before {
		top: 50%;
	}
	.toggleContainer div {
		padding: 2px;
		text-align: center;
		z-index: 1;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.toggleContainer div * {
		transform: translateY(0.1em);
	}
	.toggleCheckbox {
		display: none;
	}
	.toggleCheckbox:checked + .toggleContainer div:first-child {
		color: rgba(0, 0, 0, 127);
		transition: color 0.2s;
	}
	.toggleCheckbox:checked + .toggleContainer div:last-child {
		color: hsl(var(--primary));
		transition: color 0.2s;
	}
	.toggleCheckbox + .toggleContainer div:first-child {
		color: hsl(var(--primary));
		transition: color 0.2s;
	}
	.slider-yellow {
        -webkit-appearance: none;
        appearance: none;
        background: #e5e7eb;
        outline: none;
        border-radius: 0.5rem;
    }

    .slider-yellow::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fbbf24;
        cursor: pointer;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .slider-yellow::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fbbf24;
        cursor: pointer;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .slider-yellow::-webkit-slider-track {
        background: linear-gradient(to right, #fbbf24 0%, #fbbf24 100%);
        height: 8px;
        border-radius: 0.5rem;
    }

    .slider-yellow::-moz-range-track {
        background: linear-gradient(to right, #fbbf24 0%, #fbbf24 100%);
        height: 8px;
        border-radius: 0.5rem;
        border: none;
    }

    .slider-yellow::-webkit-slider-thumb:hover {
        background: #f59e0b;
        transform: scale(1.1);
        transition: all 0.2s ease;
    }

    .slider-yellow::-moz-range-thumb:hover {
        background: #f59e0b;
        transform: scale(1.1);
        transition: all 0.2s ease;
    }
</style>