<script lang="ts">
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
                <div class="trip-card">
                    <div class="trip-header">
                        <span class="trip-run">{trip?.run || tripInfo.run}</span
                        >
                        <span class="trip-time">
                            {formatTimestamp(
                                trip?.stopTimes[0]
                                    ?.scheduled_departure_timestamp ||
                                    trip?.stopTimes[0]
                                        ?.scheduled_arrival_timestamp,
                            )}
                        </span>
                    </div>
                    <div class="trip-details">
                        <div class="trip-info-item">
                            <span class="info-label">Express Status:</span>
                            <span class="info-value"
                                >{data.expressStrings[tripInfo.trip_id] ||
                                    "Unknown"}</span
                            >
                        </div>
                        <div class="trip-info-item">
                            <span class="info-label">Headsign:</span>
                            <span class="info-value">
                                {trip?._trip.trip_headsign
                                    ?.replace(/station$/, "")
                                    .trim() || "Unknown"}
                            </span>
                        </div>
                        <div class="trip-info-item">
                            <span class="info-label">Route:</span>
                            <span class="info-value">
                                {route?.route_long_name ||
                                    route?.route_short_name ||
                                    trip?._trip.route_id ||
                                    "Unknown"}
                            </span>
                        </div>
                    </div>
                    <a
                        href={`/TV/trip/gtfs/${tripInfo.trip_id}`}
                        class="view-trip-link"
                    >
                        View Trip Details
                    </a>
                </div>
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

    .container {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        flex: 1;
        padding: 0.8rem;
    }

    .content {
        width: 100%;
        max-width: 800px;
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
        border-bottom: 1px solid #eee;
        padding-bottom: 0.5rem;
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

    .trip-card {
        border: 1px solid #e1e4e8;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
        background-color: #fafafa;
    }

    .trip-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.8rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #eee;
    }

    .trip-run {
        font-size: 1.2rem;
        font-weight: 700;
        color: #2c3e50;
    }

    .trip-time {
        font-size: 1.1rem;
        font-weight: 500;
        color: #555;
    }

    .trip-details {
        margin-bottom: 1rem;
    }

    .trip-info-item {
        display: flex;
        margin-bottom: 0.4rem;
        font-size: 0.9rem;
    }

    .trip-info-item .info-label {
        min-width: 100px;
        font-weight: 500;
        color: #666;
    }

    .trip-info-item .info-value {
        color: #444;
    }

    .view-trip-link {
        display: inline-block;
        padding: 0.5rem 1rem;
        background-color: #2980b9;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-weight: 500;
        transition: background-color 0.2s;
    }

    .view-trip-link:hover {
        background-color: #1c5a8a;
    }
</style>
