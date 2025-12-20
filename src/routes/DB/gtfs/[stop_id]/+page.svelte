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
	let station = $derived(data.stop || data.stations.find((v) => v.stop_id === data.stop_id));
	let facilities = $derived((data.stop as any)?.regionSpecific?.SEQ?.facilities);

	function formatFacilityName(key: string): string {
		return key
			.replace("facility_", "")
			.replace(/_/g, " ")
			.replace(/\b\w/g, (l) => l.toUpperCase())
			.replace("Avvm", "(AVVM)")
			.replace("Cctv", "CCTV")
			.replace("Lh", "LH")
			.replace("Rh", "RH")
			.replace("Sginfor", "Sign Information")
			.replace("Tv", "TV");
	}

	function formatSgKey(key: string): string {
		if (key === "all") return "All Platforms";
		if (/^p\d+$/.test(key)) return `Platform ${key.slice(1)}`;
		return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
	}

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
			font-size: min(2.65vw, 1em);
		}
	</style>

	<link rel="icon" type="image/svg+xml" href="/favicon-DB.svg" />
</svelte:head>

<div class="header">
	<div class="header-main">
		<h1>TRAX <i>DepartureBoard</i></h1>
		<a href="/map?stop={data.stop_id}" class="btn-map" title="View on map">
			🗺️
		</a>
	</div>
	<h2>
		Departures from {station?.stop_name ?? "Unknown Station"} in the next 4 hours
	</h2>

	{#if data.admin && data.extraDetails}
		<button onclick={() => console.log(data)}>LogRaw</button>
	{/if}

	{#if facilities}
		<details class="station-info">
			<summary>Station Information</summary>
			<div class="info-content">
				{#if facilities.ohours?.sections}
					<div class="info-section">
						<h3>Opening Hours</h3>
						{#each facilities.ohours.sections as section}
							<div class="ohours-section">
								<h4>{section.title}</h4>
								<ul>
									{#each section.times as time}
										<li>
											<strong>{time.days}:</strong> {time.open} - {time.close}
											{#if time.status} <span class="status-tag">{time.status}</span>{/if}
											{#if time.note} <br /><small class="note-text">{time.note}</small>{/if}
										</li>
									{/each}
								</ul>
							</div>
						{/each}
					</div>
				{/if}

				<div class="info-section">
					<h3>Facilities</h3>
					<div class="facilities-list">
						{#each Object.entries(facilities) as [key, value]}
							{#if key.startsWith("facility_") && value}
								<div class="facility-item">
									<span class="facility-name">
										{formatFacilityName(key)}
									</span>
									{#if typeof value === "number"}
										<span class="facility-value">: {value}</span>
									{/if}
								</div>
							{/if}
						{/each}
					</div>
				</div>

				{#if facilities.sginfor}
					<div class="info-section">
						<h3>Platform & Sign Info</h3>
						<div class="sg-list">
							{#each Object.entries(facilities.sginfor) as [key, value]}
								{#if key !== "_notes" && value !== undefined}
									<div class="sg-item">
										<strong>{formatSgKey(key)}:</strong>
										{#if typeof value === "object" && value !== null && "level" in value}
											{@const levelVal = value as any}
											<span class="level-tag level-{levelVal.level}">{levelVal.level}</span>
											{#if levelVal.note}<br /><small class="level-note">{levelVal.note}</small>{/if}
										{:else if Array.isArray(value)}
											{value.join(", ")}
										{:else}
											{value}
										{/if}
									</div>
								{/if}
							{/each}
						</div>
						{#if facilities.sginfor._notes && facilities.sginfor._notes.length > 0}
							<div class="sg-notes">
								<h4>Notes</h4>
								<ul>
									{#each facilities.sginfor._notes as note}
										<li>{note}</li>
									{/each}
								</ul>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</details>
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
		padding: 0.4rem 1.2rem;
		border: none;
		background-color: #2980b9;
		color: #fff;
		border-radius: 4px;
		cursor: pointer;
		transition:
			background-color 150ms ease,
			transform 150ms ease;
	}

	.refresh-button:disabled {
		cursor: not-allowed;
		background-color: #a5c7dd;
		transform: none;
	}

	.refresh-button:not(:disabled):hover {
		background-color: #1f6391;
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

	.station-info {
		margin: 1rem auto;
		border: 1px solid #e1e4e8;
		border-radius: 8px;
		background: #fff;
		overflow: hidden;
		max-width: 850px;
		width: 95%;
		text-align: left;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
	}

	.station-info summary {
		padding: 0.6rem 1.25rem;
		cursor: pointer;
		background: #f8f9fa;
		font-weight: 700;
		font-size: 0.95rem;
		color: #2c3e50;
		user-select: none;
		transition: background-color 0.2s;
	}

	.station-info summary:hover {
		background: #edf2f7;
	}

	.info-content {
		padding: 1rem;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.25rem;
		border-top: 1px solid #e1e4e8;
	}

	.info-section h3 {
		margin: 0 0 0.6rem 0;
		color: #2980b9;
		font-size: 1rem;
		border-bottom: 2px solid #3498db;
		padding-bottom: 0.25rem;
	}

	.ohours-section h4 {
		margin: 1rem 0 0.5rem 0;
		color: #444;
		font-size: 1rem;
	}

	.ohours-section ul,
	.sg-notes ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.ohours-section li {
		margin-bottom: 0.5rem;
		font-size: 0.95rem;
	}

	.status-tag {
		font-size: 0.75rem;
		padding: 0.1rem 0.4rem;
		background: #e1e4e8;
		border-radius: 4px;
		margin-left: 0.4rem;
		vertical-align: middle;
	}

	.note-text {
		color: #666;
		font-style: italic;
	}

	.facilities-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.facility-item {
		background: #ebf8ff;
		color: #2b6cb0;
		padding: 0.25rem 0.6rem;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 500;
		border: 1px solid #bee3f8;
	}

	.sg-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.sg-item {
		font-size: 0.95rem;
		line-height: 1.4;
	}

	.level-tag {
		text-transform: uppercase;
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.1rem 0.5rem;
		border-radius: 12px;
		margin-left: 0.5rem;
	}

	.level-all {
		background: #c6f6d5;
		color: #22543d;
	}
	.level-partial {
		background: #feebc8;
		color: #744210;
	}
	.level-none {
		background: #fed7d7;
		color: #822727;
	}

	.level-note {
		display: inline-block;
		margin-top: 0.2rem;
		font-size: 0.85rem;
		line-height: 1.3;
		color: #4a5568;
	}

	.sg-notes h4 {
		margin: 1.5rem 0 0.5rem 0;
		font-size: 1rem;
		color: #4a5568;
	}

	.sg-notes li {
		position: relative;
		padding-left: 1.2rem;
		margin-bottom: 0.4rem;
		font-size: 0.9rem;
		color: #4a5568;
	}

	.sg-notes li::before {
		content: "•";
		position: absolute;
		left: 0;
		color: #2980b9;
		font-weight: bold;
	}
</style>
