import { isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import TRAX from "translink-rail-api";

const PAGE_SIZE = 50;

// Helper to safely access nested properties (e.g., "trip.route_id")
function getNestedValue(obj: any, path: string): any {
	return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined) ? acc[part] : undefined, obj);
}

export const load: PageServerLoad = async ({ url }) => {
	if (!isTRAXLoaded) {
		loadTRAX();
		throw error(503, "Loading TRAX data... Please retry in a few minutes.");
	}

	if (isTRAXLoading) throw error(503, "Loading TRAX data... Please retry in a few minutes.");

	const type = url.searchParams.get("type");
	
	// Parse current page, default to 1
	const pageParam = url.searchParams.get("page");
	const currentPage = pageParam ? Math.max(1, parseInt(pageParam)) : 1;

	// Extract all params that aren't 'type' or 'page' to use as filters
	const filters: Record<string, string> = {};
	url.searchParams.forEach((value, key) => {
		if (key !== "type" && key !== "page") {
			filters[key] = value;
		}
	});

	let data: any = null;
	let totalCount = 0;
	let paginatedData: any[] = [];
	let totalPages = 0;

	if (type) {
		switch (type) {
			case "tripUpdates":
				data = TRAX.getTripUpdates();
				break;
			case "vehiclePositions":
				data = TRAX.getVehiclePositions();
				break;
			case "stopTimes":
				data = TRAX.getAugmentedStopTimes().map(v => v._stopTime);
				break;
			case "calendars":
				data = TRAX.getRawCalendars();
				break;
			case "calendarDates":
				data = TRAX.getRawCalendarDates();
				break;
			case "trips":
				data = TRAX.getRawTrips();
				break;
			case "augmentedTrips":
				data = TRAX.getAugmentedTrips();
				break;
			case "stops":
				data = TRAX.getRawStops();
				break;
			case "routes":
				data = TRAX.getRawRoutes();
				break;
			default:
				break;
		}

		if (Array.isArray(data)) {
			// 1. Filter
			if (Object.keys(filters).length > 0) {
				data = data.filter((item) => {
					return Object.entries(filters).every(([key, value]) => {
						const val = getNestedValue(item, key);
						const itemVal = (val !== undefined && val !== null) ? String(val) : "";
						return itemVal === value;
					});
				});
			}
			
			totalCount = data.length;
			totalPages = Math.ceil(totalCount / PAGE_SIZE);

			// 2. Paginate
			// Ensure current page isn't out of bounds (unless data is empty)
			const safePage = totalCount > 0 ? Math.min(currentPage, totalPages) : 1;
			
			const start = (safePage - 1) * PAGE_SIZE;
			const end = start + PAGE_SIZE;
			paginatedData = data.slice(start, end);
		}
	}

	return {
		type,
		data: paginatedData, // Return only the slice
		totalCount,
		currentPage: totalCount > 0 ? Math.min(currentPage, totalPages) : 1,
		totalPages,
		activeFilters: filters
	};
};