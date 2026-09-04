export async function convertImageBitmapToArrayBuffer(frame: ImageBitmap, quality: number = 50) {
    const offscreen = new OffscreenCanvas(frame.width, frame.height);
    const ctx = offscreen.getContext('2d');
    ctx?.drawImage(frame, 0, 0);
    const imageData = await offscreen.convertToBlob({
        type: 'image/jpeg',
        quality: quality / 100,
    });
    return await imageData.arrayBuffer();
}

export async function convertImageBitmapToBlob(frame: ImageBitmap, quality: number = 50) {
    const offscreen = new OffscreenCanvas(frame.width, frame.height);
    const ctx = offscreen.getContext('2d');
    ctx?.drawImage(frame, 0, 0);

    const blob = await offscreen.convertToBlob({
        type: 'image/jpeg',
        quality: quality / 100,
    });

    return blob;
}
