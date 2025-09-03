<script lang="ts">
    import { goto } from "$app/navigation";
    import type {
        SerializableAugmentedStop,
        SerializableAugmentedTrip,
    } from "translink-rail-api";
    import type * as gtfs from "gtfs";
    import type { PageProps } from "./$types";

    const { data }: PageProps = $props();
    let { trip }: { trip: SerializableAugmentedTrip } = data;
    let {
        stations,
        route,
    }: {
        stations: { [stop_id: string]: SerializableAugmentedStop };
        route: gtfs.Route;
    } = data;

    // Borrowed from TRAX
    function formatTimestamp(ts?: number | null): string {
        if (ts === null || ts === undefined) return "--:--";
        const d = new Date(ts * 1000);
        return d.toISOString().slice(11, 16);
    }
</script>

<svelte:head>
    <title>
        {formatTimestamp(
            trip.stopTimes[0].scheduled_departure_timestamp ||
                trip.stopTimes[0].scheduled_arrival_timestamp,
        )}
        {trip.run}
        {trip._trip.trip_headsign?.replace("station", "").trim() || "Unknown"} service
        - TRAX TripViewer
    </title>
</svelte:head>

<nav>
    <a href="/">Home</a>
    <a href="/TV">Back</a>
</nav>

<div class="header">
    <h1>TRAX <i>TripViewer</i></h1>
    <h2>
        {trip.run} - {trip._trip.trip_headsign?.replace("station", "").trim() || "Unknown"} Service
    </h2>
    <p>Departing: {formatTimestamp(
            trip.stopTimes[0].scheduled_departure_timestamp ||
                trip.stopTimes[0].scheduled_arrival_timestamp,
        )} | Trip ID: {trip._trip.trip_id}</p>
</div>

<hr />

<div class="container">
    <div class="content">
    <div class="info-section">
        <h3>Trip Information</h3>
        <div class="info-item">
            <span class="info-label">Express Status:</span>
            <span class="info-value">{data.expressString}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Run Number:</span>
            <span class="info-value">{trip.run}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Service Dates:</span>
            <span class="info-value">{trip.scheduledStartServiceDates.join(", ")}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Headsign:</span>
            <span class="info-value">{@html trip._trip.trip_headsign || "<b>null</b>"}</span>
        </div>
    </div>

    <div class="info-section">
        <h3>Route Information ({route.route_id})</h3>
        <div class="info-item">
            <span class="info-label">Route Name:</span>
            <span class="info-value">{@html route.route_long_name || route.route_short_name || "<b>null</b>"}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Route Color:</span>
            <span class="info-value">
                {@html route.route_color || "<b>null</b>"}
                {#if route.route_color}
                    <div
                        class="color-square"
                        style="background-color: #{route.route_color};"
                    ></div>
                {/if}
            </span>
        </div>
    </div>

    <div class="info-section">
        <h3>Stoptimes</h3>
        <div class="stoptimes">
            {#each trip.stopTimes as st}
                <a
                    class="stop-time {st.passing ? 'passing' : ''} {st.realtime && st.realtime_info?.schedule_relationship === 3 ? 'cancelled' : ''}"
                    href={`/DB/${st.scheduled_parent_station || st.scheduled_stop}`}
                    onclick={() =>
                        goto(
                            `/DB/${st.scheduled_parent_station || st.scheduled_stop}`,
                        )}
                >
                    <span class="platform" style="background-color: #{route.route_color || '000000'}">
                        {st.scheduled_platform_code || "?"}
                    </span>
                    <span class="smalltext">
                        <span class="time">
                            {formatTimestamp(
                                st.scheduled_departure_timestamp ||
                                    st.scheduled_arrival_timestamp,
                            )}
                        </span>
                        <span
                            class="delay {st.passing
                                ? 'estimated'
                                : st.realtime_info?.delay_class || 'scheduled'}"
                        >
                            ({st.passing
                                ? "est."
                                : st.realtime
                                  ? st.realtime_info?.delay_string
                                  : "scheduled"})
                        </span>
                        {#if (st.scheduled_departure_timestamp ? st.scheduled_departure_date_offset : st.scheduled_arrival_date_offset) !== 0}
                            <span class="date-offset"
                                >(+{st.scheduled_departure_timestamp
                                    ? st.scheduled_departure_date_offset
                                    : st.scheduled_arrival_date_offset}{(st.scheduled_departure_timestamp
                                    ? st.scheduled_departure_date_offset
                                    : st.scheduled_arrival_date_offset) !== 1
                                    ? "d"
                                    : "d"})</span
                            >
                        {/if}
                        <br />
                        <span class="station">
                            {(
                                stations[st.scheduled_parent_station || ""]
                                    ?.stop_name ||
                                stations[st.scheduled_stop || ""]?.stop_name ||
                                "Unknown"
                            )
                                .replace(/station/i, "")
                                .trim()
                                .toUpperCase()}
                        </span>
                    </span>
                    {#if st.passing}
                        <span class="service-type passing">P</span>
                    {:else if st.realtime && st.realtime_info?.schedule_relationship === 3}
                        <span class="service-type cancelled">C</span>
                    {/if}
                </a>
                <hr />
            {/each}
        </div>
    </div>
</div>

</div>

<footer>
    <p>
        * Passing stop times and stations are estimated and may not be accurate.
    </p>
</footer>

<style>
    * {
        font-family: "Arial", sans-serif;
    }

    :root {
        font-size: 1em;
    }

    body {
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background-color: #fafafa;
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

    .header p {
        font-size: 0.95rem;
        color: #777;
        margin: 0.3rem 0;
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
        margin-bottom: 1.5rem;
        padding: 1.2rem;
        border-radius: 6px;
        background-color: #ffffff;
        box-shadow: 0 1px 5px rgba(0, 0, 0, 0.03);
    }

    .info-section h3 {
        margin-top: 0;
        color: #2c3e50;
        font-size: 1.3rem;
        font-weight: 600;
    }

    .info-item {
        display: flex;
        margin-bottom: 0.6rem;
        padding: 0.4rem 0;
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
    }

    .run-series-item {
        display: flex;
        margin: 0.2rem 0;
    }

    .run-series-item .date {
        min-width: 90px;
        font-weight: 500;
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

    .stoptimes {
        font-family: "Arial Narrow", Arial, sans-serif;
        padding: 0.1rem;
        width: fit-content;
        margin: 0 auto;
    }

    .stop-time {
        display: block;
        width: fit-content;
        color: inherit;
        text-decoration: none;
    }

    .stop-time.passing {
        background-color: #f5f5f5;
    }

    .stop-time.cancelled {
        background-color: #fceaea;
    }

    .stop-time {
        cursor: pointer;
        transition: all 150ms;
        border-radius: 3px;
        margin-bottom: 0.2rem;
    }

    .stop-time:hover {
        background-color: #f0f7ff;
    }

    .stop-time.cancelled:hover {
        background-color: #fceaea;
        box-shadow: 0 0 1rem #d6b3b3;
    }

    .stop-time:hover {
        background-color: #f0f7ff;
        box-shadow: 0 0 1rem #c5d5f0;
    }

    .platform {
        align-items: center;
        color: white;
        display: inline-block;
        font-family: "Arial", serif;
        font-size: 2rem;
        font-weight: 900;
        height: 2rem;
        width: 2.8rem;
        justify-content: center;
        line-height: 0.95;
        margin: 0.3rem;
        outline: 0.15rem solid black;
        text-align: center;
        -webkit-text-stroke-width: 0.1rem;
        -webkit-text-stroke-color: black;
    }

    .smalltext {
        margin-top: -1rem;
        font-size: 0.95rem;
        width: 16rem;
        display: inline-block;
        vertical-align: middle;
        font-weight: 500;
    }

    .station {
        font-weight: 600;
        line-height: 0.9;
        font-size: 1.3rem;
        text-transform: uppercase;
    }

    .service-type {
        font-weight: 700;
        font-size: 1.1rem;
        text-transform: uppercase;
        display: inline-block;
        vertical-align: top;
        margin-top: 0.8rem;
        width: 1.1rem;
        height: 1.1rem;
        padding-bottom: 0.1rem;
        text-align: center;
        outline: 0.1rem solid black;
    }

    .service-type.passing {
        background-color: rgb(120, 120, 120);
        color: white;
    }

    .service-type.cancelled {
        background-color: #c62828;
        color: white;
    }

    .very-late {
        color: #c62828;
    }
    .late {
        color: #ff8f00;
    }
    .on-time {
        color: #2e7d32;
    }
    .early {
        color: #1565c0;
    }
    .scheduled,
    .estimated {
        color: #757575;
    }
    .delay.cancelled {
        color: #fff;
        background-color: #c62828;
        padding: 0 0.25em;
        border-radius: 0.25em;
        font-weight: bold;
    }

    .date-offset {
        font-size: 0.8rem;
        color: #757575;
        margin-left: 0.4rem;
    }

    footer {
        text-align: center;
        margin-top: 1.5rem;
        padding: 1rem;
        color: #757575;
        font-size: 0.85rem;
    }

    hr {
        border: none;
        height: 1px;
        background-color: #eee;
        margin: 0.4rem 0;
    }

    @media (max-width: 768px) {
        :root {
            font-size: 1em;
        }
        
        .info-item {
            flex-direction: column;
        }
        
        .info-label {
            min-width: auto;
            margin-bottom: 0.2rem;
        }
        
        .platform {
            font-size: 1.8rem;
            height: 1.8rem;
            width: 2.7rem;
        }
        
        .smalltext {
            width: 14rem;
            font-size: 0.9rem;
        }
        
        .station {
            font-size: 1.2rem;
        }
        
        .container {
            padding: 0.5rem;
        }
    }
</style>
