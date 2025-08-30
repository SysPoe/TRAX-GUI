<script lang="ts">
    import type {
        SerializableAugmentedStop,
        SerializableAugmentedTrip,
    } from "translink-rail-api";
    import type { PageProps } from "./$types";

    const { data }: PageProps = $props();
    let { trip }: { trip: SerializableAugmentedTrip } = data;
    let {
        stations,
    }: { stations: { [stop_id: string]: SerializableAugmentedStop } } = data;

    // Borrowed from TRAX
    function formatTimestamp(ts?: number | null): string {
        if (!ts) return "--:--";
        const d = new Date(ts * 1000);
        return d.toISOString().slice(11, 16);
    }
</script>

<h1>
    {trip._trip.trip_id} - {trip._trip.trip_headsign}
</h1>

<div class="service-dates">
    Service Dates: 
    {#each trip.serviceDates as sd, i (sd)}
        {i > 0 ? ", " : ""}{sd}
    {/each}
</div>

{#each trip.stopTimes as st}
    <div class="stop-time {st.passing ? 'passing' : ''}">
        <span class="time">
            {formatTimestamp(st.scheduled_arrival_timestamp)}
        </span>
        -
        <span class="station">
            {(
                stations[st.scheduled_parent_station || ""]?.stop_name ||
                stations[st.scheduled_stop || ""]?.stop_name ||
                "Unknown"
            )
                .replace(/station/i, "")
                .trim()}
        </span>
        <span class="platform">
            plat. {st.scheduled_platform_code || "?"}
        </span>
        {#if st.passing}
            <span class="passing-indicator">(passing*)</span>
        {/if}
    </div>
{/each}

<footer>
    <p>* Passing stop times and stations are estimated and may not be accurate.</p>
</footer>