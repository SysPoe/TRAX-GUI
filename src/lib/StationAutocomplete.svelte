<script lang="ts">
	import type { SerializableAugmentedStop } from "translink-rail-api";
	import { onMount } from "svelte";

	interface Props {
		stations: SerializableAugmentedStop[];
		placeholder?: string;
		value?: string;
		selectedStation?: SerializableAugmentedStop | null;
	}

	let {
		stations,
		placeholder = "Type to search stations",
		value = $bindable(""),
		selectedStation = $bindable(null)
	}: Props = $props();

	let inputElement: HTMLInputElement;
	let dropdownElement = $state<HTMLElement | null>(null);
	let isOpen = $state(false);
	let highlightedIndex = $state(-1);

	// Filter stations based on input
	let filteredStations = $derived.by(() => {
		if (!value.trim()) return [];
		const query = value.toLowerCase();
		return stations.filter(station => {
			const name = station.stop_name?.toLowerCase() ?? "";
			const id = station.stop_id?.toLowerCase() ?? "";
			return name.includes(query) || id.includes(query);
		}).slice(0, 10); // Limit to 10 results
	});

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		value = target.value;
		selectedStation = null; // Reset selection when typing
		isOpen = filteredStations.length > 0;
		highlightedIndex = -1;
	}

	function handleFocus() {
		isOpen = filteredStations.length > 0;
	}

	function handleBlur() {
		// Delay closing to allow click on dropdown items
		setTimeout(() => {
			isOpen = false;
			highlightedIndex = -1;
		}, 150);
	}

	function selectStation(station: SerializableAugmentedStop) {
		selectedStation = station;
		value = station.stop_name ?? station.stop_id ?? "";
		isOpen = false;
		highlightedIndex = -1;
		inputElement?.blur();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!isOpen) return;

		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				highlightedIndex = Math.min(highlightedIndex + 1, filteredStations.length - 1);
				break;
			case "ArrowUp":
				event.preventDefault();
				highlightedIndex = Math.max(highlightedIndex - 1, -1);
				break;
			case "Enter":
				event.preventDefault();
				if (filteredStations.length > 0) {
					const index = highlightedIndex >= 0 ? highlightedIndex : 0;
					selectStation(filteredStations[index]);
				}
				break;
			case "Escape":
				event.preventDefault();
				isOpen = false;
				highlightedIndex = -1;
				break;
		}
	}

	// Close dropdown when clicking outside
	onMount(() => {
		function handleClickOutside(event: MouseEvent) {
			if (inputElement && !inputElement.contains(event.target as Node) &&
				dropdownElement && !dropdownElement.contains(event.target as Node)) {
				isOpen = false;
				highlightedIndex = -1;
			}
		}

		document.addEventListener("click", handleClickOutside);
		return () => document.removeEventListener("click", handleClickOutside);
	});
</script>

<div class="autocomplete-container">
	<input
		bind:this={inputElement}
		type="text"
		{placeholder}
		bind:value
		oninput={handleInput}
		onfocus={handleFocus}
		onblur={handleBlur}
		onkeydown={handleKeydown}
		autocomplete="off"
	/>

	{#if isOpen && filteredStations.length > 0}
		<ul bind:this={dropdownElement} class="dropdown">
			{#each filteredStations as station, index}
				<button
					type="button"
					class="dropdown-item"
					class:highlighted={index === highlightedIndex}
					onclick={() => selectStation(station)}
					onmouseenter={() => highlightedIndex = index}
					onkeydown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							selectStation(station);
						}
					}}
				>
					{station.stop_name ?? station.stop_id}
					{#if station.stop_id}
						<span class="stop-id">({station.stop_id})</span>
					{/if}
				</button>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.autocomplete-container {
		position: relative;
		width: 100%;
	}

	input {
		width: 100%;
		padding: 0.3rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-family: "Arial";
		font-size: 0.9em;
	}

	.dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: white;
		border: 1px solid #ccc;
		border-top: none;
		border-radius: 0 0 4px 4px;
		max-height: 200px;
		overflow-y: auto;
		z-index: 1000;
		list-style: none;
		padding: 0;
		margin: 0;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.dropdown-item {
		width: 100%;
		padding: 0.3rem;
		border: none;
		background: none;
		text-align: left;
		cursor: pointer;
		border-bottom: 1px solid #eee;
		font-family: "Arial";
		font-size: 0.9em;
	}

	.dropdown-item:last-child {
		border-bottom: none;
	}

	.dropdown-item:hover,
	.dropdown-item.highlighted {
		background-color: #f0f0f0;
	}

	.stop-id {
		color: #666;
		font-size: 0.9em;
		margin-left: 0.5rem;
	}
</style>