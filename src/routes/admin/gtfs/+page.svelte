<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let newFilterKey = $state("");
    let newFilterValue = $state("");

    function updateQuery(newParams: Record<string, string | null>, resetPage = true) {
        const url = new URL($page.url);
        
        Object.entries(newParams).forEach(([key, value]) => {
            if (value === null) {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, value);
            }
        });

        if (resetPage) {
            url.searchParams.set('page', '1');
        }

        goto(url, { keepFocus: true });
    }

    function addFilter() {
        if (newFilterKey && newFilterValue) {
            updateQuery({ [newFilterKey]: newFilterValue });
            newFilterKey = "";
            newFilterValue = "";
        }
    }

    function removeFilter(key: string) {
        updateQuery({ [key]: null });
    }

    function clearFilters() {
        const url = new URL($page.url);
        const type = url.searchParams.get('type');
        const params = new URLSearchParams();
        if (type) params.set('type', type);
        // Page defaults to 1 if not present
        goto(`?${params.toString()}`);
    }

    function changePage(newPage: number) {
        if (newPage >= 1 && newPage <= data.totalPages) {
            // pass false to resetPage so we don't jump back to 1
            updateQuery({ page: newPage.toString() }, false);
        }
    }
</script>

<h1>Raw GTFS Objects</h1>

<div class="controls">
    <a href="?type=tripUpdates&page=1"><button class:active={data.type === 'tripUpdates'}>Trip Updates</button></a>
    <a href="?type=vehiclePositions&page=1"><button class:active={data.type === 'vehiclePositions'}>Vehicle Positions</button></a>
    <a href="?type=stopTimes&page=1"><button class:active={data.type === 'stopTimes'}>Stop Times</button></a>
    <a href="?type=calendars&page=1"><button class:active={data.type === 'calendars'}>Calendars</button></a>
    <a href="?type=calendarDates&page=1"><button class:active={data.type === 'calendarDates'}>Calendar Dates</button></a>
    <a href="?type=trips&page=1"><button class:active={data.type === 'trips'}>Trips</button></a>
    <a href="?type=stops&page=1"><button class:active={data.type === 'stops'}>Stops</button></a>
    <a href="?type=routes&page=1"><button class:active={data.type === 'routes'}>Routes</button></a>
</div>

{#if data.type}
    <div class="filter-section">
        <h3>Filters</h3>
        
        <div class="active-filters">
            {#each Object.entries(data.activeFilters) as [key, val]}
                <div class="chip">
                    <span>{key}: <strong>{val}</strong></span>
                    <button class="small-btn" onclick={() => removeFilter(key)}>×</button>
                </div>
            {/each}
            {#if Object.keys(data.activeFilters).length > 0}
                 <button class="clear-btn" onclick={clearFilters}>Clear All</button>
            {/if}
        </div>

        <div class="add-filter">
            <input type="text" bind:value={newFilterKey} placeholder="Field (e.g. trip.route_id)" />
            <input type="text" bind:value={newFilterValue} placeholder="Value (e.g. 104)" />
            <button onclick={addFilter} disabled={!newFilterKey || !newFilterValue}>Add Filter</button>
        </div>
    </div>

    <div class="pagination-header">
        <h2>{data.type} (Total: {data.totalCount})</h2>
        {#if data.totalPages > 1}
            <div class="pagination-controls">
                <button disabled={data.currentPage === 1} onclick={() => changePage(data.currentPage - 1)}>Prev</button>
                <span>Page {data.currentPage} of {data.totalPages}</span>
                <button disabled={data.currentPage === data.totalPages} onclick={() => changePage(data.currentPage + 1)}>Next</button>
            </div>
        {/if}
    </div>

    <hr />

    {#if data.data && data.data.length > 0}
        <pre>{JSON.stringify(data.data, null, 2)}</pre>
        
        {#if data.totalPages > 1}
            <div class="pagination-controls bottom">
                <button disabled={data.currentPage === 1} onclick={() => changePage(data.currentPage - 1)}>Prev</button>
                <span>Page {data.currentPage} of {data.totalPages}</span>
                <button disabled={data.currentPage === data.totalPages} onclick={() => changePage(data.currentPage + 1)}>Next</button>
            </div>
        {/if}
    {:else}
        <p>No data found.</p>
    {/if}
{/if}

<style>
    .controls {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 20px;
    }
    button {
        padding: 5px 10px;
        cursor: pointer;
    }
    button.active {
        background-color: #0056b3;
        color: white;
        border-color: #004494;
    }

    .filter-section {
        background: #eef;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        border: 1px solid #ccd;
    }
    .active-filters {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 10px;
        align-items: center;
    }
    .chip {
        background: #fff;
        border: 1px solid #999;
        border-radius: 16px;
        padding: 4px 10px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9em;
    }
    .small-btn {
        background: none;
        border: none;
        color: red;
        font-weight: bold;
        padding: 0;
        font-size: 1.2em;
        line-height: 1;
    }
    .add-filter {
        display: flex;
        gap: 10px;
    }
    input {
        padding: 5px;
        border: 1px solid #ccc;
        border-radius: 4px;
    }
    .clear-btn {
        font-size: 0.8em;
        background: none;
        border: 1px solid #999;
        color: #333;
    }

    .pagination-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    .pagination-controls {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .pagination-controls.bottom {
        justify-content: center;
        margin-top: 10px;
    }

    pre {
        background: #f0f0f0;
        padding: 10px;
        overflow-x: auto;
        border: 1px solid #ccc;
        /* max-height removed or increased since pagination handles length */
    }
</style>