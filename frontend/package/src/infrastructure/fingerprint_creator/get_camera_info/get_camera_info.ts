import { getInfoOrEmptyDataAfterTimeout } from '../helpers';

export default async function getCameraInfo(
    availableStreams: MediaDeviceInfo[],
    videoTrack: MediaStreamTrack,
    timeout = 2000
) {
    return getInfoOrEmptyDataAfterTimeout<object>(
        timeout,
        new Promise<object>(async (resolve, reject) => {
            try {
                const trackSettings = videoTrack.getSettings();

                const selectedCamera = availableStreams.find((item) => trackSettings?.deviceId === item.deviceId);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const resAvailableCameras: string[] = [];
                availableStreams.forEach((item) => {
                    resAvailableCameras.push(item?.label);
                });

                let capabilities;
                try {
                    capabilities = videoTrack?.getCapabilities();
                } catch (err) {
                    console.error(err);
                }

                let constraints;
                try {
                    constraints = videoTrack?.getConstraints();
                } catch (err) {
                    console.error(err);
                }

                resolve({
                    selectedCamera: {
                        label: selectedCamera?.label,





                        deviceId: selectedCamera?.deviceId,




                        groupId: selectedCamera?.groupId,


                        settings: trackSettings,


                        capabilities,
                        constraints,
                    },


                    availableCameras: resAvailableCameras,
                });
            } catch (err) {
                reject(err);
            }
        }),
        {
            selectedCamera: {
                label: undefined,
                deviceId: undefined,
                groupId: undefined,
                settings: undefined,
                capabilities: undefined,
            },
            availableCameras: undefined,
        }
    );
}
