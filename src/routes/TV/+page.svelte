<script lang="ts">
	import type { PageProps } from "./$types";
	import type { SerializableAugmentedStop } from "translink-rail-api";
	import "$lib/styles/common.css";
	import StationAutocomplete from "$lib/StationAutocomplete.svelte";

	let loading = $state(false);

	const { data }: PageProps = $props();
	let { stations }: { stations: SerializableAugmentedStop[] } = data;

	// Station State
	let startStation = $state<SerializableAugmentedStop | null>(null);
	let endStation = $state<SerializableAugmentedStop | null>(null);
	let intermediateStations = $state<(SerializableAugmentedStop | null)[]>([]);

	// Date State (Refactored from DOM manipulation to Svelte State for better styling)
	// We store unique IDs or just use an array of objects to track rows
	let dateFilters = $state<{ id: number; value: string }[]>([]);
	let dateCounter = 0;

	function addIntermediate() {
		intermediateStations.push(null);
	}

	function removeIntermediate(index: number) {
		intermediateStations.splice(index, 1);
	}

	function addDate() {
		dateFilters.push({ id: dateCounter++, value: "" });
	}

	function removeDate(index: number) {
		dateFilters.splice(index, 1);
	}

	function submit() {
		// Native form submission is fine here since you are using standard GET params
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
						<div id="start-station-input">
							<StationAutocomplete
								bind:selectedStation={startStation}
								{stations}
								placeholder="Search start station..."
							/>
						</div>
						<input
							type="hidden"
							name="start-station"
							value={startStation?.stop_id ?? ""}
							id="start-station"
						/>
					</div>
					<div class="input-group">
						<label for="end-station-input">Ends at:</label>
						<div id="end-station-input">
							<StationAutocomplete
								bind:selectedStation={endStation}
								{stations}
								placeholder="Search destination..."
							/>
						</div>
						<input type="hidden" name="end-station" value={endStation?.stop_id ?? ""} id="end-station" />
					</div>
				</div>

				{#if intermediateStations.length > 0}
					<div class="subsection">
						<span>Via Stations (must stop at all):</span>
						{#each intermediateStations as station, index}
							<div class="row-control">
								<div class="flex-grow">
									<StationAutocomplete
										bind:selectedStation={intermediateStations[index]}
										{stations}
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
								<input
									type="hidden"
									name="intermediate-station-{index}"
									value={station?.stop_id ?? ""}
								/>
							</div>
						{/each}
					</div>
				{/if}
				<button type="button" class="btn-secondary small" onclick={addIntermediate}> + Add Via Station </button>
			</fieldset>

			<fieldset>
				<legend>Date Filter</legend>
				<p class="hint">Service must run on all selected dates.</p>

				{#each dateFilters as dateItem, index}
					<div class="row-control">
						<select name="service-date-{index}" bind:value={dateItem.value} class="flex-grow">
							<option value="">Select a Date</option>
							{#each data.dates as date}
								<option value={date}>{date}</option>
							{/each}
						</select>
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
							<option value="1">1 - 6 car SMU</option>
							<option value="D">D - NGR</option>
							<option value="J">J - 3 car SMU</option>
							<option value="T">T - 6 car IMU</option>
							<option value="U">U - 3 car IMU</option>
							<option value="X">X - L2 ETCS</option>
						</select>
					</div>

					<div class="input-group">
						<label for="train-number">Specific Train Number</label>
						<input type="text" name="train-number" id="train-number" placeholder="e.g. 1124" />
					</div>
				</div>

				<div class="input-group">
					<label for="train-number-destination">Destination Range</label>
					<select name="train-number-destination" id="train-number-destination">
						<option value="">Any Destination Range</option>
						<option value="0">0 - Roma Street - Bowen Hills</option>
						<option value="1">1 - Dakabin - Caboolture</option>
						<option value="4">4 - Yandina - Gympie North</option>
						<option value="5">5 - Riverview - Ipswich</option>
						<option value="6">6 - Thomas Street - Rosewood</option>
						<option value="7">7 - Trinder Park - Beenleigh</option>
						<option value="8">8 - Lota - Cleveland</option>
						<option value="9">9 - Roma Street</option>
						<option value="A">A - Bindha - Banyo Yard - Shorncliffe</option>
						<option value="B">B - Clayfield - Doomben / Pinkenba</option>
						<option value="D">D - Milton - Redbank</option>
						<option value="E">E - Windsor - Ferny Grove</option>
						<option value="G">G - Ormeau - Varsity Lakes </option>
						<option value="H">H - Manly / Cannon Hill</option>
						<option value="K">K - Richlands - Springfield Central</option>
						<option value="L">L - Elimbah - Nambour</option>
						<option value="M">M - Roma Street - Bowen Hills</option>
						<option value="N">N - Exhibition via Brisbane Central</option>
						<option value="P">P - International - Domestic (Airport)</option>
						<option value="R">R - Roma Street</option>
						<option value="S">S - South Brisbane - Park Road</option>
						<option value="V">V - Dutton Park - Kuraby</option>
						<option value="W">W - Albion - Northgate</option>
						<option value="X">X - Exhibition Direct</option>
						<option value="Y">Y - Virginia - Kippa-Ring</option>
						<option value="Z">Z - Exhibition </option>
					</select>
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
								<option value="GTFS">GTFS</option>
							</select>
						</div>
						<div class="input-group">
							<label for="rs-leader-behaviour">RS Confirmed Leaders</label>
							<select name="rs-leader-behaviour" id="rs-leader-behaviour">
								<option value="include">Include (default)</option>
								<option value="exclude">Exclude</option>
								<option value="only">Only</option>
							</select>
						</div>
					</div>

					<div class="grid-2">
						<div class="input-group">
							<label for="multi-date-behaviour">Multi-Date Behaviour</label>
							<select name="multi-date-behaviour" id="multi-date-behaviour">
								<option value="original">Original (default)</option>
								<option value="duplicate">Duplicate</option>
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
				<input
					type="submit"
					value="Search Trips"
					class="btn-primary"
					onclick={() => {
						loading = true;
						submit();
					}}
				/>
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
