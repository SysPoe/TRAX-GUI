<script lang="ts">
    import { Marker } from "sveaflet";
    import L from "leaflet";
    import type { AugmentedTripInstance } from "translink-rail-api";

    let { vp, routes, ipbrIcon, onclick } = $props<{
        vp: any,
        routes: any,
        ipbrIcon: Function,
        onclick: (trip: AugmentedTripInstance) => void
    }>();

    let markerRef = $state<any>(null);

    // This effect runs once the marker is added to the map
    $effect(() => {
        if (markerRef && markerRef.instance) {
            const leafletMarker = markerRef.instance;
            
            // Native Leaflet click listener
            leafletMarker.on('click', (e: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(e);
                if (vp.tripInstance) {
                    onclick(vp.tripInstance);
                }
            });

            return () => leafletMarker.off('click');
        }
    });

    const runLabel = vp.tripInstance ? `${vp.tripInstance.run}` : "???";
    const route = vp.tripInstance?.route_id ? routes[vp.tripInstance.route_id] : { route_short_name: "?", route_color: "000000" };
</script>

<Marker
    bind:this={markerRef}
    latLng={[vp.position.latitude, vp.position.longitude]}
    options={{
        icon: ipbrIcon(runLabel, route),
        onclick: console.log
    }}
/>