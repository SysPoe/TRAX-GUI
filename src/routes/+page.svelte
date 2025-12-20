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
	<title>TRAX | Home</title>
</svelte:head>

<div class="container">
	<header class="title">
		<h1>TRAX</h1>
		<p>Tools for tracking public transport in SEQ.</p>
	</header>

	<main class="card-grid">
		<a href="DB" class="card">
			<div>
				<h3>DepartureBoard</h3>
				<p>See what's leaving soon, which platform to go to, and if services are on time.</p>
			</div>
		</a>

		<a href="TV" class="card">
			<div>
				<h3>TripViewer</h3>
				<p>Look up specific trips and see exactly where a service is headed.</p>
			</div>
		</a>

		<a href="map" class="card">
			<div>
				<h3>Map</h3>
				<p>A live look at where all services are right now on the network.</p>
			</div>
		</a>

		{#if data.admin}
			<a href="admin" class="card">
				<div>
					<h3>Admin Dashboard</h3>
					<p>Manage system settings and underlying transit data.</p>
				</div>
			</a>
		{:else}
			<a href="admin" class="card">
				<div>
					<h3>Login</h3>
					<p>Sign in to access extra tools and advanced settings.</p>
				</div>
			</a>
		{/if}
	</main>

	<footer class="settings-section">
		<p>
			{extraDetails ? "Extra details are enabled." : "Extra details are disabled."}
		</p>
		<button onclick={toggleExtraDetails}>
			{extraDetails ? "Hide Extra Details" : "Show Extra Details"}
		</button>
	</footer>
</div>
