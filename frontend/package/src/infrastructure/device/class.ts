export default class Device {
    getDeviceUserAgent() {
        return window.navigator.userAgent;
    }

    saveDeviceUuidInStorage(uuid: string) {
        window.localStorage.setItem('deviceId', uuid);
    }

    getDeviceUuidFromStorage() {
        return window.localStorage.getItem('deviceId');
    }

    isSafariOnIOSDevice() {
        return this.isAppleDevice() && this.isSafariBrowser();
    }

    isAppleDevice() {
        // @ts-ignore
        const ua = navigator.userAgent || navigator.vendor || window.opera;

        // iOS (iPhone, iPad, iPod)
        // @ts-ignore
        const isiOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;


        const isMac = navigator.platform === 'MacIntel' && !navigator.maxTouchPoints;

        return isiOS || isMac;
    }

    isSafariBrowser() {
        const ua = navigator.userAgent;
        return (
            ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium') && !ua.includes('Edg')
        );
    }

    isAppleMobile() {
        // @ts-ignore
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        // @ts-ignore
        return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    }

    isMobile() {
        return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
}
