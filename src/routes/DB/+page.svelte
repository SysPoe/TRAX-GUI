<script lang="ts">
  import type { PageProps } from "./$types";
  import { goto } from "$app/navigation";

  const { data }: PageProps = $props();
  let loading = $state(false);
  let filterText = $state("");

  let filteredStations = $derived(
    data.stations.filter((station) => {
      const filter = filterText.toLowerCase().trim();
      if (!filter) return true;

      const name = station.stop_name?.toLowerCase() || "";
      const id = station.stop_id?.toLowerCase() || "";
      return name.includes(filter) || id.includes(filter);
    }),
  );

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && filteredStations.length === 1) {
      loading = true;
      goto(`/DB/${filteredStations[0].stop_id}`);
    }
  }
</script>

<svelte:head>
  <title>TRAX Departure Board</title>
  <link rel="icon" type="image/svg+xml" href="/favicon-DB.svg" />
  <link rel="prefetch" href="/img/loading.svg" />
</svelte:head>

<nav><a href="/">Home</a></nav>

<div class="title">
  <h1>TRAX <i>DepartureBoard</i></h1>
  <p>Select a station to view departures...</p>
  {#if loading}
    <p><img src="/img/loading.svg" alt="Loading..." /></p>
    <p>Loading...</p>
  {:else}
    <input
      type="text"
      name="filter"
      id="filter"
      placeholder="Filter stations..."
      bind:value={filterText}
      onkeydown={handleKeydown}
    />
  {/if}
</div>

{#if !loading}
  <div class="stations">
    {#each filteredStations as station (station.stop_id)}
      <div
        data-id={station.stop_id}
        data-name={station.stop_name}
        class="station"
      >
        <a
          href="/DB/{station.stop_id}"
          onclick={() => {
            loading = true;
            goto(`/DB/${station.stop_id}`);
          }}
        >
          {station.stop_name}
        </a>
      </div>
    {/each}
  </div>
{/if}

<style>
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

  .title {
    text-align: center;
    margin-top: 2rem;
    margin-bottom: 2rem;
    color: #2c3e50;
  }
  .title h1 {
    font-size: 2.5rem;
    font-weight: 700;
    letter-spacing: -0.1rem;
    margin-bottom: 0.5rem;
  }
  .title p {
    font-size: 1.2rem;
    color: #555;
    margin-bottom: 1rem;
  }
  .title input[type="text"] {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    width: 300px;
    max-width: 90vw;
    box-shadow: 0 2px 8px rgba(44, 62, 80, 0.05);
    margin-top: 0.5rem;
    transition: border-color 0.2s;
  }
  .title input[type="text"]:focus {
    border-color: #2980b9;
    outline: none;
  }
  .stations {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
    margin-top: 2rem;
    max-width: 1000px;
    margin-left: auto;
    margin-right: auto;
  }
  .station {
    background: #f8f9fa;
    border: 1px solid #e1e4e8;
    border-radius: 8px;
    padding: 1rem 1.5rem;
    min-width: 180px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(44, 62, 80, 0.07);
    transition:
      box-shadow 0.2s,
      border-color 0.2s;
    width: 250px;
  }
  .station:hover {
    box-shadow: 0 4px 16px rgba(41, 128, 185, 0.12);
    border-color: #2980b9;
  }
  .station a {
    text-decoration: none;
    color: #2980b9;
    font-size: 1.1rem;
    font-weight: 500;
    transition: color 0.2s;
  }
  .station a:hover {
    color: #1abc9c;
    text-decoration: underline;
  }
</style>
