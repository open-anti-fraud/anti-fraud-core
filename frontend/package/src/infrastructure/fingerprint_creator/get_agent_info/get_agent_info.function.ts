import { getInfoOrEmptyDataAfterTimeout, getValueFromAwaitedPromise } from '../helpers';
import { DEFAULT_USER_AGENT_DATA } from './get_agent_info.const';
import { UserAgentData } from './get_agent_info.types';

export default async function getAgentInfo(timeout: number) {
    const data = await Promise.allSettled([
        getUserAgent(timeout),
        getUserAgentData(timeout),
        getIsBotActivity(timeout),
        getIsCookieEnabled(timeout),
        getVendor(timeout),
    ]);

    return {
        userAgent: getValueFromAwaitedPromise(data[0]),
        ...(getValueFromAwaitedPromise(data[1]) ?? DEFAULT_USER_AGENT_DATA),
        isBotActivity: getValueFromAwaitedPromise(data[2]),
        cookieEnabled: getValueFromAwaitedPromise(data[3]),
        vendor: getValueFromAwaitedPromise(data[4]),
    };
}

async function getUserAgent(timeout = 2000) {



    return getInfoOrEmptyDataAfterTimeout<string | undefined>(timeout, () => navigator.userAgent, undefined);
}

async function getUserAgentData(timeout = 2000) {
    return getInfoOrEmptyDataAfterTimeout<UserAgentData>(
        timeout,
        () =>
            'userAgentData' in navigator
                ? // @ts-ignore
                  navigator.userAgentData
                      .getHighEntropyValues([
                          'model',
                          'platformVersion',
                          'architecture',
                          'bitness',
                          'wow64',
                          'formFactor',
                          'fullVersionList',
                      ])
                      .then(
                          ({
                              mobile,
                              platform,
                              platformVersion,
                              architecture,
                              bitness,
                              wow64,
                              formFactor,
                              fullVersionList,
                          }: UserAgentData) =>
                              ({
                                  mobile,
                                  platform,
                                  platformVersion,
                                  architecture,
                                  bitness,
                                  wow64,
                                  formFactor,
                                  fullVersionList,
                              }) as UserAgentData
                      )
                : undefined,
        DEFAULT_USER_AGENT_DATA
    );
}

async function getIsBotActivity(timeout = 2000) {


    return getInfoOrEmptyDataAfterTimeout<boolean | undefined>(timeout, () => navigator.webdriver, undefined);
}

async function getIsCookieEnabled(timeout = 2000) {

    return getInfoOrEmptyDataAfterTimeout<boolean | undefined>(timeout, () => navigator.cookieEnabled, undefined);
}

async function getVendor(timeout = 2000) {
    // Deprecated

    return getInfoOrEmptyDataAfterTimeout<string | undefined>(timeout, () => navigator.vendor, undefined);
}
