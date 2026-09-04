from typing import Tuple

from utils.exceptions import WrongS3Link


def generate_s3_link(bucket_name, file_name) -> str:
    return f"{bucket_name}:{file_name}"


def parse_s3_link(s3_link) -> Tuple[str, str]:
    split = s3_link.split(':', 1)
    try:
        return split[0], split[1]
    except (KeyError, IndexError):
        raise WrongS3Link()
