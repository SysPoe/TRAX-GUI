<script lang="ts">
	import type { PageProps } from "./$types";
	import type * as gtfs from "gtfs";
	const { data }: PageProps = $props();

	let searchQuery = $state("");

	function matchesSearch(item: { trip_id?: string | null; route_id?: string | null }) {
		if (!searchQuery) return true;
		const q = searchQuery.toLowerCase();
		const tid = (item.trip_id ?? "").toLowerCase();
		const rid = (item.route_id ?? "").toLowerCase();

		return tid.includes(q) || rid.includes(q);
	}

	let qrTripUpdates = $derived((data.tripUpdates as gtfs.TripUpdate[]).filter((v) => v.trip_id?.includes("QR ")));
	let TURels = $derived([...new Set(qrTripUpdates.map((u) => u.schedule_relationship ?? "UNKNOWN"))].sort());

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
		(qrTripUpdates as gtfs.TripUpdate[]).filter(
			(u) => selectedTURels.has(u.schedule_relationship ?? "UNKNOWN") && matchesSearch(u),
		),
	);

	let qrStopUpdates = $derived(
		(data.stopTimeUpdates as gtfs.StopTimeUpdate[]).filter((v) => v.trip_id?.includes("QR ")),
	);
	let STURels = $derived([...new Set(qrStopUpdates.map((u) => u.schedule_relationship ?? "SCHEDULED"))].sort());

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
		qrStopUpdates.filter((u) => selectedSTURels.has(u.schedule_relationship ?? "SCHEDULED") && matchesSearch(u)),
	);

	let vp: gtfs.VehiclePosition[] = (data.vehiclePositions as gtfs.VehiclePosition[]).filter(
		(v) => v.trip_id && v.trip_id.includes("QR "),
	);

	let vehiclePositions = $derived(vp.filter((v) => matchesSearch(v)));
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
				<b>ID:</b>
				{@html update.update_id ?? (update as any).id ?? "<b>null</b>"} <br />
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
				{new Date(parseInt(update.timestamp?.toString() ?? "") * 1000).toLocaleString()} <br />
				<b>Created At:</b>
				{new Date(update.created_timestamp * 1000).toLocaleString()} <br />
				<b>Expires At:</b>
				{new Date(update.expiration_timestamp * 1000).toLocaleString()} <br />
				<button onclick={() => console.log(update)}>LogRaw</button>
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
				<b>Trip ID:</b>
				{@html stu.trip_id ? `<a href="/TV/trip/gtfs/${stu.trip_id}">${stu.trip_id}</a>` : "<b>null</b>"} <br />
				<b>Trip Start Time:</b>
				{@html stu.trip_start_time ?? "<b>null</b>"} <br />
				<b>Direction ID:</b>
				{@html stu.direction_id ?? "<b>null</b>"} <br />
				<b>Route ID:</b>
				{@html stu.route_id ?? "<b>null</b>"} <br />
				<b>Stop ID:</b>
				{@html stu.stop_id ?? "<b>null</b>"} <br />
				<b>Stop Sequence:</b>
				{@html stu.stop_sequence ?? "<b>null</b>"} <br />
				<b>Arrival Delay:</b>
				{@html stu.arrival_delay ?? "<b>null</b>"} <br />
				<b>Departure Delay:</b>
				{@html stu.departure_delay ?? "<b>null</b>"} <br />
				<b>Departure Timestamp:</b>
				{@html stu.departure_timestamp ?? "<b>null</b>"} <br />
				<b>Arrival Timestamp:</b>
				{@html stu.arrival_timestamp ?? "<b>null</b>"} <br />
				<b>Schedule Relationship:</b>
				{@html stu.schedule_relationship ?? "<b>null</b>"} <br />
				<b>Created Timestamp:</b>
				{@html new Date(stu.created_timestamp * 1000).toLocaleString() ?? "<b>null</b>"} <br />
				<b>Expiration Timestamp:</b>
				{@html new Date(stu.expiration_timestamp * 1000).toLocaleString() ?? "<b>null</b>"} <br />
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
				<b>Update Id:</b>
				{@html vp.update_id ?? (vp as any).id ?? "<b>null</b>"} <br />
				<b>Bearing:</b>
				{@html vp.bearing ?? "<b>null</b>"} <br />
				<b>Latitude:</b>
				{@html vp.latitude ?? "<b>null</b>"} <br />
				<b>Longitude:</b>
				{@html vp.longitude ?? "<b>null</b>"} <br />
				<b>Speed:</b>
				{@html vp.speed ?? "<b>null</b>"} <br />
				<b>Current Stop Sequence:</b>
				{@html vp.current_stop_sequence ?? "<b>null</b>"} <br />
				<b>Trip Id:</b>
				{@html vp.trip_id ? `<a href="/TV/trip/gtfs/${vp.trip_id}">${vp.trip_id}</a>` : "<b>null</b>"} <br />
				<b>Trip Start Date:</b>
				{@html vp.trip_start_date ?? "<b>null</b>"} <br />
				<b>Trip Start Time:</b>
				{@html vp.trip_start_time ?? "<b>null</b>"} <br />
				<b>Congestion Level:</b>
				{@html vp.congestion_level ?? "<b>null</b>"} <br />
				<b>Occupancy Status:</b>
				{@html vp.occupancy_status ?? "<b>null</b>"} <br />
				<b>Occupancy Percentage:</b>
				{@html vp.occupancy_percentage ?? "<b>null</b>"} <br />
				<b>Vehicle Stop Status:</b>
				{@html vp.vehicle_stop_status ?? "<b>null</b>"} <br />
				<b>Vehicle Id:</b>
				{@html vp.vehicle_id ?? "<b>null</b>"} <br />
				<b>Vehicle Label:</b>
				{@html vp.vehicle_label ?? "<b>null</b>"} <br />
				<b>Vehicle License Plate:</b>
				{@html vp.vehicle_license_plate ?? "<b>null</b>"} <br />
				<b>Vehicle Wheelchair Accessible:</b>
				{@html vp.vehicle_wheelchair_accessible ?? "<b>null</b>"} <br />
				<b>Timestamp:</b>
				{@html vp.timestamp ? new Date(vp.timestamp * 1000).toLocaleString() : "<b>null</b>"} <br />
				<b>Created Timestamp:</b>
				{@html new Date(vp.created_timestamp * 1000).toLocaleString() ?? "<b>null</b>"} <br />
				<b>Expiration Timestamp:</b>
				{@html new Date(vp.expiration_timestamp * 1000).toLocaleString() ?? "<b>null</b>"} <br />
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
