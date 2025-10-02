<script lang="ts">
    import type { PageProps } from "./$types";
    import "$lib/styles/trip-results.css";
    import "$lib/styles/common.css";
    const { data }: PageProps = $props();
    const { services } = data;

    const replace: { [key: string]: string } = {
        "Townsville - Charters Towers Road": "Townsville",
    };

    function formatTime(time: string) {
        let d = new Date(time);
        let n = new Date();

        return (
            `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}` +
            ` (${d.getDate()}/${d.getMonth() + 1}${d.getFullYear() != n.getFullYear() ? "/" + d.getFullYear() : ""})`
        );
    }
</script>

<svelte:head>
    <title>TRAX TripViewer - QRT Services</title>
    <link rel="icon" type="image/svg+xml" href="/favicon-TV.svg" />
</svelte:head>

<nav>
    <a href="/">Home</a>
    <a href="/TV">Back</a>
</nav>

<div class="title">
    <h1>TRAX <i>TripViewer</i></h1>
    <p>QRT Services</p>
</div>

<div class="results">
    <hr />
    {#each services as service}
        {@const run = service.run}
        {@const start =
            replace[
                service.stops[0]?.placeName
                    .replace(/^Brisbane - /, "")
                    .trim() ?? "UNKNOWN"
            ] ??
            service.stops[0]?.placeName.replace(/^Brisbane - /, "").trim() ??
            "UNKNOWN"}
        {@const end =
            replace[
                service.stops
                    .at(-1)
                    ?.placeName.replace(/^Brisbane - /, "")
                    .trim() ?? "UNKNOWN"
            ] ??
            service.stops
                .at(-1)
                ?.placeName.replace(/^Brisbane - /, "")
                .trim() ??
            "UNKNOWN"}
        <a href="/TV/trip/QRT/{service.serviceId}" class="result">
            <span class="headline">
                <span class="de-emphasize">{run} &mdash;</span> {start} &ndash; {end}
            </span><br />
            <span class="extra-details">
                {formatTime(service.stops[0].actualDeparture)}
                <span class="location">
                    {start}
                </span>
                <span class="bigarrow">&rarr;</span>
                {formatTime(service.stops.at(-1)?.actualArrival ?? "")}
                <span class="location">{end}</span>
            </span>
        </a>
        <hr />
    {/each}
</div>

<style>
    .results {
        padding: 0;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
    }
</style>
