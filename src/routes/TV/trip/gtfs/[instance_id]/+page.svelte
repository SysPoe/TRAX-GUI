<script lang="ts">
	import { goto } from "$app/navigation";
	import * as qdf from "qdf-gtfs/types";
	import type { PageProps } from "./$types";
	import "$lib/styles/common.css";
	import "$lib/styles/stoptimes.css";
	import UserIcon from "$lib/UserIcon.svelte";

	let { data }: PageProps = $props();
	let stations = $derived(data.stations);
	let route = $derived(data.route);
	let inst = $derived(data.inst);

	// svelte-ignore state_referenced_locally
	let useRealtime = $state(true);

	// Borrowed from TRAX
	function formatTimestamp(ts?: number | null, seconds: boolean = false): string {
		if (ts === null || ts === undefined) return "--:--";
		const d = new Date(ts * 1000);
		return seconds ? d.toISOString().slice(11, 19) : d.toISOString().slice(11, 16);
	}

	const TRAIN_GURU_URL_PREFIX = "https://syspoe.github.io/train-wiki/#Other/Resources/TRNGuru/?trainNumber=";

	function getTrainGuruUrl(run: string) {
		return `${TRAIN_GURU_URL_PREFIX}${encodeURIComponent(run)}`;
	}
</script>

<svelte:head>
	<title>
		{formatTimestamp(inst.stopTimes[0].scheduled_departure_time || inst.stopTimes[0].scheduled_arrival_time)}
		{inst.run}
		{inst.trip_headsign.replace("station", "").trim() || "Unknown"} service - TRAX TripViewer
	</title>
	<style>
		:root {
			font-size: min(3.6vw, 1em);
		}
	</style>
	<link rel="icon" type="image/svg+xml" href="/favicon-TV.svg" />
</svelte:head>

<div class="header">
	<h1>TRAX <i>TripViewer</i></h1>
	{#if data.extraDetails}
		<h2>
			{inst.run} - {inst.trip_headsign?.replace("station", "").trim() || "Unknown"} Service
		</h2>
		<p>
			Departing: {formatTimestamp(
				inst.stopTimes[0].scheduled_departure_time || inst.stopTimes[0].scheduled_arrival_time,
			)} | Trip ID: {inst.trip_id}
			{#if inst.schedule_relationship == qdf.TripScheduleRelationship.CANCELED}
				<span class="delay canceled">(canceled)</span>
			{/if}
		</p>
		{#if data.admin}
			<button onclick={() => console.log(data)}>LogRaw</button>
		{/if}
	{:else}
		<h2>
			{inst.serviceDate.replace(/(?<=^.{4})|(?<=^.{6})/g, "-")}
			{formatTimestamp(inst.stopTimes[0].scheduled_departure_time || inst.stopTimes[0].scheduled_arrival_time)}
			{inst.trip_headsign?.replace("station", "").trim() || "Unknown"} Service
			{#if inst.schedule_relationship == qdf.TripScheduleRelationship.CANCELED}
				<span class="delay canceled">(canceled)</span>
			{/if}
		</h2>
	{/if}
</div>

<hr />

<div class="container">
	<div class="content">
		<details class="info-section">
			<summary>Trip Information</summary>
			<div class="info-item">
				<span class="info-label">Express Status:</span>
				<span class="info-value">{data.expressString}</span>
			</div>
			<div class="info-item">
				<span class="info-label">Service Date</span>
				<span class="info-value">
					{inst.serviceDate}
				</span>
			</div>
			<div class="info-item">
				<span class="info-label">Headsign:</span>
				<span class="info-value">
					{@html inst.trip_headsign || "<b>null</b>"}
				</span>
			</div>
			{#if data.extraDetails}
				<div class="info-item">
					<span class="info-label">Route ID:</span>
					<span class="info-value">
						{@html route.route_id || "<b>null</b>"}
					</span>
				</div>
			{/if}
			<div class="info-item">
				<span class="info-label">Route Name:</span>
				<span class="info-value">
					{@html route.route_long_name || route.route_short_name || "<b>null</b>"}
				</span>
			</div>
			{#if data.extraDetails}
				<div class="info-item">
					<span class="info-label">Route Color:</span>
					<span class="info-value">
						{@html route.route_color || "<b>null</b>"}
						{#if route.route_color}
							<div class="color-square" style="background-color: #{route.route_color};"></div>
						{/if}
					</span>
				</div>
				<div class="info-item">
					<span class="info-label">TRN:</span>
					<span class="info-value">
						{inst.run}
						<a
							class="trnguru-link-inline"
							title="Consult TRNGuru"
							aria-label={`Consult TRNGuru for train ${inst.run}`}
							href={getTrainGuruUrl(inst.run)}
							target="_blank"
							rel="noopener noreferrer"
						>
							<img src="/img/trnguru.svg" alt="TRNGuru" class="trnguru-icon-inline" />
						</a>
					</span>
				</div>
				<div class="info-item">
					<span class="info-label">Trip Short Name:</span>
					<span class="info-value">
						{@html inst.trip_short_name || "<b>null</b>"}
					</span>
				</div>
				<div class="info-item">
					<span class="info-label">Direction ID:</span>
					<span class="info-value">
						{@html inst.direction_id || "<b>null</b>"}
					</span>
				</div>
				<div class="info-item">
					<span class="info-label">Block ID:</span>
					<span class="info-value">
						{@html inst.block_id || "<b>null</b>"}
					</span>
				</div>
				<div class="info-item">
					<span class="info-label">Shape ID:</span>
					<span class="info-value">
						{@html inst.shape_id || "<b>null</b>"}
					</span>
				</div>
				<div class="info-item">
					<span class="info-label">Run Series:</span>
					<span class="info-value"> Not available at the moment (working on it!) </span>
				</div>
			{/if}
		</details>

		<details class="info-section" open>
			<summary>Stops</summary>
			{#if data.extraDetails}
				<div class="stoptimes-controls">
					<label>
						<input type="checkbox" bind:checked={useRealtime} />
						Show Realtime Data
					</label>
				</div>
			{/if}
			<div class="tv-stoptimes">
				{#each inst.stopTimes as st}
					<a
						class="tv-stop-time {st.passing ? 'passing' : ''} {useRealtime &&
						inst.schedule_relationship === qdf.TripScheduleRelationship.CANCELED
							? 'canceled'
							: ''} {useRealtime &&
						st.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED
							? 'canceled'
							: ''}"
						href={`/DB/gtfs/${st.scheduled_parent_station || st.scheduled_stop}`}
						onclick={(ev) => {
							if (ev.shiftKey || ev.ctrlKey || ev.metaKey || ev.type === "auxclick") {
								// Open in new tab if modifier key is held
								ev.preventDefault();
								window.open(`/DB/gtfs/${st.scheduled_parent_station || st.scheduled_stop}`, "_blank");
								return;
							}
							goto(`/DB/gtfs/${st.scheduled_parent_station || st.scheduled_stop}`);
						}}
					>
						<span class="tv-platform" style="background-color: #{route.route_color ?? '000000'}">
							{(useRealtime ? st.actual_platform_code : st.scheduled_platform_code) ?? "?"}
						</span>
						<span class="tv-smalltext">
							<span class="time">
								{#if data.extraDetails}
									{formatTimestamp(
										useRealtime ? st.actual_arrival_time : st.scheduled_arrival_time,
										true,
									)}&rarr;{formatTimestamp(
										useRealtime ? st.actual_departure_time : st.scheduled_departure_time,
										true,
									)}
								{:else}
									{formatTimestamp(
										useRealtime && (st.actual_departure_time ?? st.actual_arrival_time)
											? (st.actual_departure_time ?? st.actual_arrival_time)
											: (st.scheduled_departure_time ?? st.scheduled_arrival_time),
									)}
								{/if}
							</span>
							<span
								class="tv-delay {useRealtime &&
								inst.schedule_relationship === qdf.TripScheduleRelationship.CANCELED
									? 'canceled'
									: useRealtime &&
										  st.realtime_info?.schedule_relationship ===
												qdf.StopTimeScheduleRelationship.SKIPPED
										? 'canceled'
										: st.passing
											? 'estimated'
											: useRealtime && st.realtime
												? (st.realtime_info?.delay_class ?? 'scheduled')
												: 'scheduled'}"
							>
								({useRealtime && inst.schedule_relationship === qdf.TripScheduleRelationship.CANCELED
									? "canceled"
									: useRealtime &&
										  st.realtime_info?.schedule_relationship ===
												qdf.StopTimeScheduleRelationship.SKIPPED
										? "skipped"
										: st.passing
											? "estimated"
											: useRealtime && st.realtime
												? st.realtime_info?.delay_string
												: "scheduled"})
							</span>
							{#if st.service_capacity != null}
								{@const sc = st.service_capacity ?? ""}
								<span class="serviceCapacity">
									{#if sc.toLowerCase().trim() === "space available"}
										<UserIcon fill="black" />
										<UserIcon fill="#DDD" />
										<UserIcon fill="#DDD" />
									{:else if sc.toLowerCase().trim() === "some space available"}
										<UserIcon fill="black" />
										<UserIcon fill="black" />
										<UserIcon fill="#DDD" />
									{:else if sc.toLowerCase().trim() === "limited space available"}
										<UserIcon fill="black" />
										<UserIcon fill="black" />
										<UserIcon fill="black" />
									{/if}
								</span>
							{/if}
							{#if (st.scheduled_departure_time ? st.scheduled_departure_date_offset : st.scheduled_arrival_date_offset) !== 0}
								<span class="tv-date-offset"
									>(+{st.scheduled_departure_time
										? st.scheduled_departure_date_offset
										: st.scheduled_arrival_date_offset}{(st.scheduled_departure_time
										? st.scheduled_departure_date_offset
										: st.scheduled_arrival_date_offset) !== 1
										? "d"
										: "d"})</span
								>
							{/if}
							<br />
							<span class="tv-station">
								{@html useRealtime
									? st.actual_exit_side
										? st.actual_exit_side == "left"
											? "◀"
											: st.actual_exit_side == "right"
												? "▶"
												: ""
										: ""
									: st.scheduled_exit_side
										? st.scheduled_exit_side == "left"
											? "◀"
											: st.scheduled_exit_side == "right"
												? "▶"
												: ""
										: ""}
								{(
									stations[st.scheduled_parent_station || ""]?.stop_name ||
									stations[st.scheduled_stop || ""]?.stop_name ||
									"Unknown"
								)
									.replace(/station/i, "")
									.trim()
									.toUpperCase()}
							</span>
						</span>
						{#if st.passing}
							<span class="tv-service-type passing">P</span>
						{:else if useRealtime && inst.schedule_relationship === qdf.TripScheduleRelationship.CANCELED}
							<span class="tv-service-type canceled">C</span>
						{:else if useRealtime && st.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED}
							<span class="tv-service-type canceled">S</span>
						{/if}
					</a>
					<hr />
				{/each}
			</div>
		</details>
	</div>
</div>

{#if data.extraDetails}
	<footer>
		<p>* Passing stop times and stations are estimated and may not be accurate.</p>
		<p>** RunSeries data is experimental and is not entirely accurate.</p>
	</footer>
{/if}

<style>
	* {
		font-family: "Arial", sans-serif;
	}

	.container {
		display: flex;
		justify-content: center;
		align-items: flex-start;
		flex: 1;
		padding: 0.8rem;
	}

	.content {
		width: 100%;
		max-width: 650px;
		margin: 0 auto;
	}

	.info-section {
		/* margin-bottom: 1rem; */
		padding: 0.5rem;
		border-radius: 6px;
		background-color: #ffffff;
		/* box-shadow: 0 0rem 0.4rem rgba(0, 0, 0, 0.5); */
	}

	.info-section summary {
		margin-top: 0;
		color: #2c3e50;
		font-size: 1.3rem;
		font-weight: 600;
		cursor: pointer;
	}

	.info-item {
		display: flex;
		padding: 0.1rem 0.5rem;
		margin-left: 1rem;
		border-left: solid black 0.1rem;
	}

	.info-label {
		font-weight: 500;
		min-width: 140px;
		color: #555;
		font-size: 0.95rem;
	}

	.info-value {
		flex: 1;
		color: #333;
		font-size: 0.95rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.trnguru-link-inline {
		display: inline-flex;
		vertical-align: middle;
	}

	.trnguru-icon-inline {
		height: 1.2em;
		width: 1.2em;
		transition: transform 0.2s ease-in-out;
	}

	.trnguru-link-inline:hover .trnguru-icon-inline {
		transform: scale(1.2);
	}

	.run-series-item {
		display: flex;
		margin: 0.2rem 0;
	}

	.route-link {
		color: #2980b9;
		text-decoration: none;
	}

	.route-link:hover {
		text-decoration: underline;
	}

	.color-square {
		width: 1rem;
		height: 1rem;
		border: 1px solid #ccc;
		display: inline-block;
		margin-left: 0.5rem;
		vertical-align: middle;
	}

	.stoptimes-controls {
		margin-bottom: 1rem;
		text-align: center;
	}
	.stoptimes-controls label {
		font-size: 1rem;
		cursor: pointer;
	}

	footer {
		text-align: center;
		margin-top: 1.5rem;
		padding: 1rem;
		color: #757575;
		font-size: 0.85rem;
	}
</style>
