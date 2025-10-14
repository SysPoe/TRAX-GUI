import TRAX, { type TravelTrip, type SRTStop } from "translink-rail-api";
import fs from "fs";

export let isTRAXLoaded = false;
export let isTRAXLoading = false;
let intervalSet = false;

export function loadTRAX(freshLoad = false) {
	if (!isTRAXLoaded && !isTRAXLoading) {
		isTRAXLoading = true;

		TRAX.clearIntervals();

		let lastLoaded = fs.existsSync("gtfs-last-loaded.txt")
			? fs.readFileSync("gtfs-last-loaded.txt", "utf-8")
			: new Date(0).toISOString();
		const lastLoadedDate = new Date(lastLoaded);
		if (
			Date.now() - lastLoadedDate.getTime() > 1000 * 60 * 60 * 24 ||
			lastLoadedDate.getDay() !== new Date().getDay() ||
			freshLoad
		) {
			// If last loaded was more than 24 hours ago, reload GTFS data

			console.log("Reloading static TRAX GTFS data...");
			if (fs.existsSync(".TRAXCACHE.sqlite")) fs.rmSync(".TRAXCACHE.sqlite");
			if (fs.existsSync(".TRAXCACHE.sqlite-journal")) fs.rmSync(".TRAXCACHE.sqlite-journal");
			TRAX.loadGTFS(true, true, 120_000).then(() => {
				isTRAXLoading = false;
				isTRAXLoaded = true;
			});
			fs.writeFileSync("gtfs-last-loaded.txt", new Date().toISOString());
		} else {
			// Otherwise, load from cache
			TRAX.loadGTFS(true, false, 120_000).then(() => {
				isTRAXLoading = false;
				isTRAXLoaded = true;
			});
		}

		intervalSet = true;
		if (!intervalSet)
			setInterval(
				() => {
					loadTRAX(true);
				},
				1000 * 60 * 60 * 6,
			); // Reload TRAX every 6h

		TRAX.on("update-realtime-start", () => {
			isTRAXLoading = true;
		});
		TRAX.on("update-realtime-end", () => {
			isTRAXLoading = false;
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
