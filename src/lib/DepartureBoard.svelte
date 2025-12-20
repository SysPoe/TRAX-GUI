<script lang="ts">
	import * as qdf from "qdf-gtfs/types";
	import type { AugmentedTripInstance } from "translink-rail-api";
	import type { Departure } from "./types";
	import UserIcon from "./UserIcon.svelte";
	import "./styles/departure-board.css";

	let {
		departures,
		instances,
		routes,
		stop_id,
		extraDetails,
		onTripClick,
	}: {
		departures: Departure[];
		instances: Record<string, AugmentedTripInstance>;
		routes: Record<string, qdf.Route>;
		stop_id: string;
		extraDetails: boolean;
		onTripClick?: (instanceId: string) => void;
	} = $props();

	// --- Departure type filtering ---
	function getDepType(dep: Departure) {
		if (dep.dep_type === "gtfs") {
			const instance = instances[dep.instance_id];
			if (instance?.schedule_relationship === qdf.TripScheduleRelationship.CANCELED) return "canceled";
			if (dep.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED) return "skipped";
			if (dep.last_stop_id === stop_id) return "term";
			if (dep.passing) return "passing";
			return "scheduled";
		}

		// For QRT departures, classify as passing or scheduled
		if (dep.dep_type === "qrt") {
			return dep.passing ? "passing" : "scheduled";
		}

		return "scheduled";
	}

	function sortDepTypes(arr: string[]) {
		const order = ["scheduled", "skipped", "canceled", "term", "passing"];
		return arr.sort((a, b) => {
			const ia = order.indexOf(a);
			const ib = order.indexOf(b);
			if (ia === -1 && ib === -1) return a.localeCompare(b);
			if (ia === -1) return 1; // unknowns go after known order
			if (ib === -1) return -1;
			return ia - ib;
		});
	}

	let depTypes = $derived(sortDepTypes([...new Set(departures.map((d) => getDepType(d)))]));

	let selectedDepTypes = $state(new Set<string>());
	let hasInit = false;
	let hasAppliedExtra = false;

	function storageKey() {
		return `depTypes:${stop_id}`;
	}

	function writeSelectedTypesToStorage() {
		if (typeof window === "undefined") return;
		if (selectedDepTypes.size === 0) {
			localStorage.removeItem(storageKey());
		} else {
			localStorage.setItem(storageKey(), Array.from(selectedDepTypes).join(","));
		}
	}

	function readSelectedTypesFromStorage() {
		if (typeof window === "undefined") return null as string[] | null;
		const raw = localStorage.getItem(storageKey());
		if (!raw) return null;
		const parts = raw
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		const valid = parts.filter((p) => depTypes.includes(p as any));
		return valid.length > 0 ? valid : null;
	}

	$effect(() => {
		// Initialize selection once we have types available
		if (!hasInit && depTypes.length > 0) {
			// Prefer localStorage; ignore URL parameters
			const stored = readSelectedTypesFromStorage();
			if (stored && stored.length > 0) {
				selectedDepTypes = new Set(stored);
			} else if (extraDetails) {
				// extra details => show all types by default
				selectedDepTypes = new Set(depTypes);
			} else {
				// default to only scheduled
				selectedDepTypes = new Set(["scheduled"]);
			}

			hasInit = true;
			// reflect initial selection in storage
			writeSelectedTypesToStorage();
		}

		// If extraDetails becomes enabled after init, expand selection to include all once
		if (hasInit && extraDetails && !hasAppliedExtra) {
			selectedDepTypes = new Set(depTypes);
			hasAppliedExtra = true;
			writeSelectedTypesToStorage();
		}

		// Reset the extraDetails-applied flag when extraDetails is turned off
		if (hasInit && !extraDetails) {
			hasAppliedExtra = false;
		}
	});

	function toggleDepType(type: string) {
		const next = new Set(selectedDepTypes);
		next.has(type) ? next.delete(type) : next.add(type);
		if (next.size === 0) {
			// Prevent empty selection; default to scheduled
			next.add("scheduled");
		}
		selectedDepTypes = next;
		writeSelectedTypesToStorage();
	}

	let filteredDepartures = $derived(departures.filter((d) => selectedDepTypes.has(getDepType(d))));
</script>

{#if depTypes.length > 0}
	<div class="filters">
		<span class="filter-label">Type:</span>
		{#each depTypes.filter((t) => t !== "passing" || extraDetails) as t}
			<button class:active={selectedDepTypes.has(t)} onclick={() => toggleDepType(t)}>
				{t === "scheduled"
					? "Scheduled"
					: t === "canceled"
						? "Canceled"
						: t === "skipped"
							? "Skipped"
							: t === "term"
								? "Terminating"
								: t === "passing"
									? "Passing"
									: t}
			</button>
		{/each}
	</div>
{/if}

<div class="departures">
	{#each filteredDepartures as dep}
		{#if dep.dep_type === "gtfs"}
			{@const instance = instances[dep.instance_id]}
			{@const route = routes[instance.route_id ?? ""]}
			{@const express = dep.express_string.toLowerCase() != "all stops"}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<a
				class="departure gtfs {instance.schedule_relationship === qdf.TripScheduleRelationship.CANCELED ||
				dep.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED
					? 'canceled'
					: dep.last_stop_id == stop_id
						? 'term'
						: dep.passing
							? 'passing'
							: ''}"
				href={`/TV/trip/gtfs/${dep.instance_id}#stoptimes`}
				onclick={(ev) => {
					if (onTripClick) {
						if (ev.shiftKey || ev.ctrlKey || ev.metaKey) return;
						ev.preventDefault();
						onTripClick(dep.instance_id);
					}
				}}
			>
				<span
					class="platform"
					style="background-color: #{route.route_color}"
					title={dep.actual_platform_code
						? `Service departs platform ${dep.actual_platform_code}`
						: "Service departs unknown platform"}
				>
					{dep.actual_platform_code ?? "?"}
				</span>
				<span class="smalltext">
					<span class="time">Sch. {dep.scheduled_departure_timestr}</span>
					{#if extraDetails}
						<span class="run">{instance.run}</span>
					{/if}
					service to
					<br /><span class="headsign">
						{instance.trip_headsign?.replace(/station$/, "").trim()}
					</span>
				</span>
				<span
					class="service-type {instance.schedule_relationship === qdf.TripScheduleRelationship.CANCELED ||
					dep.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED
						? 'canceled'
						: dep.last_stop_id == stop_id
							? 'term'
							: dep.passing
								? 'passing'
								: express
									? 'express'
									: 'all-stops'}"
					title={instance.schedule_relationship === qdf.TripScheduleRelationship.CANCELED
						? "Service is canceled"
						: dep.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED
							? "Service skipped this stop"
							: dep.last_stop_id == stop_id
								? "Service terminates at this stop"
								: dep.passing
									? "Service passes, and does not stop here"
									: express
										? dep.express_string
										: "Service runs all stops"}
				>
					{instance.schedule_relationship === qdf.TripScheduleRelationship.CANCELED
						? "C"
						: dep.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED
							? "S"
							: dep.last_stop_id == stop_id
								? "T"
								: dep.passing
									? "P"
									: express
										? "E"
										: "A"}
				</span>
				<div class="time-container">
					<span class="departs_in">
						{dep.departs_in
							.replace(/^0h /, "")
							.replace(/(?<=h) 0m/, "")
							.replace(/^0m$/, "now")}
					</span>
					<div class="departs-sub">
						<span
							class="delay {instance.schedule_relationship === qdf.TripScheduleRelationship.CANCELED ||
							dep.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED
								? 'canceled'
								: (dep.realtime_info?.delay_class ?? 'scheduled')}"
						>
							{instance.schedule_relationship === qdf.TripScheduleRelationship.CANCELED
								? "canceled"
								: dep.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED
									? "skipped"
									: (dep.realtime_info?.delay_string ?? "scheduled")}
						</span>
						{#if dep.service_capacity >= 0}
							<span class="serviceCapacity">
								{#if dep.service_capacity <= 1}
									<!-- Many seats available -->
									<UserIcon fill="black" />
									<UserIcon fill="#DDD" />
									<UserIcon fill="#DDD" />
								{:else if dep.service_capacity <= 3}
									<!-- Standing room only -->
									<UserIcon fill="black" />
									<UserIcon fill="black" />
									<UserIcon fill="#DDD" />
								{:else}
									<!-- Full -->
									<UserIcon fill="black" />
									<UserIcon fill="black" />
									<UserIcon fill="black" />
								{/if}
							</span>
						{/if}
					</div>
				</div>
			</a>
			<hr />
		{:else if dep.dep_type === "qrt"}
			<a
				class="departure {dep.passing ? 'passing' : 'qr-travel'} qrt"
				href={`/TV/trip/QRT/${dep.service.serviceId}#stoptimes`}
				onclick={(ev) => {
					if (onTripClick) {
						if (ev.shiftKey || ev.ctrlKey || ev.metaKey) return;
						ev.preventDefault();
						onTripClick(dep.service.serviceId); // QRT use serviceId
					}
				}}
			>
				<span class="platform qr-travel" title="Service departs unknown platform"> ? </span>
				<span class="smalltext">
					<span class="time"
						>Sch. {(
							dep.stop?.estimatedPassingTime ??
							(dep.stop?.plannedDeparture === "0001-01-01T00:00:00"
								? dep.stop?.plannedArrival
								: dep.stop?.plannedDeparture)
						)?.slice(11, 16)}</span
					>
					<span class="run">{dep.run}</span> service to <br />
					<span class="headsign">
						{dep.service.stops
							.at(-1)
							?.placeName.replace(/^Brisbane -/, "")
							.trim() ?? "Unknown"}
					</span>
				</span>
				<span class="service-type {dep.passing ? 'passing' : 'qr-travel'}" title={
					dep.passing ? "Service passes, and does not stop here" : "This is a Queensland Rail Travel service"
				}>
					{dep.passing ? "P" : "Q"}
				</span>
				<span class="time-container">
					<span class="departs_in">
						{dep.departureString}
					</span>

					<span class="departs-sub delay {dep.delayClass}">
						{dep.delayString}
					</span>
				</span>
			</a>
			<hr />
		{/if}
	{:else}
		<p>No departures found in the next 4 hours.</p>
	{/each}
</div>
