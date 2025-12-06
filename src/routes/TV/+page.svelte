<script lang="ts">
	import type { PageProps } from "./$types";
	import type { SerializableAugmentedStop } from "translink-rail-api";
	import "$lib/styles/common.css";
	
	let loading = $state(false);
	const { data }: PageProps = $props();
	let { stations }: { stations: SerializableAugmentedStop[] } = data;

    // Sort stations for the select list
    let sortedStations = [...stations].sort((a, b) => (a.stop_name || "").localeCompare(b.stop_name || ""));

    // Destinations List (Restored for functionality)
    const destinations = [
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

	// --- HELPER FUNCTIONS ---

	// State now holds both ID and current value for robust removal
	let intermediateItems = $state<{ id: number; value: string }[]>([]);
	let intermediateCounter = 0;
	
	let dateFilters = $state<{ id: number; value: string }[]>([]);
	let dateCounter = 0;

	function addIntermediate() {
		intermediateItems.push({ id: intermediateCounter++, value: "" });
	}

	function removeIntermediate(index: number) {
		intermediateItems.splice(index, 1);
	}

	function addDate() {
		dateFilters.push({ id: dateCounter++, value: "" });
	}

	function removeDate(index: number) {
		dateFilters.splice(index, 1);
	}

</script>

<svelte:head>
	<title>TRAX TripViewer - Search</title>
	<link rel="icon" type="image/svg+xml" href="/favicon-TV.svg" />
</svelte:head>

<h1>TRAX TripViewer</h1>
<p>Search for a GTFS trip or view <a href="/TV/trip/QRT">QRT services</a>.</p>

{#if loading}
    <p>Loading... please wait.</p>
{/if}

<form action="/TV/search" method="get">
    <fieldset>
        <legend>Station Filter</legend>
        <p>
            <label for="start-station">Starts at:</label><br>
            <select name="start-station" id="start-station">
                <option value="">-- Select Station --</option>
                {#each sortedStations as station}
                    <option value={station.stop_id}>{station.stop_name}</option>
                {/each}
            </select>
        </p>
        <p>
            <label for="end-station">Ends at:</label><br>
            <select name="end-station" id="end-station">
                <option value="">-- Select Station --</option>
                {#each sortedStations as station}
                    <option value={station.stop_id}>{station.stop_name}</option>
                {/each}
            </select>
        </p>

        {#if intermediateItems.length > 0}
            <p><b>Via Stations (must stop at all):</b></p>
            {#each intermediateItems as item, index (item.id)}
                <p>
                    <select name="intermediate-station-{index}" bind:value={item.value}>
                        <option value="">-- Select Station --</option>
                        {#each sortedStations as station}
                            <option value={station.stop_id}>{station.stop_name}</option>
                        {/each}
                    </select>
                    <button type="button" onclick={() => removeIntermediate(index)}>[x]</button>
                </p>
            {/each}
        {/if}
        <button type="button" onclick={addIntermediate}>+ Add Via Station</button>
    </fieldset>

    <br>

    <fieldset>
        <legend>Date Filter</legend>
        <p><i>Service must run on all selected dates. Format: YYYYMMDD</i></p>

        {#each dateFilters as item, index (item.id)}
            <p>
                    <input type="text" name="service-date-{index}" placeholder="YYYYMMDD" bind:value={item.value}>
                    <button type="button" onclick={() => removeDate(index)}>[x]</button>
            </p>
        {/each}
        <button type="button" onclick={addDate}>+ Add Date Constraint</button>
    </fieldset>

    <br>

    <fieldset>
        <legend>Train Details</legend>
        <p>
            <label for="train-number-type">Train Type:</label>
            <select name="train-number-type" id="train-number-type">
                <option value="">Any Type</option>
                <option value="1">1 - 6 car SMU</option>
                <option value="D">D - NGR</option>
                <option value="J">J - 3 car SMU</option>
                <option value="T">T - 6 car IMU</option>
                <option value="U">U - 3 car IMU</option>
                <option value="X">X - L2 ETCS</option>
            </select>
        </p>
        <p>
            <label for="train-number">Specific Train Number:</label>
            <input type="text" name="train-number" id="train-number" size="10">
        </p>
        <p>
             <label for="train-number-destination">Destination Code/Name:</label><br>
             <select name="train-number-destination" id="train-number-destination">
                <option value="">-- Select Destination --</option>
                {#each destinations as dest}
                    <option value={dest.v}>{dest.v} - {dest.l}</option>
                {/each}
             </select>
        </p>
    </fieldset>

    <br>

    <fieldset>
        <legend>Route Filters</legend>
        <p>
            <label for="route">Any Included Line:</label><br>
            <select name="route" id="route">
                <option value="">Any Included Line</option>
                {#each Object.keys(data.routes).sort() as route}
                    <option value={route}>{data.routes[route]}</option>
                {/each}
            </select>
        </p>
        <p>
            Starting Line:
            <select name="route-start" id="route-start">
                <option value="">Any</option>
                {#each Object.keys(data.routes).sort() as route}
                    <option value={route}>{data.routes[route]}</option>
                {/each}
            </select>
            <br>
            Ending Line:
            <select name="route-end" id="route-end">
                <option value="">Any</option>
                {#each Object.keys(data.routes).sort() as route}
                    <option value={route}>{data.routes[route]}</option>
                {/each}
            </select>
        </p>
        <p>
            Line Pair:
            <select name="route-pair" id="route-pair">
                <option value="">Any Line Pair</option>
                {#each Object.keys(data.routePairs).sort() as pair}
                    <option value={pair}>{data.routePairs[pair]}</option>
                {/each}
            </select>
            <br>
            <label>
                <input type="checkbox" name="route-pair-reversible" id="route-pair-reversible">
                Reversible
            </label>
        </p>
    </fieldset>

    <br>

    <fieldset>
        <legend>Advanced Settings</legend>
        <p>
            Date Selection:
            <select name="date-mode" id="date-mod">
                <option value="actual_sch">Actual SCH (default)</option>
                <option value="actual_rt">Actual RT</option>
                <option value="GTFS">GTFS</option>
            </select>
        </p>
        <p>
            RS Confirmed Leaders:
            <select name="rs-leader-behaviour" id="rs-leader-behaviour">
                <option value="include">Include (default)</option>
                <option value="exclude">Exclude</option>
                <option value="only">Only</option>
            </select>
        </p>
        <p>
            Multi-Date Behaviour:
            <select name="multi-date-behaviour" id="multi-date-behaviour">
                <option value="original">Original (default)</option>
                <option value="duplicate">Duplicate</option>
            </select>
        </p>
        <p>
            <label>
                <input type="checkbox" name="extra-details" id="extra-details" checked={data.extraDetails}>
                Show Extra Details
            </label>
        </p>
    </fieldset>

    <br>

    <input type="submit" value="Search Trips" onclick={() => loading = true}>
</form>
