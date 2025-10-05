<script lang="ts">
	import "$lib/styles/common.css";

	let { children } = $props();
</script>

<nav>
	<a href="/">Home</a>
	<a href="/DB">DepartureBoard</a>
	<a href="/TV">TripViewer</a>
</nav>

{@render children()}
