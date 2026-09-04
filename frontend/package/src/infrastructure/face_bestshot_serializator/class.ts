import { convertImageBitmapToArrayBuffer } from '../../shared';

export default class FaceBestshotSerializator {
    async serialize(
        videoId: string,
        frameIndex: number | undefined,
        frame: ImageBitmap,
        yaw: number,
        pitch: number,
        quality: number
    ) {
        const uuidBuffer = this._uuidSerialization(videoId);
        const indexBuffer = this._frameIndexSerialization(frameIndex ?? 0);
        const angleBuffer = this._anglesSerialization(yaw, pitch);
        const frameBuffer = await convertImageBitmapToArrayBuffer(frame, quality);


        const totalLength =
            uuidBuffer.byteLength + indexBuffer.byteLength + angleBuffer.byteLength + frameBuffer.byteLength;

        const result = new Uint8Array(totalLength);
        let offset = 0;
        result.set(uuidBuffer, offset);
        offset += uuidBuffer.byteLength;
        result.set(indexBuffer, offset);
        offset += indexBuffer.byteLength;
        result.set(new Uint8Array(angleBuffer), offset);
        offset += angleBuffer.byteLength;
        result.set(new Uint8Array(frameBuffer), offset);

        return result.buffer;
    }

    private _uuidSerialization(videoId: string) {
        return new TextEncoder().encode(videoId.replace(/-/g, ''));
    }

    private _frameIndexSerialization(frameIndex: number) {
        const indexBuffer = new Uint8Array(4);
        const view = new DataView(indexBuffer.buffer);
        view.setUint32(0, frameIndex);
        return indexBuffer;
    }

    private _anglesSerialization(yaw: number, pitch: number) {
        const angleBuffer = new ArrayBuffer(4);
        const view = new DataView(angleBuffer);
        view.setInt16(0, Math.round(yaw), false);
        view.setInt16(2, Math.round(pitch), false);
        return angleBuffer;
    }

    public async convertImageBitmapToBase64(frame: ImageBitmap, quality: number = 50) {
        const offscreen = new OffscreenCanvas(frame.width, frame.height);
        const ctx = offscreen.getContext('2d');
        ctx?.drawImage(frame, 0, 0);

        const imageData = await offscreen.convertToBlob({
            type: 'image/jpeg',
            quality: quality / 100,
        });

        return new Promise<string | Error>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(imageData);
        });
    }
}
