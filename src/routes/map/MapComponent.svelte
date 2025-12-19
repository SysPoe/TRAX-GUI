<script lang="ts">
	import { Map, TileLayer, Marker, Polyline, Tooltip } from "sveaflet";
	import L from "leaflet";
	import "leaflet/dist/leaflet.css";
	import type { AugmentedStop, AugmentedTripInstance } from "translink-rail-api";
	import type { Route } from "qdf-gtfs/types";
	import { onMount, untrack } from "svelte";
	import StopTimes from "$lib/StopTimes.svelte";
	import { DepartureBoard, type Departure } from "$lib";

	let { vps, shapes, bounds, stops, routes, extraDetails } = $props();

	const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;

	let mapInstance = $state<L.Map | undefined>(undefined);
	let selectedInstanceId = $state<string | null>(params?.get("trip") ?? null);
	let selectedTrip = $state<AugmentedTripInstance | null>(null);

	let selectedStopId = $state<string | null>(params?.get("stop") ?? null);
	let selectedStopDepartures = $state<Departure[]>([]);
	let selectedStopInstances = $state<Record<string, AugmentedTripInstance>>({});
	let selectedStopRoutes = $state<Record<string, any>>({});
	let isRefreshingDepartures = $state(false);

	const STATION_ZOOM = 8;
	const VEHICLE_ZOOM = $derived(vps.length > 100 ? 12 : vps.length > 50 ? 11 : vps.length > 20 ? 10 : 9);

	console.log(shapes);

	let initialViewDone = $state(false);
	let userLocationZoomDone = $state(false);

	$effect(() => {
		if (
			mapInstance &&
			userLocation &&
			bounds &&
			!selectedStopId &&
			!selectedInstanceId &&
			!userLocationZoomDone &&
			!hasUserMovedMap
		) {
			const [lat, lon] = userLocation;
			const isInBounds =
				lat >= bounds.min_lat && lat <= bounds.max_lat && lon >= bounds.min_lon && lon <= bounds.max_lon;

			if (isInBounds) {
				isProgrammaticMove = true;
				mapInstance.setView(userLocation, 15);
				userLocationZoomDone = true;
				setTimeout(() => {
					isProgrammaticMove = false;
				}, 500);
			}
		}
	});

	$effect(() => {
		if (mapInstance && !initialViewDone) {
			// Initialize zoom level immediately
			currentZoom = mapInstance.getZoom();

			let hasView = false;
			if (selectedStopId) {
				const stop = stops.find((s: any) => s.stop_id === selectedStopId);
				if (stop && stop.stop_lat && stop.stop_lon) {
					mapInstance.setView([stop.stop_lat, stop.stop_lon], 15);
					startDepartureRefresh(selectedStopId);
					hasView = true;
				}
			}

			if (selectedInstanceId) {
				fetchTripDetails(selectedInstanceId);
				const vp = vps.find((v: any) => v.instance_id === selectedInstanceId);
				if (vp) {
					mapInstance.setView([vp.position.latitude, vp.position.longitude], 15);
					hasView = true;
				}
			}

			if (!hasView && userLocation) {
				mapInstance.setView(userLocation, 15);
				hasView = true;
			}

			if (!hasView && bounds) {
				mapInstance.fitBounds([
					[bounds.min_lat, bounds.min_lon],
					[bounds.max_lat, bounds.max_lon],
				]);
				hasView = true;
			}

			if (!hasView) {
				// Fallback to a default view if nothing else matches
				mapInstance.setView([stops[0].stop_lat, stops[0].stop_lon], 12);
			}

			// Ensure zoom state is captured after setView/fitBounds
			currentZoom = mapInstance.getZoom();
			initialViewDone = true;
		}
	});

	$effect(() => {
		const instId = selectedInstanceId;
		const stopId = selectedStopId;

		untrack(() => {
			if (!initialViewDone) return;
			const url = new URL(window.location.href);
			const oldTrip = url.searchParams.get("trip");
			const oldStop = url.searchParams.get("stop");

			if (instId) {
				url.searchParams.set("trip", instId);
				url.searchParams.delete("stop");
			} else if (stopId) {
				url.searchParams.set("stop", stopId);
				url.searchParams.delete("trip");
			} else {
				url.searchParams.delete("trip");
				url.searchParams.delete("stop");
			}

			if (url.search !== window.location.search) {
				window.history.replaceState({}, "", url);
			}
		});
	});

	let useRealtime = $state(true);
	let isFollowing = $state(!!params?.get("trip"));
	let hasUserMovedMap = $state(false);
	let isProgrammaticMove = false;
	let isAnimating = $state(false);
	let isDragging = false;
	let animationTimer: ReturnType<typeof setTimeout> | null = null;
	let departureRefreshTimer: ReturnType<typeof setInterval> | null = null;

	let currentTimeSecs = $state(0);
	let currentZoom = $state(13);
	let userLocation = $state<[number, number] | null>(null);

	let userLocationIcon = L.divIcon({
		className: "user-location-marker",
		html: '<div class="user-dot"></div>',
		iconSize: [20, 20],
		iconAnchor: [10, 10],
	});

	let highlightedStopId = $derived.by(() => {
		if (selectedStopId) return selectedStopId;
		if (!selectedTrip) return null;

		// Only highlight if there's an active vehicle position
		const hasVp = vps.some((v: any) => v.instance_id === selectedInstanceId);
		if (!hasVp) return null;

		// Find first stop that hasn't happened yet
		const nextStop = selectedTrip.stopTimes.find((st) => {
			const time = st.actual_arrival_time ?? st.actual_departure_time;
			return time !== null && time > currentTimeSecs;
		});
		return nextStop ? (nextStop.scheduled_parent_station_id ?? nextStop.scheduled_stop_id) : null;
	});

	let fetchController: AbortController | null = null;

	let stationMap = $derived.by(() => {
		const map: Record<string, AugmentedStop> = {};
		stops.forEach((s: AugmentedStop) => (map[s.stop_id] = s));
		return map;
	});

	const createStationIcon = (stopId: string) =>
		L.divIcon({
			className: "station-marker-icon",
			html: `<div class="station-dot" data-stop-id="${stopId}"></div>`,
			iconSize: [8, 8],
			iconAnchor: [4, 4],
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

	async function fetchStationDepartures(stopId: string) {
		isRefreshingDepartures = true;
		try {
			const res = await fetch(`/api/stop/${stopId}`);
			if (res.ok) {
				const data = await res.json();
				selectedStopDepartures = data.departures;
				selectedStopInstances = data.instances;
				selectedStopRoutes = data.routes;
			}
		} catch (err) {
			console.error("Failed to fetch station departures", err);
		} finally {
			isRefreshingDepartures = false;
		}
	}

	function startDepartureRefresh(stopId: string) {
		if (departureRefreshTimer) clearInterval(departureRefreshTimer);
		fetchStationDepartures(stopId);
		departureRefreshTimer = setInterval(() => {
			fetchStationDepartures(stopId);
		}, 30000);
	}

	let stationMarkers: L.Marker[] = [];

	// EFFECT: Handle station markers manually
	$effect(() => {
		if (mapInstance && stops.length > 0) {
			// Clear existing markers
			stationMarkers.forEach((m) => m.remove());
			stationMarkers = [];

			if (currentZoom <= STATION_ZOOM) return;

			stops.forEach((stop: AugmentedStop) => {
				if (stop.stop_lat && stop.stop_lon) {
					const marker = L.marker([stop.stop_lat, stop.stop_lon], {
						icon: createStationIcon(stop.stop_id),
						interactive: true,
					}).addTo(mapInstance!);

					marker.bindTooltip(stop.stop_name ?? "Unknown", {
						direction: "top",
						offset: [0, -5],
					});

					marker.on("click", (e) => {
						L.DomEvent.stopPropagation(e);
						handleStationClick(stop.stop_id);
					});

					stationMarkers.push(marker);
				}
			});

			return () => {
				stationMarkers.forEach((m) => m.remove());
				stationMarkers = [];
			};
		}
	});

	// EFFECT: Handle map interaction events
	$effect(() => {
		if (mapInstance) {
			const handleMoveStart = () => {
				isAnimating = false;
				if (animationTimer) clearTimeout(animationTimer);
				if (!isProgrammaticMove) {
					isFollowing = false;
					hasUserMovedMap = true;
				}
			};

			const handleDragStart = () => {
				isDragging = true;
				isFollowing = false;
			};

			const handleMoveEnd = () => {
				isDragging = false;
				currentZoom = mapInstance?.getZoom() ?? 13;
			};

			const handleMove = () => {
				currentZoom = mapInstance?.getZoom() ?? 13;
			};

			const handleMapClick = (e: L.LeafletMouseEvent) => {
				const clickedElement = e.originalEvent.target as HTMLElement;
				const markerContainer = clickedElement.closest(".marker-container") as HTMLElement;

				if (markerContainer && markerContainer.dataset.instanceId) {
					const id = markerContainer.dataset.instanceId;
					handleTripClick(id);
				}
			};

			mapInstance.on("movestart", handleMoveStart);
			mapInstance.on("moveend", handleMoveEnd);
			mapInstance.on("move", handleMove);
			mapInstance.on("dragstart", handleDragStart);
			mapInstance.on("click", handleMapClick);

			return () => {
				mapInstance?.off("movestart", handleMoveStart);
				mapInstance?.off("moveend", handleMoveEnd);
				mapInstance?.off("move", handleMove);
				mapInstance?.off("dragstart", handleDragStart);
				mapInstance?.off("click", handleMapClick);
			};
		}
	});

	function handleStationClick(stopId: string) {
		console.log("handleStationClick called for", stopId);
		selectedStopId = stopId;
		selectedInstanceId = null;
		selectedTrip = null;
		isFollowing = false;
		startDepartureRefresh(stopId);
	}

	function handleTripClick(instanceId: string) {
		const foundVp = vps.find((v: any) => v.instance_id === instanceId);
		selectedInstanceId = instanceId;
		selectedStopId = null;
		if (departureRefreshTimer) clearInterval(departureRefreshTimer);

		if (foundVp) {
			isFollowing = true;
			isProgrammaticMove = true;
			mapInstance?.flyTo([foundVp.position.latitude, foundVp.position.longitude], 15);
			setTimeout(() => {
				isProgrammaticMove = false;
			}, 500);
		} else {
			isFollowing = false;
		}
		fetchTripDetails(instanceId);
	}

	function locateUser() {
		if (userLocation && mapInstance) {
			isFollowing = false;
			isProgrammaticMove = true;
			mapInstance.flyTo(userLocation, 15);
			setTimeout(() => {
				isProgrammaticMove = false;
			}, 500);
		}
	}

	let sidebarContentElement = $state<HTMLElement | null>(null);
	$effect(() => {
		void selectedStopId;
		if (selectedStopId && sidebarContentElement) {
			sidebarContentElement.scrollTo(0, 0);
		}
	});

	// EFFECT: Invalidate map size when sidebar toggles
	$effect(() => {
		void selectedInstanceId;
		void selectedStopId;
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

		if (id) {
			untrack(() => fetchTripDetails(id));

			const foundVp = currentVps?.find((v: any) => v.instance_id === id);
			if (foundVp) {
				if (isFollowing && mapInstance && !isDragging) {
					isProgrammaticMove = true;
					mapInstance.flyTo([foundVp.position.latitude, foundVp.position.longitude], mapInstance.getZoom());
					setTimeout(() => {
						isProgrammaticMove = false;
					}, 500);
				}
			} else {
				isFollowing = false;
			}
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

		if ("geolocation" in navigator) {
			navigator.geolocation.watchPosition(
				(pos) => {
					userLocation = [pos.coords.latitude, pos.coords.longitude];
				},
				(err) => console.warn("Geolocation error:", err),
				{ enableHighAccuracy: true },
			);
		}

		resize();
		window.addEventListener("resize", resize);
		return () => {
			window.removeEventListener("resize", resize);
			clearInterval(timeInterval);
			if (departureRefreshTimer) clearInterval(departureRefreshTimer);
		};
	});
</script>

<div id="mapContainer" class:animating={isAnimating}>
	{#if selectedTrip || selectedStopId}
		<div class="sidebar">
			<div class="sidebar-header">
				<h3>
					{#if selectedTrip}
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
					{:else if selectedStopId}
						{@const station = stationMap[selectedStopId]}
						Departures: {station?.stop_name ?? "Unknown"}
						<a
							href="/DB/gtfs/{selectedStopId}"
							target="_blank"
							title="View in DepartureBoard"
							style="font-size: 0.8rem; margin-left: 0.5rem; text-decoration: none;"
						>
							🔗
						</a>
					{/if}
				</h3>
				<button
					class="close-btn"
					onclick={() => {
						selectedInstanceId = null;
						selectedTrip = null;
						selectedStopId = null;
						if (departureRefreshTimer) clearInterval(departureRefreshTimer);
						isFollowing = false;
					}}>&times;</button
				>
			</div>
			<div class="sidebar-content" bind:this={sidebarContentElement}>
				{#if selectedTrip}
					<StopTimes
						inst={selectedTrip}
						{useRealtime}
						stations={stationMap}
						route={(selectedTrip.route_id ? routes[selectedTrip.route_id] : null) ?? {}}
						{extraDetails}
						{highlightedStopId}
						onStopClick={handleStationClick}
					/>
				{:else if selectedStopId}
					{#if isRefreshingDepartures && selectedStopDepartures.length === 0}
						<p>Loading departures...</p>
					{:else}
						<div class="scaled-departures">
							<DepartureBoard
								departures={selectedStopDepartures}
								instances={selectedStopInstances}
								routes={selectedStopRoutes}
								stop_id={selectedStopId}
								{extraDetails}
								onTripClick={handleTripClick}
							/>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	{/if}

	<div class="map-wrapper">
		<Map bind:instance={mapInstance} options={{}}>
			<TileLayer url={"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"} />

			{#each shapes as shape}
				{#if shape.points.length > 0}
					<Polyline
						latLngs={shape.points.map((p: any) => [p.shape_pt_lat, p.shape_pt_lon])}
						options={{ color: `#${shape.color}`, weight: 3, opacity: 0.7 }}
					/>
				{/if}
			{/each}

			{#if currentZoom >= VEHICLE_ZOOM}
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
			{/if}

			{#if userLocation}
				<Marker latLng={userLocation} options={{ icon: userLocationIcon, zIndexOffset: 1000 }} />
			{/if}
		</Map>

		<button
			class="locate-btn"
			onclick={locateUser}
			title="Locate Me"
			class:disabled={!userLocation}
			disabled={!userLocation}
		>
			<svg viewBox="0 0 24 24" width="20" height="20">
				<path
					fill="currentColor"
					d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M3.05,13H1V11H3.05C3.5,6.83 6.83,3.5 11,3.05V1H13V3.05C17.17,3.5 20.5,6.83 20.95,11H23V13H20.95C20.5,17.17 17.17,20.5 13,20.95V23H11V20.95C6.83,20.5 3.5,17.17 3.05,13Z"
				/>
			</svg>
		</button>
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
		:global(:root) {
			font-size: min(2.65vw, 1em);
		}
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

		.sidebar-content :global(.tv-stoptimes) {
			transform: scale(1.6);
			transform-origin: top center;
			height: 130%;
		}
	}

	@media (min-width: 769px) {
		.scaled-departures {
			transform: scale(0.7);
			margin-top: -1.5rem;
			margin-left: -2rem;
			transform-origin: top left;
			width: 170%;
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
		overflow-x: hidden;
		padding: 1rem;
	}

	.sidebar-content :global(.tv-stoptimes) {
		align-items: flex-start;
		margin-left: auto;
		margin-right: auto;
	}

	.sidebar-content :global(.tv-stop-time) {
		margin-top: -0.2rem;
		margin-bottom: -0.2rem;
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
		z-index: 2000 !important;
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
		z-index: 1000;
		pointer-events: auto !important;
		cursor: pointer !important;
	}

	:global(.station-dot) {
		width: 8px;
		height: 8px;
		background: white;
		border: 2px solid #2c3e50;
		border-radius: 50%;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
		pointer-events: auto !important;
	}

	:global(.user-location-marker) {
		background: none;
		border: none;
	}

	:global(.user-dot) {
		width: 14px;
		height: 14px;
		background: #4285f4;
		border: 3px solid white;
		border-radius: 50%;
		box-shadow: 0 0 10px rgba(66, 133, 244, 0.6);
	}

	.locate-btn {
		position: absolute;
		bottom: 25px;
		right: 10px;
		z-index: 2000;
		background: white;
		border: 2px solid rgba(0, 0, 0, 0.2);
		border-radius: 4px;
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: #444;
		box-shadow: 0 1px 5px rgba(0, 0, 0, 0.4);
		padding: 0;
	}

	.locate-btn:hover:not(.disabled) {
		background-color: #f4f4f4;
		color: #000;
	}

	.locate-btn.disabled {
		color: #ccc;
		cursor: not-allowed;
		opacity: 0.7;
	}
</style>
