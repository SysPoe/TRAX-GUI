<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import "$lib/styles/common.css";
	import * as qdf from "qdf-gtfs/types";
	import { onMount } from "svelte";
	import { formatTimestamp, type Departure, DepartureBoard } from "$lib";
	import type { PageProps } from "./$types";

	const REFRESH_INTERVAL_MS = 30_000;

	let { data, params }: PageProps = $props();

	let departures = $derived(data.departures as Departure[]);
	let routes = $derived(data.routes as { [route_id: string]: qdf.Route });
	let station = $derived(data.stations.find((v) => v.stop_id === data.stop_id));

	let isRefreshing = $state(false);
	let refreshError: string | null = $state(null);
	let lastUpdated: Date | null = $state(null);
	let refreshTimer: ReturnType<typeof setTimeout> | null = null;

	async function refreshDepartures() {
		if (isRefreshing) return;

		isRefreshing = true;
		refreshError = null;

		let res = await fetch("/api/traxloading").then((r) => r.json());
		if (res.traxLoading) {
			// TRAX is still loading, show a loading indicator
			return;
		}

		try {
			await invalidateAll();
			lastUpdated = new Date();
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unable to refresh departures.";
			refreshError = message;
		} finally {
			isRefreshing = false;
		}
	}

	onMount(() => {
		const scheduleRefresh = () => {
			if (refreshTimer) {
				clearTimeout(refreshTimer);
			}

			refreshTimer = setTimeout(async () => {
				if (document.visibilityState !== "visible") {
					scheduleRefresh();
					return;
				}

				await refreshDepartures();
				scheduleRefresh();
			}, REFRESH_INTERVAL_MS);
		};

		const handleVisibility = () => {
			if (document.visibilityState === "visible") {
				refreshDepartures();
			}
		};

		scheduleRefresh();
		document.addEventListener("visibilitychange", handleVisibility);
		refreshDepartures();

		return () => {
			if (refreshTimer) {
				clearTimeout(refreshTimer);
				refreshTimer = null;
			}
			document.removeEventListener("visibilitychange", handleVisibility);
		};
	});
</script>

<svelte:head>
	<title>
		TRAX Departure Board - {station?.stop_name ?? "Unknown Station"}
	</title>

	<style>
		:root {
			font-size: min(2.4vw, 1em);
		}
	</style>

	<link rel="icon" type="image/svg+xml" href="/favicon-DB.svg" />
</svelte:head>

<div class="header">
	<h1>TRAX <i>DepartureBoard</i></h1>
	<h2>
		Departures from {station?.stop_name ?? "Unknown Station"} in the next 4 hours
	</h2>

	{#if data.admin && data.extraDetails}
		<button onclick={() => console.log(data)}>LogRaw</button>
	{/if}
</div>

<hr />

<div class="refresh-bar" aria-live="polite">
	<button class="refresh-button" onclick={refreshDepartures} disabled={isRefreshing}>
		{isRefreshing ? "Updating…" : "Refresh"}
	</button>
	<span class="refresh-status">
		{#if lastUpdated}
			Last updated at
			{lastUpdated.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
			})}
		{:else}
			Waiting for first update…
		{/if}
		{#if refreshError}
			<span class="refresh-error"> • {refreshError}</span>
		{/if}
	</span>
</div>

<DepartureBoard
	{departures}
	instances={data.instances}
	{routes}
	stop_id={params.stop_id}
	extraDetails={data.extraDetails}
/>

<style>
	* {
		font-family: "Arial";
	}

	.refresh-bar {
		display: flex;
		align-items: center;
		gap: 1rem;
		justify-content: center;
		margin: 1rem auto;
		width: fit-content;
		padding: 0.5rem 0.75rem;
		background-color: rgba(0, 0, 0, 0.04);
		border-radius: 0.5rem;
	}

	.refresh-button {
		font-family: "Arial";
		font-size: 1rem;
		font-weight: 600;
		padding: 0.35rem 1.2rem;
		border: 0.15rem solid #000;
		background-color: #fff;
		cursor: pointer;
		transition:
			background-color 150ms ease,
			transform 150ms ease;
	}

	.refresh-button:disabled {
		cursor: not-allowed;
		background-color: #eee;
		transform: none;
	}

	.refresh-button:not(:disabled):hover {
		background-color: #eef;
		transform: translateY(-1px);
	}

	.refresh-status {
		font-family: "Arial";
		font-size: 0.9rem;
		color: #333;
	}

	.refresh-error {
		color: #b22222;
		font-weight: 600;
	}
</style>
