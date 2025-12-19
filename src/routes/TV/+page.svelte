<script lang="ts">
	import type { PageProps } from "./$types";
	import type { AugmentedStop } from "translink-rail-api";
	import "$lib/styles/common.css";

	// Import the NEW generic component
	import Autocomplete from "$lib/Autocomplete.svelte";

	let loading = $state(false);
	let { data }: PageProps = $props();
	let stations: AugmentedStop[] = $derived(data.stations);

	// --- 1. PREPARE DATA FOR AUTOCOMPLETE ---

	// Convert Stations to Autocomplete Format
	let stationOptions = $derived(
		stations.map((s) => ({
			label: s.stop_name
				? `${s.stop_name} ${s.platform_code ? "" : "(all platforms)"}`
				: "Unknown Station",
			value: s.stop_id ?? "",
			original: s,
		})),
	);

	const formatDate = (d: string) => {
		const date = new Date(
			Date.UTC(
				Number.parseInt(d.slice(0, 4)),
				Number.parseInt(d.slice(4, 6)) - 1,
				Number.parseInt(d.slice(6, 8)),
			),
		);
		const p = Object.fromEntries(
			new Intl.DateTimeFormat("en-AU", {
				day: "numeric",
				month: "short",
				year: "2-digit",
				weekday: "short",
				timeZone: "UTC",
			})
				.formatToParts(date)
				.map((i) => [i.type, i.value]),
		);
		return `${p.day} ${p.month} ${p.year} (${p.weekday})`;
	};

	// Convert Dates to Autocomplete Format
	let dateOptions = $derived(
		data.dates.map((d) => ({
			label: formatDate(d),
			value: d,
		})),
	);

	// Convert Destinations to Autocomplete Format
	// (Hardcoding your previous list here for cleaner mapping)
	const destRaw = [
		{ v: "0", l: "Roma Street - Bowen Hills" },
		{ v: "1", l: "Dakabin - Caboolture" },
		{ v: "4", l: "Yandina - Gympie North" },
		{ v: "5", l: "Riverview - Ipswich" },
		{ v: "6", l: "Thomas Street - Rosewood" },
		{ v: "7", l: "Trinder Park - Beenleigh" },
		{ v: "8", l: "Lota - Cleveland" },
		{ v: "9", l: "Roma Street" },
		{ v: "A", l: "Bindha - Banyo Yard - Shorncliffe" },
		{ v: "B", l: "Clayfield - Doomben / Pinkenba" },
		{ v: "D", l: "Milton - Redbank" },
		{ v: "E", l: "Windsor - Ferny Grove" },
		{ v: "G", l: "Ormeau - Varsity Lakes" },
		{ v: "H", l: "Manly / Cannon Hill" },
		{ v: "K", l: "Richlands - Springfield Central" },
		{ v: "L", l: "Elimbah - Nambour" },
		{ v: "M", l: "Roma Street - Bowen Hills" },
		{ v: "N", l: "Exhibition via Brisbane Central" },
		{ v: "P", l: "International - Domestic (Airport)" },
		{ v: "R", l: "Roma Street" },
		{ v: "S", l: "South Brisbane - Park Road" },
		{ v: "V", l: "Dutton Park - Kuraby" },
		{ v: "W", l: "Albion - Northgate" },
		{ v: "X", l: "Exhibition Direct" },
		{ v: "Y", l: "Virginia - Kippa-Ring" },
		{ v: "Z", l: "Exhibition" },
	];
	const destOptions = destRaw.map((d) => ({
		label: `${d.v} - ${d.l}`, // Combine so user can search by code OR name
		value: d.v,
	}));

	// --- 2. STATE VARIABLES ---
	// We only need simple variables or arrays now, the component handles the hidden inputs

	// Station State (We use the 'original' property to get the augmented stop back if needed,
	// but standard form submit only needs the ID which the component handles via 'name')
	let startStationItem = $state(null);
	let endStationItem = $state(null);

	// Intermediate Stations: Array of objects { item: Item | null }
	let intermediateItems = $state<{ item: any }[]>([]);

	// Date State
	let dateFilters = $state<{ id: number; item: any }[]>([]);
	let dateCounter = 0;

	// Destination State
	let destItem = $state(null);

	// --- 3. HELPER FUNCTIONS ---

	function addIntermediate() {
		intermediateItems.push({ item: null });
	}

	function removeIntermediate(index: number) {
		intermediateItems.splice(index, 1);
	}

	function addDate() {
		dateFilters.push({ id: dateCounter++, item: null });
	}

	function removeDate(index: number) {
		dateFilters.splice(index, 1);
	}

	function submit() {
		let form = document.querySelector("form") as HTMLFormElement;
		form.requestSubmit();
	}
</script>

<svelte:head>
	<title>TRAX TripViewer - Search</title>
	<link rel="icon" type="image/svg+xml" href="/favicon-TV.svg" />
</svelte:head>

<div class="page-container">
	<header class="title">
		<h1>TRAX <i>TripViewer</i></h1>
		<p>Search for a GTFS trip or view <a href="/TV/trip/QRT">QRT services</a>.</p>

		{#if loading}
			<div class="loading-state">
				<img src="/img/loading.svg" alt="Loading..." />
				<p>Loading... this may take a while.</p>
			</div>
		{/if}
	</header>

	{#if !loading}
		<form action="/TV/search" method="get" class="search-card">
			<fieldset>
				<legend>Station Filter</legend>
				<div class="grid-2">
					<div class="input-group">
						<label for="start-station-input">Starts at:</label>
						<Autocomplete
							items={stationOptions}
							bind:selectedItem={startStationItem}
							name="start-station"
							placeholder="Search start station..."
						/>
					</div>
					<div class="input-group">
						<label for="end-station-input">Ends at:</label>
						<Autocomplete
							items={stationOptions}
							bind:selectedItem={endStationItem}
							name="end-station"
							placeholder="Search destination..."
						/>
					</div>
				</div>

				{#if intermediateItems.length > 0}
					<div class="subsection">
						<span>Via Stations (must stop at all):</span>
						{#each intermediateItems as row, index}
							<div class="row-control">
								<div class="flex-grow">
									<Autocomplete
										items={stationOptions}
										bind:selectedItem={row.item}
										name="intermediate-station-{index}"
										placeholder="Search via station..."
									/>
								</div>
								<button
									type="button"
									class="btn-icon"
									onclick={() => removeIntermediate(index)}
									title="Remove Station"
								>
									&minus;
								</button>
							</div>
						{/each}
					</div>
				{/if}
				<button type="button" class="btn-secondary small" onclick={addIntermediate}> + Add Via Station </button>
			</fieldset>

			<fieldset>
				<legend>Date Filter</legend>
				<p class="hint">Service must run on all selected dates.</p>

				{#each dateFilters as row, index}
					<div class="row-control">
						<div class="flex-grow">
							<Autocomplete
								items={dateOptions}
								bind:selectedItem={row.item}
								name="service-date-{index}"
								placeholder="Select or type date (YYYYMMDD)..."
							/>
						</div>
						<button type="button" class="btn-icon" onclick={() => removeDate(index)} title="Remove Date">
							&minus;
						</button>
					</div>
				{/each}
				<button type="button" class="btn-secondary small" onclick={addDate}> + Add Date Constraint </button>
			</fieldset>

			<fieldset>
				<legend>Train Details</legend>
				<div class="grid-2">
					<div class="input-group">
						<label for="train-number-type">Train Type</label>
						<select name="train-number-type" id="train-number-type">
							<option value="">Any Type</option>
							<option value="3car">Any 3 car</option>
							<option value="6car">Any 6 car</option>
							<option value="1">1 - 6 car SMU</option>
							<option value="D">D - 6 car NGR</option>
							<option value="J">J - 3 car SMU</option>
							<option value="T">T - 6 car IMU</option>
							<option value="U">U - 3 car IMU</option>
							<option value="X">X - L2 ETCS</option>
						</select>
					</div>

					<div class="input-group">
						<label for="train-number">Specific Train Number</label>
						<input
							type="text"
							name="train-number"
							id="train-number"
							placeholder="e.g. 1124 or use '.' for wildcard (.K12)"
						/>
					</div>
				</div>

				<div class="input-group">
					<label for="train-number-destination">Destination Range</label>
					<Autocomplete
						items={destOptions}
						bind:selectedItem={destItem}
						name="train-number-destination"
						placeholder="Search destination code or name..."
					/>
				</div>
			</fieldset>

			<fieldset>
				<legend>Route Filters</legend>
				<div class="input-group">
					<label for="route">Any Included Line</label>
					<select name="route" id="route">
						<option value="">Any Included Line</option>
						{#each Object.keys(data.routes).sort() as route}
							<option value={route}>{data.routes[route]}</option>
						{/each}
					</select>
				</div>

				<div class="grid-2">
					<div class="input-group">
						<label for="route-start">Starting Line</label>
						<select name="route-start" id="route-start">
							<option value="">Any</option>
							{#each Object.keys(data.routes).sort() as route}
								<option value={route}>{data.routes[route]}</option>
							{/each}
						</select>
					</div>
					<div class="input-group">
						<label for="route-end">Ending Line</label>
						<select name="route-end" id="route-end">
							<option value="">Any</option>
							{#each Object.keys(data.routes).sort() as route}
								<option value={route}>{data.routes[route]}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="input-group">
					<label for="route-pair">Line Pair</label>
					<div class="row-control">
						<select name="route-pair" id="route-pair" class="flex-grow">
							<option value="">Any Line Pair</option>
							{#each Object.keys(data.routePairs).sort() as pair}
								<option value={pair}>{data.routePairs[pair]}</option>
							{/each}
						</select>
						<label class="checkbox-label">
							<input type="checkbox" name="route-pair-reversible" id="route-pair-reversible" />
							Reversible
						</label>
					</div>
				</div>
			</fieldset>

			<details class="advanced-details" open={data.extraDetails}>
				<summary>Advanced Settings</summary>
				<div class="details-content">
					<div class="grid-2">
						<div class="input-group">
							<label for="date-mod">Date Selection</label>
							<select name="date-mode" id="date-mod">
								<option value="actual_sch">Actual SCH (default)</option>
								<option value="actual_rt">Actual RT</option>
							</select>
						</div>
						<div class="input-group checkbox-group">
							<input
								type="checkbox"
								name="extra-details"
								id="extra-details"
								checked={data.extraDetails}
							/>
							<label for="extra-details">Show Extra Details</label>
						</div>
					</div>
				</div>
			</details>

			<div class="form-actions">
				<input type="submit" value="Search Trips" class="btn-primary" />
			</div>
		</form>
	{/if}
</div>

<style>
	.page-container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.title {
		text-align: center;
		margin-bottom: 2rem;
	}

	.title h1 {
		margin: 0;
		color: #2c3e50;
	}

	.loading-state {
		text-align: center;
		margin: 2rem 0;
	}

	/* Card Style */
	.search-card {
		background: white;
		padding: 2rem;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
		border: 1px solid #e1e4e8;
	}

	/* Form Grouping */
	fieldset {
		border: none;
		padding: 0;
		margin: 0 0 2rem 0;
		border-bottom: 1px solid #eee;
		padding-bottom: 2rem;
	}

	fieldset:last-of-type {
		border-bottom: none;
		padding-bottom: 0;
		margin-bottom: 1rem;
	}

	legend {
		font-weight: 600;
		font-size: 1.1rem;
		color: #2c3e50;
		margin-bottom: 1rem;
		display: block;
		width: 100%;
	}

	.hint {
		font-size: 0.85rem;
		color: #666;
		margin-top: -0.5rem;
		margin-bottom: 1rem;
		font-style: italic;
	}

	/* Input Layouts */
	.grid-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	@media (max-width: 600px) {
		.grid-2 {
			grid-template-columns: 1fr;
		}
	}

	.input-group {
		margin-bottom: 1rem;
	}

	label {
		display: block;
		font-weight: 500;
		font-size: 0.9rem;
		margin-bottom: 0.4rem;
		color: #444;
	}

	input[type="text"],
	select {
		width: 100%;
		padding: 0.6rem;
		border: 1px solid #ccc;
		border-radius: 6px;
		font-size: 1rem;
		box-sizing: border-box;
		background-color: #fff;
	}

	input[type="text"]:focus,
	select:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
	}

	/* Dynamic Rows */
	.row-control {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.flex-grow {
		flex-grow: 1;
	}

	/* Buttons */
	.btn-primary {
		width: 100%;
		padding: 0.8rem;
		background-color: #007bff;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 1.1rem;
		font-weight: bold;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-primary:hover {
		background-color: #0056b3;
	}

	.btn-secondary {
		background: none;
		border: 1px dashed #aaa;
		color: #555;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.9rem;
	}

	.btn-secondary:hover {
		border-color: #007bff;
		color: #007bff;
		background: #f0f7ff;
	}

	.btn-icon {
		background: #ffebeb;
		color: #cc0000;
		border: none;
		width: 36px;
		height: 36px;
		border-radius: 6px;
		cursor: pointer;
		font-size: 1.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-icon:hover {
		background: #ffcccc;
	}

	.subsection {
		background: #f9f9f9;
		padding: 1rem;
		border-radius: 6px;
		margin-bottom: 1rem;
	}

	/* Checkboxes */
	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		white-space: nowrap;
		cursor: pointer;
	}

	.checkbox-group {
		display: flex;
		align-items: center;
		height: 100%;
		padding-top: 1rem;
	}

	.checkbox-group input {
		margin-right: 0.5rem;
	}

	/* Details */
	.advanced-details {
		background: #f8f9fa;
		border-radius: 8px;
		padding: 0.5rem;
		margin-bottom: 2rem;
	}

	summary {
		padding: 0.5rem;
		cursor: pointer;
		font-weight: 600;
		color: #555;
	}

	.details-content {
		padding: 1rem;
		padding-top: 0;
	}

	.form-actions {
		margin-top: 2rem;
	}
</style>
