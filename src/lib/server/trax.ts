import TRAX_CLASS from "translink-rail-api";
import { safeCount } from "../utils";
import type { SystemStatus, UpcomingQRTravelDeparture } from "../types";

export const TRAX = new TRAX_CLASS();

export let isTRAXLoaded = false;
export let isTRAXLoading = false;

// System Status Tracking
const serverStartTime = Date.now();
let lastStaticUpdate = 0;
let lastRealtimeUpdate = 0;

export function loadTRAX() {
	if (!isTRAXLoaded && !isTRAXLoading) {
		isTRAXLoading = true;

		TRAX.clearIntervals();

		TRAX.loadGTFS(true, 60_000).finally(() => {
			isTRAXLoading = false;
			isTRAXLoaded = true;
		});

		TRAX.on("static-update-start", () => {
			isTRAXLoading = true;
		})
		TRAX.on("static-update-end", () => {
			isTRAXLoading = false;
			isTRAXLoaded = true;
			lastStaticUpdate = Date.now();
		});

		// Listening for realtime updates
		TRAX.on("realtime-update-end", () => {
			lastRealtimeUpdate = Date.now();
		});
	}
}

export function getSystemStatus(): SystemStatus {
	return {
		uptime: Date.now() - serverStartTime,
		lastStaticRefresh: lastStaticUpdate,
		lastRealtimeUpdate: lastRealtimeUpdate,
		cacheStats: {
			routes: safeCount(() => TRAX.getRawRoutes()),
			trips: safeCount(() => TRAX.getRawTrips()),
			stops: safeCount(() => TRAX.getRawStops()),
			tripUpdates: safeCount(() => TRAX.getTripUpdates()),
			stopTimeUpdates: safeCount(() => TRAX.getTripUpdates().flatMap((v: any) => v.stop_time_updates)),
			vehiclePositions: safeCount(() => TRAX.getVehiclePositions()),
		},
	};
}

export function getUpcomingQRTravelDepartures(
	gtfs_station_id: string,
	max_hours: number = 4,
): UpcomingQRTravelDeparture[] {
	const travelTrains = TRAX.regionSpecific.SEQ.getQRTTrains();

	const trains: UpcomingQRTravelDeparture[] = travelTrains
		.filter(
			(v: any) =>
				(v.stopsWithPassing && v.stopsWithPassing.some((s: any) => s.gtfsStopId == gtfs_station_id)) ||
				v.stops.some((s: any) => s.gtfsStopId == gtfs_station_id),
		)
		.map((v: any) => {
			const stop = (v.stopsWithPassing ?? []).find((s: any) => s.gtfsStopId == gtfs_station_id);
			let departsInSecs =
				Math.round(
					new Date(
						((stop?.actualDeparture === "0001-01-01T00:00:00" || !stop?.actualDeparture
							? stop?.actualArrival === "0001-01-01T00:00:00" || !stop?.actualArrival
								? stop?.estimatedPassingTime
								: stop?.actualArrival
							: stop?.actualDeparture) ?? "0001-01-01T00:00:00") + "+10:00",
					).getTime() - Date.now(),
				) / 1000;
			departsInSecs = Math.round(departsInSecs / 60) * 60;
			return {
				dep_type: "qrt" as const,
				service: v,
				stop,
				passing: !stop?.isStop,
				departsInSecs,
				departureString: (
					Math.floor(departsInSecs / 3600) +
					"h " +
					Math.floor((departsInSecs % 3600) / 60) +
					"m"
				)
					.replace(/^0h/, "")
					.trim(),
				delayString: stop?.arrivalDelayString ?? stop?.departureDelayString ?? "scheduled",
				delayClass: stop?.arrivalDelayClass ?? stop?.departureDelayClass ?? "scheduled",
				run: v.run,
			};
		})
		.filter((v: any) => v.departsInSecs > 0 && v.departsInSecs <= max_hours * 3600)
		.sort((a: any, b: any) => a.departsInSecs - b.departsInSecs) as UpcomingQRTravelDeparture[];
	return trains;
}
