<script lang="ts">
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
</script>

<h1>Raw GTFS Objects</h1>

<div class="controls">
    <a href="?type=tripUpdates"><button>Trip Updates</button></a>
    <a href="?type=vehiclePositions"><button>Vehicle Positions</button></a>
    <a href="?type=stopTimes"><button>Stop Times</button></a>
    <a href="?type=calendars"><button>Calendars</button></a>
    <a href="?type=calendarDates"><button>Calendar Dates</button></a>
    <a href="?type=trips"><button>Trips</button></a>
    <a href="?type=stops"><button>Stops</button></a>
    <a href="?type=routes"><button>Routes</button></a>
</div>

{#if data.type}
    <h2>{data.type} ({data.count})</h2>
    {#if data.data}
        <pre>{JSON.stringify(data.data, null, 2)}</pre>
    {:else}
        <p>No data found or invalid type.</p>
    {/if}
{/if}

<style>
    .controls {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 20px;
    }
    button {
        padding: 5px 10px;
        cursor: pointer;
    }
    pre {
        background: #f0f0f0;
        padding: 10px;
        overflow-x: auto;
        border: 1px solid #ccc;
    }
</style>
