<script lang="ts">
    import { onMount } from 'svelte';
    let MapComponent: any = $state(null);

    let { data } = $props();
    let vps = $derived(data.vps);
    let shapes = $derived(data.shapes);
    let biggest = $derived(data.biggest);
    let stops = $derived(data.stops);
    let routes = $derived(data.routes);
    let extraDetails = $derived(data.extraDetails);

    onMount(async () => {
        // The import only happens in the browser, preventing the server crash
        const module = await import('./MapComponent.svelte');
        // @ts-ignore
        MapComponent = module.default;
    });
</script>

{#if MapComponent}
    <MapComponent {vps} {shapes} {biggest} {stops} {routes} {extraDetails} />
{:else}
    <p>Loading map...</p>
{/if}

<style>
    :global(body) {
        margin: 0;
    }
</style>