import { getInfoOrEmptyDataAfterTimeout, getValueFromAwaitedPromise } from '../helpers';
import { apiKeys, audioCodecs, inputAvailableAttributes, inputTypes } from './html5Features.json';

import { TAudioInfo, TAvailableAPIInfo, TInputInfo } from './types';

export default async function getHTML5Info(waitTime: number) {
    const data = await Promise.allSettled([
        getInfoOrEmptyDataAfterTimeout<TAudioInfo>(waitTime, HTML5AudioInfo, {}),
        getInfoOrEmptyDataAfterTimeout<TAvailableAPIInfo>(waitTime, HTML5AvailableAPIInfo, {}),
        getInfoOrEmptyDataAfterTimeout<TInputInfo>(waitTime, HTML5InputInfo, {}),
    ]);

    return {
        audioInfo: getValueFromAwaitedPromise(data[0]),
        availableAPIInfo: getValueFromAwaitedPromise(data[1]),
        inputInfo: getValueFromAwaitedPromise(data[2]),
    };
}

function HTML5AudioInfo(): TAudioInfo {
    const audio = document.createElement('audio');
    return audioCodecs.reduce((res: { [x: string]: boolean }, codec) => {
        res[codec] = !!audio.canPlayType(codec);
        return res;
    }, {});
}

function HTML5AvailableAPIInfo(): TAvailableAPIInfo {
    return apiKeys.reduce((res, key) => {
        // @ts-ignore
        res[key] = !!window[key];
        return res;
    }, {});
}

function HTML5InputInfo(): TInputInfo {
    const input = document.createElement('input');
    return {
        inputTypes: inputTypes.reduce((res: { [x: string]: boolean }, type) => {
            input.setAttribute('type', type);
            res[type] = input.type === type;
            return res;
        }, {}),
        inputAvailableAttributes: inputAvailableAttributes.reduce((res: { [x: string]: boolean }, attribute) => {
            res[attribute] = attribute in input;
            return res;
        }, {}),
    };
}
