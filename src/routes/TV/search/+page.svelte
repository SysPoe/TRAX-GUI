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
	{#if data.extraDetails && data.admin}
		<button onclick={() => console.log(data)}>LogRaw</button>
	{/if}
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
	{#each data?.trips as inst}
		{@const departure_time = formatTimestamp(inst.stopTimes[0].scheduled_departure_time)}
		{@const arrival_time = formatTimestamp(inst.stopTimes.at(-1)?.scheduled_arrival_time)}
		{@const startStopId = inst.stopTimes[0].scheduled_stop_id}
		{@const endStopId = inst.stopTimes.at(-1)?.scheduled_stop_id}
		{@const startParentId = inst.stopTimes[0].scheduled_parent_station_id}
		{@const endParentId = inst.stopTimes.at(-1)?.scheduled_parent_station_id}
		{@const startStation = data.stations[startStopId ?? ""] ?? null}
		{@const endStation = data.stations[endStopId ?? ""] ?? null}
		{@const startParent = startParentId ? data.stations[startParentId] : null}
		{@const endParent = endParentId ? data.stations[endParentId] : null}
		{@const date_offset =
			(inst.stopTimes.at(-1)?.scheduled_arrival_date_offset ?? 0) -
			inst.stopTimes[0].scheduled_departure_date_offset}
		{@const route = data.routes[inst.route_id]}

		<div class="result-wrapper">
			<a
				class="result"
				href={`/TV/trip/gtfs/${inst.instance_id}`}
				onclick={(event) => handleTripNavigation(event, inst.instance_id)}
			>
				<span class="headline">
					{inst.run}
					<span class="de-emphasize">
						{route?.route_short_name}
					</span>
					&mdash;
					{route?.route_long_name}
				</span><br />
				<span class="extra-details">
					{departure_time}
					<span class="location">
						{startParent?.stop_name?.replace(" station", "")?.trim() ??
							startStation?.stop_name?.replace(" station", "").trim() ??
							"Unknown"}
						{inst.stopTimes[0]?.scheduled_platform_code}
					</span>
					<span class="bigarrow">&rarr;</span>
					{arrival_time}
					<span class="location">
						{endParent?.stop_name?.replace(" station", "").trim() ??
							endStation?.stop_name?.replace(" station", "").trim() ??
							"Unknown"}
						{inst.stopTimes.at(-1)?.scheduled_platform_code}
					</span>
					{#if date_offset > 0}
						(+{date_offset} {date_offset == 1 ? "day" : "days"})
					{/if}
					<br />
					{data.expressStrings[inst.trip_id]} <br />

					Service Date: {inst.serviceDate}

					{#if data.extraDetails}
						<br />
						{types[inst.run[0]] ?? "Unknown train type"}<br />

						{#if data.filters.intermediateStations.length > 0}
							<hr style="width: 8rem; margin: 0.3rem 0;">
						{/if}

						{#each data.filters.intermediateStations as st}
							{@const stoptime = inst.stopTimes.find(
								data.filters.useRT
									? (sti) => st === sti.actual_stop_id || st === sti.actual_parent_station_id
									: (sti) => st === sti.scheduled_stop_id || st === sti.scheduled_parent_station_id,
							)}
							<span style="min-width: 10rem; display: inline-block;"
								>{data.stations[st]?.stop_name.replace(/station$/, "").trim() ?? st}</span
							>
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
							<br />
						{/each}
					{/if}
				</span>
			</a>
			{#if data.extraDetails}
				<a
					class="trn-button"
					title="Consult TRNGuru"
					aria-label={`Consult TRNGuru for train ${inst.run}`}
					href={getTrainGuruUrl(inst.run)}
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
