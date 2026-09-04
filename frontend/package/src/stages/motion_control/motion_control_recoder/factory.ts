import { VideoRecordingApi } from '../../../shared';
import { Props } from './class';
import { motionControlChunksRecoderFactory } from './motion_control_chunks_recoder';
import { motionControlPacketsRecoderFactory } from './motion_control_packets_recoder';

export default async function motionControlRecoderFactory(props: Props) {
    const { clientServerConnectionSettings } = props.model;

    try {
        const recoder =
            clientServerConnectionSettings.videoRecordingApi === VideoRecordingApi.WEB_CODEC
                ? motionControlPacketsRecoderFactory(props)
                : motionControlChunksRecoderFactory(props);

        await recoder.initRecoder();
        return recoder;
    } catch (err) {
        if (!clientServerConnectionSettings.switchToMediaRecoderApiAsFallback) {
            throw err;
        } else {
            const recoder = motionControlChunksRecoderFactory(props);
            await recoder.initRecoder();
            return recoder;
        }
    }
}
