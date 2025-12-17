<script lang="ts">
    import { onMount } from 'svelte';
    import { invalidateAll } from '$app/navigation';
    let MapComponent: any = $state(null);

    let { data } = $props();
    let vps = $derived(data.vps);
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

{#if MapComponent}
    <MapComponent {vps} {biggest} {stops} {routes} {extraDetails} />
{:else}
    <p>Loading map...</p>
{/if}

<style>
    :global(body) {
        margin: 0;
    }
</style>