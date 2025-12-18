import type { QRTTravelTrip, QRTSRTStop, AugmentedStopTime } from "translink-rail-api";

export type SystemStatus = {
	uptime: number;
	lastStaticRefresh: number;
	lastRealtimeUpdate: number;
	cacheStats: {
		routes: number;
		trips: number;
		stops: number;
		tripUpdates: number;
		stopTimeUpdates: number;
		vehiclePositions: number;
	};
};

export type UpcomingGTFSDeparture = AugmentedStopTime & {
	dep_type: "gtfs";
	express_string: string;
	last_stop_id: string;
	scheduled_departure_timestr: string;
	actual_departure_timestr: string;
	departs_in: string;
	departsInSecs: number;
};

export type UpcomingQRTravelDeparture = {
	dep_type: "qrt";
	service: QRTTravelTrip;
	stop: QRTSRTStop | undefined;
	passing: boolean;
	departsInSecs: number;
	departureString: string;
	delayString: string;
	delayClass: "very-late" | "late" | "early" | "on-time" | "scheduled";
	run: string | null;
};

export type Departure = UpcomingGTFSDeparture | UpcomingQRTravelDeparture;
