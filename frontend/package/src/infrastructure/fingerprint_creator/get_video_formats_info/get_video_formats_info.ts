import {
    getInfoOrEmptyDataAfterTimeout,
    getValueFromAwaitedPromise,
} from '../helpers';
import {
    pixelFormats,
    videoCodecs,
    videoContainer,
} from './get_video_formats_info.const';

export default async function getVideoFormatsInfo(timeout = 2000) {
    const data = await Promise.allSettled([
        getVideoContainersInfo(timeout),
        getVideoCodecsInfo(timeout),
        getVideoInfo(timeout),
        getPixelFormatInfo(timeout),
    ]);

    return {
        containers: getValueFromAwaitedPromise(data[0]),
        codecs: getValueFromAwaitedPromise(data[1]),
        combinations: getValueFromAwaitedPromise(data[2]),
        pixelFormat: getValueFromAwaitedPromise(data[3]),
    };
}

async function getVideoContainersInfo(timeout: number) {
    return getInfoOrEmptyDataAfterTimeout<{
        [key: string]: boolean | undefined;
    }>(
        timeout,
        new Promise((resolve, reject) => {
            try {
                const supportVideoContainer: {
                    [key: string]: boolean | undefined;
                } = {};
                videoContainer.forEach((item) => {
                    supportVideoContainer[item] =
                        MediaRecorder?.isTypeSupported(`video/${item}`);
                });

                resolve(supportVideoContainer);
            } catch (err) {
                reject(err);
            }
        }),
        {}
    );
}

async function getVideoCodecsInfo(timeout: number) {
    return getInfoOrEmptyDataAfterTimeout<{
        [key: string]: boolean | undefined;
    }>(
        timeout,
        new Promise(async (resolve, reject) => {
            try {
                const supportedCodecs: { [key: string]: boolean | undefined } =
                    {};

                for (let i = 0; i < videoCodecs.length; i++) {
                    const codec = videoCodecs[i];

                    try {
                        const { supported } =
                            await VideoEncoder?.isConfigSupported({
                                codec,
                                width: 600,
                                height: 480,
                                bitrate: 1_000_000,
                                framerate: 25,
                            });
                        supportedCodecs[codec] = !!supported;
                    } catch {
                        supportedCodecs[codec] = undefined;
                    }
                }

                resolve(supportedCodecs);
            } catch (err) {
                reject(err);
            }
        }),
        {}
    );
}

async function getVideoInfo(timeout: number) {
    return getInfoOrEmptyDataAfterTimeout<{
        [key: string]: boolean | undefined;
    }>(
        timeout,
        new Promise((resolve, reject) => {
            try {
                const combinations = videoContainer
                    .map((format) =>
                        videoCodecs.map(
                            (codec) => `video/${format}; codec='${codec}'`
                        )
                    )
                    .flat();

                const supportedCombination: { [key: string]: boolean } =
                    combinations.reduce(
                        (res, format) => {
                            res[format] =
                                MediaRecorder?.isTypeSupported(format);
                            return res;
                        },
                        {} as { [key: string]: boolean }
                    );

                resolve(supportedCombination);
            } catch (err) {
                reject(err);
            }
        }),
        {}
    );
}

async function getPixelFormatInfo(timeout: number) {
    return getInfoOrEmptyDataAfterTimeout<{
        [key: string]: boolean | undefined;
    }>(
        timeout,

        new Promise((resolve, reject) => {
            try {
                const supportedPixelFormats: { [key: string]: boolean } =
                    pixelFormats.reduce(
                        (res, format) => {
                            try {
                                // @ts-ignore
                                const frame = new VideoFrame(
                                    new Uint8Array(1280 * 720 * 4),
                                    {
                                        format,
                                        codedWidth: 600,
                                        codedHeight: 480,
                                        timestamp: 0,
                                    }
                                );
                                res[format] = true;
                                frame.close();
                            } catch (err) {
                                res[format] = false;
                            }

                            return res;
                        },
                        {} as { [key: string]: boolean }
                    );

                resolve(supportedPixelFormats);
            } catch (err) {
                reject(err);
            }
        }),
        {}
    );
}
