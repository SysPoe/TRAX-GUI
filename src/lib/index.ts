import TRAX, { type TravelTrip, type SRTStop } from "translink-rail-api";

export let isTRAXLoaded = false;
export let isTRAXLoading = false;

export function loadTRAX() {
	if (!isTRAXLoaded && !isTRAXLoading) {
		isTRAXLoading = true;

		TRAX.clearIntervals();
		
		TRAX.loadGTFS(true, true, 60_000).then(() => {
			isTRAXLoading = false;
			isTRAXLoaded = true;
		});
	}
}

export type UpcomingQRTravelDeparture = {
	dep_type: "qrt";
	service: TravelTrip;
	stop: SRTStop | undefined;
	passing: boolean;
	departsInSecs: number;
	departureString: string;
	delayString: string;
	delayClass: "very-late" | "late" | "early" | "on-time" | "scheduled";
	run: string | null;
};

export function getUpcomingQRTravelDepartures(
	gtfs_station_id: string,
	max_hours: number = 4,
): UpcomingQRTravelDeparture[] {
	const travelTrains: TravelTrip[] = TRAX.getQRTTrains();

	const trains: UpcomingQRTravelDeparture[] = travelTrains
		.filter(
			(v) =>
				(v.stopsWithPassing && v.stopsWithPassing.some((s) => s.gtfsStopId == gtfs_station_id)) ||
				v.stops.some((s) => s.gtfsStopId == gtfs_station_id),
		)
		.map((v) => {
			const stop = (v.stopsWithPassing ?? []).find((s) => s.gtfsStopId == gtfs_station_id);
			let departsInSecs =
				Math.round(
					new Date(
						(stop?.actualDeparture === "0001-01-01T00:00:00" || !stop?.actualDeparture
							? stop?.actualArrival === "0001-01-01T00:00:00" || !stop?.actualArrival
								? stop?.estimatedPassingTime
								: stop?.actualArrival
							: stop?.actualDeparture) || "0001-01-01T00:00:00",
					).getTime() - Date.now(),
				) / 1000;
			departsInSecs = Math.round(departsInSecs / 60) * 60;
			return {
				dep_type: "qrt" as "qrt",
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
		.filter((v) => v.departsInSecs > 0 && v.departsInSecs <= max_hours * 3600)
		.sort((a, b) => a.departsInSecs - b.departsInSecs) as UpcomingQRTravelDeparture[];
	return trains;
}
