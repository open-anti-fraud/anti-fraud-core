export function dataURLtoBlob(dataUrl: string) {
    const [meta, base64] = dataUrl.split(',');
    if (!meta || !base64) throw new Error('Invalid base64 string');

    const mime = meta.match(/:(.*?);/);
    if (!mime) throw new Error('No mime type data');

    const binary = atob(base64);
    const array = [];

    for (let i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }

    return new Blob([new Uint8Array(array)], { type: mime[1] });
}
