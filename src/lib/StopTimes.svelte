<script lang="ts">
	import { goto } from "$app/navigation";
	import * as qdf from "qdf-gtfs/types";
	import { formatTimestamp } from "$lib";
	import UserIcon from "$lib/UserIcon.svelte";
	import type { AugmentedTripInstance, AugmentedStop } from "translink-rail-api";
	import "./styles/stoptimes.css";
	import "./styles/common.css";

	let {
		inst,
		useRealtime = true,
		stations,
		route,
		extraDetails,
	}: {
		inst: AugmentedTripInstance;
		useRealtime: boolean;
		stations: Record<string, AugmentedStop>;
		route: { route_color?: string | null };
		extraDetails: boolean;
	} = $props();
</script>

<div class="tv-stoptimes">
	{#each inst.stopTimes as st}
		{@const stopId = st.scheduled_parent_station_id ?? st.scheduled_stop_id ?? ""}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<a
			class="tv-stop-time {st.passing ? 'passing' : ''} {useRealtime &&
			inst.schedule_relationship === qdf.TripScheduleRelationship.CANCELED
				? 'canceled'
				: ''} {useRealtime &&
			st.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED
				? 'canceled'
				: ''}"
			href={`/DB/gtfs/${stopId}`}
			onclick={(ev) => {
				if (ev.shiftKey || ev.ctrlKey || ev.metaKey || ev.type === "auxclick") {
					// Open in new tab if modifier key is held
					ev.preventDefault();
					window.open(`/DB/gtfs/${stopId}`, "_blank");
					return;
				}
				ev.preventDefault();
				goto(`/DB/gtfs/${stopId}`);
			}}
		>
			<span class="tv-platform" style="background-color: #{route.route_color ?? '000000'}">
				{(useRealtime ? st.actual_platform_code : st.scheduled_platform_code) ?? "?"}
			</span>
			<span class="tv-smalltext">
				<span class="time">
					{#if extraDetails}
						{formatTimestamp(
							useRealtime ? st.actual_arrival_time : st.scheduled_arrival_time,
							true,
						)}&rarr;{formatTimestamp(
							useRealtime ? st.actual_departure_time : st.scheduled_departure_time,
							true,
						)}
					{:else}
						{formatTimestamp(
							useRealtime && (st.actual_departure_time ?? st.actual_arrival_time)
								? (st.actual_departure_time ?? st.actual_arrival_time)
								: (st.scheduled_departure_time ?? st.scheduled_arrival_time),
						)}
					{/if}
				</span>
				<span
					class="tv-delay {useRealtime && inst.schedule_relationship === qdf.TripScheduleRelationship.CANCELED
						? 'canceled'
						: useRealtime &&
							  st.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED
							? 'canceled'
							: st.passing
								? 'estimated'
								: useRealtime && st.realtime
									? (st.realtime_info?.delay_class ?? 'scheduled')
									: 'scheduled'}"
				>
					({useRealtime && inst.schedule_relationship === qdf.TripScheduleRelationship.CANCELED
						? "canceled"
						: useRealtime &&
							  st.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED
							? "skipped"
							: st.passing
								? "estimated"
								: useRealtime && st.realtime
									? st.realtime_info?.delay_string
									: "scheduled"})
				</span>
				{#if st.service_capacity >= 0}
					<span class="serviceCapacity">
						{#if st.service_capacity <= 1}
							<!-- Many seats available -->
							<UserIcon fill="black" />
							<UserIcon fill="#DDD" />
							<UserIcon fill="#DDD" />
						{:else if st.service_capacity <= 3}
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
				{#if (st.scheduled_departure_time ? st.scheduled_departure_date_offset : st.scheduled_arrival_date_offset) !== 0}
					<span class="tv-date-offset"
						>(+{st.scheduled_departure_time
							? st.scheduled_departure_date_offset
							: st.scheduled_arrival_date_offset}{(st.scheduled_departure_time
							? st.scheduled_departure_date_offset
							: st.scheduled_arrival_date_offset) !== 1
							? "d"
							: "d"})</span
					>
				{/if}
				<br />
				<span class="tv-station">
					{@html useRealtime
						? st.actual_exit_side
							? st.actual_exit_side == "left"
								? "◀"
								: st.actual_exit_side == "right"
									? "▶"
									: ""
							: ""
						: st.scheduled_exit_side
							? st.scheduled_exit_side == "left"
								? "◀"
								: st.scheduled_exit_side == "right"
									? "▶"
									: ""
							: ""}
					{(
						stations[st.scheduled_parent_station_id ?? ""]?.stop_name ??
						stations[st.scheduled_stop_id ?? ""]?.stop_name ??
						"Unknown"
					)
						.replace(/station/i, "")
						.trim()
						.toUpperCase()}
				</span>
			</span>
			{#if st.passing}
				<span class="tv-service-type passing">P</span>
			{:else if useRealtime && inst.schedule_relationship === qdf.TripScheduleRelationship.CANCELED}
				<span class="tv-service-type canceled">C</span>
			{:else if useRealtime && st.realtime_info?.schedule_relationship === qdf.StopTimeScheduleRelationship.SKIPPED}
				<span class="tv-service-type canceled">S</span>
			{/if}
		</a>
		<hr />
	{/each}
</div>
