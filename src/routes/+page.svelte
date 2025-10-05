<script lang="ts">
	let { data } = $props();
	let extraDetails = $state(data.extraDetails);

	async function toggle() {
		let res = await fetch("/set/toggle");
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
<p>
	{extraDetails ? "Extra details are shown by default." : "Extra details are hidden by default."}
	<button onclick={toggle}>Toggle</button>
</p>
