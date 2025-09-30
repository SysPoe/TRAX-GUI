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

    // Format date as YYYY-MM-DD
    function formatDate(date: number): string {
        const dateStr = date.toString();
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
</script>

<svelte:head>
    <title>
        {data.runSeries.date}/{data.runSeries.series} - TRAX TV RunSeries
    </title>
    <link rel="icon" type="image/svg+xml" href="/favicon-TV.svg" />
</svelte:head>

<nav>
    <a href="/">Home</a>
    <a href="/TV">Back</a>
</nav>

<div class="header">
    <h1>TRAX <i>TripViewer</i></h1>
    <h2>
        {data.runSeries.date} - {data.runSeries.series} RunSeries
    </h2>
</div>

<div class="container">
    <div class="content">
        <div class="info-section">
            <h3>Run Series Information</h3>
            <div class="info-item">
                <span class="info-label">Date:</span>
                <span class="info-value">{formatDate(data.runSeries.date)}</span
                >
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
                    <span class="info-value"
                        >{data.runSeries.vehicle_sightings}</span
                    >
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
                {@const route = trip?._trip.route_id
                    ? data.routes[trip._trip.route_id]
                    : null}

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
                        trip.stopTimes[trip.stopTimes.length - 1]
                            .scheduled_stop ?? 0
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

                <a
                    class="result"
                    onclick={() => goto(`/TV/trip/gtfs/${trip._trip.trip_id}`)}
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
                            {startParent?.stop_name
                                ?.replace(" station", "")
                                .trim() ??
                                startStation?.stop_name
                                    ?.replace(" station", "")
                                    .trim()}
                            {startStation?.platform_code}
                        </span>
                        <span class="bigarrow">&rarr;</span>
                        {arrival_time}
                        <span class="location"
                            >{endParent?.stop_name
                                ?.replace(" station", "")
                                .trim() ??
                                endStation?.stop_name
                                    ?.replace(" station", "")
                                    .trim()}
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
                            {date}{i <
                            trip.scheduledStartServiceDates.length - 1
                                ? ", "
                                : ""}
                        {/each}
                    </span>
                </a>
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

    .header {
        text-align: center;
        color: #2c3e50;
        margin: 1.2rem 0;
        padding: 0 1rem;
    }

    .header h1 {
        font-size: 2rem;
        font-weight: 700;
        letter-spacing: -0.03rem;
        margin-bottom: 0.2rem;
    }

    .header h2 {
        font-size: 1.3rem;
        font-weight: 500;
        color: #555;
        margin: 0.3rem 0;
    }

    .content {
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

    .bigarrow {
        font-size: 2rem;
        line-height: 0.1;
        vertical-align: middle;
        display: inline-block;
        margin-top: -0.5rem;
    }
</style>
