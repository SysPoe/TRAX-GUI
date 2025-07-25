import TRAX from "translink-rail-api";

let loaded = false;

export async function loadTRAX() {
    if (!loaded) {
        await TRAX.loadGTFS(true);
        loaded = true;
    }
}