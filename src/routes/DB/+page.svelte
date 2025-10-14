<script lang="ts">
	import type { PageProps } from "./$types";
	import { goto } from "$app/navigation";
	import "$lib/styles/common.css";
	import type { SerializableAugmentedStop } from "translink-rail-api";
	import { onMount } from "svelte";

	const { data }: PageProps = $props();
	let loading = $state(false);
	let filterText = $state("");

	let filteredStations = $derived(
		data.stations.filter((station) => {
			const filter = filterText.toLowerCase().trim();
			if (!filter) return true;

			const name = station.stop_name?.toLowerCase() || "";
			const id = station.stop_id?.toLowerCase() || "";
			return name.includes(filter) || id.includes(filter);
		}),
	);

	// svelte-ignore state_referenced_locally
	let sortedStations = $state<SerializableAugmentedStop[]>([]);

	$effect(() => {
		Promise.all(
			filteredStations.map(async (station) => ({
				station,
				dist: await dist(station.stop_lat ?? 0, station.stop_lon ?? 0),
			})),
		).then((results) => {
			sortedStations = results
				.sort((a, b) => {
					if (a.dist !== b.dist) return a.dist - b.dist;
					return a.station.stop_id.localeCompare(b.station.stop_id);
				})
				.map((r) => r.station);
		});
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" && filteredStations.length === 1) {
			loading = true;
			if (event.shiftKey || event.ctrlKey || event.metaKey) {
				// Open in new tab if modifier key is held
				window.open(`/DB/gtfs/${filteredStations[0].stop_id}`, "_blank");
				loading = false;
				return;
			}
			goto(`/DB/gtfs/${filteredStations[0].stop_id}`);
		}
	}

	// Get distance from current location
	function dist(lat: number, lon: number): Promise<number> {
		if (!navigator.geolocation) return new Promise<number>((res) => res(Infinity));
		const toRad = (x: number) => (x * Math.PI) / 180;

		return new Promise<number>((resolve) => {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					const R = 6371; // km
					const dLat = toRad(lat - position.coords.latitude);
					const dLon = toRad(lon - position.coords.longitude);
					const a =
						Math.sin(dLat / 2) * Math.sin(dLat / 2) +
						Math.cos(toRad(position.coords.latitude)) *
							Math.cos(toRad(lat)) *
							Math.sin(dLon / 2) *
							Math.sin(dLon / 2);
					const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
					const d = R * c;
					resolve(d);
				},
				() => resolve(Infinity),
			);
		});
	}

	function errorCallback(error: GeolocationPositionError) {
		console.error(`GEO ERROR(${error.code}): ${error.message}`);
		sortedStations = [...sortedStations];
	}

	sortedStations = [...sortedStations];

	onMount(() => {
		navigator.geolocation.getCurrentPosition(() => {
			sortedStations = [...sortedStations];
		}, errorCallback);
	});
</script>

<svelte:head>
	<title>TRAX Departure Board</title>
	<link rel="icon" type="image/svg+xml" href="/favicon-DB.svg" />
	<link rel="prefetch" href="/img/loading.svg" />
</svelte:head>

<div class="title">
	<h1>TRAX <i>DepartureBoard</i></h1>
	<p>Select a station to view departures...</p>
	{#if loading}
		<p><img src="/img/loading.svg" alt="Loading..." /></p>
		<p>Loading... This will most likely take less than 2 minutes</p>
	{:else}
		<input
			type="text"
			name="filter"
			id="filter"
			placeholder="Filter stations..."
			bind:value={filterText}
			onkeydown={handleKeydown}
		/>
	{/if}
</div>

{#if !loading}
	<div class="stations">
		{#each sortedStations as station}
			<div data-id={station.stop_id} data-name={station.stop_name} class="station">
				<a
					href="/DB/gtfs/{station.stop_id}"
					onclick={(ev) => {
						loading = true;
						if (ev.shiftKey || ev.ctrlKey || ev.metaKey || ev.type === "auxclick") {
							// Open in new tab if modifier key is held
							ev.preventDefault();
							window.open(`/DB/gtfs/${station.stop_id}`, "_blank");
							loading = false;
							return;
						}
						goto(`/DB/gtfs/${station.stop_id}`);
					}}
				>
					{station.stop_name}
				</a>
			</div>
		{/each}
	</div>
{/if}

<style>
	.title input[type="text"] {
		padding: 0.5rem 1rem;
		font-size: 1rem;
		border: 1px solid #ccc;
		border-radius: 6px;
		width: 300px;
		max-width: 90vw;
		box-shadow: 0 2px 8px rgba(44, 62, 80, 0.05);
		margin-top: 0.5rem;
		transition: border-color 0.2s;
	}
	.title input[type="text"]:focus {
		border-color: #2980b9;
		outline: none;
	}
	.stations {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: center;
		margin-top: 2rem;
		max-width: 1000px;
		margin-left: auto;
		margin-right: auto;
	}
	.station {
		background: #f8f9fa;
		border: 1px solid #e1e4e8;
		border-radius: 8px;
		padding: 1rem 1.5rem;
		min-width: 180px;
		text-align: center;
		box-shadow: 0 2px 8px rgba(44, 62, 80, 0.07);
		transition:
			box-shadow 0.2s,
			border-color 0.2s;
		width: 250px;
		font-family: "Inter";
	}
	.station:hover {
		box-shadow: 0 4px 16px rgba(41, 128, 185, 0.12);
		border-color: #2980b9;
	}
	.station a {
		text-decoration: none;
		color: #2980b9;
		font-size: 1.1rem;
		font-weight: 500;
		transition: color 0.2s;
	}
	.station a:hover {
		color: #1abc9c;
		text-decoration: underline;
	}
</style>
