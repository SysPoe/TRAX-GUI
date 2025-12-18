<script lang="ts">
	let { data } = $props();
	// svelte-ignore state_referenced_locally
	let extraDetails = $state(data.extraDetails ?? false);
	$effect(() => {
		extraDetails = data.extraDetails ?? false;
	});
	async function toggleExtraDetails() {
		let res = await fetch("/api/toggleextradetails");
		let { extraDetails: newValue } = await res.json();
		extraDetails = newValue;
	}
</script>

<svelte:head>
	<title>SysPoe's Projects</title>
</svelte:head>

<h1>SysPoe's Projects</h1>
<a href="DB">TRAX <i>DepartureBoard</i></a><br />
<a href="TV">TRAX <i>TripViewer</i></a><br />
<a href="map">TRAX <i>Map</i></a><br />
{#if data.admin}
	<a href="admin">Admin Dashboard</a><br />
{:else}
	<a href="admin">Login</a><br />
{/if}

<p>
	{extraDetails ? "Extra details are shown by default." : "Extra details are hidden by default."}
	<button onclick={toggleExtraDetails}>Toggle</button>
</p>
