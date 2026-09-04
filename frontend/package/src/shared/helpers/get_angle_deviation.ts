export default function getAngleDeviation(yaw: number, pitch: number) {
    const yawDeviation = Math.abs(yaw);
    const pitchDeviation = Math.abs(pitch);
    return yawDeviation + pitchDeviation;
}
