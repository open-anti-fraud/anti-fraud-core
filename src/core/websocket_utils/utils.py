from core.business_logic.types import VideoContainer

def check_webm(chunk: bytes) -> bool:
    # check that webm header is first 4 bytes
    return chunk[:4].hex().upper() == "1A45DFA3"

def check_mp4(chunk: bytes) -> bool:
    # check that first mp4 block have ftyp type
    return chunk[4:8] == b'ftyp'

check_func_mapping = {
    VideoContainer.webm: check_webm,
    VideoContainer.mp4: check_mp4
}

def check_start_video_chunk(chunk: bytes, video_container: VideoContainer) -> bool:
    return check_func_mapping[video_container](chunk)
