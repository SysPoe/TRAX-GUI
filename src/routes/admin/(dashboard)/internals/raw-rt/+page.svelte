<script lang="ts">
	import type { PageProps } from "./$types";
	const { data }: PageProps = $props();
</script>

<div class="content">
	<h1>Raw Real-Time Data</h1>
	<details>
		<summary>
			<span style="font-size: 1.5em; font-weight: bold;">Trip Updates</span>
		</summary>
		{#each data.tripUpdates.filter((v) => v.trip_id.includes("QR ")) as update}
			<div class="trip-update">
				<b>ID:</b>
				{update.id} <br />
				<b>Vehicle ID:</b>
				{@html update.vehicle_id ?? "<b>null</b>"} <br />
				<b>Trip ID:</b> <a href="/TV/trip/gtfs/{update.trip_id}">{update.trip_id}</a> <br />
				<b>Route ID:</b>
				{update.route_id} <br />
				<b>Start Date:</b>
				{update.start_date} <br />
				<b>Schedule Relationship:</b>
				{update.schedule_relationship} <br />
				<b>Timestamp:</b>
				{new Date(parseInt(update.timestamp) * 1000).toLocaleString()} <br />
				<b>Created At:</b>
				{new Date(update.created_timestamp * 1000).toLocaleString()} <br />
				<b>Expires At:</b>
				{new Date(update.expiration_timestamp * 1000).toLocaleString()} <br />
			</div>
				<hr />
		{/each}
	</details>

	<details>
		<summary>
			<span style="font-size: 1.5em; font-weight: bold;">StopTime Updates</span>
		</summary>
	</details>
</div>

<style>
    .content {
        max-width: 800px;
        margin: auto;
    }
    .trip-update {
        background-color: #d9d9d9;
        padding: 10px;
        margin-bottom: 10px;
        border-radius: 5px;
    }
    summary {
        cursor: pointer;
    }
</style>
