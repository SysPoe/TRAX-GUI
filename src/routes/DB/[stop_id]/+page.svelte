<script lang="ts">
  import type { AugmentedStopTime } from "translink-rail-api";
  import type { PageProps } from "./$types";
  import type * as gtfs from "gtfs";

  const { data, params }: PageProps = $props();

  let {
    departures,
  }: {
    departures: Array<
      Omit<
        AugmentedStopTime,
        | "actual_stop"
        | "actual_parent_station"
        | "scheduled_stop"
        | "scheduled_parent_station"
        | "toSerializable"
      > & {
        actual_stop: string | null;
        actual_parent_station: string | null;
        scheduled_stop: string | null;
        scheduled_parent_station: string | null;
        express_string: string;
        actual_departure_time: string;
        scheduled_departure_time: string;
        last_stop_id: string;
        departs_in: string;
      }
    >;
  } = data;

  let {
    routes,
  }: {
    routes: { [route_id: string]: gtfs.Route };
  } = data;

  const station = data.stations.find((v) => v.stop_id === data.stop_id);
</script>

<div class="header">
  <h1>TRAX <i>DepartureBoard</i></h1>
  <h2>
    Departures from {station?.stop_name || "Unknown Station"} in the next 4 hours
  </h2>
  <a href="/DB/">Back</a>
</div>

<hr />

<div class="departures">
  {#each departures as dep}
    {@const trip = data.trips[dep.trip_id]}
    {@const route = routes[trip._trip.route_id || ""]}
    {@const express = dep.express_string.toLowerCase() != "all stops"}
    <div
      class="departure {dep.last_stop_id == params.stop_id.toLowerCase()
        ? 'term'
        : dep.passing
          ? 'passing'
          : ''}"
    >
      <!-- <span class="last-stop">
        {dep.last_stop_id.slice(-6, -3).toUpperCase()}
      </span> -->
      <span class="platform" style="background-color: #{route.route_color}">
        {dep.actual_platform_code || "?"}
      </span>
      <span class="smalltext">
        <span class="time">{dep.scheduled_departure_time}</span>
        <span
          class="delay {dep.realtime
            ? dep.realtime_info?.delay_class || 'scheduled'
            : 'scheduled'}"
        >
          ({dep.realtime
            ? dep.realtime_info?.delay_string || "scheduled"
            : "scheduled"})
        </span>
        <span class="run">{trip.run}</span> to <br />
        <span class="headsign">
          {trip._trip.trip_headsign
            ?.replace(/station$/, "")
            .trim()
            .toUpperCase()}
        </span>
      </span>
      <span
        class="service-type {dep.last_stop_id == params.stop_id.toLowerCase()
          ? 'term'
          : dep.passing
            ? 'passing'
            : express
              ? 'express'
              : 'all-stops'}"
      >
        {dep.last_stop_id == params.stop_id.toLowerCase()
          ? "T"
          : dep.passing
            ? "P"
            : express
              ? "E"
              : "A"}
      </span>
      <span class="departs_in">
        {dep.departs_in.replace("0h ", "")}
      </span>
    </div>
    <hr />
  {/each}
</div>

<style>
  .header {
    text-align: center;
    color: #2c3e50;
  }
  .header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    letter-spacing: -0.1rem;
    margin-bottom: 0.5rem;
  }

  :root {
    font-size: min(2.5vw, 1em);
  }
  .departures {
    font-family: "Arial Narrow", Arial, sans-serif;
    padding: 0.2rem;
    height: 3rem;
    width: fit-content;
    margin-left: auto;
    margin-right: auto;
  }
  .departure {
    width: fit-content;
  }
  .departure.passing {
    background-color: #ccc;
  }
  .departure.term {
    background-color: rgb(236, 215, 255);
  }

  .last-stop {
    font-family: "Arial";
    font-weight: 900;
    font-synthesis: weight;
    font-synthesis-weight: 900;
    font-size: 3rem;
    width: 8rem;
    height: 3rem;
    display: inline-block;
    text-align: right;
  }

  .platform {
    align-items: center;
    color: white;
    display: inline-block;
    font-family: "Arial";
    font-size: 3rem;
    font-synthesis: weight;
    font-synthesis-weight: 900;
    font-weight: 900;
    height: 3rem;
    width: 4rem;
    justify-content: center;
    line-height: 0.95;
    margin: 0.6rem;
    outline: 0.3rem solid black;
    text-align: center;
    -webkit-text-stroke-width: 0.2rem;
    -webkit-text-stroke-color: black;
  }

  .smalltext {
    margin-top: -1.8rem;
    font-size: 1.2rem;
    width: 20rem;
    display: inline-block;
    vertical-align: middle;
    font-weight: 500;
    font-synthesis: weight;
    font-synthesis-weight: 500;
  }
  .headsign {
    font-weight: 700;
    font-size: 1.6rem;
    text-transform: uppercase;
  }

  .run {
    font-style: italic;
  }

  .service-type {
    font-weight: 700;
    font-size: 1.5rem;
    text-transform: uppercase;
    display: inline-block;
    vertical-align: top;
    margin-top: 1.3rem;
    width: 1.5rem;
    height: 1.5rem;
    padding-bottom: 0.2rem;
    text-align: center;
    outline: 0.15rem solid black;
  }
  .service-type.passing {
    background-color: rgb(73, 73, 73);
    color: white;
  }
  .service-type.express {
    background-color: burlywood;
  }
  .service-type.term {
    background-color: blueviolet;
    color: white;
  }
  .service-type.all-stops {
    background-color: blue;
    color: white;
  }

  .departs_in {
    font-family: "Arial";
    font-weight: 900;
    font-synthesis: weight;
    font-synthesis-weight: 900;
    font-size: 2rem;
    width: 9rem;
    height: 3rem;
    display: inline-block;
    vertical-align: top;
    margin-top: 0.7rem;
  }

  .very-late {
    color: red;
  }
  .late {
    color: darkgoldenrod;
  }
  .on-time {
    color: green;
  }
  .early {
    color: blue;
  }
  .scheduled {
    color: gray;
  }
</style>
