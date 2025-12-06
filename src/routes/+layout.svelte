<script lang="ts">
	import "$lib/styles/common.css";

	let { children, data } = $props();
</script>

<nav>
	[ <a href="/">Home</a> ]
	[ <a href="/DB">DepartureBoard</a> ]
	[ <a href="/TV">TripViewer</a> ]
	{#if data.admin}
		|
		[ <a href="/admin">Dashboard</a> ]
		[ <a href="/admin/logout">Logout</a> ]
	{:else}
		[ <a href="/admin">Login</a> ]
	{/if}
</nav>

<hr>

{@render children()}

<hr>
<center>
    <small>
        <i>Optimized for Netscape Navigator 4.0 and Internet Explorer 5.0</i><br>
        &copy; 2025 TRAX
    </small>
</center>
