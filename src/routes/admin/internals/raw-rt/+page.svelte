<script lang="ts">
	import type { PageProps } from "./$types";
	import * as qdf from "qdf-gtfs/types";
	const props: PageProps = $props();
	const data: PageProps["data"] = $derived(props.data);

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
				qrTripUpdates.map((u) =>
					u.trip.schedule_relationship
						? qdf.TripScheduleRelationship[u.trip.schedule_relationship]
						: "SCHEDULED",
				),
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
				selectedTURels.has(
					u.trip.schedule_relationship
						? qdf.TripScheduleRelationship[u.trip.schedule_relationship]
						: "SCHEDULED",
				) && matchesSearch(u.trip),
		),
	);

	let qrStopUpdates = $derived(
		(data.stopTimeUpdates as qdf.RealtimeStopTimeUpdate[]).filter((v) => v.trip_id?.includes("QR ")),
	);
	let STURels = $derived(
		[
			...new Set(
				qrStopUpdates.map((u) =>
					u.schedule_relationship !== null
						? qdf.StopTimeScheduleRelationship[u.schedule_relationship]
						: "SCHEDULED",
				),
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
				selectedSTURels.has(
					u.schedule_relationship !== null
						? qdf.StopTimeScheduleRelationship[u.schedule_relationship]
						: "SCHEDULED",
				) && matchesSearch(u),
		),
	);

	let tripUpdates: Map<string, qdf.RealtimeTripUpdate> = $derived(
		new Map(
			(data.tripUpdates as qdf.RealtimeTripUpdate[])
				.filter((v) => v.trip.trip_id)
				.map((tu) => [`${tu.trip.trip_id}|${tu.trip.start_date}|${tu.trip.start_time}`, tu]),
		),
	);

	let vp: qdf.RealtimeVehiclePosition[] = $derived(
		(data.vehiclePositions as qdf.RealtimeVehiclePosition[]).filter(
			(v) => v.trip.trip_id && v.trip.trip_id.includes("QR "),
		),
	);

	let vehiclePositions = $derived(vp.filter((v) => matchesSearch(v.trip)));
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

		<button onclick={() => console.log(qrTripUpdates)}>LogRaw</button>

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
				<b>Trip ID:</b>
				<a
					href="/TV/trip/gtfs/{btoa(
						JSON.stringify([
							update.trip.trip_id,
							update.trip.start_date,
							update.trip.start_time,
							update.trip.schedule_relationship,
						]),
					)}">{update.trip.trip_id}</a
				> <br />
				<b>Trip Route ID:</b>
				{update.trip.route_id} <br />
				<b>Trip Direction ID:</b>
				{update.trip.direction_id} <br />
				<b>Trip Start Time:</b>
				{update.trip.start_time} <br />
				<b>Trip Start Date:</b>
				{update.trip.start_date} <br />
				<b>Schedule Relationship:</b>
				{update.trip.schedule_relationship
					? qdf.TripScheduleRelationship[update.trip.schedule_relationship]
					: "SCHEDULED"} <br />
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

		<button onclick={() => console.log(qrStopUpdates)}>LogRaw</button>

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
				<b>Trip Id:</b>
				<a
					href="/TV/trip/gtfs/{btoa(
						JSON.stringify([
							stu.trip_id,
							stu.start_date,
							stu.start_time,
							tripUpdates.get(stu.trip_id + '|' + stu.start_date + '|' + stu.start_time)?.trip
								.schedule_relationship ?? 0,
						]),
					)}">{stu.trip_id}</a
				> <br />
				<b>Arrival Delay:</b>
				{stu.arrival_delay} <br />
				<b>Arrival Time:</b>
				{stu.arrival_time
					? new Date(stu.arrival_time * 1000 + 36000000)
							.toISOString()
							.replace("Z", "")
							.replace("T", " ")
							.replace(/\.000$/, "")
					: "NOT_PROVIDED"} <br />
				<b>Departure Delay:</b>
				{stu.departure_delay} <br />
				<b>Departure Time:</b>
				{stu.departure_time
					? new Date(stu.departure_time * 1000 + 36000000)
							.toISOString()
							.replace("Z", "")
							.replace("T", " ")
							.replace(/\.000$/, "")
					: "NOT_PROVIDED"}
				<br />
				<b>Schedule Relationship:</b>
				{stu.schedule_relationship !== null
					? qdf.StopTimeScheduleRelationship[stu.schedule_relationship]
					: "SCHEDULED"}
				<br />
				<b>Start Date:</b>
				{stu.start_date}
				<br />
			</div>
			<hr />
		{/each}
	</details>

	<details>
		<summary>
			<span style="font-size: 1.5em; font-weight: bold;"> Vehicle Positions ({vehiclePositions.length})</span>
		</summary>

		<button onclick={() => console.log(vehiclePositions)}>LogRaw</button>

		{#each vehiclePositions as vp}
			<div class="trip-update">
				<b>Update ID:</b>
				{vp.update_id} <br />
				<b>Is Deleted:</b>
				{vp.is_deleted} <br />
				<b>Trip ID:</b>
				{vp.trip.trip_id} <br />
				<b>Trip Route ID:</b>
				{vp.trip.route_id} <br />
				<b>Trip Direction ID:</b>
				{vp.trip.direction_id} <br />
				<b>Trip Start Time:</b>
				{vp.trip.start_time} <br />
				<b>Trip Start Date:</b>
				{vp.trip.start_date} <br />
				<b>Trip Schedule Relationship:</b>
				{vp.trip.schedule_relationship
					? qdf.TripScheduleRelationship[vp.trip.schedule_relationship]
					: "SCHEDULED"} <br />
				<b>Vehicle ID:</b>
				{vp.vehicle.id} <br />
				<b>Vehicle Label:</b>
				{vp.vehicle.label} <br />
				<b>Vehicle License Plate:</b>
				{vp.vehicle.license_plate} <br />
				<b>Latitude:</b>
				{vp.position.latitude} <br />
				<b>Longitude:</b>
				{vp.position.longitude} <br />
				<b>Bearing:</b>
				{vp.position.bearing} <br />
				<b>Odometer:</b>
				{vp.position.odometer} <br />
				<b>Speed:</b>
				{vp.position.speed} <br />
				<b>Current Stop Sequence:</b>
				{vp.current_stop_sequence} <br />
				<b>Stop Id:</b>
				{vp.stop_id} <br />
				<b>Current Status:</b>
				{vp.current_status ? qdf.VehicleStopStatus[vp.current_status] : "SCHEDULED"} <br />
				<b>Timestamp:</b>
				{vp.timestamp} <br />
				<b>Congestion Level:</b>
				{vp.congestion_level ? qdf.CongestionLevel[vp.congestion_level] : "SCHEDULED"} <br />
				<b>Occupancy Status:</b>
				{vp.occupancy_status ? qdf.OccupancyStatus[vp.occupancy_status] : "SCHEDULED"} <br />
				<b>Occupancy Percentage:</b>
				{vp.occupancy_percentage} <br />
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
		color: #333;
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
