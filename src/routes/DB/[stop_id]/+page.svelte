<script lang="ts">
  import { type SerializableAugmentedStopTime } from "translink-rail-api";
  import type { PageProps } from "./$types";
  import type * as gtfs from "gtfs";
  import type { UpcomingQRTravelDeparture } from "$lib";
    import { onMount } from "svelte";

  const { data, params }: PageProps = $props();

  let {
    departures,
  }: {
    departures: (
      | (SerializableAugmentedStopTime & {
          dep_type: "gtfs";
          express_string: string;
          last_stop_id: string;
          scheduled_departure_time: string;
          departs_in: string;
          departsInSecs: number;
        })
      | UpcomingQRTravelDeparture
    )[];
  } = data;

  let {
    routes,
  }: {
    routes: { [route_id: string]: gtfs.Route };
  } = data;

  const station = data.stations.find((v) => v.stop_id === data.stop_id);

  onMount(() => {
    console.log(data);
  })
</script>

<svelte:head>
  <title>
    TRAX Departure Board - {station?.stop_name || "Unknown Station"}
  </title>

  <style>
    :root {
      font-size: min(2.4vw, 1em);
    }
  </style>

  <link rel="icon" type="image/svg+xml" href="/favicon-DB.svg" />
</svelte:head>

<nav><a href="..">Home</a> <a href="../DB">Back</a></nav>

<div class="header">
  <h1>TRAX <i>DepartureBoard</i></h1>
  <h2>
    Departures from {station?.stop_name || "Unknown Station"} in the next 4 hours
  </h2>
</div>

<hr />

<div class="departures">
  {#if departures.length === 0}
    <p>No departures found in the next 4 hours.</p>
  {/if}
  {#each departures as dep}
    {#if dep.dep_type === "gtfs"}
      {@const trip = data.trips[dep.trip_id]}
      {@const route = routes[trip._trip.route_id || ""]}
      {@const express = dep.express_string.toLowerCase() != "all stops"}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <a
        class="departure gtfs {dep.realtime &&
        dep.realtime_info?.schedule_relationship === 3
          ? 'cancelled'
          : dep.last_stop_id == params.stop_id.toLowerCase()
            ? 'term'
            : dep.passing
              ? 'passing'
              : ''}"
        href={`/TV/trip/gtfs/${trip._trip.trip_id}#stoptimes`}
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
            class="delay {dep.realtime &&
            dep.realtime_info?.schedule_relationship === 3
              ? 'cancelled'
              : dep.realtime
                ? dep.realtime_info?.delay_class || 'scheduled'
                : 'scheduled'}"
          >
            ({dep.realtime && dep.realtime_info?.schedule_relationship === 3
              ? "cancelled"
              : dep.realtime
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
          class="service-type {dep.realtime &&
          dep.realtime_info?.schedule_relationship === 3
            ? 'cancelled'
            : dep.last_stop_id == params.stop_id.toLowerCase()
              ? 'term'
              : dep.passing
                ? 'passing'
                : express
                  ? 'express'
                  : 'all-stops'}"
        >
          {dep.realtime && dep.realtime_info?.schedule_relationship === 3
            ? "C"
            : dep.last_stop_id == params.stop_id.toLowerCase()
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
      </a>
      <hr />
    {:else if dep.dep_type === "qrt"}
      <a class="departure {dep.passing ? 'passing' : 'qr-travel'} qrt" 
        href={`/TV/trip/QRT/${dep.service.serviceId}#stoptimes`}>
        <!-- <span class="last-stop">
        {dep.last_stop_id.slice(-6, -3).toUpperCase()}
      </span> -->
        <span class="platform qr-travel"> ? </span>
        <span class="smalltext">
          <span class="time"
            >{(
              dep.stop?.estimatedPassingTime ||
              (dep.stop?.actualDeparture === "0001-01-01T00:00:00"
                ? dep.stop?.actualArrival
                : dep.stop?.actualDeparture)
            )?.slice(11, 16)}</span
          >
          <span class="delay {dep.delayClass}">
            ({dep.delayString})
          </span>
          <span class="run">{dep.run}</span> to <br />
          <span class="headsign">
            {dep.service.stops
              .at(-1)
              ?.placeName.replace(/^Brisbane -/, "")
              .trim() || "Unknown"}
          </span>
        </span>
        <span class="service-type {dep.passing ? 'passing' : 'qr-travel'}">
          {dep.passing ? "P" : "Q"}
        </span>
        <span class="departs_in">
          {dep.departureString}
        </span>
      </a>
      <hr />
    {/if}
  {/each}
</div>

<style>
  * {
    font-family: "Arial";
  }

  nav {
    text-align: center;
    margin: 1rem 0;
  }

  nav a {
    margin: 0 1rem;
    color: #2980b9;
    text-decoration: none;
    font-weight: 500;
  }

  nav a:hover {
    text-decoration: underline;
  }
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

  .departures {
    font-family: "Arial Narrow", Arial, sans-serif;
    padding: 0.2rem;
    height: 3rem;
    width: fit-content;
    margin-left: auto;
    margin-right: auto;
  }

  .departure {
    display: block;
    width: fit-content;
    color: inherit;
    text-decoration: none;
  }
  .departure.passing {
    background-color: #ccc;
  }
  .departure.term {
    background-color: rgb(236, 215, 255);
  }
  .departure.qr-travel {
    background-color: #fec796;
  }
  .departure.cancelled {
    background-color: #c48989;
  }
  .departure.cancelled:hover {
    background-color: #c48989;
    box-shadow: 0 0 1rem #8c4141;
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
    font-family: "Arial", serif;
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
  .platform.qr-travel,
  .service-type.qr-travel {
    background-color: rgb(255, 132, 0);
  }

  .smalltext {
    margin-top: -1.7rem;
    font-size: 1.2rem;
    width: 20rem;
    display: inline-block;
    vertical-align: middle;
    font-weight: 500;
    font-synthesis: weight;
    font-synthesis-weight: 500;
  }
  .headsign {
    font-family: "Arial Bold";
    font-synthesis: weight;
    font-weight: 700;
    line-height: 0.9;
    font-size: 1.7rem;
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
  .service-type.cancelled {
    background-color: #b22222;
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

  .gtfs, .qrt {
    cursor: pointer;
    transition: all 200ms;
  }

  .qrt:hover {
    background-color: hsl(28, 100%, 90%);
    box-shadow: 0 0 1rem hsl(24, 78%, 60%);
  }

  .gtfs:hover {
    background-color: #eef;
    box-shadow: 0 0 1rem #99f;
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
  .scheduled,
  .estimated {
    color: gray;
  }
  .delay.cancelled {
    color: #fff;
    background-color: #b22222;
    padding: 0 0.3em;
    border-radius: 0.3em;
    font-weight: bold;
  }
</style>
