<script lang="ts">
	import { Map, TileLayer, Marker, Polyline, Tooltip } from "sveaflet";
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
	let isAnimating = $state(false);
	let isDragging = false;
	let animationTimer: ReturnType<typeof setTimeout> | null = null;

	let currentTimeSecs = $state(0);

	let highlightedStopId = $derived.by(() => {
		if (!selectedTrip) return null;
		// Find first stop that hasn't happened yet
		const nextStop = selectedTrip.stopTimes.find((st) => {
			const time = st.actual_arrival_time ?? st.actual_departure_time;
			return time !== null && time > currentTimeSecs;
		});
		return nextStop ? (nextStop.scheduled_parent_station_id ?? nextStop.scheduled_stop_id) : null;
	});

	let shapeCache = $state<Record<string, { points: any[]; color: string }>>({});
	let fetchController: AbortController | null = null;

	let stationMap = $derived.by(() => {
		const map: Record<string, AugmentedStop> = {};
		stops.forEach((s: AugmentedStop) => (map[s.stop_id] = s));
		return map;
	});

	const stationIcon = L.divIcon({
		className: "station-marker-icon",
		html: `<div class="station-dot"></div>`,
		iconSize: [12, 12],
		iconAnchor: [6, 6],
	});

	// Memoize icons to prevent prototype loss during Svelte updates
	let markerIcons = $derived.by(() => {
		const icons: Record<string, L.DivIcon> = {};
		vps.forEach((vp: any) => {
			const route = vp.route_id
				? routes[vp.route_id]
				: ({ route_short_name: "?", route_color: "000000" } as Route);
			const label = vp.run ?? "???";
			const instanceId = vp.instance_id;

			icons[vp.instance_id] = L.divIcon({
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
		});
		return icons;
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

	// EFFECT: Handle map interaction events
	$effect(() => {
		if (mapInstance) {
			const handleMoveStart = () => {
				isAnimating = false;
				if (animationTimer) clearTimeout(animationTimer);
				if (!isProgrammaticMove) {
					isFollowing = false;
				}
			};

			const handleDragStart = () => {
				isDragging = true;
				isFollowing = false;
			};

			const handleMoveEnd = () => {
				isDragging = false;
			};

			const handleMapClick = (e: L.LeafletMouseEvent) => {
				const clickedElement = e.originalEvent.target as HTMLElement;
				const container = clickedElement.closest(".marker-container") as HTMLElement;

				if (container && container.dataset.instanceId) {
					const id = container.dataset.instanceId;
					const foundVp = vps.find((v: any) => v.instance_id === id);
					if (foundVp) {
						selectedInstanceId = id;
						isFollowing = true;
						isProgrammaticMove = true;
						mapInstance?.flyTo([foundVp.position.latitude, foundVp.position.longitude], 15);
						setTimeout(() => {
							isProgrammaticMove = false;
						}, 500);
						fetchTripDetails(id);
					}
				}
			};

			mapInstance.on("movestart", handleMoveStart);
			mapInstance.on("moveend", handleMoveEnd);
			mapInstance.on("dragstart", handleDragStart);
			mapInstance.on("click", handleMapClick);

			return () => {
				mapInstance?.off("movestart", handleMoveStart);
				mapInstance?.off("moveend", handleMoveEnd);
				mapInstance?.off("dragstart", handleDragStart);
				mapInstance?.off("click", handleMapClick);
			};
		}
	});

	// EFFECT: Invalidate map size when sidebar toggles
	$effect(() => {
		void selectedInstanceId;
		if (mapInstance && !isDragging) {
			setTimeout(() => {
				mapInstance?.invalidateSize({ animate: true });
			}, 100);
		}
	});

	// EFFECT: Update selected trip and follow if enabled
	$effect(() => {
		const currentVps = vps;
		const id = selectedInstanceId;

		isAnimating = true;
		if (animationTimer) clearTimeout(animationTimer);
		animationTimer = setTimeout(() => {
			isAnimating = false;
		}, 1000);

		if (id && currentVps) {
			const foundVp = currentVps.find((v: any) => v.instance_id === id);

			if (foundVp) {
				untrack(() => fetchTripDetails(id));

				if (isFollowing && mapInstance && !isDragging) {
					isProgrammaticMove = true;
					mapInstance.flyTo([foundVp.position.latitude, foundVp.position.longitude], mapInstance.getZoom());
					setTimeout(() => {
						isProgrammaticMove = false;
					}, 500);
				}
			} else {
				untrack(() => {
					selectedInstanceId = null;
					selectedTrip = null;
					isFollowing = false;
				});
			}
		}
	});

	// EFFECT: Fetch shapes
	$effect(() => {
		if (vps) {
			vps.forEach((vp: any) => {
				if (vp.shape_id && !shapeCache[vp.shape_id]) {
					const route = routes[vp.route_id];
					const color = route?.route_color ? `#${route.route_color}` : "#0000FF";
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
		hexcolor = hexcolor.replace("#", "");
		if (hexcolor.length === 3) {
			hexcolor = hexcolor
				.split("")
				.map((c: string) => c + c)
				.join("");
		}
		const r = parseInt(hexcolor.substring(0, 2), 16);
		const g = parseInt(hexcolor.substring(2, 4), 16);
		const b = parseInt(hexcolor.substring(4, 6), 16);
		const yiq = (r * 299 + g * 587 + b * 114) / 1000;
		return yiq >= 128 ? "#000000" : "#FFFFFF";
	}

	let resize = () => {
		const navHeight = document.querySelector("nav")?.getBoundingClientRect()?.height ?? 0;
		const container = document.querySelector("#mapContainer") as HTMLElement;
		if (container) {
			container.style.height = `calc(100vh - ${navHeight}px - 2rem)`;
		}
	};

	onMount(() => {
		const updateTime = () => {
			const now = new Date(Date.now() + 10 * 3600 * 1000);
			currentTimeSecs = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
		};
		updateTime();
		const timeInterval = setInterval(updateTime, 10000);

		resize();
		window.addEventListener("resize", resize);
		return () => {
			window.removeEventListener("resize", resize);
			clearInterval(timeInterval);
		};
	});
</script>

<div id="mapContainer" class:animating={isAnimating}>
	{#if selectedTrip}
		<div class="sidebar">
			<div class="sidebar-header">
				<h3>
					Trip {selectedTrip.run}
					{#if selectedTrip.route_id && routes[selectedTrip.route_id]}
						{@const route = routes[selectedTrip.route_id]}
						- {route.route_short_name}
					{/if}
					<a
						href="/TV/trip/gtfs/{selectedTrip.instance_id}"
						target="_blank"
						title="View in TripViewer"
						style="font-size: 0.8rem; margin-left: 0.5rem; text-decoration: none;"
					>
						🔗
					</a>
				</h3>
				<button
					class="close-btn"
					onclick={() => {
						selectedInstanceId = null;
						selectedTrip = null;
						isFollowing = false;
					}}>&times;</button
				>
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
					{highlightedStopId}
				/>
			</div>
		</div>
	{/if}

	<div class="map-wrapper">
		<Map options={{ center: [biggest.stop_lat ?? 0, biggest.stop_lon ?? 0], zoom: 13 }} bind:instance={mapInstance}>
			<TileLayer url={"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"} />

			{#each stops as stop}
				{#if stop.stop_lat && stop.stop_lon}
					<Marker
						latLng={[stop.stop_lat, stop.stop_lon]}
						options={{
							icon: stationIcon,
							interactive: true,
						}}
					>
						<Tooltip options={{ direction: "top", offset: [0, -5] }}>
							{stop.stop_name}
						</Tooltip>
					</Marker>
				{/if}
			{/each}

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
				{@const icon = markerIcons[vp.instance_id]}
				{#if icon}
					<Marker
						latLng={[vp.position.latitude, vp.position.longitude]}
						options={{
							icon,
							interactive: true,
						}}
					/>
				{/if}
			{/each}
		</Map>
	</div>
</div>

<style>
	/* 1. RELOCATE MAP CONTROLS */
	:global(.leaflet-left) {
		left: auto !important;
		right: 10px !important;
	}

	/* 2. LAYOUT */
	#mapContainer {
		width: 100%;
		display: flex;
		position: relative;
		overflow: hidden;
	}

	.map-wrapper {
		flex: 1;
		height: 100%;
		position: relative;
	}

	/* 3. SIDEBAR STYLING */
	.sidebar {
		width: 25rem;
		height: 100%;
		background: white;
		z-index: 1100;
		box-shadow: 4px 0 15px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		flex-shrink: 0;
		border-right: 1px solid #ddd;
	}

	@media (max-width: 768px) {
		#mapContainer {
			flex-direction: column-reverse;
		}

		.sidebar {
			width: 100%;
			height: 50%;
			border-right: none;
			border-top: 1px solid #ddd;
			box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.1);
		}

		.map-wrapper {
			flex: 1;
		}
	}

	.sidebar-header {
		padding: 4px 12px;
		background: #f8f8f8;
		border-bottom: 1px solid #ddd;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.sidebar-header h3 {
		margin: 0;
		font-family: sans-serif;
		font-size: 0.9rem;
		line-height: 1.2;
	}

	.sidebar-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}

	.sidebar-content :global(.tv-stoptimes) {
		align-items: flex-start;
		margin: 0;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 18px;
		cursor: pointer;
		color: #666;
		padding: 0;
		display: flex;
		align-items: center;
	}

	.close-btn:hover {
		color: #000;
	}

	/* 4. MARKER STYLING & ANIMATION */
	:global(.custom-ipbr-marker) {
		background: transparent;
		border: none;
		cursor: pointer !important;
		pointer-events: auto !important;
	}

	:global(.animating .custom-ipbr-marker) {
		transition: transform 1s linear;
	}

	:global(.marker-container) {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		pointer-events: auto; /* Enable clicks */
		width: 40px;
		height: fit-content; /* Height is dynamic so there is no weird squishing if there are runs shown */
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

	:global(.station-marker-icon) {
		background: transparent;
		border: none;
	}

	:global(.station-dot) {
		width: 8px;
		height: 8px;
		background: white;
		border: 2px solid #2c3e50;
		border-radius: 50%;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
	}
</style>
