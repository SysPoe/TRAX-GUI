<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageProps } from './$types';

  const { data }: PageProps = $props();
  
  onMount(() => {
    const filterInput = document.getElementById('filter') as HTMLInputElement;
    filterInput.value = "";
  });

  function filterStations(event: KeyboardEvent) {
    const filter = (event.target as HTMLInputElement).value.toLowerCase();
    const stations = document.querySelectorAll('.station') as NodeListOf<HTMLElement>;
    
    stations.forEach(station => {
      const name = station.getAttribute('data-name')?.toLowerCase() || '';
      const id = station.getAttribute('data-id')?.toLowerCase() || '';
      if (name.includes(filter.toLowerCase()) || id.includes(filter.toLowerCase())) {
        station.style.display = 'block';
      } else {
        station.style.display = 'none';
      }
    });
  }
</script>

<nav><a href="/">Home</a></nav>

<title>TRAX Departure Board</title>

<div class="title">
    <h1>TRAX <i>DepartureBoard</i></h1>
    <p>Select a station to view departures...</p>
    <input type="text" name="filter" id="filter" placeholder="Filter stations..." onkeypress={filterStations}>
</div>

<div class="stations">
    {#each data.stations as station}
    <div data-id={station.stop_id} data-name={station.stop_name} class="station">
        <a href="/DB/{station.stop_id}">{station.stop_name}</a>
    </div>
    {/each}
</div>
<style>
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
    box-shadow: 0 2px 8px rgba(44,62,80,0.05);
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
  }
  .station {
    background: #f8f9fa;
    border: 1px solid #e1e4e8;
    border-radius: 8px;
    padding: 1rem 1.5rem;
    min-width: 180px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(44,62,80,0.07);
    transition: box-shadow 0.2s, border-color 0.2s;
  }
  .station:hover {
    box-shadow: 0 4px 16px rgba(41,128,185,0.12);
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