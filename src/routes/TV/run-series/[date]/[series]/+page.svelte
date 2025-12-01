<script lang="ts">
	import { goto } from "$app/navigation";
	import type { PageProps } from "./$types";
	import "$lib/styles/trip-results.css";
	import "$lib/styles/common.css";

	const { data }: PageProps = $props();

	// Borrowed from TRAX
	function formatTimestamp(ts?: number | null): string {
		if (ts === null || ts === undefined) return "--:--";
		const d = new Date(ts * 1000);
		return d.toISOString().slice(11, 16);
	}

	// Format date as YYYY-MM-DD
	function formatDate(date: string | number): string {
		const dateStr = date.toString();
		return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
	}

	const TRAIN_GURU_URL_PREFIX = "https://syspoe.github.io/train-wiki/#Other/Resources/TRNGuru/?trainNumber=";

	function getTrainGuruUrl(run: string) {
		return `${TRAIN_GURU_URL_PREFIX}${encodeURIComponent(run)}`;
	}
</script>

<svelte:head>
	<title>
		{data.runSeries.date}/{data.runSeries.series} - TRAX TV RunSeries
	</title>
	<link rel="icon" type="image/svg+xml" href="/favicon-TV.svg" />
</svelte:head>


<div class="header">
	<h1>TRAX <i>TripViewer</i></h1>
	<h2>
		{data.runSeries.date} - {data.runSeries.series} RunSeries
	</h2>
	<p class="de-emphasize">RunSeries data is experimental and is not entirely accurate.</p>
</div>

<div class="container">
	<div class="content">
		<div class="info-section">
			<h3>Run Series Information</h3>
			<div class="info-item">
				<span class="info-label">Date:</span>
				<span class="info-value">{formatDate(data.runSeries.date)}</span>
			</div>
			<div class="info-item">
				<span class="info-label">Series:</span>
				<span class="info-value">{data.runSeries.series}</span>
			</div>
			<div class="info-item">
				<span class="info-label">Trips:</span>
				<span class="info-value">{data.runSeries.trips.length}</span>
			</div>
			{#if data.runSeries.vehicle_sightings.length > 0}
				<div class="info-item">
					<span class="info-label">Vehicle Sightings:</span>
					<span class="info-value">{data.runSeries.vehicle_sightings}</span>
				</div>
			{/if}
		</div>

		{#if data.runSeries.vehicle_sightings.length > 0}
			<div class="info-section">
				<h3>Vehicle Sightings</h3>
				{#each data.runSeries.vehicle_sightings as sighting}
					<div class="info-item">
						<span class="info-value">{sighting}</span>
					</div>
				{/each}
			</div>
		{/if}

		<div class="info-section">
			<h3>Trips in this Series</h3>
			{#each data.runSeries.trips as tripInfo}
				{@const trip = data.trips[tripInfo.trip_id]}
				{@const route = trip?._trip.route_id ? data.routes[trip._trip.route_id] : null}

				{@const departure_time = formatTimestamp(trip.stopTimes[0].scheduled_departure_time)}
				{@const arrival_time = formatTimestamp(
					trip.stopTimes[trip.stopTimes.length - 1].scheduled_arrival_time,
				)}
				{@const startStation = data.stations[trip.stopTimes[0].scheduled_stop ?? 0]}
				{@const endStation = data.stations[trip.stopTimes[trip.stopTimes.length - 1].scheduled_stop ?? 0]}
				{@const startParent = startStation?.parent_station ? data.stations[startStation.parent_station] : null}
				{@const endParent = endStation?.parent_station ? data.stations[endStation.parent_station] : null}
				{@const date_offset =
					trip.stopTimes[trip.stopTimes.length - 1].scheduled_arrival_date_offset -
					trip.stopTimes[0].scheduled_departure_date_offset}

				<div class="result-wrapper">
					<a
						class="result"
						onclick={(ev) => {
							if (ev.shiftKey || ev.ctrlKey || ev.metaKey || ev.type === "auxclick") {
								// Open in new tab if modifier key is held
								ev.preventDefault();
								window.open(`/TV/trip/gtfs/${trip._trip.trip_id}`, "_blank");
								return;
							}
							goto(`/TV/trip/gtfs/${trip._trip.trip_id}`);
						}}
						href={`/TV/trip/gtfs/${trip._trip.trip_id}`}
					>
						<span class="headline">
							{trip.run}
							<span class="de-emphasize">
								{route?.route_short_name}
							</span>
							&mdash;
							{route?.route_long_name}
						</span><br />
						<span class="extra-details">
							{departure_time}
							<span class="location">
								{startParent?.stop_name?.replace(" station", "").trim() ??
									startStation?.stop_name?.replace(" station", "").trim()}
								{startStation?.platform_code}
							</span>
							<span class="bigarrow">&rarr;</span>
							{arrival_time}
							<span class="location"
								>{endParent?.stop_name?.replace(" station", "").trim() ??
									endStation?.stop_name?.replace(" station", "").trim()}
								{endStation?.platform_code}
							</span>
							{#if date_offset > 0}
								(+{date_offset} {date_offset == 1 ? "day" : "days"})
							{/if}
							<br />
							{data.expressStrings[trip._trip.trip_id]} <br />

							{#if trip.scheduledStartServiceDates.length == 1}
								Service date:
							{:else}
								Service dates:
							{/if}
							{#each trip.scheduledStartServiceDates as date, i (date)}
								{date}{i < trip.scheduledStartServiceDates.length - 1 ? ", " : ""}
							{/each}
						</span>
					</a>
					<a
						class="trn-button"
						title="Consult TRNGuru"
						aria-label={`Consult TRNGuru for train ${trip.run}`}
						href={getTrainGuruUrl(trip.run)}
						target="_blank"
						rel="noopener noreferrer"
					>
						<img src="/img/trnguru.svg" alt="" aria-hidden="true" class="trn-icon" />
						<span class="sr-only">Consult TRNGuru</span>
					</a>
				</div>
				<hr />
			{/each}
		</div>
	</div>
</div>

<style>
	* {
		font-family: "Arial", sans-serif;
	}

	:root {
		font-size: 1em;
	}

	.content {
		margin: 0 auto;
		max-width: 600px;
		padding: 0 1rem;
	}

	.de-emphasize {
		color: #666;
		font-size: 0.9em;
	}
</style>
