/**
 * @typedef {Object} Infrastructure
 * @property {number} police
 * @property {number} hospitals
 * @property {number} metro
 * @property {number} commercial
 * @property {number} busStops
 * @property {number} pharmacies
 * @property {number} fireStations
 * @property {number} petrolPumps
 * @property {number} trafficSignals
 * @property {number} schools
 * @property {number} parks
 * @property {number} banks
 */

/**
 * @typedef {Object} Lighting
 * @property {number} score
 * @property {string} label
 */

/**
 * @typedef {Object} RouteAnalysis
 * @property {string} id
 * @property {string} distance
 * @property {string} duration
 * @property {number} score
 * @property {number} confidence
 * @property {Object} geometry
 * @property {Infrastructure} infrastructure
 * @property {Lighting} lighting
 * @property {string} explanation
 */

module.exports = {};
