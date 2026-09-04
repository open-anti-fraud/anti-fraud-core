import asyncio
import time
import uuid

from core.business_logic.types import VideoContainer, VideoCodec, PixelFormat
from integration.decoding.process_manager import DecodingProcessManager, CPUCommands


# async def async_main():
#     dpm = DecodingProcessManager(2)
#     try:
#         cpc = CPUCommands(dpm)
#         with open('/home/stranger/Downloads/video_webm_vr.videos_3Amotion_control_video-25-09-01-11_20_20-no-parent-605c5.webm_blob_http___video-recorder.webm', 'rb') as video:
#             images = await cpc.decode_video_to_images(video.read())
#
#             for i, image in enumerate(images):
#                 with open(f"./test_chunk/images/{i}.jpeg", 'wb') as img:
#                     img.write(image)
#     finally:
#         dpm.stop_processes()

async def encode_video(cpc: CPUCommands):
    async with cpc.cast_packets_to_video(
            str(uuid.uuid4()),
            VideoContainer.webm,
            VideoCodec.vp8,
            PixelFormat.yuv420p,
            (1280, 720),
            1_000_000,
            30
    ) as result_tuple:
        work_function, result_list = result_tuple
        packet_buffer = []
        buffer_length = 25

        encode_time = time.time()
        for i in range(223):
            with open(f'./test_chunk/full_chunks/frame_{i}.bin', 'rb') as frame:
                packet_buffer.append(frame.read())
                if len(packet_buffer) >= buffer_length:
                    await work_function(packet_buffer)
                    packet_buffer = []
            # emulate video transferring in time
            await asyncio.sleep(0.015)
        if len(packet_buffer) > 0:
            await work_function(packet_buffer)
            del packet_buffer

        return time.time() - encode_time

async def async_main():
    dpm = DecodingProcessManager(70)
    try:
        cpc = CPUCommands(dpm)

        simult_funcs = []
        for i in range(600):
            simult_funcs.append(encode_video(cpc))

        result = await asyncio.gather(*simult_funcs)

        print(sum(result) / len(result))



    finally:
        dpm.stop_processes()

asyncio.run(async_main())

# 1 - 7.467311382293701
# 2 - 7.540944337844849
# 5 - 7.634355926513672
# 10 - 7.626032924652099
# 20 - 7.745409989356995
# 40 - 7.942631077766419