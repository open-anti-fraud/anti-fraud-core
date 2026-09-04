export default class UUIDGenerator {
    generateUuid4() {
        return 'crypto' in window
            ? '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
                  (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16)
              )
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                  const r = (Math.random() * 16) | 0;
                  const v = c === 'x' ? r : (r & 0x3) | 0x8;
                  return v.toString(16);
              });
    }
}
