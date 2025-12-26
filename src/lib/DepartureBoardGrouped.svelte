<script lang="ts">
	import * as qdf from "qdf-gtfs/types";
	import type { AugmentedStop, AugmentedTripInstance } from "translink-rail-api";
	import type { Departure, UpcomingGTFSDeparture } from "./types";
	import UserIcon from "./UserIcon.svelte";

	let {
		departures,
		instances,
		routes,
		stop_id,
		onTripClick,
		stations,
	}: {
		departures: Departure[];
		instances: Record<string, AugmentedTripInstance>;
		routes: Record<string, qdf.Route>;
		stop_id: string;
		onTripClick?: (instance_id: string) => void;
		stations: AugmentedStop[];
	} = $props();

	type DestGroup = {
		name: string;
		deps: UpcomingGTFSDeparture[];
		frequency: string;
	};

	let groups = $derived(() => {
		const destMap = new Map<string, UpcomingGTFSDeparture[]>();

		// 1. Identify all unique final destinations from the current departures to use as group keys
		const finalDestIds = new Set<string>();
		for (const dep of departures) {
			if (dep.dep_type !== "gtfs") continue;
			const inst = instances[dep.instance_id];
			if (!inst) continue;
			const lastStop = inst.stopTimes[inst.stopTimes.length - 1];
			const lastId =
				lastStop?.actual_parent_station_id ??
				lastStop?.scheduled_parent_station_id ??
				lastStop?.actual_stop_id ??
				lastStop?.scheduled_stop_id;
			if (lastId && lastId !== stop_id) {
				finalDestIds.add(lastId);
			}
		}

		// 2. Map departures to all destinations they serve that are in the finalDestIds set
		for (const dep of departures) {
			if (dep.dep_type !== "gtfs") continue;
			const inst = instances[dep.instance_id];
			if (!inst) continue;

			// Find our current stop's index in the trip
			const myStopIdx = inst.stopTimes.findIndex(
				(st) =>
					st.actual_parent_station_id === stop_id ||
					st.actual_stop_id === stop_id ||
					st.scheduled_parent_station_id === stop_id ||
					st.scheduled_stop_id === stop_id,
			);

			if (myStopIdx === -1) continue;

			// Find all stops AFTER my current stop that are also a final destination for some trip
			const servedDests = new Set<string>();
			for (let i = myStopIdx + 1; i < inst.stopTimes.length; i++) {
				const st = inst.stopTimes[i];
				const sid =
					st.actual_parent_station_id ??
					st.scheduled_parent_station_id ??
					st.actual_stop_id ??
					st.scheduled_stop_id;
				if (sid && finalDestIds.has(sid)) {
					servedDests.add(sid);
				}
			}

			// Add to each group we serve
			for (const destId of servedDests) {
				if (!destMap.has(destId)) {
					destMap.set(destId, []);
				}
				destMap.get(destId)!.push(dep);
			}
		}

		return Array.from(destMap.entries())
			.map(([id, deps]) => {
				const station = stations.find((s) => s.stop_id === id);
				const sortedDeps = deps.sort((a, b) => {
					const aDate = Number.parseInt(a.actual_departure_dates[0] ?? a.actual_arrival_dates[0]);
					const bDate = Number.parseInt(b.actual_departure_dates[0] ?? b.actual_arrival_dates[0]);
					if (aDate !== bDate && !Number.isNaN(aDate) && !Number.isNaN(bDate)) return (aDate - bDate) * 86400;

					const aTime = a.actual_departure_time ?? a.actual_arrival_time;
					const bTime = b.actual_arrival_time ?? b.actual_departure_time;
					if (aTime !== bTime && aTime !== null && bTime !== null) return aTime - bTime;
					return 0;
				});

				// Calculate frequency
				let frequency = "";
				if (sortedDeps.length > 1) {
					const gaps: number[] = [];
					for (let i = 0; i < sortedDeps.length - 1; i++) {
						const a = sortedDeps[i];
						const b = sortedDeps[i + 1];
						const aT = (a.actual_departure_time ?? a.actual_arrival_time ?? 0) / 60;
						const bT = (b.actual_departure_time ?? b.actual_arrival_time ?? 0) / 60;
						const gap = Math.round(bT - aT);
						if (gap > 0 && gap < 480) {
							// Ignore very large gaps (e.g. overnight)
							gaps.push(gap);
						}
					}
					if (gaps.length > 0) {
						const min = Math.min(...gaps);
						const max = Math.max(...gaps);
						frequency = min === max ? `Every ${min} mins` : `Every ${min}—${max} mins`;
					}
				}

				return {
					name: station?.stop_name.replace(/station$/i, "").trim() ?? "Unknown Destination",
					deps: sortedDeps,
					frequency,
				};
			})
			.sort((a, b) => a.name.localeCompare(b.name));
	});

	function formatTime(dep: UpcomingGTFSDeparture) {
		return dep.departs_in
			.replace(/^0h /, "")
			.replace(/(?<=h) 0m/, "")
			.replace(/^0m$/, "now");
	}

	function getExpressInfo(dep: UpcomingGTFSDeparture) {
		const isExpress = dep.express_string.toLowerCase() !== "all stops";
		return {
			letter: isExpress ? "E" : "A",
			className: isExpress ? "express" : "all-stops",
			title: isExpress ? dep.express_string : "Service runs all stops",
		};
	}
</script>

<div class="departure-board-grouped">
	{#each groups() as group}
		<div class="dest-block">
			<div class="dest-header">
				<span class="dest-name">NEXT TO {group.name.toUpperCase()}</span>
				{#if group.frequency}
					<span class="freq-tag">{group.frequency}</span>
				{/if}
			</div>
			<div class="deps-scroll">
				{#each group.deps as dep}
					{@const instance = instances[dep.instance_id]}
					{@const route = routes[instance?.route_id ?? ""]}
					{@const express = getExpressInfo(dep)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<a
						href={`/TV/trip/gtfs/${dep.instance_id}#stoptimes`}
						class="compact-card {dep.realtime_info?.delay_class || 'scheduled'}"
						onclick={(ev) => {
							if (onTripClick) {
								if (ev.shiftKey || ev.ctrlKey || ev.metaKey) return;
								ev.preventDefault();
								onTripClick(dep.instance_id);
							}
						}}
					>
						<div
							class="plat-box"
							style="background-color: #{route?.route_color || '888'}"
							title={dep.actual_platform_code
								? `Service departs platform ${dep.actual_platform_code}`
								: "Service departs unknown platform"}
						>
							{dep.actual_platform_code ?? "?"}
						</div>

						<div class="card-content">
							<div class="top-row">
								<span class="express-tag {express.className}" title={express.title}>
									{express.letter}
								</span>
								<span class="dep-time">{formatTime(dep)}</span>
							</div>
							<div class="bottom-row">
								<span class="delay-status">
									{dep.realtime_info?.delay_string ?? "scheduled"}
								</span>
								{#if dep.service_capacity >= 0}
									<div class="cap-icons">
										{#if dep.service_capacity <= 1}
											<UserIcon fill="black" width="0.7rem" height="0.7rem" />
											<UserIcon fill="#DDD" width="0.7rem" height="0.7rem" />
											<UserIcon fill="#DDD" width="0.7rem" height="0.7rem" />
										{:else if dep.service_capacity <= 3}
											<UserIcon fill="black" width="0.7rem" height="0.7rem" />
											<UserIcon fill="black" width="0.7rem" height="0.7rem" />
											<UserIcon fill="#DDD" width="0.7rem" height="0.7rem" />
										{:else}
											<UserIcon fill="black" width="0.7rem" height="0.7rem" />
											<UserIcon fill="black" width="0.7rem" height="0.7rem" />
											<UserIcon fill="black" width="0.7rem" height="0.7rem" />
										{/if}
									</div>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{:else}
		<p class="empty-msg">No departures found in the next 8 hours.</p>
	{/each}
</div>

<style>
	.departure-board-grouped {
		margin: 1rem auto;
		max-width: 900px; /* Not full width */
		background: #fff;
		color: #1a1a1a;
		font-family: Arial, sans-serif;
	}

	.dest-block {
		margin-bottom: 8px;
		border-radius: 4px;
		border: 1px solid #ddd;
		overflow: hidden;
	}

	.dest-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: #f4f4f4;
		padding: 4px 10px;
		border-bottom: 1px solid #ddd;
	}

	.dest-name {
		font-weight: 700;
		font-size: 0.8rem;
		color: #555;
		letter-spacing: 0.2px;
	}

	.freq-tag {
		font-size: 0.75rem;
		font-weight: 600;
		color: #777;
		background: #e0e0e0;
		padding: 1px 6px;
		border-radius: 10px;
	}

	.deps-scroll {
		display: flex;
		overflow-x: auto;
		padding: 8px;
		gap: 8px;
		scrollbar-width: thin;
		scrollbar-color: #ddd transparent;
	}

	.deps-scroll::-webkit-scrollbar {
		height: 4px;
	}

	.deps-scroll::-webkit-scrollbar-thumb {
		background: #ddd;
		border-radius: 4px;
	}

	.compact-card {
		flex: 0 0 160px; /* Fixed consistent width */
		display: flex;
		padding: 6px;
		background: #fff;
		border: 1.5px solid #eee;
		border-radius: 6px;
		text-decoration: none;
		color: inherit;
		gap: 8px;
		align-items: center;
		box-sizing: border-box;
	}

	.compact-card:hover {
		border-color: #bbb;
		background: #f9f9f9;
	}

	.plat-box {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		font-weight: 900;
		font-size: 1.8rem;
		outline: 3.5px solid black;
		-webkit-text-stroke: 1.5px black;
		box-sizing: border-box;
		flex-shrink: 0;
	}

	.card-content {
		display: flex;
		flex-direction: column;
		justify-content: center;
		flex-grow: 1;
		min-width: 0; /* Prevent overflow */
	}

	.top-row {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.express-tag {
		width: 1.2rem;
		height: 1.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 800;
		font-size: 1.1rem; /* Occupy more space */
		color: #fff;
		outline: 0.15rem solid black;
		box-sizing: border-box;
		flex-shrink: 0;
		line-height: 1;
		padding: 0;
	}

	.express-tag.express {
		background-color: burlywood;
		color: #000;
	}

	.express-tag.all-stops {
		background-color: blue;
		color: #fff;
	}

	.dep-time {
		font-weight: 900;
		font-size: 1.6rem;
		line-height: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bottom-row {
		display: flex;
		align-items: center;
		justify-content: space-between; /* Right align capacity */
		gap: 4px;
		margin-top: 1px;
	}

	.delay-status {
		font-size: 0.7rem;
		font-weight: 600;
		color: #888;
		white-space: nowrap;
	}

	.cap-icons {
		display: flex;
		align-items: center;
		margin-left: auto; /* Ensure right alignment */
	}

	/* Status Colors */
	.compact-card.on-time .dep-time {
		color: #2e7d32;
	}
	.compact-card.late .dep-time,
	.compact-card.very-late .dep-time {
		color: #d32f2f;
	}
	.compact-card.scheduled .dep-time {
		color: #777;
	}
	.compact-card.early .dep-time {
		color: #1976d2;
	}

	.empty-msg {
		padding: 24px;
		text-align: center;
		color: #999;
		font-style: italic;
	}
</style>
