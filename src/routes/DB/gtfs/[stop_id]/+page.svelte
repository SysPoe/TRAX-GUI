<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import "$lib/styles/common.css";
	import type { UpcomingQRTravelDeparture } from "$lib";
	import * as qdf from "qdf-gtfs/types";
	import { onMount } from "svelte";
	import { type AugmentedStopTime } from "translink-rail-api";
	import type { PageProps } from "./$types";
	import UserIcon from "$lib/UserIcon.svelte";

	type Departure =
		| (AugmentedStopTime & {
				dep_type: "gtfs";
				express_string: string;
				last_stop_id: string;
				scheduled_departure_time: string;
				actual_departure_time: string;
				departs_in: string;
				departsInSecs: number;
		  })
		| UpcomingQRTravelDeparture;

	const REFRESH_INTERVAL_MS = 30_000;

	let { data, params }: PageProps = $props();

	let departures = $derived(data.departures as Departure[]);
	let routes = $derived(data.routes as { [route_id: string]: qdf.Route });
	let station = $derived(data.stations.find((v) => v.stop_id === data.stop_id));

	// --- Departure type filtering ---
	function getDepType(dep: Departure) {
		if (dep.dep_type === "gtfs") {
			const instance = data.instances[dep.instance_id];
			if (instance?.schedule_relationship === qdf.TripScheduleRelationship.CANCELED) return "canceled";
			if (dep.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED) return "skipped";
			if (dep.last_stop_id === params.stop_id) return "term";
			if (dep.passing) return "passing";
			return "scheduled";
		}

		// For QRT departures, classify as passing or scheduled
		if (dep.dep_type === "qrt") {
			return dep.passing ? "passing" : "scheduled";
		}

		return "scheduled";
	}

	function sortDepTypes(arr: string[]) {
		const order = ["scheduled", "skipped", "canceled", "term", "passing"];
		return arr.sort((a, b) => {
			const ia = order.indexOf(a);
			const ib = order.indexOf(b);
			if (ia === -1 && ib === -1) return a.localeCompare(b);
			if (ia === -1) return 1; // unknowns go after known order
			if (ib === -1) return -1;
			return ia - ib;
		});
	}

	let depTypes = $derived(sortDepTypes([
		...new Set((departures as Departure[]).map((d) => getDepType(d))),
	]));

	let selectedDepTypes = $state(new Set<string>());
	let hasInit = false;
	let hasAppliedExtra = false;

	function storageKey() {
		return `depTypes:${params.stop_id}`;
	}

	

	function writeSelectedTypesToStorage() {
		if (typeof window === "undefined") return;
		if (selectedDepTypes.size === 0) {
			localStorage.removeItem(storageKey());
		} else {
			localStorage.setItem(storageKey(), Array.from(selectedDepTypes).join(","));
		}
	}

	function readSelectedTypesFromStorage() {
		if (typeof window === "undefined") return null as string[] | null;
		const raw = localStorage.getItem(storageKey());
		if (!raw) return null;
		const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
		const valid = parts.filter((p) => depTypes.includes(p as any));
		return valid.length > 0 ? valid : null;
	}

	$effect(() => {
		// Initialize selection once we have types available
		if (!hasInit && depTypes.length > 0) {
			// Prefer localStorage; ignore URL parameters
			const stored = readSelectedTypesFromStorage();
			if (stored && stored.length > 0) {
				selectedDepTypes = new Set(stored);
			} else if (data.extraDetails) {
				// extra details => show all types by default
				selectedDepTypes = new Set(depTypes);
			} else {
				// default to only scheduled
				selectedDepTypes = new Set(["scheduled"]);
			}

			hasInit = true;
			// reflect initial selection in storage
			writeSelectedTypesToStorage();
		}

		// If extraDetails becomes enabled after init, expand selection to include all once
		if (hasInit && data.extraDetails && !hasAppliedExtra) {
			selectedDepTypes = new Set(depTypes);
			hasAppliedExtra = true;
			writeSelectedTypesToStorage();
		}

		// Reset the extraDetails-applied flag when extraDetails is turned off
		if (hasInit && !data.extraDetails) {
			hasAppliedExtra = false;
		}
	});

	function toggleDepType(type: string) {
		const next = new Set(selectedDepTypes);
		next.has(type) ? next.delete(type) : next.add(type);
		if (next.size === 0) {
			// Prevent empty selection; default to scheduled
			next.add("scheduled");
		}
		selectedDepTypes = next;
		writeSelectedTypesToStorage();
	}

	let filteredDepartures = $derived(
		(departures as Departure[]).filter((d) => selectedDepTypes.has(getDepType(d))),
	);


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

{#if depTypes.length > 0}
	<div class="filters">
		<span class="filter-label">Type:</span>
		{#each depTypes.filter(t => t !== 'passing' || data.extraDetails) as t}
			<button class:active={selectedDepTypes.has(t)} onclick={() => toggleDepType(t)}>
				{t === 'scheduled' ? 'Scheduled' : t === 'canceled' ? 'Canceled' : t === 'skipped' ? 'Skipped' : t === 'term' ? 'Terminating' : t === 'passing' ? 'Passing' : t}
			</button>
		{/each}
	</div>
{/if}

<div class="departures">
	{#each filteredDepartures as dep}
		{#if dep.dep_type === "gtfs"}
			{@const instance = data.instances[dep.instance_id]}
			{@const route = routes[instance.route_id ?? ""]}
			{@const express = dep.express_string.toLowerCase() != "all stops"}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<a
				class="departure gtfs {instance.schedule_relationship === qdf.TripScheduleRelationship.CANCELED ||
				dep.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED
					? 'canceled'
					: dep.last_stop_id == params.stop_id
						? 'term'
						: dep.passing
							? 'passing'
							: ''}"
				href={`/TV/trip/gtfs/${dep.instance_id}#stoptimes`}
			>
				<span class="platform" style="background-color: #{route.route_color}">
					{dep.actual_platform_code ?? "?"}
				</span>
				<span class="smalltext">
					<span class="time">Sch. {qdf.formatTimestamp(dep.scheduled_departure_time)}</span>
					{#if data.extraDetails}
						<span class="run">{instance.run}</span>
					{/if}
					service to
					<br /><span class="headsign">
						{instance.trip_headsign?.replace(/station$/, "").trim()}
					</span>
				</span>
				<span
					class="service-type {instance.schedule_relationship === qdf.TripScheduleRelationship.CANCELED ||
					dep.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED
						? 'canceled'
						: dep.last_stop_id == params.stop_id
							? 'term'
							: dep.passing
								? 'passing'
								: express
									? 'express'
									: 'all-stops'}"
				>
					{instance.schedule_relationship === qdf.TripScheduleRelationship.CANCELED
						? "C"
						: dep.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED
							? "S"
							: dep.last_stop_id == params.stop_id
								? "T"
								: dep.passing
									? "P"
									: express
										? "E"
										: "A"}
				</span>
				<div class="time-container">
					<span class="departs_in">
						{dep.departs_in
							.replace(/^0h /, "")
							.replace(/(?<=h) 0m/, "")
							.replace(/^0m$/, "now")}
					</span>
					<div class="departs-sub">
						<span
							class="delay {instance.schedule_relationship === qdf.TripScheduleRelationship.CANCELED ||
							dep.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED
								? 'canceled'
								: (dep.realtime_info?.delay_class ?? 'scheduled')}"
						>
							{instance.schedule_relationship === qdf.TripScheduleRelationship.CANCELED
								? "canceled"
								: dep.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED
									? "skipped"
									: (dep.realtime_info?.delay_string ?? "scheduled")}
						</span>
						{#if dep.service_capacity != null}
							<span class="serviceCapacity">
								{#if dep.service_capacity.toLowerCase().trim() === "space available"}
									<UserIcon fill="black" />
									<UserIcon fill="#DDD" />
									<UserIcon fill="#DDD" />
								{:else if dep.service_capacity.toLowerCase().trim() === "some space available"}
									<UserIcon fill="black" />
									<UserIcon fill="black" />
									<UserIcon fill="#DDD" />
								{:else if dep.service_capacity.toLowerCase().trim() === "limited space available"}
									<UserIcon fill="black" />
									<UserIcon fill="black" />
									<UserIcon fill="black" />
								{/if}
							</span>
						{/if}
					</div>
				</div>
			</a>
			<hr />
		{:else if dep.dep_type === "qrt"}
			<a
				class="departure {dep.passing ? 'passing' : 'qr-travel'} qrt"
				href={`/TV/trip/QRT/${dep.service.serviceId}#stoptimes`}
			>
				<!-- <span class="last-stop">
        {dep.last_stop_id.slice(-6, -3).toUpperCase()}
      </span> -->
				<span class="platform qr-travel"> ? </span>
				<span class="smalltext">
					<span class="time">Sch. {(dep.stop?.estimatedPassingTime ?? (dep.stop?.plannedDeparture === "0001-01-01T00:00:00" ? dep.stop?.plannedArrival : dep.stop?.plannedDeparture))?.slice(11, 16)}</span>
					<span class="run">{dep.run}</span> service to <br />
					<span class="headsign">
						{dep.service.stops
							.at(-1)
							?.placeName.replace(/^Brisbane -/, "")
							.trim() ?? "Unknown"}
					</span>
				</span>
				<span class="service-type {dep.passing ? 'passing' : 'qr-travel'}">
					{dep.passing ? "P" : "Q"}
				</span>
				<span class="time-container">
					<span class="departs_in">
						{dep.departureString}
					</span>

					<span class="departs-sub delay {dep.delayClass}">
						{dep.delayString}
					</span>
				</span>
			</a>
			<hr />
		{/if}
	{:else}
		<p>No departures found in the next 4 hours.</p>
	{/each}
</div>

<style>
	* {
		font-family: "Arial";
	}

	.departures {
		font-family: "Arial Narrow", Arial, sans-serif;
		padding: 0.2rem;
		height: 3rem;
		width: fit-content;
		margin-left: auto;
		margin-right: auto;
	}

	.departure {
		display: block;
		width: fit-content;
		color: inherit;
		text-decoration: none;
	}
	.departure.passing {
		background-color: #ccc;
	}
	.departure.term {
		background-color: rgb(236, 215, 255);
	}
	.departure.qr-travel {
		background-color: #fec796;
	}
	.departure.canceled {
		background-color: #c48989;
	}
	.departure.canceled:hover {
		background-color: #c48989;
		box-shadow: 0 0 1rem #8c4141;
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

	.last-stop {
		font-family: "Arial";
		font-weight: 900;
		font-synthesis: weight;
		font-synthesis-weight: 900;
		font-size: 3rem;
		width: 8rem;
		height: 3rem;
		display: inline-block;
		text-align: right;
	}

	.platform {
		align-items: center;
		color: white;
		display: inline-block;
		font-family: "Arial", serif;
		font-size: 3rem;
		font-synthesis: weight;
		font-synthesis-weight: 900;
		font-weight: 900;
		height: 3rem;
		width: 4rem;
		justify-content: center;
		line-height: 0.95;
		margin: 0.6rem;
		outline: 0.3rem solid black;
		text-align: center;
		-webkit-text-stroke-width: 0.2rem;
		-webkit-text-stroke-color: black;
	}

	.platform.qr-travel,
	.service-type.qr-travel {
		background-color: rgb(255, 132, 0);
	}

	.smalltext {
		margin-top: -1.6rem;
		font-size: 1.1rem;
		width: 20rem;
		display: inline-block;
		vertical-align: middle;
		font-weight: 500;
		font-synthesis: weight;
		font-synthesis-weight: 500;
		color: rgba(0, 0, 0, 0.7);
	}

	.headsign {
		font-family: "Arial Bold";
		font-synthesis: weight;
		font-weight: 700;
		line-height: 0.9;
		font-size: 1.8rem;
		text-transform: uppercase;
		color: black;
	}

	.run {
		font-style: italic;
	}

	.service-type {
		font-weight: 700;
		font-size: 1.5rem;
		text-transform: uppercase;
		display: inline-block;
		vertical-align: top;
		margin-top: 1.3rem;
		width: 1.5rem;
		height: 1.5rem;
		padding-bottom: 0.2rem;
		text-align: center;
		outline: 0.15rem solid black;
	}
	.service-type.passing {
		background-color: rgb(73, 73, 73);
		color: white;
	}
	.service-type.express {
		background-color: burlywood;
	}
	.service-type.term {
		background-color: blueviolet;
		color: white;
	}
	.service-type.all-stops {
		background-color: blue;
		color: white;
	}
	.service-type.canceled {
		background-color: #b22222;
		color: white;
	}

	.departs_in {
		font-family: "Arial";
		font-weight: 900;
		font-synthesis: weight;
		font-synthesis-weight: 900;
		font-size: 2rem;
		display: inline-block;
		vertical-align: top;
		margin: 0;
	}

	.time-container {
		display: inline-flex;
		flex-direction: column;
		justify-content: center;
		vertical-align: top;
		width: 9rem;
		height: 4rem;
		margin-top: 0;
		padding: 0;
	}

	.departs-sub {
		line-height: 0;
	}

	.gtfs,
	.qrt {
		cursor: pointer;
		transition: all 200ms;
	}

	.qrt:hover {
		background-color: hsl(28, 100%, 90%);
		box-shadow: 0 0 1rem hsl(24, 78%, 60%);
	}

	.gtfs:hover {
		background-color: #eef;
		box-shadow: 0 0 1rem #99f;
	}

	.very-late {
		color: red;
	}
	.late {
		color: darkgoldenrod;
	}
	.on-time {
		color: green;
	}
	.early {
		color: blue;
	}
	.scheduled,
	.estimated {
		color: gray;
	}
	.delay.canceled,
	.tv-delay.canceled {
		color: #fff;
		background-color: #b22222;
		padding: 0 0.3em;
		border-radius: 0.3em;
		font-weight: bold;
	}
	.serviceCapacity {
		font-size: 1rem;
	}

	/* Filters (similar to raw-rt) */
	.filters {
		margin: 1rem auto;
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		background: #f8f8f8;
		padding: 8px;
		border-radius: 6px;
	}

	.filter-label {
		font-weight: 700;
		margin-right: 6px;
	}

	.filters button {
		padding: 6px 10px;
		border: 1px solid #ccc;
		border-radius: 6px;
		background: #fff;
		cursor: pointer;
		transition: all 0.15s;
	}

	.filters button.active {
		background: #007bff;
		color: #fff;
		border-color: #0056b3;
		font-weight: 700;
	}

	.filters button:hover:not(.active) {
		background: #f0f0f0;
	}
</style>
