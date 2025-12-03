<script lang="ts">
	import { onMount } from "svelte";

	// Generic Item Interface
	interface Item {
		label: string;
		value: string;
		// Allow passing through original objects if needed (like the station object)
		original?: any; 
	}

	interface Props {
		items: Item[]; // The full list of items to filter
		placeholder?: string;
		value?: string; // The text in the input box
		selectedItem?: Item | null; // The actual selected object
		name?: string; // For the hidden input field form submission
	}

	let {
		items,
		placeholder = "Type to search...",
		value = $bindable(""),
		selectedItem = $bindable(null),
		name = ""
	}: Props = $props();

	let inputElement: HTMLInputElement;
	let dropdownElement = $state<HTMLElement | null>(null);
	let isOpen = $state(false);
	let highlightedIndex = $state(-1);

	// Filter items based on input
	let filteredItems = $derived.by(() => {
		// If input is empty, show all (or limit to top 20 for performance)
		// If you prefer to show NOTHING until typing, uncomment the next line:
		// if (!value.trim()) return []; 
		
		const query = value.toLowerCase();
		return items.filter(item => {
			return item.label.toLowerCase().includes(query) || 
				   item.value.toLowerCase().includes(query);
		});
	});

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		value = target.value;
		selectedItem = null; // Reset selection when typing
		isOpen = true;
		highlightedIndex = -1;
	}

	function handleFocus() {
		isOpen = true; // Open immediately on focus
	}

	function handleBlur() {
		setTimeout(() => {
			isOpen = false;
			highlightedIndex = -1;
		}, 150);
	}

	function selectItem(item: Item) {
		selectedItem = item;
		value = item.label;
		isOpen = false;
		highlightedIndex = -1;
		// blur to close keyboard on mobile, or keep focus? Usually keeping focus is better but closed dropdown.
		// inputElement?.blur(); 
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!isOpen && event.key !== "ArrowDown") return;
        if (!isOpen && event.key === "ArrowDown") {
             isOpen = true;
             return;
        }

		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				highlightedIndex = Math.min(highlightedIndex + 1, filteredItems.length - 1);
				// Auto-scroll logic could go here
				break;
			case "ArrowUp":
				event.preventDefault();
				highlightedIndex = Math.max(highlightedIndex - 1, -1);
				break;
			case "Enter":
				event.preventDefault();
				if (filteredItems.length > 0) {
					const index = highlightedIndex >= 0 ? highlightedIndex : 0;
					selectItem(filteredItems[index]);
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

<div class="autocomplete-wrapper">
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
		class="autocomplete-input"
	/>
	
	{#if name}
		<input type="hidden" {name} value={selectedItem?.value ?? ""} />
	{/if}

	{#if isOpen && filteredItems.length > 0}
		<ul bind:this={dropdownElement} class="dropdown-list">
			{#each filteredItems as item, index}
				<li class="dropdown-item-wrapper">
				<button
					type="button"
					class="dropdown-item"
					class:highlighted={index === highlightedIndex}
					onclick={() => selectItem(item)}
					onmouseenter={() => highlightedIndex = index}
				>
					<span class="item-label">{item.label}</span>
					{#if item.value !== item.label}
						<span class="item-value-pill">{item.value}</span>
					{/if}
				</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.autocomplete-wrapper {
		position: relative;
		width: 100%;
	}

	.autocomplete-input {
		width: 100%;
		padding: 0.6rem;
		border: 1px solid #ccc;
		border-radius: 6px;
		font-size: 1rem;
		box-sizing: border-box;
		background-color: #fff;
	}
	
	.autocomplete-input:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
	}

	.dropdown-list {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: white;
		border: 1px solid #ccc;
		border-top: none;
		border-radius: 0 0 6px 6px;
		max-height: 250px;
		overflow-y: auto;
		z-index: 1000;
		list-style: none;
		padding: 0;
		margin: 0;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.dropdown-item {
		width: 100%;
		padding: 0.5rem 0.8rem;
		border: none;
		background: none;
		text-align: left;
		cursor: pointer;
		border-bottom: 1px solid #f0f0f0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.95rem;
	}
	
	.dropdown-item-wrapper:last-child .dropdown-item {
		border-bottom: none;
	}

	.dropdown-item:hover,
	.dropdown-item.highlighted {
		background-color: #f0f7ff;
		color: #0056b3;
	}

	.item-value-pill {
		background: #eee;
		color: #666;
		font-size: 0.75rem;
		padding: 2px 6px;
		border-radius: 4px;
		margin-left: 10px;
	}
</style>