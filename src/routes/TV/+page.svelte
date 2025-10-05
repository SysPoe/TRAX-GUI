<script lang="ts">
	import type { PageProps } from "./$types";
	import type { SerializableAugmentedStop } from "translink-rail-api";
	import "$lib/styles/common.css";

	let loading = $state(false);

	const { data }: PageProps = $props();
	let { stations }: { stations: SerializableAugmentedStop[] } = data;

	function addIntermediate() {
		const container = document.getElementById("intermediates");
		const template = document.getElementById("template-intermediate-station");
		if (container && template) {
			let id = container.children.length;
			const newIntermediate = template.cloneNode(true) as HTMLElement;
			newIntermediate.style.display = "block";
			newIntermediate.id += `-${id}`;
			newIntermediate.querySelector("select")?.setAttribute("id", `intermediate-station-${id}`);
			newIntermediate.querySelector("select")?.setAttribute("name", `intermediate-station-${id}`);
			const button = newIntermediate.querySelector("button");
			if (button) {
				button.addEventListener("click", removeIntermediate);
			}
			container.appendChild(newIntermediate);
		}
	}

	function removeIntermediate(event: Event) {
		const button = event.currentTarget as HTMLElement;
		const parent = button.parentElement;
		if (parent && parent.parentElement) {
			parent.parentElement.removeChild(parent);
		}
	}

	function addDate() {
		const container = document.getElementById("dates");
		const template = document.getElementById("template-date");
		if (container && template) {
			let id = container.children.length;
			const newDate = template.cloneNode(true) as HTMLElement;
			newDate.id += `-${id}`;
			newDate.querySelector("select")?.setAttribute("id", `service-date-${id}`);
			newDate.querySelector("select")?.setAttribute("name", `service-date-${id}`);
			newDate.style.display = "block";
			const button = newDate.querySelector("button");
			if (button) {
				button.addEventListener("click", removeDate);
			}
			container.appendChild(newDate);
		}
	}

	function removeDate(event: Event) {
		const button = event.currentTarget as HTMLElement;
		const parent = button.parentElement;
		if (parent && parent.parentElement) {
			parent.parentElement.removeChild(parent);
		}
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


<div class="title">
	<h1>TRAX <i>TripViewer</i></h1>
	<p>Search for a GTFS trip to view details or view <a href="/TV/trip/QRT">QRT services</a>.</p>

	{#if loading}
		<p><img src="/img/loading.svg" alt="Loading..." /></p>
		<p>Loading... this may take a while.</p>
	{/if}
</div>

{#if !loading}
	<form action="/TV/search" method="get">
		<input
			type="submit"
			value="Search"
			onclick={() => {
				loading = true;
				submit();
			}}
		/>
		<hr />
		<b>Filter by Stations</b><br />
		<label for="start-station">Starts at:</label>
		<select name="start-station" id="start-station">
			<option value="">Any Station</option>
			<!-- TODO add search functionality for stations -->
			{#each stations as station}
				<option value={station.stop_id}>{station.stop_name}</option>
			{/each}
		</select><br />
		<label for="end-station">Ends at:</label>
		<select name="end-station" id="end-station">
			<option value="">Any Station</option>
			<!-- TODO add search functionality for stations -->
			{#each stations as station}
				<option value={station.stop_id}>{station.stop_name}</option>
			{/each}
		</select><br />
		<i
			>Included Stations (not necessarily in order and can be start/end, service must stop at all selected stops):</i
		><br />
		<!-- TODO add ability to add/remove intermediate stations -->
		<div class="intermediates" id="intermediates">
			<div style="display: none;" id="template-intermediate-station">
				<select name="intermediate-station" id="intermediate-station">
					<option value="">Any Intermediate Station</option>
					<!-- TODO add search functionality for stations -->
					{#each stations as station}
						<option value={station.stop_id}>{station.stop_name}</option>
					{/each}
				</select>
				<button> - </button>
			</div>
		</div>
		<button type="button" onclick={addIntermediate}> + </button>

		<hr />
		<b>Filter by Date</b><br />
		<i>Service must run on (have stops scheduled for) all selected dates</i><br />
		<div class="dates" id="dates">
			<div style="display: none;" id="template-date">
				<select name="service-date" id="service-date">
					<option value="">Any Date</option>
					{#each data.dates as date}
						<option value={date}>{date}</option>
					{/each}
				</select>
				<button> - </button>
			</div>
		</div>
		<button type="button" onclick={addDate}> + </button>

		<hr />
		<b>Filter by Train Number</b><br />
		<select name="train-number-type" id="train-number-type">
			<option value="">Any Type</option>
			<option value="1">1 - 6 car SMU in revenue service</option>
			<option value="D">D - NGR in revenue service</option>
			<option value="J">J - 3 car SMU in revenue service</option>
			<option value="T">T - 6 car IMU in revenue service</option>
			<option value="U">U - 3 car IMU in revenue service</option>
			<option value="X">X - Train equipped w/ L2 ETCS in revenue service </option>
		</select><br />

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
		</select><br />
		<label for="train-number">Train Number:</label>
		<input type="text" name="train-number" id="train-number" /><br />
		<hr />
		<b>Filter by Lines</b> <br />
		<select name="route" id="route">
			<option value="">Any Included Line</option>
			{#each Object.keys(data.routes).sort() as route}
				<option value={route}>{data.routes[route]}</option>
			{/each}
		</select>
		<select name="route-start" id="route-start">
			<option value="">Any Starting Line</option>
			{#each Object.keys(data.routes).sort() as route}
				<option value={route}>{data.routes[route]}</option>
			{/each}
		</select>
		<select name="route-end" id="route-end">
			<option value="">Any Ending Line</option>
			{#each Object.keys(data.routes).sort() as route}
				<option value={route}>{data.routes[route]}</option>
			{/each}
		</select><br />
		<select name="route-pair" id="route-pair">
			<option value="">Any Line Pair</option>
			{#each Object.keys(data.routePairs).sort() as pair}
				<option value={pair}>{data.routePairs[pair]}</option>
			{/each}
		</select>
		<label for="route-pair-reversible">Reversible:</label>
		<input type="checkbox" name="route-pair-reversible" id="route-pair-reversible" />
		<br />

		<hr />
		<details>
			<summary>Advanced</summary>

			<label for="date-mod">Date Selection:</label>
			<select name="date-mode" id="date-mod">
				<option value="actual_sch">Actual SCH (default)</option>
				<option value="actual_rt">Actual RT</option>
				<option value="GTFS">GTFS</option>
			</select><br />

			<label for="rs-leader-behaviour">RS Confirmed Leaders:</label>
			<select name="rs-leader-behaviour" id="rs-leader-behaviour">
				<option value="include">Include (default)</option>
				<option value="exclude">Exclude</option>
				<option value="only">Only</option>
			</select><br />

			<label for="multi-date-behaviour">Multi-Date Behaviour:</label>
			<select name="multi-date-behaviour" id="multi-date-behaviour">
				<option value="original">Original (defualt)</option>
				<option value="duplicate">Duplicate</option>
			</select><br />

			<label for="extra-details">Show Extra Details:</label>
			<input type="checkbox" name="extra-details" id="extra-details" />
		</details>
		<hr />
		<input
			type="submit"
			value="Search"
			onclick={() => {
				loading = true;
				submit();
			}}
		/>
	</form>
{/if}

<style>
	* {
		font-family: "Arial";
	}

	form {
		max-width: 600px;
		margin: 0 auto;
		font-size: 1.1em;
	}

	form hr {
		margin: 1rem 0;
		margin-left: -1rem;
		margin-right: -1rem;
	}

	summary {
		cursor: pointer;
		font-weight: bold;
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}
</style>
