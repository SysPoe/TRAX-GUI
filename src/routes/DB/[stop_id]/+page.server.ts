import TRAX, {
  formatTimestamp,
  type SerializableAugmentedStopTime,
  type SerializableAugmentedTrip,
} from "translink-rail-api";
import * as gtfs from "gtfs";
import {
  getUpcomingQRTravelDepartures,
  isTRAXLoaded,
  loadTRAX,
  type UpcomingQRTravelDeparture,
} from "$lib";
import type { PageServerLoad } from "./$types";
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  if (!isTRAXLoaded) {
    loadTRAX();
    throw error(503, 'Loading TRAX data... Please retry in a few minutes.');
  }

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

  function secTimeDiff(t1: string, t2: string): number {
    // t1 and t2 are in 'HH:mm' format
    const [h1, m1] = t1.split(":").map(Number);
    const [h2, m2] = t2.split(":").map(Number);
    let total1 = h1 * 3600 + m1 * 60;
    let total2 = h2 * 3600 + m2 * 60;
    let diff = total1 - total2;
    if (diff < 0) diff += 24 * 3600; // handle overnight
    return diff;
  }

  let stop = TRAX.getAugmentedStops(stop_id)[0];
  if(stop === undefined || stop === null) 
    throw error(404, `Stop with ID "${stop_id}" not found.`);
  let departures: (SerializableAugmentedStopTime & {
    dep_type: "gtfs";
    express_string: string;
    last_stop_id: string;
    scheduled_departure_time: string;
    departs_in: string;
    departsInSecs: number;
  })[] = stop
    .getDepartures(today, startTime, endTime)
    .map((v) => {
      const actualTime = formatTimestamp(
        v.actual_departure_timestamp || v.actual_arrival_timestamp
      );
      // Get current time in HH:mm
      const nowTime = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      return {
        ...v.toSerializable(),
        dep_type: "gtfs" as "gtfs",
        express_string: v.express_string,
        actual_departure_time: actualTime,
        scheduled_departure_time: formatTimestamp(
          v.scheduled_departure_timestamp || v.scheduled_arrival_timestamp
        ),
        last_stop_id:
          TRAX.getAugmentedTrips(v.trip_id)[0].stopTimes.at(-1)
            ?.actual_parent_station?.stop_id ||
          TRAX.getAugmentedTrips(v.trip_id)[0].stopTimes.at(-1)?.actual_stop
            ?.stop_id ||
          "",
        departs_in:
          actualTime && actualTime.match(/^\d{2}:\d{2}/)
            ? timeDiff(actualTime.slice(0, 5), nowTime)
            : "-",
        departsInSecs:
          actualTime && actualTime.match(/^\d{2}:\d{2}/)
            ? secTimeDiff(actualTime.slice(0, 5), nowTime)
            : -1,
      };
    })
    .sort(
      (a, b) =>
        (a.actual_departure_timestamp || a.actual_arrival_timestamp || 0) -
        (b.actual_departure_timestamp || b.actual_arrival_timestamp || 0)
    );

  let trips: {
    [trip_id: string]: SerializableAugmentedTrip;
  } = {};
  for (const departure of departures) {
    const trip = TRAX.getAugmentedTrips(departure.trip_id)[0];
    if (trip) {
      trips[trip._trip.trip_id] = trip.toSerializable();
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

  let qrtDepartures: UpcomingQRTravelDeparture[] =
    getUpcomingQRTravelDepartures(stop_id);

  let mixed: (
    | (SerializableAugmentedStopTime & {
        dep_type: "gtfs";
        express_string: string;
        last_stop_id: string;
        scheduled_departure_time: string;
        departs_in: string;
        departsInSecs: number;
      })
    | UpcomingQRTravelDeparture
  )[] = [...departures, ...qrtDepartures].sort((a,b) => {
    return (a.departsInSecs || 0) - (b.departsInSecs || 0);
  });

  let stations = TRAX.getStations()
    .map((v) => v.toSerializable())
    .sort((a, b) => (a.stop_name || "").localeCompare(b.stop_name || ""));

  return { stations, stop_id, departures: mixed, trips, routes };
};
