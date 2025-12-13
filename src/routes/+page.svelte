<script lang="ts">
	let { data } = $props();
	let extraDetails = $state(data.user?.extraDetails ?? false);
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
{#if data.admin}
	<a href="admin">Admin Dashboard</a><br />
{:else}
	<a href="admin">Login</a><br />
{/if}

<p>
	{extraDetails ? "Extra details are shown by default." : "Extra details are hidden by default."}
	<button onclick={toggleExtraDetails}>Toggle</button>
</p>
