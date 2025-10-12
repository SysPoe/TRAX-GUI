import TRAX from "translink-rail-api";

export function GET() {
    TRAX.updateRealtime();
}