



import { getInfoOrEmptyDataAfterTimeout } from '../helpers';

export default async function getGeolocationInfo(timeout: number) {
	return getInfoOrEmptyDataAfterTimeout<object | undefined>(
		timeout,
		new Promise((resolve, reject) => {
			navigator.geolocation.getCurrentPosition(
				(data) => {
					resolve({

						latitude: data.coords.latitude,

						longitude: data.coords.longitude,

						accuracy: data.coords.accuracy,

						altitude: data.coords.altitude,

						altitudeAccuracy: data.coords.altitudeAccuracy,

						heading: data.coords.heading,

						speed: data.coords.speed,

						timestamp: data.timestamp,
						datetime: formatTimestamp(data.timestamp),
					});
				},
				(err) => {
					reject(err);
				},
				{
					enableHighAccuracy: true,
					timeout: timeout,
					// maximumAge: 0,
				}
			);
		}),
		undefined
	);
}

function formatTimestamp(timestamp: number) {
	const localeDate = new Intl.DateTimeFormat('en-GB', {
		dateStyle: 'full',
		timeStyle: 'long',
	});

	return localeDate.format(new Date(timestamp));
}
