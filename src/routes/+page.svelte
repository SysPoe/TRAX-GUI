<script lang="ts">
	let { data } = $props();
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