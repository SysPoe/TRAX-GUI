<script lang="ts">
	import type { PageProps } from "./$types";
	import * as qdf from "qdf-gtfs";
	const { data }: PageProps = $props();

	let searchQuery = $state("");

	function matchesSearch(item: { trip_id?: string | null; route_id?: string | null }) {
		if (!searchQuery) return true;
		const q = searchQuery.toLowerCase();
		const tid = (item.trip_id ?? "").toLowerCase();
		const rid = (item.route_id ?? "").toLowerCase();

		return tid.includes(q) || rid.includes(q);
	}

	let qrTripUpdates = $derived(
		(data.tripUpdates as qdf.RealtimeTripUpdate[]).filter((v) => v.trip.trip_id.includes("QR ")),
	);
	let TURels = $derived(
		[
			...new Set(
				qrTripUpdates.map((u) => qdf.TripScheduleRelationship[u.trip.schedule_relationship] ?? "UNKNOWN"),
			),
		].sort(),
	);

	let selectedTURels = $state(new Set<string>());
	let isTUInit = $state(false);

	$effect(() => {
		if (!isTUInit && TURels.length > 0) {
			// TURels.forEach(r => selectedTURels.add(r));
			selectedTURels = new Set(selectedTURels);
			isTUInit = true;
		}
	});

	function TURelToggle(rel: string) {
		const next = new Set(selectedTURels);
		next.has(rel) ? next.delete(rel) : next.add(rel);
		selectedTURels = next;
	}

	let filteredTUs = $derived(
		(qrTripUpdates as qdf.RealtimeTripUpdate[]).filter(
			(u) =>
				selectedTURels.has(qdf.TripScheduleRelationship[u.trip.schedule_relationship] ?? "UNKNOWN") &&
				matchesSearch(u.trip),
		),
	);

	let qrStopUpdates = $derived(
		(data.stopTimeUpdates as qdf.RealtimeStopTimeUpdate[]).filter((v) => v.trip_id?.includes("QR ")),
	);
	let STURels = $derived(
		[
			...new Set(
				qrStopUpdates.map((u) => qdf.StopTimeScheduleRelationship[u.schedule_relationship] ?? "SCHEDULED"),
			),
		].sort(),
	);

	let selectedSTURels = $state(new Set<string>());
	let isSTUInit = $state(false);

	$effect(() => {
		if (!isSTUInit && STURels.length > 0) {
			// STURels.forEach(r => selectedSTURels.add(r));
			selectedSTURels = new Set(selectedSTURels);
			isSTUInit = true;
		}
	});

	function STURelToggle(rel: string) {
		const next = new Set(selectedSTURels);
		next.has(rel) ? next.delete(rel) : next.add(rel);
		selectedSTURels = next;
	}

	let filteredSTUs = $derived(
		qrStopUpdates.filter(
			(u) =>
				selectedSTURels.has(qdf.StopTimeScheduleRelationship[u.schedule_relationship] ?? "SCHEDULED") &&
				matchesSearch(u),
		),
	);

	let vp: qdf.RealtimeVehiclePosition[] = (data.vehiclePositions as qdf.RealtimeVehiclePosition[]).filter(
		(v) => v.trip.trip_id && v.trip.trip_id.includes("QR "),
	);

	let vehiclePositions = $derived(vp.filter((v) => matchesSearch(v.trip)));

	function or(v: any | null, str: string | null = v) {
		return v == null ? "<b>null</b>" : str?.toString();
	}
</script>

<div class="content">
	<h1>Raw Real-Time Data</h1>

	<div class="search-box">
		<input type="text" bind:value={searchQuery} placeholder="Search Trip ID, Route ID, or TRN..." />
	</div>

	<details>
		<summary>
			<span style="font-size: 1.5em; font-weight: bold;">
				Trip Updates ({filteredTUs.length} / {qrTripUpdates.length})
			</span>
		</summary>

		<div class="filters">
			<span class="filter-label">Relationship:</span>
			{#each TURels as rel}
				<button class:active={selectedTURels.has(rel)} onclick={() => TURelToggle(rel)}>
					{rel}
				</button>
			{/each}
		</div>

		{#each filteredTUs as update}
			<div class="trip-update">
				<b>Update ID:</b>
				{update.update_id.toString()} <br />
				<b>Is Deleted:</b>
				{update.is_deleted.toString()} <br />
				<b>Trip ID:</b> <a href="/TV/trip/gtfs/{update.trip.trip_id}">{update.trip.trip_id}</a> <br />
				<b>Trip Route ID:</b>
				{update.trip.route_id} <br />
				<b>Trip Direction ID:</b>
				{update.trip.direction_id} <br />
				<b>Trip Start Time:</b>
				{update.trip.start_time} <br />
				<b>Trip Start Date:</b>
				{update.trip.start_date} <br />
				<b>Schedule Relationship:</b>
				{qdf.TripScheduleRelationship[update.trip.schedule_relationship]} <br />
				<b>Vehicle ID:</b>
				{update.vehicle.id} <br />
				<b>Vehicle Label:</b>
				{update.vehicle.label} <br />
				<b>Vehicle License Plate:</b>
				{update.vehicle.license_plate} <br />
				<b>STU Count:</b>
				{update.stop_time_updates.length} <br />
				<b>Timestamp:</b>
				{update.timestamp} <br />
				<b>Delay:</b>
				{update.delay} <br />
			</div>
			<hr />
		{/each}
	</details>

	<details>
		<summary>
			<span style="font-size: 1.5em; font-weight: bold;">
				StopTime Updates ({filteredSTUs.length} / {qrStopUpdates.length})
			</span>
		</summary>

		<div class="filters">
			<span class="filter-label">Relationship:</span>
			{#each STURels as rel}
				<button class:active={selectedSTURels.has(rel)} onclick={() => STURelToggle(rel)}>
					{rel}
				</button>
			{/each}
		</div>

		{#each filteredSTUs as stu}
			<div class="trip-update">
				<b>Stop Sequence:</b>
				{stu.stop_sequence} <br />
				<b>Stop Id:</b>
				{stu.stop_id} <br />
				<b>Trip Id:</b> <a href="/TV/trip/gtfs/{stu.trip_id}">{stu.trip_id}</a> <br />
				<b>Arrival Delay:</b>
				{stu.arrival_delay} <br />
				<b>Arrival Time:</b>
				{stu.arrival_time} <br />
				<b>Departure Delay:</b>
				{stu.departure_delay} <br />
				<b>Departure Time:</b>
				{stu.departure_time} <br />
				<b>Schedule Relationship:</b>
				{qdf.StopTimeScheduleRelationship[stu.schedule_relationship]} <br />
			</div>
			<hr />
		{/each}
	</details>

	<details>
		<summary>
			<span style="font-size: 1.5em; font-weight: bold;"> Vehicle Positions ({vehiclePositions.length})</span>
		</summary>

		{#each vehiclePositions as vp}
			<div class="trip-update">
				<b>Update ID:</b> {vp.update_id} <br />
				<b>Is Deleted:</b> {vp.is_deleted} <br />
				<b>Trip ID:</b> <a href="/TV/trip/gtfs/{vp.trip.trip_id}">{vp.trip.trip_id}</a> <br />
				<b>Trip Route ID:</b> {vp.trip.route_id} <br />
				<b>Trip Direction ID:</b> {vp.trip.direction_id} <br />
				<b>Trip Start Time:</b> {vp.trip.start_time} <br />
				<b>Trip Start Date:</b> {vp.trip.start_date} <br />
				<b>Trip Schedule Relationship:</b> {qdf.TripScheduleRelationship[vp.trip.schedule_relationship]} <br />
				<b>Vehicle ID:</b> {vp.vehicle.id} <br />
				<b>Vehicle Label:</b> {vp.vehicle.label} <br />
				<b>Vehicle License Plate:</b> {vp.vehicle.license_plate} <br />
				<b>Latitude:</b> {vp.position.latitude} <br />
				<b>Longitude:</b> {vp.position.longitude} <br />
				<b>Bearing:</b> {vp.position.bearing} <br />
				<b>Odometer:</b> {vp.position.odometer} <br />
				<b>Speed:</b> {vp.position.speed} <br />
				<b>Current Stop Sequence:</b> {vp.current_stop_sequence} <br />
				<b>Stop Id:</b> {vp.stop_id} <br />
				<b>Current Status:</b> {qdf.VehicleStopStatus[vp.current_status]} <br />
				<b>Timestamp:</b> {vp.timestamp} <br />
				<b>Congestion Level:</b> {qdf.CongestionLevel[vp.congestion_level]} <br />
				<b>Occupancy Status:</b> {qdf.OccupancyStatus[vp.occupancy_status]} <br />
				<b>Occupancy Percentage:</b> {vp.occupancy_percentage} <br />
			</div>
			<hr />
		{/each}
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
		margin-bottom: 10px;
	}

	/* Search Input */
	.search-box {
		margin-bottom: 20px;
	}
	.search-box input {
		width: 100%;
		padding: 10px;
		font-size: 1.1em;
		border: 2px solid #ccc;
		border-radius: 8px;
	}

	/* Filter Styles */
	.filters {
		margin-bottom: 15px;
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		align-items: center;
		background: #f0f0f0;
		padding: 10px;
		border-radius: 8px;
	}

	.filter-label {
		font-weight: bold;
		margin-right: 5px;
	}

	.filters button {
		padding: 6px 12px;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: #fff;
		cursor: pointer;
		transition: all 0.2s;
	}

	.filters button.active {
		background: #007bff;
		color: white;
		border-color: #0056b3;
		font-weight: bold;
	}

	.filters button:hover:not(.active) {
		background: #e2e2e2;
	}
</style>
