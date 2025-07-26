import TRAX, {type TravelTrip, type TravelStopTime} from "translink-rail-api";

let loaded = false;

export async function loadTRAX() {
    if (!loaded) {
        await TRAX.loadGTFS(true);
        loaded = true;
    }
}

export type UpcomingQRTravelDeparture = {
  dep_type: "qrt";
  service: TravelTrip;
  stop: TravelStopTime | undefined;
  departsInSecs: number;
  departureString: string;
  delayString: string;
  delayClass: "very-late" | "late" | "early" | "on-time" | "scheduled";
  run: string | null;
};

export function getUpcomingQRTravelDepartures(
  gtfs_station_id: string,
  max_hours: number = 4
): UpcomingQRTravelDeparture[] {
  // TODO cache this
  const travelTrains: TravelTrip[] = TRAX.getQRTTrains();

  const stations = TRAX.getStations().filter((v: any) => v.qrt_Place);
  const targetPlace: string | undefined = stations.find(
    (v: any) => v.stop_id === gtfs_station_id
  )?.qrt_PlaceCode;

  if (!targetPlace) return [];

  const trains: UpcomingQRTravelDeparture[] = travelTrains
    .filter((v) => v.stops.some((s) => s.placeCode === targetPlace))
    .map((v) => {
      const stop = v.stops.find((s) => s.placeCode === targetPlace);
      let departsInSecs =
        Math.round(
          new Date(
            (stop?.actualDeparture === "0001-01-01T00:00:00"
              ? stop.actualArrival
              : stop?.actualDeparture) || "0001-01-01T00:00:00"
          ).getTime() - Date.now()
        ) / 1000;
      departsInSecs = Math.round(departsInSecs / 60) * 60;
      const delaySecs = stop?.departureDelaySeconds || stop?.arrivalDelaySeconds;
      const roundedDelay = delaySecs ? Math.round(delaySecs / 60) * 60 : 0;
      const delayString = delaySecs
        ? delaySecs == 0
          ? "on time"
          : `${Math.floor(roundedDelay / 3600)}h ${Math.floor(
              (Math.abs(roundedDelay) % 3600) / 60
            )}m ${delaySecs > 0 ? "late" : "early"}`
              .replace(/^0h/, "")
              .trim()
        : "scheduled";
      const delayClass: "very-late" | "late" | "early" | "on-time" | "scheduled" = delaySecs
        ? roundedDelay > 0
          ? roundedDelay > 5 * 60
            ? "very-late"
            : "late"
          : roundedDelay < 0
          ? "early"
          : "on-time"
        : "scheduled";
      return {
        dep_type: "qrt" as "qrt",
        service: v,
        stop,
        departsInSecs,
        departureString: (
          Math.floor(departsInSecs / 3600) +
          "h " +
          Math.floor((departsInSecs % 3600) / 60) +
          "m"
        )
          .replace(/^0h/, "")
          .trim(),
        delayString,
        delayClass,
        run:
          v.serviceName.split(" ")[0].length == 4
            ? v.serviceName.split(" ")[0]
            : null,
      };
    })
    .filter((v) => v.departsInSecs > 0 && v.departsInSecs <= max_hours * 3600)
    .sort((a, b) => a.departsInSecs - b.departsInSecs);
  return trains;
}