<script lang="ts">
	import { Map, TileLayer, Marker, Polyline } from "sveaflet";
	import L from "leaflet";
	import "leaflet/dist/leaflet.css";
	import type { AugmentedStop, AugmentedTripInstance } from "translink-rail-api";
	import type { Route } from "qdf-gtfs/types";
	import { onMount, untrack } from "svelte";
	import StopTimes from "$lib/StopTimes.svelte";

	let { vps, biggest, stops, routes, extraDetails } = $props();

	let mapInstance = $state<L.Map | undefined>(undefined);
	let selectedInstanceId = $state<string | null>(null);
	let selectedTrip = $state<AugmentedTripInstance | null>(null);
	let useRealtime = $state(true);
	let isFollowing = $state(false);
	let isProgrammaticMove = false;

	let shapeCache = $state<Record<string, { points: any[]; color: string }>>({});
	let fetchController: AbortController | null = null;

	let stationMap = $derived.by(() => {
		const map: Record<string, AugmentedStop> = {};
		stops.forEach((s: AugmentedStop) => (map[s.stop_id] = s));
		return map;
	});

	async function fetchTripDetails(instanceId: string) {
		if (fetchController) fetchController.abort();
		fetchController = new AbortController();

		try {
			const res = await fetch(`/api/trip/${instanceId}`, { signal: fetchController.signal });
			if (res.ok) {
				const data = await res.json();
				selectedTrip = data;
			}
		} catch (err: any) {
			if (err.name !== "AbortError") {
				console.error("Failed to fetch trip details", err);
			}
		}
	}

	// EFFECT: Handle following state on user move
	$effect(() => {
		if (mapInstance) {
			const handleUserMove = () => {
				if (!isProgrammaticMove) {
					isFollowing = false;
				}
			};
			mapInstance.on("movestart", handleUserMove);
			return () => mapInstance?.off("movestart", handleUserMove);
		}
	});

	// EFFECT: Update selected trip and follow if enabled when vps changes (30s poll)
	$effect(() => {
		// Dependency on vps and selectedInstanceId
		const currentVps = vps;
		const id = selectedInstanceId;

		if (id && currentVps) {
			const foundVp = currentVps.find((v: any) => v.instance_id === id);

			if (foundVp) {
				// Refresh details if they are out of sync or just triggered by vps update
				untrack(() => fetchTripDetails(id));

				if (isFollowing && mapInstance) {
					isProgrammaticMove = true;
					mapInstance.flyTo([foundVp.position.latitude, foundVp.position.longitude], mapInstance.getZoom());
					setTimeout(() => {
						isProgrammaticMove = false;
					}, 500);
				}
			} else {
				// Vehicle disappeared
				untrack(() => {
					selectedInstanceId = null;
					selectedTrip = null;
					isFollowing = false;
				});
			}
		}
	});

	// EFFECT: Fetch shapes for new vehicles
	$effect(() => {
		if (vps) {
			vps.forEach((vp: any) => {
				if (vp.shape_id && !shapeCache[vp.shape_id]) {
					const route = routes[vp.route_id];
					const color = route?.route_color ? `#${route.route_color}` : "#0000FF";
					// Initialize cache to prevent double-fetch
					shapeCache[vp.shape_id] = { points: [], color };

					fetch(`/api/shape/${vp.shape_id}`)
						.then((r) => r.json())
						.then((points) => {
							shapeCache[vp.shape_id] = { points, color };
						})
						.catch((err) => {
							console.error(`Failed to fetch shape ${vp.shape_id}`, err);
							delete shapeCache[vp.shape_id];
						});
				}
			});
		}
	});

	function getContrastYIQ(hexcolor: string) {
		// Remove leading #
		hexcolor = hexcolor.replace("#", "");

		// Convert 3-digit hex to 6-digit
		if (hexcolor.length === 3) {
			hexcolor = hexcolor
				.split("")
				.map((c: string) => c + c)
				.join("");
		}

		// Convert to RGB
		const r = parseInt(hexcolor.substring(0, 2), 16);
		const g = parseInt(hexcolor.substring(2, 4), 16);
		const b = parseInt(hexcolor.substring(4, 6), 16);

		// Calculate YIQ ratio
		const yiq = (r * 299 + g * 587 + b * 114) / 1000;

		// Return black for light backgrounds, white for dark backgrounds
		return yiq >= 128 ? "#000000" : "#FFFFFF";
	}

	// Custom Icon Generator matches your IPBR logo design
	const ipbrIcon = (label: string, route: Route, instanceId: string) =>
		L.divIcon({
			className: "custom-ipbr-marker",
			html: `
            <div class="marker-container" data-instance-id="${instanceId}">
                <div class="logo-circle" style="background-color: ${route.route_color ? `#${route.route_color}` : "#000"};">
                    <span class="logo-text" style="color: ${getContrastYIQ(route.route_color ? `#${route.route_color}` : "#000")}">${route.route_short_name}</span>
                </div>
				${extraDetails ? `<span class="run-label">${label}</span>` : ""}
            </div>`,
			iconSize: [40, 40],
			iconAnchor: [20, 20],
		});

	// EFFECT: Map-wide click listener
	$effect(() => {
		if (mapInstance) {
			const handleMapClick = (e: L.LeafletMouseEvent) => {
				const clickedElement = e.originalEvent.target as HTMLElement;
				const container = clickedElement.closest(".marker-container") as HTMLElement;

				if (container && container.dataset.instanceId) {
					const id = container.dataset.instanceId;
					if (id !== selectedInstanceId) {
						selectedInstanceId = id;
						isFollowing = true;
						isProgrammaticMove = true;
						mapInstance?.flyTo(e.latlng, 15);
						setTimeout(() => {
							isProgrammaticMove = false;
						}, 500);
						fetchTripDetails(id);
					}
				}
			};

			mapInstance.on("click", handleMapClick);
			return () => mapInstance?.off("click", handleMapClick);
		}
	});

	let resize = () => {
		const navHeight = document.querySelector("nav")?.getBoundingClientRect()?.height ?? 0;
		document
			.querySelector("#mapContainer")
			?.setAttribute("style", `width: 100%; height: calc(100vh - ${navHeight}px - 2rem);`);
	};

	onMount(() => {
		resize();
		window.addEventListener("resize", resize);
		return () => window.removeEventListener("resize", resize);
	});
</script>

<div id="mapContainer" style="width:100%; height:100vh; display:flex; position:relative;">
	{#if selectedTrip}
		<div class="sidebar">
			<div class="sidebar-header">
				<h3>
					Trip {selectedTrip.run}
					{#if selectedTrip.route_id && routes[selectedTrip.route_id]}
						{@const route = routes[selectedTrip.route_id]}
						- {route.route_short_name}
						({route.route_long_name})
					{/if}
				</h3>
				<button class="close-btn" onclick={() => {
					selectedInstanceId = null;
					selectedTrip = null;
					isFollowing = false;
				}}>&times;</button>
			</div>
			<div class="sidebar-content">
				{#if extraDetails}
					<div class="sidebar-controls">
						<label>
							<input type="checkbox" bind:checked={useRealtime} />
							Show Realtime Data
						</label>
					</div>
				{/if}
				<StopTimes
					inst={selectedTrip}
					{useRealtime}
					stations={stationMap}
					route={selectedTrip.route_id ? routes[selectedTrip.route_id] : {}}
					{extraDetails}
				/>
			</div>
		</div>
	{/if}

	<Map options={{ center: [biggest.stop_lat ?? 0, biggest.stop_lon ?? 0], zoom: 13 }} bind:instance={mapInstance}>
		<TileLayer url={"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"} />

		{#each Object.keys(shapeCache) as shapeId}
			{@const shape = shapeCache[shapeId]}
			{#if shape.points.length > 0}
				<Polyline
					latLngs={shape.points.map((p: any) => [p.shape_pt_lat, p.shape_pt_lon])}
					options={{ color: shape.color, weight: 3, opacity: 0.7 }}
				/>
			{/if}
		{/each}

		{#each vps as vp}
			{@const runLabel = vp.run ?? "???"}
			<Marker
				latLng={[vp.position.latitude, vp.position.longitude]}
				options={{
					icon: ipbrIcon(
						runLabel,
						vp.route_id
							? routes[vp.route_id]
							: ({ route_short_name: "?", route_color: "000000" } as Route),
						vp.instance_id,
					),
					interactive: true,
				}}
			/>
		{/each}
	</Map>
</div>

<style>
	/* 1. RELOCATE MAP CONTROLS */
	/* Moves the + and - buttons to the right so the sidebar doesn't block them */
	:global(.leaflet-left) {
		left: auto !important;
		right: 10px !important;
	}

	/* 2. SIDEBAR STYLING */
	.sidebar {
		position: absolute;
		top: 0;
		left: 0;
		width: 25rem;
		height: 100%;
		background: white;
		z-index: 1100; /* Higher than Leaflet's 1000 */
		box-shadow: 4px 0 15px rgba(0, 0, 0, 0.2);
		display: flex;
		flex-direction: column;
		overflow: hidden; /* Header stays fixed, content scrolls */
	}

	.sidebar-header {
		padding: 15px;
		background: #f8f8f8;
		border-bottom: 1px solid #ddd;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.sidebar-header h3 {
		margin: 0;
		font-family: sans-serif;
	}

	.sidebar-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}

	.sidebar-controls {
		padding: 12px 15px;
		background: #fff;
		border-bottom: 1px solid #eee;
		font-family: sans-serif;
		font-size: 0.9rem;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 24px;
		cursor: pointer;
		color: #666;
	}

	.close-btn:hover {
		color: #000;
	}

	/* 3. MARKER STYLING */
	:global(.custom-ipbr-marker) {
		background: transparent;
		border: none;
		cursor: pointer !important;
		pointer-events: auto !important;
	}

	:global(.marker-container) {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		pointer-events: auto; /* Enable clicks */
	}

	:global(.logo-circle) {
		border: 2px solid white;
		border-radius: 50%;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	:global(.logo-text) {
		font-weight: bold;
		font-family: sans-serif;
		line-height: 0.8;
		font-size: 10px;
		text-align: center;
	}

	:global(.run-label) {
		background: white;
		padding: 1px 4px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: bold;
		border: 1px solid #ccc;
		margin-top: 2px;
		font-family: sans-serif;
	}
</style>
