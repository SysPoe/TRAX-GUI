<script lang="ts">
    import { goto } from "$app/navigation";
    import type { PageProps } from "./$types";

    const { data }: PageProps = $props();

    // Borrowed from TRAX
    function formatTimestamp(ts?: number | null): string {
        if (ts === null || ts === undefined) return "--:--";
        const d = new Date(ts * 1000);
        return d.toISOString().slice(11, 16);
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
        for (
            let i = Math.max(2, current - 2);
            i <= Math.min(total - 1, current + 2);
            i++
        ) {
            pages.push(i);
        }
        if (current < total - 3) pages.push("...");
        if (total > 1) pages.push(total);
        return pages;
    }
</script>

<svelte:head>
    <title>TRAX TripViewer - Search Results</title>
    <link rel="icon" type="image/svg+xml" href="/favicon-TV.svg" />
</svelte:head>

<nav>
    <a href="/">Home</a>
    <a href="/TV">Back</a>
</nav>

<div class="title">
    <h1>TRAX <i>TripViewer</i></h1>
    <p>
        {#if data?.trips.length === 0}
            No trips found. Try adjusting your search criteria and searching
            again.
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
        {@const departure_time = formatTimestamp(
            trip.stopTimes[0].scheduled_departure_timestamp,
        )}
        {@const arrival_time = formatTimestamp(
            trip.stopTimes[trip.stopTimes.length - 1]
                .scheduled_arrival_timestamp,
        )}
        {@const startStation =
            data.stations[trip.stopTimes[0].scheduled_stop ?? 0]}
        {@const endStation =
            data.stations[
                trip.stopTimes[trip.stopTimes.length - 1].scheduled_stop ?? 0
            ]}
        {@const startParent = startStation?.parent_station
            ? data.stations[startStation.parent_station]
            : null}
        {@const endParent = endStation?.parent_station
            ? data.stations[endStation.parent_station]
            : null}
        {@const date_offset =
            trip.stopTimes[trip.stopTimes.length - 1]
                .scheduled_arrival_date_offset -
            trip.stopTimes[0].scheduled_departure_date_offset}
        {@const route = data.routes[trip._trip.route_id]}

        <a
            class="result"
            onclick={() => goto(`/TV/trip/gtfs/${trip._trip.trip_id}`)}
            href={`/TV/trip/gtfs/${trip._trip.trip_id}`}
        >
            <span class="headline">
                {trip.run}
                <span class="de-emphasize">
                    {#if [...new Set(Object.values(trip.runSeries))].length == 1}
                        ({trip.runSeries[
                            Number.parseInt(Object.keys(trip.runSeries)[0])
                        ]})
                    {:else}
                        (<i>VARS</i>)
                    {/if}
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
                <span class="location">
                    {endParent?.stop_name?.replace(" station", "").trim() ??
                        endStation?.stop_name?.replace(" station", "").trim()}
                    {startStation?.platform_code}
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
                    {date}{i < trip.scheduledStartServiceDates.length - 1
                        ? ", "
                        : ""}
                {/each}
            </span>
        </a>
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

    nav {
        text-align: center;
        margin: 1rem 0;
    }

    nav a {
        margin: 0 1rem;
        color: #2980b9;
        text-decoration: none;
        font-weight: 500;
    }

    nav a:hover {
        text-decoration: underline;
    }

    .results {
        margin: 0 auto;
        max-width: 600px;
        padding: 0 1rem;
    }

    a.result {
        cursor: pointer;
        margin-left: 1rem;
        margin-right: 1rem;
        padding: 0.5rem;
        transition: all 200ms;

        color: inherit;
        text-decoration: none;
        display: block;
    }

    .result:hover {
        background-color: #eef;
        box-shadow: 0 0 1rem #99f;
    }

    .headline {
        font-size: 1.2rem;
    }

    .de-emphasize {
        color: #777;
    }

    .extra-details,
    .extra-details * {
        color: #555;
        font-size: 0.9rem;
        font-family: "Courier New", Courier, monospace;
    }

    .location {
        color: darkslategray;
        font-weight: bold;
    }

    .title {
        text-align: center;
        margin-top: 2rem;
        margin-bottom: 2rem;
        color: #2c3e50;
    }
    .title h1 {
        font-size: 2.5rem;
        font-weight: 700;
        letter-spacing: -0.1rem;
        margin-bottom: 0.5rem;
    }
    .title p {
        font-size: 1.2rem;
        color: #555;
        margin-bottom: 1rem;
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
    .bigarrow {
        font-size: 2rem;
        line-height: 0.1;
        vertical-align: middle;
        display: inline-block;
        margin-top: -0.5rem;
    }
</style>
