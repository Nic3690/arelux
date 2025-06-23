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

	let { 
		is3d = $bindable(page.data.settings.allow3d), 
		renderer,
		virtualRoomDisabled = false
	}: { 
		is3d?: boolean; 
		renderer?: Renderer | undefined;
		virtualRoomDisabled?: boolean;
	} = $props();

	let showVirtualRoom = $state(false);
	let showRoomSettings = $state(false);
	let showDownloadDialog = $state(false);
	let showHelpDialog = $state(false);
	
	const STORAGE_KEY = 'virtual_room_dimensions';
	const DEFAULT_DIMENSIONS = { width: 30, height: 30, depth: 30 };
	
	function loadSavedDimensions() {
		if (!browser) return DEFAULT_DIMENSIONS;
		
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (parsed.width > 0 && parsed.height > 0 && parsed.depth > 0) {
					return parsed;
				}
			}
		} catch (e) {
			console.warn('Errore caricamento dimensioni stanza:', e);
		}
		
		return DEFAULT_DIMENSIONS;
	}
	
	function saveDimensions(dimensions: { width: number; height: number; depth: number }) {
		if (!browser) return;
		
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(dimensions));
		} catch (e) {
			console.warn('Errore salvataggio dimensioni stanza:', e);
		}
	}

	const savedDimensions = loadSavedDimensions();
	let roomWidth = $state(savedDimensions.width);
	let roomHeight = $state(savedDimensions.height);
	let roomDepth = $state(savedDimensions.depth);
	
	let tempRoomWidth = $state(roomWidth);
	let tempRoomHeight = $state(roomHeight);
	let tempRoomDepth = $state(roomDepth);
	
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
	
	function toggleVirtualRoom() {
		if (virtualRoomDisabled) return;
		
		showVirtualRoom = !showVirtualRoom;

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

		saveDimensions({ width: roomWidth, height: roomHeight, depth: roomDepth });
		
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
		console.log('Download configurazione in formato 2D');
		showDownloadDialog = false;
		
		if (!renderer) {
			console.error('Renderer non disponibile');
			return;
		}

		generateProfilesPDF();
	}

	function generateProfilesPDF() {
		// Importiamo jsPDF dinamicamente
		import('jspdf').then(({ jsPDF }) => {
			const pdf = new jsPDF({
				orientation: 'landscape',
				unit: 'mm',
				format: 'a4'
			});

			// Otteniamo tutti gli oggetti della configurazione
			const savedObjects = get(objects).filter((obj: any) => !obj.hidden);
			
			// Filtriamo solo i profili (oggetti con line_juncts)
			const profiles = savedObjects.filter((obj: any) => {
				if (!obj.object) return false;
				const catalogEntry = renderer!.catalog[obj.code];
				return catalogEntry && catalogEntry.line_juncts && catalogEntry.line_juncts.length > 0;
			});

			if (profiles.length === 0) {
				console.warn('Nessun profilo trovato nella configurazione');
				return;
			}

			// Raccogliamo i dati dei profili e calcoliamo il fattore di scala
			const profileData = [];
			let minX = Infinity, maxX = -Infinity;
			let minZ = Infinity, maxZ = -Infinity;
			let scaleFactor = 1; // Fattore di scala da modello 3D a misure reali

			for (const profile of profiles) {
				const rendererObj = profile.object;
				if (!rendererObj || !rendererObj.mesh) continue;

				const catalogEntry = rendererObj.getCatalogEntry();
				const lineJunct = catalogEntry.line_juncts[0];
				
				// Convertiamo i punti di controllo della curva in coordinate mondo
				const point1World = rendererObj.mesh.localToWorld(new Vector3().copy(lineJunct.point1));
				const point2World = rendererObj.mesh.localToWorld(new Vector3().copy(lineJunct.point2));
				const pointCWorld = rendererObj.mesh.localToWorld(new Vector3().copy(lineJunct.pointC));
				
				// Usa SEMPRE la lunghezza reale salvata nell'oggetto
				const effectiveLength = profile.length || 2500; // fallback se non c'è length
				
				// Calcola il fattore di scala confrontando la lunghezza 3D con quella reale
				if (scaleFactor === 1) {
					const model3DLength = point1World.distanceTo(point2World);
					if (model3DLength > 0) {
						// scaleFactor = lunghezza_reale_mm / lunghezza_modello_3D_mm
						scaleFactor = effectiveLength / (model3DLength * 1000); // *1000 perché model3D è in metri
						console.log(`📏 Fattore di scala calcolato: ${scaleFactor} (${effectiveLength}mm reali / ${(model3DLength * 1000).toFixed(1)}mm modello)`);
					}
				}
				
				// Determina se è un profilo curvo controllando se il punto di controllo
				// è significativamente diverso dal punto medio tra point1 e point2
				const midPoint = new Vector3().addVectors(point1World, point2World).multiplyScalar(0.5);
				const distanceFromMid = pointCWorld.distanceTo(midPoint);
				const isCurved = distanceFromMid > 0.1; // soglia di tolleranza

				profileData.push({
					point1: { x: point1World.x, z: point1World.z },
					point2: { x: point2World.x, z: point2World.z },
					pointC: { x: pointCWorld.x, z: pointCWorld.z },
					length: effectiveLength,
					code: profile.code,
					isCurved
				});

				if (isCurved) {
					// Per profili curvi, calcoliamo i bounds campionando punti lungo la curva
					const curve = new QuadraticBezierCurve3(point1World, pointCWorld, point2World);
					const samples = 20;
					for (let i = 0; i <= samples; i++) {
						const t = i / samples;
						const point = curve.getPointAt(t);
						minX = Math.min(minX, point.x);
						maxX = Math.max(maxX, point.x);
						minZ = Math.min(minZ, point.z);
						maxZ = Math.max(maxZ, point.z);
					}
				} else {
					// Per profili dritti, bounds normali
					minX = Math.min(minX, point1World.x, point2World.x);
					maxX = Math.max(maxX, point1World.x, point2World.x);
					minZ = Math.min(minZ, point1World.z, point2World.z);
					maxZ = Math.max(maxZ, point1World.z, point2World.z);
				}
			}

			// Dimensioni totali della configurazione (bounding box reale)
			let totalWidth = 0;
			let totalLength = 0;
			
			if (minX !== Infinity && maxX !== -Infinity && minZ !== Infinity && maxZ !== -Infinity) {
				// Calcola le dimensioni del bounding box in coordinate mondo e applica il fattore di scala
				const boundingBoxWidth = (maxX - minX) * 1000 * scaleFactor; // converti da metri a mm e applica fattore scala
				const boundingBoxLength = (maxZ - minZ) * 1000 * scaleFactor; // converti da metri a mm e applica fattore scala
				
				totalWidth = Math.max(boundingBoxWidth, 50);
				totalLength = Math.max(boundingBoxLength, 50);
				
				console.log(`📐 Bounding box: ${boundingBoxWidth.toFixed(1)}mm × ${boundingBoxLength.toFixed(1)}mm`);
			} else {
				// Fallback se non riusciamo a calcolare il bounding box
				totalWidth = 50;
				totalLength = 50;
			}

			// Impostazioni canvas
			const pageWidth = 297; // A4 landscape width in mm
			const pageHeight = 210; // A4 landscape height in mm
			const margin = 20;
			const drawArea = {
				width: pageWidth - 2 * margin,
				height: pageHeight - 2 * margin - 40 // spazio per dimensioni totali
			};

			// Calcolo scala per far entrare tutto nel foglio
			const scaleX = drawArea.width / (maxX - minX);
			const scaleZ = drawArea.height / (maxZ - minZ);
			const scale = Math.min(scaleX, scaleZ) * 0.9; // 90% per margine

			// Offset per centrare
			const offsetX = margin + (drawArea.width - (maxX - minX) * scale) / 2;
			const offsetY = margin + (drawArea.height - (maxZ - minZ) * scale) / 2;

			// Funzione per convertire coordinate mondo in coordinate PDF
			function worldToPDF(worldX: number, worldZ: number): { x: number; y: number } {
				return {
					x: offsetX + (worldX - minX) * scale,
					y: offsetY + (worldZ - minZ) * scale
				};
			}

			// Disegniamo i profili
			pdf.setLineWidth(0.5);
			pdf.setDrawColor(0, 0, 0);
			pdf.setTextColor(0, 0, 0);
			pdf.setFontSize(8);

			for (const profile of profileData) {
				if (profile.isCurved) {
					// Disegna profilo curvo campionando punti lungo la curva
					const point1_3d = new Vector3(profile.point1.x, 0, profile.point1.z);
					const point2_3d = new Vector3(profile.point2.x, 0, profile.point2.z);
					const pointC_3d = new Vector3(profile.pointC.x, 0, profile.pointC.z);
					
					const curve = new QuadraticBezierCurve3(point1_3d, pointC_3d, point2_3d);
					const segments = 50;
					
					for (let i = 0; i < segments; i++) {
						const t1 = i / segments;
						const t2 = (i + 1) / segments;
						
						const p1 = curve.getPointAt(t1);
						const p2 = curve.getPointAt(t2);
						
						const pdf1 = worldToPDF(p1.x, p1.z);
						const pdf2 = worldToPDF(p2.x, p2.z);
						
						pdf.line(pdf1.x, pdf1.y, pdf2.x, pdf2.y);
					}
					
					// Posiziona il testo al punto medio della curva
					const midPoint = curve.getPointAt(0.5);
					const midPDF = worldToPDF(midPoint.x, midPoint.z);
					
					// Usa la lunghezza reale del profilo invece di calcolarla dalla geometria 3D
					const realLength = profile.length;
					
					const curveText = `${Math.round(realLength)}mm (curvo)`;
					pdf.text(curveText, midPDF.x, midPDF.y - 3, { align: 'center' });
					
				} else {
					// Disegna profilo dritto come linea
					const startPDF = worldToPDF(profile.point1.x, profile.point1.z);
					const endPDF = worldToPDF(profile.point2.x, profile.point2.z);

					// Disegniamo la linea del profilo
					pdf.line(startPDF.x, startPDF.y, endPDF.x, endPDF.y);

					// Calcoliamo il punto medio per il testo
					const midX = (startPDF.x + endPDF.x) / 2;
					const midY = (startPDF.y + endPDF.y) / 2;

					// Aggiungiamo il testo con la lunghezza
					const lengthText = `${Math.round(profile.length)}mm`;
					
					// Calcoliamo l'angolo della linea per orientare il testo
					const angle = Math.atan2(endPDF.y - startPDF.y, endPDF.x - startPDF.x);
					const degrees = angle * 180 / Math.PI;
					
					// Aggiungiamo il testo leggermente spostato dalla linea
					const textOffset = 3;
					const offsetX = -Math.sin(angle) * textOffset;
					const offsetY = Math.cos(angle) * textOffset;
					
					pdf.text(lengthText, midX + offsetX, midY + offsetY, { 
						align: 'center',
						angle: degrees > 90 || degrees < -90 ? degrees + 180 : degrees
					});
				}
			}

			// Aggiungiamo le dimensioni totali in basso
			pdf.setFontSize(12);
			pdf.setFont('helvetica', 'bold');
			
			const dimensionsText = `Dimensioni totali: ${Math.round(totalWidth)}mm × ${Math.round(totalLength)}mm`;
			const textWidth = pdf.getTextWidth(dimensionsText);
			
			pdf.text(dimensionsText, (pageWidth - textWidth) / 2, pageHeight - 15);

			// Aggiungiamo titolo
			pdf.setFontSize(16);
			pdf.text('Configurazione Profili - Vista dall\'alto', pageWidth / 2, 15, { align: 'center' });

			// Salviamo il PDF
			const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
			pdf.save(`configurazione-2d-${timestamp}.pdf`);
			
		}).catch(error => {
			console.error('Errore durante la generazione del PDF:', error);
		});
	}

	function handleDownload3D() {
		console.log('Download configurazione in formato 3D');
		showDownloadDialog = false;
		
		if (!renderer) {
			console.error('Renderer non disponibile');
			return;
		}

		generate3DGLTF();
	}

	async function generate3DGLTF() {
		try {
			// Crea una nuova scena per l'export
			const exportScene = new Scene();
			
			// Ottieni tutti gli oggetti dalla configurazione corrente
			const objects = renderer!.getObjects();
			
			if (objects.length === 0) {
				console.warn('Nessun oggetto nella configurazione');
				return;
			}

			console.log(`🔄 Esportando ${objects.length} oggetti in formato GLTF...`);

			// Gruppo principale per contenere tutti gli oggetti
			const mainGroup = new Group();
			mainGroup.name = 'Configurazione_Arelux';

			// Processa ogni oggetto
			for (let i = 0; i < objects.length; i++) {
				const obj = objects[i];
				
				if (!obj.mesh) {
					console.warn(`Oggetto ${i} non ha una mesh, saltato`);
					continue;
				}

				// Clona la mesh dell'oggetto
				const clonedMesh = obj.mesh.clone();
				clonedMesh.name = `${obj.getCatalogEntry().code}_${i}`;
				
				// Assicurati che tutti i materiali siano clonati
				clonedMesh.traverse((child) => {
					if (child instanceof Mesh && child.material) {
						if (Array.isArray(child.material)) {
							child.material = child.material.map(mat => mat.clone());
						} else {
							child.material = child.material.clone();
						}
					}
				});

				// Applica le trasformazioni correnti (posizione, rotazione, scala)
				clonedMesh.position.copy(obj.mesh.position);
				clonedMesh.rotation.copy(obj.mesh.rotation);
				clonedMesh.scale.copy(obj.mesh.scale);
				
				// Aggiungi metadati come userData
				clonedMesh.userData = {
					originalCode: obj.getCatalogEntry().code,
					objectType: 'configuration_item',
					power: obj.getCatalogEntry().power,
					system: obj.getCatalogEntry().system,
					exportTimestamp: new Date().toISOString()
				};

				mainGroup.add(clonedMesh);
			}

			// Aggiungi metadati alla configurazione completa
			mainGroup.userData = {
				configurationType: 'arelux_configuration',
				totalObjects: objects.length,
				exportedBy: 'Arelux_Configurator',
				exportDate: new Date().toISOString(),
				version: '1.0'
			};

			exportScene.add(mainGroup);

			// Configura l'esportatore GLTF
			const exporter = new GLTFExporter();
			
			const options = {
				binary: false, // Esporta in formato .gltf (JSON) invece di .glb
				embedImages: true, // Includi le texture nel file
				animations: [], // Nessuna animazione
				includeCustomExtensions: false,
				onlyVisible: true, // Solo oggetti visibili
				truncateDrawRange: true,
				forcePowerOfTwoTextures: false,
				maxTextureSize: 2048
			};

			// Esporta la scena
			exporter.parse(
				exportScene,
				(gltfData) => {
					// Crea il file e scaricalo
					const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
					const filename = `configurazione-3d-${timestamp}.gltf`;
					
					// Converti in Blob e scarica
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
					
					console.log(`✅ File GLTF esportato: ${filename}`);
					
					// Pulizia
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