<script lang="ts">
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    let extraDetails = $state(data.user?.extraDetails ?? false);
    let status = $state(data.status);

	async function toggle() {
		let res = await fetch("/api/toggleextradetails");
		let { extraDetails: newValue } = await res.json();
		extraDetails = newValue;
	}

    function formatDuration(ms: number) {
        if (ms < 0) return "0s";
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));

        let parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        parts.push(`${seconds}s`);
        return parts.join(" ");
    }

    function formatTime(timestamp: number) {
        if (timestamp === 0) return "Never";
        return new Date(timestamp).toLocaleString();
    }
</script>

<h1>Admin Home</h1>

<div class="status-section">
    <h2>System Status</h2>
    <table border="1" cellpadding="5" cellspacing="0">
        <tbody>
            <tr>
                <td><strong>Server Uptime</strong></td>
                <td>{formatDuration(status.uptime)}</td>
            </tr>
            <tr>
                <td><strong>Last Static Refresh</strong></td>
                <td>{formatTime(status.lastStaticRefresh)}</td>
            </tr>
            <tr>
                <td><strong>Last Realtime Update</strong></td>
                <td>{formatTime(status.lastRealtimeUpdate)} ({formatDuration(new Date().getTime() - new Date(status.lastRealtimeUpdate).getTime())} ago)</td>
            </tr>
        </tbody>
    </table>
</div>

<div class="cache-section">
    <h2>Cache Statistics</h2>
    <table border="1" cellpadding="5" cellspacing="0">
        <tbody>
            <tr>
                <td><strong>Static Routes</strong></td>
                <td>{status.cacheStats.routes}</td>
            </tr>
            <tr>
                <td><strong>Static Trips</strong></td>
                <td>{status.cacheStats.trips}</td>
            </tr>
            <tr>
                <td><strong>Static Stops</strong></td>
                <td>{status.cacheStats.stops}</td>
            </tr>
            <tr>
                <td><strong>Realtime Trip Updates</strong></td>
                <td>{status.cacheStats.tripUpdates}</td>
            </tr>
            <tr>
                <td><strong>Realtime Stop Time Updates</strong></td>
                <td>{status.cacheStats.stopTimeUpdates}</td>
            </tr>
            <tr>
                <td><strong>Vehicle Positions</strong></td>
                <td>{status.cacheStats.vehiclePositions}</td>
            </tr>
        </tbody>
    </table>
</div>

<hr />

Links:
<ul>
    <li><a href="/api/reload">Reload</a></li>
    <li><a href="/admin/internals/raw-rt">Raw RT Updates</a></li>
    <li><a href="/admin/gtfs">Raw GTFS Objects</a></li>
</ul>

<p>
	{extraDetails ? "Extra details are shown by default." : "Extra details are hidden by default."}
	<button onclick={toggle}>Toggle</button>
</p>

<style>
    .status-section, .cache-section {
        margin-bottom: 20px;
    }
    h2 {
        font-size: 1.2em;
        margin-bottom: 10px;
        border-bottom: 1px solid #000;
        display: inline-block;
    }
    table {
        border-collapse: collapse;
        width: 100%;
        max-width: 600px;
        width: fit-content;
    }
    td {
        padding: 4px 8px;
        width: fit-content;
    }
</style>
