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

  let stop = TRAX.getAugmentedStops(stop_id)[0];
  let departures = stop
    .getDepartures(today, startTime, endTime)
    .map((v) => ({
      ...v.toSerializable(),
      express_string: v.express_string,
      actual_departure_time: formatTimestamp(
        v.actual_departure_timestamp || v.actual_arrival_timestamp
      ),
      scheduled_departure_time: formatTimestamp(
        v.scheduled_departure_timestamp || v.scheduled_arrival_timestamp
      ),
      last_stop_id: TRAX.getAugmentedTrips(v.trip_id)[0].stopTimes.at(-1)?.actual_parent_station?.stop_id || TRAX.getAugmentedTrips(v.trip_id)[0].stopTimes.at(-1)?.actual_stop?.stop_id || "",
    }))
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
