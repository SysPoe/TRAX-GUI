<script lang="ts">
    let { data } = $props();
    let extraDetails = $state(data.user?.extraDetails ?? false);

	async function toggle() {
		let res = await fetch("/api/toggleextradetails");
		let { extraDetails: newValue } = await res.json();
		extraDetails = newValue;
	}
</script>

Links:
<ul>
    <li><a href="/api/reload">Reload</a></li>
    <li><a href="/admin/internals/raw-rt">Raw RT Updates</a></li>
</ul>

<p>
	{extraDetails ? "Extra details are shown by default." : "Extra details are hidden by default."}
	<button onclick={toggle}>Toggle</button>
</p>