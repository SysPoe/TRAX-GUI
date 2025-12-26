<script lang="ts">
	import type { PageProps } from "./$types";
	import type { QRTTravelTrip, QRTSRTStop } from "translink-rail-api";
	import "$lib/styles/common.css";
	import "$lib/styles/stoptimes.css";

	let { data }: PageProps = $props();
	let service: QRTTravelTrip = $derived(data.service);

	let showPassing = $state(false);
	let useRealtime = $state(true);
	$effect(() => {
		// Reset view toggles when a new service is loaded
		void service.serviceId;
		showPassing = false;
		useRealtime = true;
	});

	let destination = $derived(
		service.stops
			.at(-1)
			?.placeName.replace(/^Brisbane -/, "")
			.trim() ?? "Unknown",
	);

	const stopsToFilter: string[] = [
		// "NORMANBY",
		// "EXHIBITION",
		// "CAMPBELL STREET",
		// "MAYNE JUNCTION",
		// "MAYNE",
		// "AIRPORT JUNCTION"
	];

	const replace: { [key: string]: string } = {
		"TOWNSVILLE - CHARTERS TOWERS ROAD": "TOWNSVILLE STN.",
	};

	let filteredStops = $derived(
		(service.stopsWithPassing ?? service.stops).filter((st) => {
			const isQRTSrtStop = "isStop" in st;
			if (isQRTSrtStop) {
				const isPassing = !(st as QRTSRTStop).isStop;
				if (isPassing) {
					return !stopsToFilter.some((filterName) => st.placeName.toUpperCase().includes(filterName));
				}
			}
			return true;
		}),
	);

	function formatTime(isoString?: string | null): string {
		if (!isoString || isoString === "0001-01-01T00:00:00") return "--:--";
		try {
			let d = new Date(isoString);
			let n = new Date();

			return (
				`${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}` +
				` (${d.getDate()}/${d.getMonth() + 1}${d.getFullYear() != n.getFullYear() ? "/" + d.getFullYear() : ""})`
			);
		} catch (e) {
			return isoString.slice(11, 16);
		}
	}

	const TRAIN_GURU_URL_PREFIX = "https://syspoe.github.io/train-wiki/#Other/Resources/TRNGuru/?trainNumber=";

	function getTrainGuruUrl(run: string) {
		return `${TRAIN_GURU_URL_PREFIX}${encodeURIComponent(run)}`;
	}
</script>

<svelte:head>
	<title>
		{formatTime(service.departureDate).split(" ")[0]}
		{service.run}
		{destination} service - TRAX TripViewer
	</title>
	<style>
		:root {
			font-size: min(3.6vw, 1em);
		}
	</style>
	<link rel="icon" type="image/svg+xml" href="/favicon-TV.svg" />
</svelte:head>

<div class="header">
	<div class="header-main">
		<h1>TRAX <i>TripViewer</i></h1>
	</div>
	{#if data.extraDetails}
		<h2>
			{service.run} - {destination} Service
		</h2>
		<p>
			Departing: {formatTime(service.departureDate)} | Service ID: {service.serviceId}
		</p>
	{:else}
		<h2>
			{service.departureDate.slice(0, 10)}
			{formatTime(service.departureDate).split(" ")[0]}
			{destination} Service
		</h2>
	{/if}
</div>

<hr />

<div class="container">
	<div class="content">
		<details class="info-section">
			<summary>Trip Information</summary>
			{#if data.extraDetails}
				<div class="info-item">
					<span class="info-label">TRN:</span>
					<span class="info-value">
						{service.run}
						<a
							class="trnguru-link-inline"
							title="Consult TRNGuru"
							aria-label={`Consult TRNGuru for train ${service.run}`}
							href={getTrainGuruUrl(service.run)}
							target="_blank"
							rel="noopener noreferrer"
						>
							<img src="/img/trnguru.svg" alt="TRNGuru" class="trnguru-icon-inline" />
						</a>
					</span>
				</div>
				<div class="info-item">
					<span class="info-label">Service Name:</span>
					<span class="info-value">{service.serviceName}</span>
				</div>
			{/if}
			<div class="info-item">
				<span class="info-label">Line:</span>
				<span class="info-value">{service.line}</span>
			</div>
			<div class="info-item">
				<span class="info-label">Direction:</span>
				<span class="info-value">{service.direction}</span>
			</div>
			<div class="info-item">
				<span class="info-label">Status:</span>
				<span class="info-value">{service.status}</span>
			</div>
			{#if data.extraDetails}
				<div class="info-item">
					<span class="info-label">Service Date:</span>
					<span class="info-value">
						{service.serviceDate}
					</span>
				</div>
				<div class="info-item">
					<span class="info-label">Offers Gold Class:</span>
					<span class="info-value">
						{service.offersGoldClass ? "Yes" : "No"}
					</span>
				</div>
			{/if}
		</details>

		{#if service.disruption}
			<details class="info-section">
				<summary>Service Disruption</summary>
				<div class="info-item">
					<span class="info-label">Title:</span>
					<span class="info-value">{service.disruption.Title}</span>
				</div>
				<div class="info-item">
					<span class="info-label">Summary:</span>
					<span class="info-value">{service.disruption.SummaryText}</span>
				</div>
				{#if service.disruption.PageURL}
					<div class="info-item">
						<span class="info-label">More Info:</span>
						<span class="info-value"
							><a
								href={`https://www.queenslandrailtravel.com.au/serviceupdates/pages/${service.disruption.PageURL}`}
								target="_blank"
								rel="noopener noreferrer">{service.disruption.PageURL}</a
							></span
						>
					</div>
				{/if}
			</details>
		{/if}

		<details class="info-section" open>
			<summary>Stoptimes</summary>
			<div class="tv-stoptimes">
				{#if data.extraDetails}
					<div class="stoptimes-controls">
						<label>
							<input type="checkbox" bind:checked={showPassing} />
							Show Passing Stops*
						</label>
						<label>
							<input type="checkbox" bind:checked={useRealtime} />
							Show Realtime Data
						</label><br />
						(*Passing stops use realtime data)
					</div>
				{/if}
				<hr />
				{#each filteredStops as st}
					{@const isQRTSrtStop = "isStop" in st}
					{@const delay = {
						delayClass: st.departureDelayClass ?? st.arrivalDelayClass,
						delayString: st.departureDelayString ?? st.arrivalDelayString,
					}}
					{@const passing = isQRTSrtStop && !(st as QRTSRTStop).isStop}
					{#if ((isQRTSrtStop && st.isStop) || !isQRTSrtStop) && st.gtfsStopId && ((showPassing && useRealtime) || !passing)}
						<a class="tv-stop-time {passing ? 'passing' : ''}" href={`/DB/gtfs/${st.gtfsStopId}`}>
							<span class="tv-platform" style="background-color: #ff8400"> ? </span>
							<span class="tv-smalltext">
								<span class="time">
									{formatTime(
										useRealtime
											? st.actualDeparture === "0001-01-01T00:00:00" || !st.actualDeparture
												? st.actualArrival === "0001-01-01T00:00:00" || !st.actualArrival
													? isQRTSrtStop
														? (st as QRTSRTStop).estimatedPassingTime
														: st.plannedDeparture
													: st.actualArrival
												: st.actualDeparture
											: isQRTSrtStop &&
												  (st as QRTSRTStop).estimatedPassingTime !== "0001-01-01T00:00:00" &&
												  (st as QRTSRTStop).estimatedPassingTime
												? (st as QRTSRTStop).estimatedPassingTime
												: st.plannedDeparture === "0001-01-01T00:00:00" || !st.plannedDeparture
													? st.plannedArrival
													: st.plannedDeparture,
									)}
								</span>
								{#if useRealtime}
									<span class="tv-delay {delay.delayClass}">
										({delay.delayString})
									</span>
								{:else}
									<span class="tv-delay scheduled"> (scheduled) </span>
								{/if}
								<br />
								<span class="tv-station">
									{replace[
										st.placeName
											.replace(/station/i, "")
											.replace(/^Brisbane - /i, "")
											.trim()
											.toUpperCase()
									] ??
										st.placeName
											.replace(/station/i, "")
											.replace(/^Brisbane - /i, "")
											.trim()
											.toUpperCase()}
								</span>
							</span>
							{#if passing}
								<span class="tv-service-type passing">P</span>
							{:else if data.extraDetails && service.stops.find((v) => v.placeName === st.placeName)?.kStation}
								<span class="tv-service-type">K</span>
							{:else}
								<span class="tv-service-type-empty"></span>
							{/if}
						</a>
						<hr />
					{:else if (showPassing && useRealtime) || !passing}
						<div class="tv-stop-time {passing ? 'passing' : ''}">
							<span class="tv-platform" style="background-color: #ff8400"> ? </span>
							<span class="tv-smalltext">
								<span class="time">
									{formatTime(
										useRealtime
											? st.actualDeparture === "0001-01-01T00:00:00" || !st.actualDeparture
												? st.actualArrival === "0001-01-01T00:00:00" || !st.actualArrival
													? isQRTSrtStop
														? (st as QRTSRTStop).estimatedPassingTime
														: st.plannedDeparture
													: st.actualArrival
												: st.actualDeparture
											: isQRTSrtStop &&
												  (st as QRTSRTStop).estimatedPassingTime !== "0001-01-01T00:00:00" &&
												  (st as QRTSRTStop).estimatedPassingTime
												? (st as QRTSRTStop).estimatedPassingTime
												: st.plannedDeparture === "0001-01-01T00:00:00" || !st.plannedDeparture
													? st.plannedArrival
													: st.plannedDeparture,
									)}
								</span>
								{#if useRealtime}
									<span class="tv-delay {delay.delayClass}">
										({delay.delayString})
									</span>
								{:else}
									<span class="tv-delay scheduled"> (scheduled) </span>
								{/if}
								<br />
								<span class="tv-station">
									{replace[
										st.placeName
											.replace(/station/i, "")
											.replace(/^Brisbane - /i, "")
											.trim()
											.toUpperCase()
									] ??
										st.placeName
											.replace(/station/i, "")
											.replace(/^Brisbane - /i, "")
											.trim()
											.toUpperCase()}
								</span>
							</span>
							{#if passing}
								<span class="tv-service-type passing">P</span>
							{:else if data.extraDetails && service.stops.find((v) => v.placeName === st.placeName)?.kStation}
								<span class="tv-service-type">K</span>
							{:else}
								<span class="tv-service-type-empty"></span>
							{/if}
						</div>
						<hr />
					{/if}
				{/each}
			</div>
		</details>
	</div>
</div>

{#if data.extraDetails}
	<footer>
		<p>* Passing stop times and stations are estimated and may not be accurate.</p>
	</footer>
{/if}

<style>
	* {
		font-family: "Arial", sans-serif;
	}

	.container {
		display: flex;
		justify-content: center;
		align-items: flex-start;
		flex: 1;
		padding: 0.8rem;
	}

	.content {
		width: 100%;
		max-width: 650px;
		margin: 0 auto;
	}

	.info-section {
		/* margin-bottom: 1rem; */
		padding: 0.5rem;
		border-radius: 6px;
		background-color: #ffffff;
		/* box-shadow: 0 0rem 0.4rem rgba(0, 0, 0, 0.5); */
	}

	.info-section summary {
		margin-top: 0;
		color: #2c3e50;
		font-size: 1.3rem;
		font-weight: 600;
		cursor: pointer;
	}

	.info-item {
		display: flex;
		padding: 0.1rem 0.5rem;
		margin-left: 1rem;
		border-left: solid black 0.1rem;
	}

	.info-label {
		font-weight: 500;
		min-width: 140px;
		color: #555;
		font-size: 0.95rem;
	}

	.info-value {
		flex: 1;
		color: #333;
		font-size: 0.95rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.trnguru-link-inline {
		display: inline-flex;
		vertical-align: middle;
	}

	.trnguru-icon-inline {
		height: 1.2em;
		width: 1.2em;
		transition: transform 0.2s ease-in-out;
	}

	.trnguru-link-inline:hover .trnguru-icon-inline {
		transform: scale(1.2);
	}

	.color-square {
		width: 1rem;
		height: 1rem;
		border: 1px solid #ccc;
		display: inline-block;
		margin-left: 0.5rem;
		vertical-align: middle;
	}

	.stoptimes-controls {
		margin-bottom: 1rem;
		text-align: center;
	}
	.stoptimes-controls label {
		font-size: 1rem;
		cursor: pointer;
	}

	footer {
		text-align: center;
		margin-top: 1.5rem;
		padding: 1rem;
		color: #757575;
		font-size: 0.85rem;
	}
</style>
