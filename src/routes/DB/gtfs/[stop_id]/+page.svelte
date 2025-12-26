<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import "$lib/styles/common.css";
	import * as qdf from "qdf-gtfs/types";
	import { onMount } from "svelte";
	import { type Departure, DepartureBoard } from "$lib";
	import type { PageProps } from "./$types";
	import DepartureBoardGrouped from "$lib/DepartureBoardGrouped.svelte";

	const REFRESH_INTERVAL_MS = 30_000;

	let newLayout = $state(false);

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

	{#if !newLayout}
		<style>
			:root {
				font-size: min(2.65vw, 1em);
			}
		</style>
	{/if}

	<link rel="icon" type="image/svg+xml" href="/favicon-DB.svg" />
</svelte:head>

<div class="header">
	<div class="header-main">
		<h1>TRAX <i>DepartureBoard</i></h1>
		<a href="/map?stop={data.stop_id}" class="btn-map" title="View on map"> 🗺️ </a>
	</div>
	<h2>
		Departures from {station?.stop_name ?? "Unknown Station"} in the next 8 hours
	</h2>

	{#if data.admin && data.extraDetails}
		<button onclick={() => console.log(data)}>LogRaw</button>
		
		<button
			onclick={() => {
				newLayout = !newLayout;
			}}
		>
			{#if newLayout}
				Switch to old layout
			{:else}
				Switch to experimental layout
			{/if}
		</button>
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
									{#each section.times.filter((t: { days: string }, i: any, arr: any[]) => {
										if (t.days?.toLowerCase().includes("holiday")) {
											return arr.findIndex((x: { days: string }) => x.days
														?.toLowerCase()
														.includes("holiday")) === i;
										}
										return true;
									}) as time}
										<li>
											{#if time.days?.toLowerCase().includes("holiday")}
												<strong>Public holiday hours may vary.</strong>
											{:else}
												<strong>{time.days?.replace(/[:-\s]+$/, "")}:</strong>
												{#if time.open && time.open !== "-"}
													{time.open} - {time.close}
												{:else}
													{time.status || "Closed"}
												{/if}
												{#if time.status && time.open && time.open !== "-"}
													<span class="status-tag">{time.status}</span>
												{/if}
												{#if time.note}
													<br /><small class="note-text">{time.note}</small>
												{/if}
											{/if}
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
						<h3>Accessibility Info</h3>
						<div class="sg-list">
							{#each Object.entries(facilities.sginfor) as [key, value]}
								{#if key !== "_notes" && value !== undefined}
									<div class="sg-item">
										<strong>{formatSgKey(key)}:</strong>
										{#if typeof value === "object" && value !== null && "level" in value}
											{@const levelVal = value as any}
											<span class="level-tag level-{levelVal.level}">{levelVal.level}</span>
											{#if levelVal.note}<br /><small class="level-note"
													>{levelVal.note
														.replace(/^Platforms? \d((, \d)+ and \d)? (is|are) /, "")
														.trim()}</small
												>{/if}
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

<div class="board-header-container">
	<div class="refresh-bar" aria-live="polite">
		<button class="refresh-btn-simple" onclick={refreshDepartures} disabled={isRefreshing}>
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

	{#if !newLayout}
		<div class="column-labels-row">
			<div class="column-labels">
				<div class="hdr-grp-left">
					<div class="hdr-col hdr-platform">Platform</div>
					<div class="hdr-sep">|</div>
					<div class="hdr-col hdr-destination">Destination</div>
				</div>
				<div class="hdr-grp-right">
					<div class="hdr-col hdr-express">Express</div>
					<div class="hdr-col hdr-departs">
						<span class="hdr-sep-right">|</span>
						Departs in
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

{#if newLayout}
	<DepartureBoardGrouped
		{departures}
		instances={data.instances}
		{routes}
		stop_id={params.stop_id}
		extraDetails={data.extraDetails}
		stations={data.stations}
	/>
{:else}
	<DepartureBoard
		{departures}
		instances={data.instances}
		{routes}
		stop_id={params.stop_id}
		extraDetails={data.extraDetails}
	/>
{/if}

<style>
	* {
		font-family: "Arial";
	}

	.board-header-container {
		width: 100%;
		margin: 1.5rem auto 0;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.refresh-bar {
		display: flex;
		align-items: center;
		gap: 1rem;
		justify-content: center;
		margin-bottom: 0.75rem;
		padding: 0.5rem;
	}

	.refresh-btn-simple {
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		padding: 0.4rem 1rem;
		border: none;
		background-color: #2980b9;
		color: #fff;
		border-radius: 4px;
		cursor: pointer;
	}

	.refresh-btn-simple:disabled {
		background-color: #a5c7dd;
		cursor: not-allowed;
	}

	.refresh-status {
		font-size: 0.9rem;
		color: #333;
	}

	.column-labels-row {
		width: 100%;
		display: flex;
		justify-content: center;
		border-bottom: 2px solid #333;
		padding-bottom: 2px;
	}

	.column-labels {
		display: flex;
		justify-content: space-between;
		align-items: center;
		/* Matches total width of board rows */
		width: 31.7rem;
		padding: 0 0.2rem;
	}

	.hdr-grp-left {
		display: flex;
		align-items: center;
		width: 21.2rem; /* 5.2 + 16 */
	}

	.hdr-grp-right {
		display: flex;
		align-items: center;
		width: 10.5rem; /* 1.5 + 9 */
		position: relative;
	}

	.hdr-col {
		font-weight: 400;
		color: #333;
		font-size: 1.1rem;
		font-family: Arial, sans-serif;
	}

	.hdr-platform {
		width: 5.2rem;
		text-align: center;
	}

	.hdr-destination {
		flex: 1;
		text-align: left;
		padding-left: 0.5rem;
	}

	.hdr-express {
		width: 1.5rem;
		display: flex;
		justify-content: center;
		overflow: visible;
		white-space: nowrap;
		/* High z-index to ensure text is visible if it crosses lines, though we fix layout to allow space */
		z-index: 1;
	}

	.hdr-departs {
		width: 9rem;
		text-align: right;
		position: relative;
		/* Ensure the separator inside this container is positioned correctly */
	}

	.hdr-sep {
		color: #999;
		margin: 0 0.1rem;
		font-style: normal;
	}

	/* Separator specifically for the right group, positioned to clear "Express" text */
	.hdr-sep-right {
		position: absolute;
		left: 2.6rem; /* Push separator into the column to clear "Express" but keep it closer */
		top: 50%;
		transform: translateY(-50%);
		color: #999;
		font-style: normal;
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
