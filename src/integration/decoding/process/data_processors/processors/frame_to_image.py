from io import BytesIO
from pickle import loads
from typing import Optional

import cv2
import numpy as np
from PIL import Image

from integration.decoding.messages import ProcessMessage, MessageTypes
from integration.decoding.process.data_processors.processors.interface import MessageProcessor
from integration.decoding.utils import pixel_format_to_cv_conversion, send_to_shared_memory
from settings import IMAGE_FORMAT, IMAGE_COMPRESS_LEVEL


class FrameToImageProcessor(MessageProcessor):
    def clear_session(self, session_id: str, rack: Optional[str] = None, auto_clear: Optional[bool] = False):
        # no session realized in this processor
        pass

    @MessageProcessor.check_message_type
    def process_message(self, message: ProcessMessage):
        self._logger.info(f"{message.session_id}|FtI|Handle message")

        image_buffer = BytesIO()
        frame = loads(message.data)

        try:
            pixels = np.frombuffer(frame.data, frame.data_type.value)
            pixels = pixels.reshape(*frame.shape)

            if (convert_flag := pixel_format_to_cv_conversion.get(frame.pixel_format)) is not None:
                bgr_image = cv2.cvtColor(pixels, convert_flag)
            else:
                bgr_image = pixels

            img = Image.fromarray(bgr_image.astype('uint8'))

            exif_kwargs = {}
            if frame.exif is not None:
                exif = img.getexif()
                exif.update(frame.exif)
                exif_kwargs['exif'] = exif

            img.save(
                image_buffer,
                format=IMAGE_FORMAT,
                compress_level=IMAGE_COMPRESS_LEVEL,
                **exif_kwargs
            )

            img_bytes = image_buffer.getvalue()

            send_to_shared_memory(
                self._client_pipe,
                self._client_shared_memory,
                ProcessMessage(
                    type=MessageTypes.data,
                    correlation_id="none",
                    data=img_bytes,
                    rack=message.rack
                )
            )

        finally:
            image_buffer.close()