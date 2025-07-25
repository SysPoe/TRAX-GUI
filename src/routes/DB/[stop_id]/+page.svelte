<script lang="ts">
  import type { AugmentedStopTime } from "translink-rail-api";
  import type { PageProps } from "./$types";
  import type * as gtfs from "gtfs";

  const { data }: PageProps = $props();

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
  <h1>Departures from {station?.stop_name || "Unknown Station"}</h1>
</div>

<div class="departures">
  {#each departures as dep}
    {@const trip = data.trips[dep.trip_id]}
    {@const route = routes[trip._trip.route_id || ""]}
    <div class="departure {dep.passing ? 'passing' : ''}">
      <span class="last-stop">
        {dep.last_stop_id.slice(-6, -3).toUpperCase()}
      </span>
      <span class="platform" style="background-color: #{route.route_color}">
        {dep.actual_platform_code}
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
        <span class="run">{trip.run}</span> to <br>
        <span class="headsign">
          {trip._trip.trip_headsign?.replace(/station$/, "").trim().toUpperCase()}
        </span>
      </span>
    </div>
  {/each}
</div>

<style>
  :root {
    font-size: 1em;
  }
  .departures {
    font-family: "Arial Narrow", Arial, sans-serif;
    padding: 0.2rem;
    height: 3rem;
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
    font-size: 1.5rem;
    text-transform: uppercase;
  }

  .very-late {
    color: red;
  }
  .late {
    color: orange;
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
