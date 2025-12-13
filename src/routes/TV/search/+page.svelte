<script lang="ts">
	import { goto } from "$app/navigation";
	import type { PageProps } from "./$types";
	import "$lib/styles/trip-results.css";
	import "$lib/styles/common.css";

	const { data }: PageProps = $props();

	// Borrowed from TRAX
	function formatTimestamp(ts?: number | null, seconds: boolean = false): string {
		if (ts === null || ts === undefined) return "--:--";
		const d = new Date(ts * 1000);
		return seconds ? d.toISOString().slice(11, 19) : d.toISOString().slice(11, 16);
	}

	function makePageUrl(page: number) {
		// Use originalParams from the server to reconstruct the query string
		const params = new URLSearchParams();
		if (data.originalParams) {
			for (const [key, values] of Object.entries(data.originalParams)) {
				(values as string[]).forEach((v) => {
					if (v !== "") params.append(key, v);
				});
			}
		}
		params.set("page", page.toString());
		return `?${params.toString()}`;
	}

	function getPaginationPages(current: number, total: number) {
		const pages = [];
		if (total <= 1) return [1];
		pages.push(1);
		if (current > 4) pages.push("...");
		for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) {
			pages.push(i);
		}
		if (current < total - 3) pages.push("...");
		if (total > 1) pages.push(total);
		return pages;
	}

	const types: { [key: string]: string } = {
		"1": "6 car SMU in revenue service",
		D: "NGR in revenue service",
		J: "3 car SMU in revenue service",
		T: "6 car IMU in revenue service",
		U: "3 car IMU in revenue service",
		X: "Train equipped w/ L2 ETCS in revenue service ",
	};

	const TRAIN_GURU_URL_PREFIX = "https://syspoe.github.io/train-wiki/#Other/Resources/TRNGuru/?trainNumber=";

	function getTrainGuruUrl(run: string) {
		return `${TRAIN_GURU_URL_PREFIX}${encodeURIComponent(run)}`;
	}

	function handleTripNavigation(event: MouseEvent, tripId: string) {
		if (
			event.defaultPrevented ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		) {
			return;
		}
		event.preventDefault();
		goto(`/TV/trip/gtfs/${tripId}`);
	}

	function contractSD(dateStrings: string[]): string[] {
    if (dateStrings.length === 0) return [];

    // 1. Parse strings into Date objects and sort them
    // We use UTC to avoid Daylight Savings Time issues affecting day difference calculations
    const sortedDates = [...new Set(dateStrings)] // Remove duplicates first
        .map(ds => {
            const year = parseInt(ds.substring(0, 4), 10);
            const month = parseInt(ds.substring(4, 6), 10) - 1; // Months are 0-indexed in JS
            const day = parseInt(ds.substring(6, 8), 10);
            return new Date(Date.UTC(year, month, day));
        })
        .sort((a, b) => a.getTime() - b.getTime());

    const ranges: string[] = [];
    
    if (sortedDates.length === 0) return [];

    // Initialize the start and end of the current range
    let rangeStart = sortedDates[0];
    let rangeEnd = sortedDates[0];

    // Helper to format Date back to YYYYMMDD string
    const formatDate = (date: Date): string => {
        const y = date.getUTCFullYear();
        const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const d = date.getUTCDate().toString().padStart(2, '0');
        return `${y}${m}${d}`;
    };

    for (let i = 1; i < sortedDates.length; i++) {
        const currentDate = sortedDates[i];
        
        // Calculate difference in days
        // 86400000 ms = 1 day
        const diffTime = currentDate.getTime() - rangeEnd.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);

        if (diffDays === 1) {
            // It is consecutive, extend the current range
            rangeEnd = currentDate;
        } else {
            // Gap found, push the previous range and start a new one
            if (rangeStart.getTime() === rangeEnd.getTime()) {
                ranges.push(formatDate(rangeStart));
            } else {
                ranges.push(`${formatDate(rangeStart)}-${formatDate(rangeEnd)}`);
            }
            rangeStart = currentDate;
            rangeEnd = currentDate;
        }
    }

    // Push the final range remaining after the loop finishes
    if (rangeStart.getTime() === rangeEnd.getTime()) {
        ranges.push(formatDate(rangeStart));
    } else {
        ranges.push(`${formatDate(rangeStart)}-${formatDate(rangeEnd)}`);
    }

    return ranges;
}
</script>

<svelte:head>
	<title>TRAX TripViewer - Search Results</title>
	<link rel="icon" type="image/svg+xml" href="/favicon-TV.svg" />
</svelte:head>

<div class="title">
	<h1>TRAX <i>TripViewer</i></h1>
	<p>
		{#if data?.trips.length === 0}
			No trips found. Try adjusting your search criteria and searching again.
		{:else}
			Search Results (Showing {(data.page - 1) * data.perPage + 1} to {Math.min(
				data.page * data.perPage,
				data.results,
			)} of {data.results} results)
		{/if}
	</p>
</div>

{#if data.totalPages > 1}
	<div class="pagination">
		{#if data.page > 1}
			<a href={makePageUrl(data.page - 1)}>&laquo; Prev</a>
		{/if}
		{#each getPaginationPages(data.page, data.totalPages) as page}
			{#if page === "..."}
				<span class="ellipsis">...</span>
			{:else if page === data.page}
				<span class="current">{page}</span>
			{:else}
				<a href={makePageUrl(page as number)}>{page}</a>
			{/if}
		{/each}
		{#if data.page < data.totalPages}
			<a href={makePageUrl(data.page + 1)}>Next &raquo;</a>
		{/if}
	</div>
{/if}

<div class="results">
	<hr />
	{#each data?.trips as trip}
		{@const departure_time = formatTimestamp(trip.stopTimes[0].scheduled_departure_time)}
		{@const arrival_time = formatTimestamp(trip.stopTimes.at(-1)?.scheduled_arrival_time)}
		{@const startStation = data.stations[trip.stopTimes[0].scheduled_stop ?? ""]}
		{@const endStation = data.stations[trip.stopTimes.at(-1)?.scheduled_stop ?? ""]}
		{@const startParent = trip.stopTimes[0].scheduled_parent_station
			? data.stations[trip.stopTimes[0].scheduled_parent_station]
			: null}
		{@const endParent = trip.stopTimes.at(-1)?.scheduled_parent_station
			? data.stations[trip.stopTimes.at(-1)?.scheduled_parent_station ?? ""]
			: null}
		{@const date_offset =
			(trip.stopTimes.at(-1)?.scheduled_arrival_date_offset ?? 0) -
			trip.stopTimes[0].scheduled_departure_date_offset}
		{@const route = data.routes[trip._trip.route_id]}
		{@const serviceDates = contractSD(trip.scheduledStartServiceDates)}

		<div class="result-wrapper">
			<a
				class="result"
				href={`/TV/trip/gtfs/${trip._trip.trip_id}`}
				onclick={(event) => handleTripNavigation(event, trip._trip.trip_id)}
			>
				<span class="headline">
					{trip.run}
					<span class="de-emphasize">
						{#if data.extraDetails}
							{#if [...new Set(Object.values(trip.runSeries))].length == 1}
								({trip.runSeries[Number.parseInt(Object.keys(trip.runSeries)[0])]})
							{:else}
								(<i>VARS</i>)
							{/if}
						{/if}
						{route?.route_short_name}
					</span>
					&mdash;
					{route?.route_long_name}
				</span><br />
				<span class="extra-details">
					{departure_time}
					<span class="location">
						{startParent?.stop_name?.replace(" station", "")?.trim() ??
							startStation?.stop_name?.replace(" station", "").trim()}
						{trip.stopTimes[0]?.scheduled_platform_code}
					</span>
					<span class="bigarrow">&rarr;</span>
					{arrival_time}
					<span class="location">
						{endParent?.stop_name?.replace(" station", "").trim() ??
							endStation?.stop_name?.replace(" station", "").trim()}
						{trip.stopTimes.at(-1)?.scheduled_platform_code}
					</span>
					{#if date_offset > 0}
						(+{date_offset} {date_offset == 1 ? "day" : "days"})
					{/if}
					<br />
					{data.expressStrings[trip._trip.trip_id]} <br />
					
					{#if serviceDates.length == 1}
						Service date:
					{:else}
						Service dates:
					{/if}
					{#each serviceDates as date, i (date)}
						{date}{i < serviceDates.length - 1 ? ", " : ""}
					{/each}

					{#if data.extraDetails}
						<br />
						{types[trip.run[0]] ?? "Unknown train type"}<br />

						{#each data.filters.intermediateStations as st}
							{@const stoptime = trip.stopTimes.find(
								data.filters.useRT
									? (sti) => sti.actual_stop === st || sti.actual_parent_station === st
									: (sti) => sti.scheduled_stop === st || sti.scheduled_parent_station === st,
							)}
							{data.stations[st]?.stop_name ?? st}
							arr {formatTimestamp(
								data.filters.useRT
									? (stoptime?.actual_arrival_time ?? stoptime?.scheduled_arrival_time)
									: stoptime?.scheduled_arrival_time,
								true,
							)}
							dep {formatTimestamp(
								data.filters.useRT
									? (stoptime?.actual_departure_time ?? stoptime?.scheduled_departure_time)
									: stoptime?.scheduled_departure_time,
								true,
							)}
							{#if st != data.filters.intermediateStations.at(-1)},
							{/if}
						{/each}
					{/if}
				</span>
			</a>
			{#if data.extraDetails}
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
			{/if}
		</div>
		<hr />
	{/each}
</div>

{#if data.totalPages > 1}
	<div class="pagination">
		{#if data.page > 1}
			<a href={makePageUrl(data.page - 1)}>&laquo; Prev</a>
		{/if}
		{#each getPaginationPages(data.page, data.totalPages) as page}
			{#if page === "..."}
				<span class="ellipsis">...</span>
			{:else if page === data.page}
				<span class="current">{page}</span>
			{:else}
				<a href={makePageUrl(page as number)}>{page}</a>
			{/if}
		{/each}
		{#if data.page < data.totalPages}
			<a href={makePageUrl(data.page + 1)}>Next &raquo;</a>
		{/if}
	</div>
{/if}

<style>
	* {
		font-family: "Arial";
	}

	.results {
		margin: 0 auto;
		max-width: 600px;
		padding: 0 1rem;
	}
	.pagination {
		text-align: center;
		margin: 1rem 0;
	}
	.pagination a,
	.pagination .current,
	.pagination .ellipsis {
		display: inline-block;
		margin: 0 0.2rem;
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
		text-decoration: none;
		color: #2980b9;
		font-weight: 500;
		background: none;
	}
	.pagination a:hover {
		background: #e0e0e0;
		color: #222;
	}
	.pagination .current {
		background: #2980b9;
		color: #fff;
		font-weight: 700;
	}
	.pagination .ellipsis {
		color: #888;
		background: none;
		cursor: default;
	}
</style>
