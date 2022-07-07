/**
 * Reference Potential Evapotranspiration (ETₒ) calculation.
 *
 * @fileoverview The implementation of this algorithm was guided by a step-by-step breakdown (<http://edis.ifas.ufl.edu/pdffiles/ae/ae45900.pdf>).
 */

import { GeoCoordinates } from '@/types'
import { EToData } from '@/weatherProviders'
import { unix } from 'moment'

/**
 * Calculates the reference potential evapotranspiration using the Penman-Monteith (FAO-56) method (<http://www.fao.org/3/X0490E/x0490e07.htm>).
 *
 * @param etoData Data to calculate the ETₒ with.
 * @param elevation Elevation above sea level of the watering site (in meters).
 * @param coordinates Coordinates of the watering site.
 * @return Reference potential evapotranspiration (ETₒ), mm/day.
 */
export function calculateETo(etoData: EToData, elevation: number, coordinates: GeoCoordinates): number {
	// Convert to megajoules.
	const solarRadiation = etoData.solarRadiation * 3.6;
	const meanTemperature = meanDailyTemperature(etoData.minTemp, etoData.maxTemp)
	const Δ = slopeOfSaturationVaporPressureCurve(meanTemperature)
	const γ = psychrometricConstant(atmosphericPressure(elevation))
	const minSaturationVaporPressure = saturationVaporPressure(etoData.minTemp)
	const maxSaturationVaporPressure = saturationVaporPressure(etoData.maxTemp)
	const vaporPressure = actualVaporPressure(minSaturationVaporPressure, maxSaturationVaporPressure, etoData.minHumidity, etoData.maxHumidity)

	return windTerm(psiTerm(Δ, γ, etoData.windSpeed), temperatureTerm(meanTemperature, etoData.windSpeed), minSaturationVaporPressure, maxSaturationVaporPressure, vaporPressure) +
		radiationTerm(Δ, γ, etoData.windSpeed, solarRadiation, etoData.minTemp, etoData.maxTemp, vaporPressure, elevation, unix(etoData.periodStartTime).dayOfYear(), degreesToRadians(coordinates[0]))
}

/**
 * Step 1 - Mean daily temperature (Tmean)
 *
 * @param Tmin minimum daily air temperature, C
 * @param Tmax maximum daily air temperature, C
 * @returns mean daily air temperature, C
 */
const meanDailyTemperature = (Tmin: number, Tmax: number) => (Tmin + Tmax) / 2

/**
 * Step 4 - Slope of saturation vapor pressure curve (Δ)
 * @param Tmean mean daily air temperature, C {@link meanDailyTemperature}
 * @returns
 */
const slopeOfSaturationVaporPressureCurve = (Tmean: number) => 4098 * 0.6108 * Math.exp(17.27 * Tmean / (Tmean + 237.3)) / Math.pow(Tmean + 237.3, 2)

/**
 * Step 5 – Atmospheric Pressure (P)
 * @param z elevation above sea level, m
 * @returns atmospheric pressure, kPa
 */
const atmosphericPressure = (z: number) => 101.3 * Math.pow((293 - 0.0065 * z) / 293, 5.26)

/**
 * Step 6 - Psychrometric constant (γ)
 * @param p  atmospheric pressure, kPa
 * @returns  psychrometric constant, kPa °C-1
 */
const psychrometricConstant = (p: number) => 0.000665 * p

/**
 * Step 7 - Delta Term (DT) (auxiliary calculation for Radiation Term)
 * @param Δ slope of saturation vapor curve {@link slopeOfSaturationVaporPressureCurve}
 * @param γ psychrometric constant, kPa °C-1 {@link psychrometricConstant}
 * @param u wind speed 2 m above the ground surface, m s-1
 * @returns
 */
const deltaTerm = (Δ: number, γ: number, u: number) => Δ / (Δ + γ * (1 + 0.34 * u))

/**
 * Step 8 -Psi Term (PT) (auxiliary calculation for Wind Term)
 * @param Δ slope of saturation vapor curve {@link slopeOfSaturationVaporPressureCurve}
 * @param γ psychrometric constant, kPa °C-1 {@link psychrometricConstant}
 * @param u wind speed 2 m above the ground surface, m s-1
 * @returns
 */
const psiTerm = (Δ: number, γ: number, u: number) => γ / (Δ + γ * (1 + 0.34 * u))

/**
 * Step 9 - Temperature Term (TT) (auxiliary calculation for Wind Term)
 * @param Tmean mean daily air temperature, C {@link meanDailyTemperature}
 * @param u wind speed 2 m above the ground surface, m s-1
 * @returns
 */
const temperatureTerm = (Tmean: number, u: number) => (900 / (Tmean + 273)) * u

/**
 * Step 10(a) - Saturation vapor pressure
 * @param t air temperature, C
 * @returns saturation vapor pressure at the air temperature T, kPa
 */
const saturationVaporPressure = (t: number) => 0.6108 * Math.exp(17.27 * t / (t + 237.3))

/**
 * Step 11 - Actual vapor pressure (ea) derived from relative humidity
 * @param eTmin saturation vapour pressure at daily minimum temperature, kPa {@link saturationVaporPressure}
 * @param eTmax saturation vapour pressure at daily maximum temperature, kPa {@link saturationVaporPressure}
 * @param RHmin minimum relative humidity, %
 * @param RHmax maximum relative humidity, %
 * @returns actual vapour pressure, kPa
 */
const actualVaporPressure = (eTmin: number, eTmax: number, RHmin: number, RHmax: number) => (eTmin * RHmax / 100 + eTmax * RHmin / 100) / 2

/**
 * Step 12(a) - Inverse relative distance Earth-Sun (dr)
 * @param J number of the day in the year between 1 (1 January) and 365 or 366 (31 December)
 * @returns inverse relative distance Earth-Sun
 */
const inverseRelativeDistanceEarthSun = (J: number) => 1 + 0.033 * Math.cos(2 * Math.PI / 365 * J)

/**
 * Step 12 (b) - Solar declination (δ)
 * @param J number of the day in the year between 1 (1 January) and 365 or 366 (31 December)
 * @returns solar declination, rad
 */
const solarDeclination = (J: number) => 0.409 * Math.sin(2 * Math.PI / 365 * J - 1.39)

/**
 * Step 13 - Conversion of latitude (φ) in degrees to radians
 * @param deg
 * @returns latitude, rad
 */
const degreesToRadians = (deg: number) => Math.PI / 180 * deg

/**
 * Step 14 - Sunset hour angle (ωs)
 * @param φ latitude, rad
 * @param δ solar declination
 * @returns
 */
const sunsetHourAngle = (φ: number, δ: number) => Math.acos(-Math.tan(φ) * Math.tan(δ))

/**
 * Step 15 - Extraterrestrial radiation (Ra)
 * @param dr inverse relative distance Earth-Sun {@link inverseRelativeDistanceEarthSun}
 * @param ωs sunset hour angle, rad
 * @param φ latitude, rad
 * @param δ solar declination, rad {@link solarDeclination}
 * @returns
 */
const extraterrestrialRadiation = (dr: number, ωs: number, φ: number, δ: number) => 24 * 60 / Math.PI * 0.082 * dr * (ωs * Math.sin(φ) * Math.sin(δ) + Math.cos(φ) * Math.cos(δ) * Math.sin(ωs))

/**
 * Step 16 - Clear sky solar radiation (Rso)
 * @param z elevation above sea level, m
 * @param Ra extraterrestrial radiation, MJ m-2 day-1
 * @returns
 */
const clearSkySolarRadiation = (z: number, Ra: number) => (0.75 + 2e-5 * z) * Ra

/**
 * Step 17 - Net solar or net shortwave radiation (Rns)
 * @param Rs the incoming solar radiation, MJ m-2 day-1
 * @param a albedo or canopy reflection coefficient, which is 0.23 for the hypothetical grass reference crop, dimensionless
 * @returns  net solar or shortwave radiation, MJ m-2 day-1
 */
const netShortWaveSolarRadiation = (Rs: number, a: number = 0.23) => (1 - a) * Rs

/**
 * Step 18 - Net outgoing long wave solar radiation (Rnl)
 * @param Tmin minimum absolute temperature during the 24-hour period, C
 * @param Tmax maximum absolute temperature during the 24-hour period, C
 * @param ea actual vapor pressure, kPa {@link actualVaporPressure}
 * @param Rs the incoming solar radiation, MJ m-2 day-1
 * @param Rso  clear sky solar radiation, MJ m-2 day-1 {@link clearSkySolarRadiation}
 * @returns net outgoing longwave radiation, MJ m-2 day-1
 */
const netOutgoingLongWaveSolarRadiation = (Tmin: number, Tmax: number, ea: number, Rs: number, Rso: number) => 4.903e-9 * (Math.pow(Tmax + 273.16, 4) + Math.pow(Tmin + 273.16, 4)) / 2 * (0.34 - 0.14 * Math.sqrt(ea)) * (1.35 * Rs / Rso - 0.35)


/**
 * Step 19 - Net radiation (Rn) in equivalent of evaporation (mm) (Rng)
 * @param Rns net solar or shortwave radiation, MJ m-2 day-1 {@link netShortWaveSolarRadiation}
 * @param Rnl net outgoing longwave radiation, MJ m-2 day-1 {@link netOutgoingLongWaveSolarRadiation}
 * @returns net radiation, mm
 */
const netRadiation = (Rns: number, Rnl: number) => 0.408 * Rns - Rnl

/**
 * Wind Term (ETwind)
 * @param PT Psi term {@link psiTerm}
 * @param TT Temperature term {@link temperatureTerm}
 * @param eTmin saturation vapor pressure at the minimum daily air temperature, kPa {@link saturationVaporPressure}
 * @param eTmax saturation vapor pressure at the maximum daily air temperature, kPa {@link saturationVaporPressure}
 * @param ea actual vapor pressure, kPa {@link actualVaporPressure}
 * @returns wind term, mm d-1
 */
const windTerm = (PT: number, TT: number, eTmin: number, eTmax: number, ea: number) => {
	const es = (eTmin + eTmax) / 2
	return PT * TT * (es - ea)
}

/**
 * Radiation Term (ETrad)
 * @param Δ slope of saturation vapor curve {@link slopeOfSaturationVaporPressureCurve}
 * @param γ psychrometric constant, kPa °C-1 {@link psychrometricConstant}
 * @param u wind speed 2 m above the ground surface, m s-1
 * @param Rs the incoming solar radiation, MJ m-2 day-1
 * @param Tmin minimum daily air temperature, C
 * @param Tmax maximum daily air temperature, C
 * @param ea actual vapor pressure, kPa {@link actualVaporPressure}
 * @param z elevation, m
 * @param J number of the day in the year between 1 (1 January) and 365 or 366 (31 December)
 * @param φ latitude, rad
 * @returns
 */
const radiationTerm = (Δ: number, γ: number, u: number, Rs: number, Tmin: number, Tmax: number, ea: number, z: number, J: number, φ: number) => {
	const δ = solarDeclination(J)
	return deltaTerm(Δ, γ, u) * netRadiation(netShortWaveSolarRadiation(Rs), netOutgoingLongWaveSolarRadiation(Tmin, Tmax, ea, Rs, clearSkySolarRadiation(z, extraterrestrialRadiation(inverseRelativeDistanceEarthSun(J), sunsetHourAngle(φ, δ), φ, δ))))
}