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

<div class="title">
    <h1>TRAX <i>TripViewer</i></h1>
    <h2>
        Trip Details - {formatTimestamp(
            trip.stopTimes[0].scheduled_departure_timestamp ||
                trip.stopTimes[0].scheduled_arrival_timestamp,
        )}
        {trip.run}
        {trip._trip.trip_headsign?.replace("station", "").trim() || "Unknown"} service
    </h2>
    <p>Trip ID: {trip._trip.trip_id}</p>
</div>

<div class="content">
    <div class="section">
        <h3>Trip Information</h3>
        <div class="info-row">
            <span class="info-label">Express:</span>
            <span class="info-value">{data.expressString}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Run:</span>
            <span class="info-value">{trip.run}</span>
        </div>
        <div class="run-series">
            <span class="info-label">Run Series:</span>
            <ul>
                {#each Object.keys(trip.runSeries) as date}
                    <li>
                        {date}: {trip.runSeries[Number.parseInt(date)] ||
                            "Unknown"}
                    </li>
                {/each}
            </ul>
        </div>
        <div class="info-row">
            <span class="info-label">Service Dates:</span>
            {#each trip.scheduledStartServiceDates as sd, i (sd)}
                {i > 0 ? ", " : ""}{sd}
            {/each}
        </div>
        <div class="info-row">
            <span class="info-label">Service ID:</span>
            <span class="info-value"
                >{@html trip._trip.service_id || "<b>null</b>"}</span
            >
        </div>
        <div class="info-row">
            <span class="info-label">Trip Headsign:</span>
            <span class="info-value"
                >{@html trip._trip.trip_headsign || "<b>null</b>"}</span
            >
        </div>
        <div class="info-row">
            <span class="info-label">Trip Short Name:</span>
            <span class="info-value"
                >{@html trip._trip.trip_short_name || "<b>null</b>"}</span
            >
        </div>
        <div class="info-row">
            <span class="info-label">Direction ID:</span>
            <span class="info-value"
                >{@html trip._trip.direction_id || "<b>null</b>"}</span
            >
        </div>
        <div class="info-row">
            <span class="info-label">Block ID:</span>
            <span class="info-value"
                >{@html trip._trip.block_id || "<b>null</b>"}</span
            >
        </div>
        <div class="info-row">
            <span class="info-label">Shape ID:</span>
            <span class="info-value"
                >{@html trip._trip.shape_id || "<b>null</b>"}</span
            >
        </div>
        <div class="info-row">
            <span class="info-label">Wheelchair Accessible:</span>
            <span class="info-value"
                >{@html trip._trip.wheelchair_accessible || "<b>null</b>"}</span
            >
        </div>
        <div class="info-row">
            <span class="info-label">Bikes Allowed:</span>
            <span class="info-value"
                >{@html trip._trip.bikes_allowed || "<b>null</b>"}</span
            >
        </div>
        <div class="info-row">
            <span class="info-label">Cars Allowed:</span>
            <span class="info-value"
                >{@html trip._trip.cars_allowed || "<b>null</b>"}</span
            >
        </div>
    </div>

    <div class="section">
        <h3>Route Information ({route.route_id})</h3>
        <div class="info-row">
            <span class="info-label">Agency ID:</span>
            <span class="info-value"
                >{@html route.agency_id || "<b>null</b>"}</span
            >
        </div>
        <div class="info-row">
            <span class="info-label">Route Short Name:</span>
            <span class="info-value"
                >{@html route.route_short_name || "<b>null</b>"}</span
            >
        </div>
        <div class="info-row">
            <span class="info-label">Route Long Name:</span>
            <span class="info-value"
                >{@html route.route_long_name || "<b>null</b>"}</span
            >
        </div>
        <div class="info-row">
            <span class="info-label">Route Description:</span>
            <span class="info-value"
                >{@html route.route_desc || "<b>null</b>"}</span
            >
        </div>
        <div class="info-row">
            <span class="info-label">Route Type:</span>
            <span class="info-value"
                >{@html route.route_type || "<b>null</b>"}</span
            >
        </div>
        <div class="info-row">
            <span class="info-label">Route URL:</span>
            <span class="info-value"
                >{@html `<a href="${route.route_url}" target="_blank">${route.route_url}</a>` ||
                    "<b>null</b>"}</span
            >
        </div>
        <div class="info-row">
            <span class="info-label">Route Color:</span>
            <span class="info-value"
                >{@html route.route_color || "<b>null</b>"}
                {#if route.route_color}
                    <div
                        class="square"
                        style="background-color: #{route.route_color};"
                    ></div>
                {/if}
            </span>
        </div>
        <div class="info-row">
            <span class="info-label">Route Text Color:</span>
            <span class="info-value"
                >{@html route.route_text_color || "<b>null</b>"}</span
            >
        </div>
        <div class="info-row">
            <span class="info-label">Route Sort Order:</span>
            <span class="info-value"
                >{@html route.route_sort_order || "<b>null</b>"}</span
            >
        </div>
        <div class="info-row">
            <span class="info-label">Continuous Pickup:</span>
            <span class="info-value"
                >{@html route.continuous_pickup || "<b>null</b>"}</span
            >
        </div>
        <div class="info-row">
            <span class="info-label">Continuous Drop Off:</span>
            <span class="info-value"
                >{@html route.continuous_drop_off || "<b>null</b>"}</span
            >
        </div>
        <div class="info-row">
            <span class="info-label">Network ID:</span>
            <span class="info-value"
                >{@html route.network_id || "<b>null</b>"}</span
            >
        </div>
    </div>

    <div class="section" id="stoptimes">
        <h3>Stoptimes</h3>
        <div class="stoptimes">
            <p>Example format:</p>
            <span class="stop-time">
                <span class="time">Sch.</span>
                <span class="lateness scheduled">lateness</span>
                <span class="date-offset">(+1 day)</span>
                <span class="station">Station</span>
                <span class="platform">platform</span>
            </span>
            <hr>
            {#each trip.stopTimes as st}
                <a
                    class="stop-time {st.passing ? 'passing' : ''}"
                    href={`/DB/${st.scheduled_parent_station || st.scheduled_stop}`}
                    onclick={() =>
                        goto(
                            `/DB/${st.scheduled_parent_station || st.scheduled_stop}`,
                        )}
                >
                    <span class="time {st.realtime ? 'realtime' : ''}">
                        {formatTimestamp(
                            st.scheduled_departure_timestamp ||
                                st.scheduled_arrival_timestamp,
                        )}
                    </span>

                    <span class="lateness {st.passing ? "estimated" : st.realtime_info?.delay_class || "scheduled"}">
                        {st.passing ? "estimated" : st.realtime ? st.realtime_info?.delay_string : "scheduled"}
                    </span>
                    {#if (st.scheduled_departure_timestamp ? st.scheduled_departure_date_offset : st.scheduled_arrival_date_offset) !== 0}
                        <span class="date-offset"
                            >(+{st.scheduled_departure_timestamp
                                ? st.scheduled_departure_date_offset
                                : st.scheduled_arrival_date_offset} day{(st.scheduled_departure_timestamp
                                ? st.scheduled_departure_date_offset
                                : st.scheduled_arrival_date_offset) !== 1
                                ? "s"
                                : ""})</span
                        >
                    {/if}
                    <span class="station">
                        {(
                            stations[st.scheduled_parent_station || ""]
                                ?.stop_name ||
                            stations[st.scheduled_stop || ""]?.stop_name ||
                            "Unknown"
                        )
                            .replace(/station/i, "")
                            .trim()}
                    </span>
                    {#if st.scheduled_platform_code}
                        <span class="platform">
                            plat. {st.scheduled_platform_code || "?"}
                        </span>
                    {/if}
                    {#if st.passing}
                        <span class="passing-indicator">passing*</span>
                    {/if}
                </a>
            {/each}
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
        font-family: "Arial";
    }

    :root {
        font-size: min(3vw, 1em);
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
    }
    .title * {
        margin-bottom: 0.4rem;
    }
    .title p {
        font-size: 1.2rem;
        color: #555;
        margin-bottom: 1rem;
    }
    .square {
        width: 0.7rem;
        height: 0.7rem;
        border: 0.1rem solid black;
        display: inline-block;
    }

    .content {
        max-width: 800px;
        margin: 0 auto;
        padding: 0 1rem;
    }

    .section {
        background: #f8f9fa;
        border: 1px solid #e1e4e8;
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 2rem;
        box-shadow: 0 2px 8px rgba(44, 62, 80, 0.07);
    }

    .section h3 {
        color: #2c3e50;
        margin-top: 0;
        margin-bottom: 1rem;
        font-size: 1.4rem;
        font-weight: 600;
    }

    .info-row {
        margin-bottom: 0.5rem;
        line-height: 1.4;
    }

    .info-label {
        font-weight: 600;
        color: #2980b9;
        display: inline-block;
        min-width: 140px;
    }

    .info-value {
        color: #555;
    }

    .run-series {
        margin-top: 1rem;
    }

    .run-series ul {
        margin: 0.5rem 0;
        padding-left: 1.5rem;
        list-style-type: " \2013 ";
    }

    .run-series li {
        margin-bottom: 0.25rem;
        color: #555;
    }

    .stoptimes {
        margin-top: 1rem;
    }

    .stop-time {
        display: block;
        text-decoration: none;
        color: inherit;

        display: flex;
        align-items: center;
        padding: 0.75rem 1rem;
        margin-bottom: 0.5rem;
        background: white;
        border: 1px solid #e1e4e8;
        border-radius: 6px;
        transition: all 0.2s;
    }

    .stop-time:hover {
        box-shadow: 0 2px 8px rgba(44, 62, 80, 0.1);
        border-color: #2980b9;
    }

    .stop-time.passing {
        background: #d6d6d6;
        border-color: rgb(197, 197, 197);
    }

    .stop-time.passing:hover {
        box-shadow: 0 2px 8px rgba(44, 62, 80, 0.1);
        border-color: #2980b9;
    }

    .time {
        font-size: 1.1rem;
        font-weight: 600;
        color: #2c3e50;
        min-width: 60px;
    }

    .date-offset {
        color: #16324e;
        font-size: 0.9rem;
        margin-left: 0.5rem;
        font-weight: 500;
    }

    .station {
        flex: 1;
        font-weight: 500;
        color: #2980b9;
        margin: 0 1rem;
    }

    .platform {
        color: #27ae60;
        font-size: 0.9rem;
        font-weight: 500;
    }

    .passing-indicator {
        color: #000000;
        font-size: 0.9rem;
        font-weight: 500;
        margin-left: 0.5rem;
    }

    footer {
        text-align: center;
        margin-top: 3rem;
        padding: 1rem;
        color: #777;
        font-size: 0.9rem;
        border-top: 1px solid #e1e4e8;
    }

    .lateness {
        min-width: 4rem;
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
</style>
