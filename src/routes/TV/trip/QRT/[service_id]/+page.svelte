<script lang="ts">
    import type { PageProps } from "./$types";
    import type { TravelTrip, SRTStop, TravelStopTime } from "translink-rail-api";

    const { data }: PageProps = $props();
    let { service }: { service: TravelTrip } = data;

    const run = service.serviceName.split(" ")[0].length == 4
            ? service.serviceName.split(" ")[0]
            : null;

    const destination = service.stops.at(-1)?.placeName.replace(/^Brisbane -/, "").trim() || "Unknown";

    const stopsToFilter: string[] = [
        // "NORMANBY",
        // "EXHIBITION",
        // "CAMPBELL STREET",
        // "MAYNE JUNCTION",
        // "MAYNE",
        // "AIRPORT JUNCTION"
    ];

    const filteredStops = (service.stopsWithPassing || service.stops).filter(st => {
        const isSrtStop = 'isStop' in st;
        if (isSrtStop) {
            const isPassing = !(st as SRTStop).isStop;
            if (isPassing) {
                return !stopsToFilter.some(filterName => st.placeName.toUpperCase().includes(filterName));
            }
        }
        return true;
    });

    function formatTime(isoString?: string | null): string {
        if (!isoString || isoString === "0001-01-01T00:00:00") return "--:--";
        try {
            return new Date(isoString).toTimeString().slice(0, 5);
        } catch (e) {
            return isoString.slice(11, 16);
        }
    }

    function getDelay(stop: SRTStop) {
        const delaySecs = stop?.departureDelaySeconds ?? stop?.arrivalDelaySeconds;
        if (delaySecs === null || delaySecs === undefined) {
            return { delayString: 'scheduled', delayClass: 'scheduled' };
        }
        const roundedDelay = Math.round(delaySecs / 60) * 60;
        const delayString =
            delaySecs == 0
            ? "on time"
            : `${Math.floor(roundedDelay / 3600)}h ${Math.floor(
                (Math.abs(roundedDelay) % 3600) / 60
                )}m ${delaySecs > 0 ? "late" : "early"}`
                .replace(/^0h/, "")
                .trim();
        const delayClass: "very-late" | "late" | "early" | "on-time" = 
            roundedDelay > 0
                ? roundedDelay > 5 * 60
                ? "very-late"
                : "late"
                : roundedDelay < 0
                ? "early"
                : "on-time";
        return { delayString, delayClass };
    }
</script>

<svelte:head>
    <title>
        {run} {destination} service - TRAX TripViewer
    </title>
    <style>
        :root {
            font-size: min(3.6vw, 1em);
        }
    </style>
    <link rel="icon" type="image/svg+xml" href="/favicon-TV.svg" />
</svelte:head>

<nav>
    <a href="/">Home</a>
    <a href="/TV">Back</a>
</nav>

<div class="header">
    <h1>TRAX <i>TripViewer</i></h1>
    <h2>
        {run} - {destination} Service
    </h2>
    <p>
        Departing: {formatTime(service.departureDate)} | Service ID: {service.serviceId}
    </p>
</div>

<hr />

<div class="container">
    <div class="content">
        <div class="info-section">
            <h3>Trip Information</h3>
            <div class="info-item">
                <span class="info-label">Service Name:</span>
                <span class="info-value">{service.serviceName}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Line:</span>
                <span class="info-value">{service.line}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Direction:</span>
                <span class="info-value">{service.direction}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Status:</span>
                <span class="info-value">{service.status}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Service Date:</span>
                <span class="info-value">
                    {service.serviceDate}
                </span>
            </div>
            <div class="info-item">
                <span class="info-label">Offers Gold Class:</span>
                <span class="info-value">
                    {service.offersGoldClass ? 'Yes' : 'No'}
                </span>
            </div>
        </div>

        {#if service.disruption}
        <div class="info-section">
            <h3>Service Disruption</h3>
            <div class="info-item">
                <span class="info-label">Title:</span>
                <span class="info-value">{service.disruption.Title}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Summary:</span>
                <span class="info-value">{service.disruption.SummaryText}</span>
            </div>
            {#if service.disruption.PageURL}
            <div class="info-item">
                <span class="info-label">More Info:</span>
                <span class="info-value"><a href={service.disruption.PageURL} target="_blank" rel="noopener noreferrer">{service.disruption.PageURL}</a></span>
            </div>
            {/if}
        </div>
        {/if}

        <div class="info-section">
            <h3>Stoptimes</h3>
            <div class="stoptimes">
                {#each filteredStops as st}
                    {@const isSrtStop = 'isStop' in st}
                    {@const delay = isSrtStop ? getDelay(st as SRTStop) : { delayString: (st as TravelStopTime).delayString, delayClass: (st as TravelStopTime).delayClass }}
                    <div
                        class="stop-time {isSrtStop && !(st as SRTStop).isStop
                            ? 'passing'
                            : ''}"
                    >
                        <span
                            class="platform"
                            style="background-color: #ff8400"
                        >
                            ?
                        </span>
                        <span class="smalltext">
                            <span class="time">
                                {formatTime(st.actualDeparture === '0001-01-01T00:00:00' || !st.actualDeparture ? (st.actualArrival === '0001-01-01T00:00:00' || !st.actualArrival ? (isSrtStop ? (st as SRTStop).estimatedPassingTime : st.plannedDeparture) : st.actualArrival) : st.actualDeparture)}
                            </span>
                            <span
                                class="delay {delay.delayClass}"
                            >
                                ({delay.delayString})
                            </span>
                            <br />
                            <span class="station">
                                {st.placeName
                                    .replace(/station/i, "")
                                    .trim()
                                    .toUpperCase()}
                            </span>
                        </span>
                        {#if isSrtStop && !(st as SRTStop).isStop}
                            <span class="service-type passing">P</span>
                        {/if}
                    </div>
                    <hr />
                {/each}
            </div>
        </div>
    </div>
</div>

<footer>
    <p>
        * Passing stop times and stations are estimated and may not be accurate.
    </p>
</footer>

<style>
    * {
        font-family: "Arial", sans-serif;
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
        margin: 1.2rem 0;
        padding: 0 1rem;
    }
    .header h1 {
        font-size: 2rem;
        font-weight: 700;
        letter-spacing: -0.03rem;
        margin-bottom: 0.2rem;
    }

    .header h2 {
        font-size: 1.3rem;
        font-weight: 500;
        color: #555;
        margin: 0.3rem 0;
    }

    .header p {
        font-size: 0.95rem;
        color: #777;
        margin: 0.3rem 0;
    }

    .container {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        flex: 1;
        padding: 0.8rem;
    }

    .content {
        width: 100%;
        max-width: 650px;
        margin: 0 auto;
    }

    .info-section {
        margin-bottom: 1.5rem;
        padding: 1.2rem;
        border-radius: 6px;
        background-color: #ffffff;
        box-shadow: 0 1px 5px rgba(0, 0, 0, 0.03);
    }

    .info-section h3 {
        margin-top: 0;
        color: #2c3e50;
        font-size: 1.3rem;
        font-weight: 600;
    }

    .info-item {
        display: flex;
        margin-bottom: 0.6rem;
        padding: 0.4rem 0;
    }

    .info-label {
        font-weight: 500;
        min-width: 140px;
        color: #555;
        font-size: 0.95rem;
    }

    .info-value {
        flex: 1;
        color: #333;
        font-size: 0.95rem;
    }

    .run-series-item {
        display: flex;
        margin: 0.2rem 0;
    }

    .route-link {
        color: #2980b9;
        text-decoration: none;
    }

    .route-link:hover {
        text-decoration: underline;
    }

    .color-square {
        width: 1rem;
        height: 1rem;
        border: 1px solid #ccc;
        display: inline-block;
        margin-left: 0.5rem;
        vertical-align: middle;
    }

    .stoptimes {
        font-family: "Arial Narrow", Arial, sans-serif;
        padding: 0.1rem;
        width: fit-content;
        margin: 0 auto;
    }

    .stop-time {
        display: block;
        width: fit-content;
        color: inherit;
        text-decoration: none;
    }

    .stop-time.passing {
        background-color: #f5f5f5;
    }

    .stop-time.cancelled {
        background-color: #fceaea;
    }

    .stop-time {
        border-radius: 3px;
        margin-bottom: 0.2rem;
    }

    .platform {
        align-items: center;
        color: white;
        display: inline-block;
        font-family: "Arial", serif;
        font-size: 2rem;
        font-weight: 900;
        height: 2rem;
        width: 2.8rem;
        justify-content: center;
        line-height: 0.95;
        margin: 0.3rem;
        outline: 0.15rem solid black;
        text-align: center;
        -webkit-text-stroke-width: 0.1rem;
        -webkit-text-stroke-color: black;
    }

    .smalltext {
        margin-top: -1rem;
        font-size: 0.95rem;
        width: 16rem;
        display: inline-block;
        vertical-align: middle;
        font-weight: 500;
    }

    .station {
        font-weight: 600;
        line-height: 0.9;
        font-size: 1.3rem;
        text-transform: uppercase;
    }

    .service-type {
        font-weight: 700;
        font-size: 1.1rem;
        text-transform: uppercase;
        display: inline-block;
        vertical-align: top;
        margin-top: 0.8rem;
        width: 1.1rem;
        height: 1.1rem;
        padding-bottom: 0.1rem;
        text-align: center;
        outline: 0.1rem solid black;
    }

    .service-type.passing {
        background-color: rgb(120, 120, 120);
        color: white;
    }

    .service-type.cancelled {
        background-color: #c62828;
        color: white;
    }

    .very-late {
        color: #c62828;
    }
    .late {
        color: #ff8f00;
    }
    .on-time {
        color: #2e7d32;
    }
    .early {
        color: #1565c0;
    }
    .scheduled,
    .estimated {
        color: #757575;
    }
    .delay.cancelled {
        color: #fff;
        background-color: #c62828;
        padding: 0 0.25em;
        border-radius: 0.25em;
        font-weight: bold;
    }

    .date-offset {
        font-size: 0.8rem;
        color: #757575;
        margin-left: 0.4rem;
    }

    footer {
        text-align: center;
        margin-top: 1.5rem;
        padding: 1rem;
        color: #757575;
        font-size: 0.85rem;
    }

    hr {
        border: none;
        height: 1px;
        background-color: #eee;
        margin: 0.4rem 0;
    }
</style>