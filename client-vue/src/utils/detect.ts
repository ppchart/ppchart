const detectOS = () => {
    const ua = window.navigator.userAgent;
    const detectOther = {
        desktop: false,
        ios: null as null | RegExpMatchArray,
        android: ua.match(/(Android)\s+([\d.]+)/),
        tablet: /^(?=.*Android)(?!.*Mobile).*/.test(ua),
        ipod: /(iPod).*OS\s([\d_]+)/.test(ua),
        ipad: ua.match(/(iPad).*OS\s([\d_]+)/),
        iphone: ua.match(/(iPhone\sOS)\s([\d_]+)/),
        webkit: /WebKit\/([\d.]+)/.test(ua),
        iosVersion: null as null | string,
        androidVersion: null as null | string,
        blackberry: /^(?=.*BB10; Touch).*Version\/([0-9]+\.[0-9])/.test(ua),
    };

    detectOther.ios = detectOther.ipad || detectOther.iphone;
    detectOther.desktop = !(detectOther.ios || detectOther.android || detectOther.tablet || detectOther.ipod || detectOther.blackberry);

    if (detectOther.ios) {
        const [iosVersion] = detectOther.ios[2].split('_');
        detectOther.iosVersion = iosVersion
    }
    if (detectOther.android) {
        const [androidVersion] = (detectOther.android as RegExpMatchArray)[2].split('.');
        detectOther.androidVersion = androidVersion
    }
    return detectOther;
}

export const os = detectOS();