import TRAX, { type TravelTrip, type SRTStop } from "translink-rail-api";
import fs from "fs";

export let isTRAXLoaded = false;
let isTRAXLoading = false;

export async function loadTRAX() {
  if (!isTRAXLoaded && !isTRAXLoading) {
    isTRAXLoading = true;

    TRAX.clearIntervals();

    let lastLoaded = fs.existsSync("gtfs-last-loaded.txt")
      ? fs.readFileSync("gtfs-last-loaded.txt", "utf-8")
      : new Date(0).toISOString();
    const lastLoadedDate = new Date(lastLoaded);
    if (
      Date.now() - lastLoadedDate.getTime() > 1000 * 60 * 60 * 24 ||
      lastLoadedDate.getDay() !== new Date().getDay()
    ) {
      // If last loaded was more than 24 hours ago, reload GTFS data

      console.log("Reloading static TRAX GTFS data...");
      if (fs.existsSync("db.sqlite")) fs.rmSync("db.sqlite");
      if (fs.existsSync("db.sqlite-journal")) fs.rmSync("db.sqlite-journal");
      await TRAX.loadGTFS(true, true);
      fs.writeFileSync("gtfs-last-loaded.txt", new Date().toISOString());
    } else {
      // Otherwise, load from cache
      await TRAX.loadGTFS(true, false);
    }

    // Calculate millis to 3am
    const millis = new Date();
    millis.setHours(3, 0, 0, 0);
    if (millis.getTime() < Date.now()) {
      millis.setDate(millis.getDate() + 1);
    }
    const millisTo3am = millis.getTime() - Date.now();
    setTimeout(() => {
      TRAX.clearIntervals();
      loadTRAX();

      setInterval(() => {
        TRAX.clearIntervals();
        loadTRAX();
      }, 1000 * 60 * 60 * 24);
    }, millisTo3am); // Reload TRAX at 3am every day

    isTRAXLoading = false;
    isTRAXLoaded = true;
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
  max_hours: number = 4
): UpcomingQRTravelDeparture[] {
  const travelTrains: TravelTrip[] = TRAX.getQRTTrains();

  const stations = TRAX.getStations();
  const targetPlace: string | undefined = stations
    .find((v: any) => v.stop_id === gtfs_station_id)
    ?.stop_name?.replace("station", "")
    .trim()
    .toLowerCase();

  if (!targetPlace) return [];

  const trains: UpcomingQRTravelDeparture[] = travelTrains
    .filter(
      (v) =>
        v.stopsWithPassing &&
        v.stopsWithPassing.some(
          (s) =>
            s.placeName.toLowerCase().trim().startsWith(targetPlace) ||
            targetPlace.startsWith(s.placeName.toLowerCase().trim()) ||
            (s.placeName.trim().toLowerCase().includes("roma st") &&
              gtfs_station_id == "place_romsta")
        )
    )
    .map((v) => {
      const stop = (v.stopsWithPassing ?? []).find(
        (s) =>
          s.placeName.toLowerCase().trim().startsWith(targetPlace) ||
          targetPlace.startsWith(s.placeName.toLowerCase().trim()) ||
          (s.placeName.trim().toLowerCase().includes("roma st") &&
            gtfs_station_id == "place_romsta")
      );
      let departsInSecs =
        Math.round(
          new Date(
            (stop?.actualDeparture === "0001-01-01T00:00:00" ||
            !stop?.actualDeparture
              ? stop?.actualArrival === "0001-01-01T00:00:00" ||
                !stop?.actualArrival
                ? stop?.estimatedPassingTime
                : stop?.actualArrival
              : stop?.actualDeparture) || "0001-01-01T00:00:00"
          ).getTime() - Date.now()
        ) / 1000;
      departsInSecs = Math.round(departsInSecs / 60) * 60;
      const delaySecs =
        stop?.departureDelaySeconds || stop?.arrivalDelaySeconds;
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
      const delayClass:
        | "very-late"
        | "late"
        | "early"
        | "on-time"
        | "scheduled" = delaySecs
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
        delayString,
        delayClass,
        run:
          v.serviceName.split(" ")[0].length == 4
            ? v.serviceName.split(" ")[0]
            : null,
      };
    })
    .filter((v) => v.departsInSecs > 0 && v.departsInSecs <= max_hours * 3600)
    .sort(
      (a, b) => a.departsInSecs - b.departsInSecs
    ) as UpcomingQRTravelDeparture[];
  return trains;
}
