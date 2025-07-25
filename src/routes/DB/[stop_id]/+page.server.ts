import TRAX, { formatTimestamp, type AugmentedTrip } from "translink-rail-api";
import * as gtfs from "gtfs";
import { loadTRAX } from "$lib";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  await loadTRAX();

  const { stop_id } = params;

  let today = Number.parseInt(
    new Date().toISOString().split("T")[0].replaceAll("-", "")
  );

let now = new Date();
let startTime = now.getHours() + ":" + now.getMinutes() + ":00";
let endTime = now.getHours() + 4 + ":" + now.getMinutes() + ":00";

function timeDiff(t1: string, t2: string): string {
  // t1 and t2 are in 'HH:mm' format
  const [h1, m1] = t1.split(":").map(Number);
  const [h2, m2] = t2.split(":").map(Number);
  let total1 = h1 * 60 + m1;
  let total2 = h2 * 60 + m2;
  let diff = total1 - total2;
  if (diff < 0) diff += 24 * 60; // handle overnight
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hours}h ${mins}m`;
}

  let stop = TRAX.getAugmentedStops(stop_id)[0];
  let departures = stop
    .getDepartures(today, startTime, endTime)
    .map((v) => {
      const actualTime = formatTimestamp(
        v.actual_departure_timestamp || v.actual_arrival_timestamp
      );
      // Get current time in HH:mm
      const nowTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      return {
        ...v.toSerializable(),
        express_string: v.express_string,
        actual_departure_time: actualTime,
        scheduled_departure_time: formatTimestamp(
          v.scheduled_departure_timestamp || v.scheduled_arrival_timestamp
        ),
        last_stop_id:
          TRAX.getAugmentedTrips(v.trip_id)[0].stopTimes.at(-1)?.actual_parent_station?.stop_id ||
          TRAX.getAugmentedTrips(v.trip_id)[0].stopTimes.at(-1)?.actual_stop?.stop_id ||
          "",
        departs_in:
          actualTime && actualTime.match(/^\d{2}:\d{2}/)
            ? timeDiff(actualTime.slice(0, 5), nowTime)
            : "-"
      };
    })
    .sort(
      (a, b) =>
        (a.actual_departure_timestamp || a.actual_arrival_timestamp || 0) -
        (b.actual_departure_timestamp || b.actual_arrival_timestamp || 0)
    );

  let trips: {
    [trip_id: string]: Omit<AugmentedTrip, "stopTimes" | "toSerializable">;
  } = {};
  for (const departure of departures) {
    const trip = TRAX.getAugmentedTrips(departure.trip_id)[0];
    if (trip) {
      let { stopTimes, ...rest } = trip.toSerializable();
      trips[trip._trip.trip_id] = rest;
    }
  }

  let routes: {
    [route_id: string]: gtfs.Route;
  } = {};
  for (const trip of Object.values(trips)) {
    if (trip._trip.route_id && !routes[trip._trip.route_id]) {
      const route = TRAX.getRawRoutes(trip._trip.route_id)[0];
      if (route) routes[trip._trip.route_id] = route;
    }
  }

  let stations = TRAX.getStations()
    .map((v) => v.toSerializable())
    .sort((a, b) => (a.stop_name || "").localeCompare(b.stop_name || ""));

  return { stations, stop_id, departures, trips, routes };
};
