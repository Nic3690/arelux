<script lang="ts">
	import { Dialog, Separator } from 'bits-ui';
	import { fade } from 'svelte/transition';
	import { flyAndScale } from '$shad/utils';
	import X from 'phosphor-svelte/lib/X';
	import House from 'phosphor-svelte/lib/House';
	import ArrowsHorizontal from 'phosphor-svelte/lib/ArrowsHorizontal';
	import Download from 'phosphor-svelte/lib/Download';
	import { button, objects } from '$lib';
	import { page } from '$app/state';
	import { Renderer } from './renderer/renderer';
	import { browser } from '$app/environment';
	import { Vector3 } from 'three';

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
			const savedObjects = $objects.filter(obj => !obj.hidden);
			
			// Filtriamo solo i profili (oggetti con line_juncts)
			const profiles = savedObjects.filter(obj => {
				if (!obj.object) return false;
				const catalogEntry = renderer!.catalog[obj.code];
				return catalogEntry && catalogEntry.line_juncts && catalogEntry.line_juncts.length > 0;
			});

			if (profiles.length === 0) {
				console.warn('Nessun profilo trovato nella configurazione');
				return;
			}

			// Raccogliamo i dati dei profili
			const profileData = [];
			let minX = Infinity, maxX = -Infinity;
			let minZ = Infinity, maxZ = -Infinity;

			for (const profile of profiles) {
				const rendererObj = profile.object;
				if (!rendererObj || !rendererObj.mesh) continue;

				const catalogEntry = rendererObj.getCatalogEntry();
				const lineJunct = catalogEntry.line_juncts[0];
				
				// Convertiamo i punti in coordinate mondo solo per la disposizione visiva
				const point1World = rendererObj.mesh.localToWorld(new Vector3().copy(lineJunct.point1));
				const point2World = rendererObj.mesh.localToWorld(new Vector3().copy(lineJunct.point2));
				
				// Vista dall'alto: usiamo X e Z, ignoriamo Y
				const start = { x: point1World.x, z: point1World.z };
				const end = { x: point2World.x, z: point2World.z };
				
				// Usa SEMPRE la lunghezza reale salvata nell'oggetto
				const effectiveLength = profile.length || 2500; // fallback se non c'è length
				
				// Controlliamo se è un profilo curvo
				const familyData = Object.values(page.data.families).find(family => 
					family.items.some(item => item.code === profile.code)
				);
				const familyItem = familyData?.items.find(item => item.code === profile.code);
				
				const isCurved = familyItem && familyItem.deg !== undefined && familyItem.deg !== 0 && familyItem.deg !== -1;
				const angle = familyItem?.deg || 0;
				const radius = familyItem?.radius || 0;
				
				profileData.push({
					start,
					end,
					length: effectiveLength,
					code: profile.code,
					isCurved,
					angle,
					radius
				});

				// Per i profili curvi, dobbiamo calcolare i bounds dell'arco
				if (isCurved && radius > 0) {
					// Calcola i bounds dell'arco basandosi su centro, raggio e angolo
					const centerX = (start.x + end.x) / 2;
					const centerZ = (start.z + end.z) / 2;
					const arcRadius = radius / 1000; // converti da mm a unità renderer
					
					minX = Math.min(minX, centerX - arcRadius, centerX + arcRadius);
					maxX = Math.max(maxX, centerX - arcRadius, centerX + arcRadius);
					minZ = Math.min(minZ, centerZ - arcRadius, centerZ + arcRadius);
					maxZ = Math.max(maxZ, centerZ - arcRadius, centerZ + arcRadius);
				} else {
					// Bounds normali per profili dritti
					minX = Math.min(minX, start.x, end.x);
					maxX = Math.max(maxX, start.x, end.x);
					minZ = Math.min(minZ, start.z, end.z);
					maxZ = Math.max(maxZ, start.z, end.z);
				}
			}

			// Dimensioni totali della configurazione
			// Calcoliamo basandoci SOLO sui profili reali e la loro disposizione logica
			let totalWidth = 0;
			let totalLength = 0;
			
			if (profiles.length === 1) {
				// Per un singolo profilo, le dimensioni sono la sua lunghezza reale
				const effectiveLength = profileData[0].length;
				
				// Determiniamo l'orientamento dal renderer (ma solo per capire l'orientamento)
				const startPt = profileData[0].start;
				const endPt = profileData[0].end;
				const deltaX = Math.abs(endPt.x - startPt.x);
				const deltaZ = Math.abs(endPt.z - startPt.z);
				
				if (deltaX > deltaZ) {
					// Profilo prevalentemente orizzontale
					totalWidth = effectiveLength;
					totalLength = 50; // spessore profilo stimato
				} else {
					// Profilo prevalentemente verticale  
					totalLength = effectiveLength;
					totalWidth = 50; // spessore profilo stimato
				}
			} else {
				// Per più profili, usiamo un approccio semplificato
				// Analizziamo l'orientamento dai dati 3D per capire la disposizione
				
				let horizontalProfiles = [];
				let verticalProfiles = [];
				let curvedProfiles = [];
				
				for (const profile of profileData) {
					if (profile.isCurved) {
						curvedProfiles.push(profile);
						continue;
					}
					
					const startPt = profile.start;
					const endPt = profile.end;
					const deltaX = Math.abs(endPt.x - startPt.x);
					const deltaZ = Math.abs(endPt.z - startPt.z);
					
					if (deltaX > deltaZ) {
						// Profilo prevalentemente orizzontale
						horizontalProfiles.push(profile);
					} else {
						// Profilo prevalentemente verticale
						verticalProfiles.push(profile);
					}
				}
				
				// Calcola le dimensioni dei profili curvi
				let curvedWidth = 0;
				let curvedLength = 0;
				
				for (const curved of curvedProfiles) {
					// Per un profilo curvo, la dimensione dipende dal raggio e dall'angolo
					const radiusMM = curved.radius;
					const angleDeg = curved.angle;
					const angleRad = angleDeg * Math.PI / 180;
					
					// Calcola le dimensioni dell'arco
					const arcWidth = radiusMM * Math.sin(angleRad);
					const arcLength = radiusMM * (1 - Math.cos(angleRad));
					
					curvedWidth = Math.max(curvedWidth, arcWidth);
					curvedLength = Math.max(curvedLength, arcLength);
				}
				
				// Se tutti i profili hanno lo stesso orientamento, probabilmente sono in serie
				if (horizontalProfiles.length === profiles.length) {
					// Tutti orizzontali - sommali
					totalWidth = horizontalProfiles.reduce((sum, p) => sum + p.length, 0);
					totalLength = 50; // spessore stimato
				} else if (verticalProfiles.length === profiles.length) {
					// Tutti verticali - sommali
					totalLength = verticalProfiles.reduce((sum, p) => sum + p.length, 0);
					totalWidth = 50; // spessore stimato
				} else if (curvedProfiles.length === profiles.length) {
					// Tutti curvi
					totalWidth = curvedWidth;
					totalLength = curvedLength;
				} else {
					// Mix di orientamenti - configurazione complessa
					const maxHorizontal = horizontalProfiles.length > 0 ? 
						Math.max(...horizontalProfiles.map(p => p.length)) : 0;
					const maxVertical = verticalProfiles.length > 0 ? 
						Math.max(...verticalProfiles.map(p => p.length)) : 0;
					
					totalWidth = Math.max(maxHorizontal, curvedWidth, 50);
					totalLength = Math.max(maxVertical, curvedLength, 50);
				}
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
			function worldToPDF(worldX: number, worldZ: number) {
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
				if (profile.isCurved && profile.radius > 0 && profile.angle > 0) {
					// Disegna profilo curvo come arco usando segmenti di linea
					const centerX = (profile.start.x + profile.end.x) / 2;
					const centerZ = (profile.start.z + profile.end.z) / 2;
					const centerPDF = worldToPDF(centerX, centerZ);
					
					// Calcola il raggio in scala PDF
					const radiusPDF = (profile.radius / 1000) * scale; // converti da mm a unità PDF
					
					// Calcola angoli di inizio e fine dell'arco in radianti
					const startAngleRad = Math.atan2(profile.start.z - centerZ, profile.start.x - centerX);
					const endAngleRad = startAngleRad + (profile.angle * Math.PI / 180);
					
					// Disegna l'arco usando segmenti di linea
					const steps = Math.max(16, Math.abs(profile.angle) / 5); // più segmenti per angoli grandi
					
					for (let i = 0; i < steps; i++) {
						const angle1 = startAngleRad + (endAngleRad - startAngleRad) * i / steps;
						const angle2 = startAngleRad + (endAngleRad - startAngleRad) * (i + 1) / steps;
						
						const x1 = centerPDF.x + radiusPDF * Math.cos(angle1);
						const y1 = centerPDF.y + radiusPDF * Math.sin(angle1);
						const x2 = centerPDF.x + radiusPDF * Math.cos(angle2);
						const y2 = centerPDF.y + radiusPDF * Math.sin(angle2);
						
						pdf.line(x1, y1, x2, y2);
					}
					
					// Calcola posizione per il testo (punto medio dell'arco)
					const midAngleRad = (startAngleRad + endAngleRad) / 2;
					const textRadius = radiusPDF * 1.3; // leggermente più lontano dall'arco
					const textX = centerPDF.x + textRadius * Math.cos(midAngleRad);
					const textY = centerPDF.y + textRadius * Math.sin(midAngleRad);
					
					// Testo con lunghezza e angolo
					const curveText = `${Math.round(profile.length)}mm (${profile.angle}°)`;
					pdf.text(curveText, textX, textY, { align: 'center' });
					
				} else {
					// Disegna profilo dritto come linea
					const startPDF = worldToPDF(profile.start.x, profile.start.z);
					const endPDF = worldToPDF(profile.end.x, profile.end.z);

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
		// TODO: Implementare download 3D
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
		class={button({ 
			size: 'square', 
			class: 'font-bold flex items-center justify-center', 
			color: showVirtualRoom ? 'primary' : 'secondary' 
		})}
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
		class={button({ 
			size: 'square', 
			class: 'font-bold flex items-center justify-center'
		})}
		onclick={openRoomSettings}
		title="Modifica dimensioni stanza"
	>
		<ArrowsHorizontal size={20} />
	</button>
	{/if}

	<Dialog.Root>
		<Dialog.Trigger class={button({ size: 'square', class: 'font-bold mt-2' })}>
			<span class="text-xl">?</span>
		</Dialog.Trigger>

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
				>
					<div>
						<X class="size-5 text-foreground" />
						<span class="sr-only">Close</span>
					</div>
				</Dialog.Close>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>

	<!-- Nuovo pulsante Download -->
	<Dialog.Root bind:open={showDownloadDialog}>
		<Dialog.Trigger class={button({ size: 'square', class: 'font-bold flex items-center justify-center' })}>
			<Download size={20} />
		</Dialog.Trigger>

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
							class={button({ class: 'w-full py-4 text-lg' })}
							onclick={handleDownload2D}
						>
							📄 Scarica in formato 2D
							<span class="block text-sm text-gray-600 mt-1">
								Schema tecnico bidimensionale
							</span>
						</button>

						<button 
							class={button({ class: 'w-full py-4 text-lg' })}
							onclick={handleDownload3D}
						>
							📦 Scarica in formato 3D
							<span class="block text-sm text-gray-600 mt-1">
								Modello tridimensionale interattivo
							</span>
						</button>
					</div>

					<div class="mt-6 flex gap-3">
						<button 
							class={button({ color: 'secondary', class: 'flex-1' })}
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

	<!-- Dialog per impostazioni stanza virtuale -->
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
								class="w-40"
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
								class="w-40"
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
								class="w-40"
								bind:value={tempRoomDepth}
							/>
							<span class="ml-2 w-16 text-right">{(tempRoomDepth / 10).toFixed(1)}m</span>
						</div>
					</div>

					<div class="mt-6 flex gap-3">
						<button 
							class={button({ color: 'secondary', class: 'flex-1' })}
							onclick={cancelRoomSettings}
						>
							Annulla
						</button>
						<button 
							class={button({ class: 'flex-1' })}
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
</style>