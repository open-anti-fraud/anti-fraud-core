import { getInfoOrEmptyDataAfterTimeout, getValueFromAwaitedPromise } from '../helpers';

const connection =
    // @ts-expect-error
    navigator.connection ||
    // @ts-expect-error
    navigator.mozConnection ||
    // @ts-expect-error
    navigator.webkitConnection;

export default async function getConnectionInfo(timeout = 2000) {
    const data = await Promise.allSettled([
        getIpInfo(timeout),
        getDownlinkInfo(timeout),
        getDownlinkMaxInfo(timeout),
        getEffectiveConnectionTypeInfo(timeout),
        getRoundTripTimeInfo(timeout),
        getEnabledTrafficSavingsInfo(timeout),
    ]);

    return {
        ip: getValueFromAwaitedPromise(data[0]),
        downlink: getValueFromAwaitedPromise(data[1]),
        downlinkMax: getValueFromAwaitedPromise(data[2]),
        effectiveConnectionType: getValueFromAwaitedPromise(data[3]),
        roundTripTime: getValueFromAwaitedPromise(data[4]),
        enabledTrafficSavings: getValueFromAwaitedPromise(data[5]),
    };
}

async function getDownlinkInfo(timeout: number) {

    return getInfoOrEmptyDataAfterTimeout<string | undefined>(
        timeout,
        () => (!!connection && 'downlink' in connection ? `${connection.downlink} Mbps` : undefined),
        undefined
    );
}

async function getDownlinkMaxInfo(timeout: number) {
    return getInfoOrEmptyDataAfterTimeout<string | undefined>(
        timeout,
        () => (!!connection && 'downlinkMax' in connection ? `${connection.downlinkMax} Mbps` : undefined),
        undefined
    );
}

async function getEffectiveConnectionTypeInfo(timeout: number) {





    // https://developer.mozilla.org/en-US/docs/Glossary/Effective_connection_type
    return getInfoOrEmptyDataAfterTimeout<string | undefined>(
        timeout,
        () => (!!connection ? `${connection.effectiveType}` : undefined),
        undefined
    );
}

async function getRoundTripTimeInfo(timeout: number) {

    return getInfoOrEmptyDataAfterTimeout<string | undefined>(
        timeout,
        () => (!!connection && 'rtt' in connection ? `${connection.rtt} ms` : undefined),
        undefined
    );
}

async function getEnabledTrafficSavingsInfo(timeout: number) {

    return getInfoOrEmptyDataAfterTimeout<string | undefined>(
        timeout,
        () => (!!connection ? `${connection.saveData}` : undefined),
        undefined
    );
}

async function getIpInfo(timeout: number): Promise<string | undefined> {
    // @ts-ignore
    return getInfoOrEmptyDataAfterTimeout<string | undefined>(
        timeout,
        new Promise((resolve, reject) => {
            try {
                const ConnectionConstructor =
                    window.RTCPeerConnection ||
                    // @ts-expect-error
                    window.webkitRTCPeerConnection ||
                    // @ts-expect-error
                    window.mozRTCPeerConnection ||
                    // @ts-expect-error
                    window.msRTCPeerConnection;

                const connection = new ConnectionConstructor({
                    iceServers: [
                        { urls: "stun:stun.l.google.com:19302" },
                        { urls: "stun:stun1.l.google.com:19302" },
                        { urls: "stun:stun.nextcloud.com:3478" },
                        { urls: "stun:stun.services.mozilla.com:3478" }
                    ],
                });

                connection.onicecandidate = (e) => {
                    if (!e.candidate || e.candidate.type !== 'srflx') {
                        return;
                    }

                    const ip = extractIp(e.candidate.candidate);
                    if (ip) {
                        resolve(ip);
                        connection.close();
                    }
                };

                connection.createDataChannel('bl');

                try {
                    connection.createOffer().then((e) => {
                        connection.setLocalDescription(e);
                    });
                } catch (error) {
                    connection.createOffer(
                        (event) => {
                            connection.setLocalDescription(
                                event,
                                () => {},
                                () => {}
                            );
                        },
                        () => {}
                    );
                }
            } catch (err) {
                reject(err);
            }
        }),
        undefined
    );
}

const extractIp = (candidateString: string) => {
    try {
        // https://datatracker.ietf.org/doc/html/rfc5245#section-15.1
        if (candidateString.includes('typ srflx')) {
            const ips = IP_REGEXP.exec(candidateString.toLowerCase());
            if (ips && ips.length && ips.length > 1) {
                return ips[1];
            }
        }
    } catch (/* empty */ _a) {
        /* empty */
    }
    return false;
};

const IP_REGEXP =
    /([0-9]{1,3}(\.[0-9]{1,3}){3}|(([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))/;
