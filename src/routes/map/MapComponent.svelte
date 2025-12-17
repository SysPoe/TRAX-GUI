<script lang="ts">
	import { Map, TileLayer, Marker, Polyline } from "sveaflet";
	import L from "leaflet"; // Import Leaflet for custom icons
	import "leaflet/dist/leaflet.css";
	import type { AugmentedStop, AugmentedTripInstance } from "translink-rail-api";
	import type { RealtimeVehiclePosition, Route, Shape } from "qdf-gtfs/types";
	import { onMount } from "svelte";

	export let vps: (RealtimeVehiclePosition & {
		tripInstance: AugmentedTripInstance | null;
	})[];
	export let shapes: { [key: string]: (Shape & { color: string })[] };
	export let biggest: AugmentedStop;
	export let stops: AugmentedStop[];
	export let routes: { [key: string]: Route };

	// Define the custom IPBR icon
	// Replace 'path/to/your/logo.png' with the actual path to your image
	const ipbrIcon = (label: string, route: Route) =>
		L.divIcon({
			className: "custom-ipbr-marker",
			html: `
            <div class="marker-container">
                <div class="logo-circle" style="background-color: ${route.route_color ? `#${route.route_color}` : "#000"};">
                    <span class="logo-text">${route.route_short_name}</span>
                </div>
                <div class="run-label">${label}</div>
            </div>
        `,
			iconSize: [40, 40],
			iconAnchor: [20, 20],
		});

	let resize = () => {
		document.querySelector("#mapContainer")?.setAttribute(
			"style",
			`
            width: 100%;
            height: calc(calc(100vh - 2rem) - ${document.querySelector("nav")?.getBoundingClientRect()?.height ?? 0}px);
        `,
		);
	};

	onMount(() => {
		resize();
		window.addEventListener("resize", resize);
	});
</script>

<div style="width:100%;height:100vh;" id="mapContainer">
	<Map options={{ center: [biggest.stop_lat ?? 0, biggest.stop_lon ?? 0], zoom: 13 }}>
		<TileLayer url={"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"} />

		{#each Object.keys(shapes) as shapeId}
			{@const shapePoints = shapes[shapeId]}
			<Polyline
				latLngs={shapePoints.map((p) => [p.shape_pt_lat, p.shape_pt_lon])}
				options={{ color: shapePoints[0].color, weight: 3, opacity: 0.7 }}
			/>
		{/each}

		{#each vps as vp}
			{@const runLabel = vp.tripInstance ? `${vp.tripInstance.run}` : "???"}
			<Marker
				latLng={[vp.position.latitude, vp.position.longitude]}
				options={{
					icon: ipbrIcon(runLabel, vp.tripInstance?.route_id ? routes[vp.tripInstance.route_id] : { route_short_name: "?", route_color: "000000" } as Route),
					rotationAngle: vp.position.bearing ?? 0,
					rotationOrigin: "center center",
				}}
			/>
		{/each}
	</Map>
</div>

<style>
	/* Styling to match the uploaded logo design */
	:global(.custom-ipbr-marker) {
		background: transparent;
		border: none;
	}

	:global(.marker-container) {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
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
		color: white;
		font-weight: bold;
		font-family: sans-serif;
		font-size: 10px;
	}

	:global(.run-label) {
		background: white;
		padding: 1px 4px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: bold;
		border: 1px solid #ccc;
	}
</style>
