<script lang="ts">
    import { onMount } from 'svelte';
    import { invalidateAll } from '$app/navigation';
    let MapComponent: any = $state(null);

    let { data } = $props();
    let vps = $derived(data.vps);
    let shapes = $derived(data.shapes);
    let biggest = $derived(data.biggest);
    let stops = $derived(data.stops);
    let routes = $derived(data.routes);
    let extraDetails = $derived(data.extraDetails);

    onMount(() => {
        // The import only happens in the browser, preventing the server crash
        import('./MapComponent.svelte').then(module => {
            // @ts-ignore
            MapComponent = module.default;
        });

        const interval = setInterval(() => {
            invalidateAll();
        }, 30000);

        return () => clearInterval(interval);
    });
</script>

<svelte:head>
    <title>TRAX Map View</title>

    <style>
        :root {
            font-size: min(4vw, 1em);
        }
    </style>
</svelte:head>

{#if MapComponent}
    <MapComponent {vps} {shapes} {biggest} {stops} {routes} {extraDetails} />
{:else}
    <p>Loading...</p>
{/if}


<style>
    :global(body) {
        margin: 0;
    }
</style>