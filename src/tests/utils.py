import os
import sys
from unittest.mock import Mock


def set_up_env():
    os.environ["APP_VERSION"] = "test"
    os.environ["ENABLE_IMAGE_API"] = "0"

    # disable db connection
    sys.modules['integration.database.managers'] = Mock()