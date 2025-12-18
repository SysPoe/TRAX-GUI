<script lang="ts">
	import "$lib/styles/common.css";

	let { children, data } = $props();
</script>

<nav>
	<a href="/">Home</a>
	        <a href="/DB">DepartureBoard</a>
	        <a href="/TV">TripViewer</a>
	        <a href="/map">Map</a>
	        {#if data.admin}
	
		|
		<a href="/admin">Dashboard</a>
		<a href="/admin/logout">Logout</a>
	{:else}
		<a href="/admin">Login</a>
	{/if}
</nav>

{@render children()}
