<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import "$lib/styles/common.css";
	import type { UpcomingQRTravelDeparture } from "$lib";
	import * as qdf from "qdf-gtfs/types";
	import { onMount } from "svelte";
	import { type SerializableAugmentedStopTime } from "translink-rail-api";
	import type { PageProps } from "./$types";
	import UserIcon from "$lib/UserIcon.svelte";

	type Departure =
		| (SerializableAugmentedStopTime & {
				dep_type: "gtfs";
				express_string: string;
				last_stop_id: string;
				scheduled_departure_time: string;
				actual_departure_time: string;
				departs_in: string;
				departsInSecs: number;
				serviceCapacity: string | null;
		  })
		| UpcomingQRTravelDeparture;

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
		TRAX Departure Board - {station?.stop_name || "Unknown Station"}
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
		Departures from {station?.stop_name || "Unknown Station"} in the next 4 hours
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

<div class="departures">
	{#each departures as dep}
		{#if dep.dep_type === "gtfs"}
			{@const trip = data.trips[dep.trip_id]}
			{@const route = routes[trip.route_id || ""]}
			{@const express = dep.express_string.toLowerCase() != "all stops"}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<a
				class="departure gtfs {(dep as SerializableAugmentedStopTime).realtime &&
				(trip.scheduleRelationship === qdf.TripScheduleRelationship.CANCELED ||
					(dep as SerializableAugmentedStopTime).realtime_info?.schedule_relationship ===
						qdf.StopTimeScheduleRelationship.SKIPPED)
					? 'canceled'
					: dep.last_stop_id == params.stop_id.toLowerCase()
						? 'term'
						: dep.passing
							? 'passing'
							: ''}"
				href={`/TV/trip/gtfs/${trip.trip_id}#stoptimes`}
			>
				<span class="platform" style="background-color: #{route.route_color}">
					{dep.actual_platform_code || "?"}
				</span>
				<span class="smalltext">
					<span class="time">Sch. {qdf.formatTimestamp(dep.scheduled_departure_time)}</span>
					{#if data.extraDetails}
						<span class="run">{trip.run}</span>
					{/if}
					service to
					<br /><span class="headsign">
						{trip.trip_headsign?.replace(/station$/, "").trim()}
					</span>
				</span>
				<span
					class="service-type {(dep as SerializableAugmentedStopTime).realtime &&
					(trip.scheduleRelationship === qdf.TripScheduleRelationship.CANCELED ||
						(dep as SerializableAugmentedStopTime).realtime_info?.schedule_relationship ===
							qdf.StopTimeScheduleRelationship.SKIPPED)
						? 'canceled'
						: dep.last_stop_id == params.stop_id.toLowerCase()
							? 'term'
							: dep.passing
								? 'passing'
								: express
									? 'express'
									: 'all-stops'}"
				>
					{(dep as SerializableAugmentedStopTime).realtime &&
					trip.scheduleRelationship === qdf.TripScheduleRelationship.CANCELED
						? "C"
						: (dep as SerializableAugmentedStopTime).realtime &&
							  (dep as SerializableAugmentedStopTime).realtime_info?.schedule_relationship ===
									qdf.StopTimeScheduleRelationship.SKIPPED
							? "S"
							: dep.last_stop_id == params.stop_id.toLowerCase()
								? "T"
								: dep.passing
									? "P"
									: express
										? "E"
										: "A"}
				</span>
				<div class="time-container">
					<span class="departs_in">
						{dep.departs_in.replace(/^0h /, "").replace(/(?<=h) 0m/, "").replace(/^0m$/, "now")}
					</span>
					<div class="departs-sub">
						<span
							class="delay {(dep as SerializableAugmentedStopTime).realtime &&
							(trip.scheduleRelationship === qdf.TripScheduleRelationship.CANCELED ||
								(dep as SerializableAugmentedStopTime).realtime_info?.schedule_relationship ===
									qdf.StopTimeScheduleRelationship.SKIPPED)
								? 'canceled'
								: dep.realtime
									? dep.realtime_info?.delay_class || 'scheduled'
									: 'scheduled'}"
						>
							{(dep as SerializableAugmentedStopTime).realtime &&
							trip.scheduleRelationship === qdf.TripScheduleRelationship.CANCELED
								? "canceled"
								: (dep as SerializableAugmentedStopTime).realtime &&
									  (dep as SerializableAugmentedStopTime).realtime_info?.schedule_relationship ===
											qdf.StopTimeScheduleRelationship.SKIPPED
									? "skipped"
									: dep.realtime
										? dep.realtime_info?.delay_string || "scheduled"
										: "scheduled"}
						</span>
						{#if dep.serviceCapacity != null}
							<span class="serviceCapacity">
								{#if dep.serviceCapacity.toLowerCase().trim() === "space available"}
									<UserIcon fill="black" />
									<UserIcon fill="#DDD" />
									<UserIcon fill="#DDD" />
								{:else if dep.serviceCapacity.toLowerCase().trim() === "some space available"}
									<UserIcon fill="black" />
									<UserIcon fill="black" />
									<UserIcon fill="#DDD" />
								{:else if dep.serviceCapacity.toLowerCase().trim() === "limited space available"}
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
					<span class="time"
						>Sch. {(
							dep.stop?.estimatedPassingTime ||
							(dep.stop?.plannedDeparture === "0001-01-01T00:00:00"
								? dep.stop?.plannedArrival
								: dep.stop?.plannedDeparture)
						)?.slice(11, 16)}</span
					>
					<span class="run">{dep.run}</span> service to <br />
					<span class="headsign">
						{dep.service.stops
							.at(-1)
							?.placeName.replace(/^Brisbane -/, "")
							.trim() || "Unknown"}
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
</style>
