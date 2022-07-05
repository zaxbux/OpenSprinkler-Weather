import { GeoCoordinates } from '@/types'
import moment from 'moment'
import SunCalc from "suncalc"

/**
 * Augment `GetTimesResult` with the custom times.
 */
declare module 'suncalc' {
	interface GetTimesResult {
		radiationStart: Date
		radiationEnd: Date
	}
}

/* For hours where the Sun is too low to emit significant radiation, the formula for clear sky isolation will yield a
 * negative value. "radiationStart" marks the times of day when the Sun will rise high for solar isolation formula to
 * become positive, and "radiationEnd" marks the time of day when the Sun sets low enough that the equation will yield
 * a negative result. For any times outside of these ranges, the formula will yield incorrect results (they should be
 * clamped at 0 instead of being negative).
 */
SunCalc.addTime(Math.asin(30 / 990) * 180 / Math.PI, 'radiationStart', 'radiationEnd')

/** Data about the cloud coverage for a period of time. */
export interface CloudCoverInfo {
	/** The start of this period of time. */
	startTime: moment.Moment;
	/** The end of this period of time. */
	endTime: moment.Moment;
	/** The average fraction of the sky covered by clouds during this time period. */
	cloudCover: number;
}

/**
 * Approximates total solar radiation for a day given cloud coverage information using a formula from
 * http://www.shodor.org/os411/courses/_master/tools/calculators/solarrad/
 * @param cloudCoverInfo Information about the cloud coverage for several periods that span the entire day.
 * @param coordinates The coordinates of the location the data is from.
 * @return The total solar radiation for the day (in kilowatt hours per square meter per day).
 */
export function approximateSolarRadiation(cloudCoverInfo: CloudCoverInfo[], coordinates: GeoCoordinates): number {
	return cloudCoverInfo.reduce((total, window) => {
		const radiationStart: moment.Moment = moment(SunCalc.getTimes(window.endTime.toDate(), coordinates[0], coordinates[1])['radiationStart']);
		const radiationEnd: moment.Moment = moment(SunCalc.getTimes(window.startTime.toDate(), coordinates[0], coordinates[1])['radiationEnd']);

		// Clamp the start and end times of the window within time when the sun was emitting significant radiation.
		const startTime: moment.Moment = radiationStart.isAfter(window.startTime) ? radiationStart : window.startTime;
		const endTime: moment.Moment = radiationEnd.isBefore(window.endTime) ? radiationEnd : window.endTime;

		// The length of the window that will actually be used (in hours).
		const windowLength = (endTime.unix() - startTime.unix()) / 60 / 60;

		// Skip the window if there is no significant radiation during the time period.
		if (windowLength <= 0) {
			return total;
		}

		const startPosition = SunCalc.getPosition(startTime.toDate(), coordinates[0], coordinates[1]);
		const endPosition = SunCalc.getPosition(endTime.toDate(), coordinates[0], coordinates[1]);
		const solarElevationAngle = (startPosition.altitude + endPosition.altitude) / 2;

		// Calculate radiation and convert from watts to kilowatts.
		const clearSkyIsolation = (990 * Math.sin(solarElevationAngle) - 30) / 1000 * windowLength;

		return total + clearSkyIsolation * (1 - 0.75 * Math.pow(window.cloudCover, 3.4));
	}, 0);
}
