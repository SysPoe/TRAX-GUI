<script lang="ts">
	import type { PageProps } from "./$types";
	import { goto } from "$app/navigation";
	import "$lib/styles/common.css";
	import type { SerializableAugmentedStop } from "translink-rail-api";
	import { onMount } from "svelte";

	const { data }: PageProps = $props();
	let loading = $state(false);
	let filterText = $state("");
	
	// Store user location in state (initialized to null)
	let userLocation = $state<{ lat: number; lon: number } | null>(null);

	// 1. First, simply filter the list based on text input
	let filteredStations = $derived(
		data.stations.filter((station) => {
			const filter = filterText.toLowerCase().trim();
			if (!filter) return true;

			const name = station.stop_name?.toLowerCase() || "";
			const id = station.stop_id?.toLowerCase() || "";
			return name.includes(filter) || id.includes(filter);
		}),
	);

	// 2. Derive the sorted list based on availability of userLocation
	let sortedStations = $derived.by(() => {
		// If we don't have location yet, just show the filtered list immediately!
		if (!userLocation) {
			return filteredStations;
		}

		// If we DO have location, sort by distance
		return [...filteredStations].sort((a, b) => {
			const distA = calculateDistance(
				userLocation!.lat, 
				userLocation!.lon, 
				a.stop_lat ?? 0, 
				a.stop_lon ?? 0
			);
			const distB = calculateDistance(
				userLocation!.lat, 
				userLocation!.lon, 
				b.stop_lat ?? 0, 
				b.stop_lon ?? 0
			);
			return distA - distB;
		});
	});

	// Pure Math Helper (Synchronous)
	function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
		const toRad = (x: number) => (x * Math.PI) / 180;
		const R = 6371; // km
		const dLat = toRad(lat2 - lat1);
		const dLon = toRad(lon2 - lon1);
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(toRad(lat1)) *
				Math.cos(toRad(lat2)) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" && filteredStations.length === 1) {
			loading = true;
			if (event.shiftKey || event.ctrlKey || event.metaKey) {
				window.open(`/DB/gtfs/${filteredStations[0].stop_id}`, "_blank");
				loading = false;
				return;
			}
			goto(`/DB/gtfs/${filteredStations[0].stop_id}`);
		}
	}

	// Fetch Location ONCE on mount
	onMount(() => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					userLocation = {
						lat: position.coords.latitude,
						lon: position.coords.longitude
					};
				},
				(error) => {
					console.error(`GEO ERROR(${error.code}): ${error.message}`);
					// No need to reset sortedStations, it will just stay as filteredStations
				}
			);
		}
	});
</script>

<svelte:head>
	<title>TRAX Departure Board</title>
	<link rel="icon" type="image/svg+xml" href="/favicon-DB.svg" />
</svelte:head>

<h1>TRAX DepartureBoard</h1>
<p>Select a station to view departures.</p>

{#if loading}
    <p>Loading... Please wait.</p>
{:else}
    <p>
        Filter stations:
        <input
            type="text"
            name="filter"
            size="30"
            bind:value={filterText}
            onkeydown={handleKeydown}
        />
    </p>
{/if}

<hr>

{#if !loading}
	<ul>
		{#each sortedStations as station (station.stop_id)}
			<li>
                <a href="/DB/gtfs/{station.stop_id}"
                   onclick={(ev) => {
					loading = true;
					if (ev.shiftKey || ev.ctrlKey || ev.metaKey || ev.type === "auxclick") {
						ev.preventDefault();
						window.open(`/DB/gtfs/${station.stop_id}`, "_blank");
						loading = false;
						return;
					}
					// goto is handled by anchor tag mostly, but we use it for SPA feel if needed.
                    // Actually, for retro feel, full page load is fine, but we keep SPA for speed.
                    ev.preventDefault();
					goto(`/DB/gtfs/${station.stop_id}`);
				   }}>
                    {station.stop_name}
                </a>
            </li>
		{/each}
	</ul>
{/if}
