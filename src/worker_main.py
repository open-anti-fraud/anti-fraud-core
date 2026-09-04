import os
import socket

# suppress key error
os.environ["APP_VERSION"] = "worker"

from settings import RETENTION_SOCKET_FOLDER, RETENTION_WORKER_SOCKET_NAME
from core.background_tasks.content_retention import RetentionWorker

SOCKET_PATH = f"/{RETENTION_SOCKET_FOLDER}/{RETENTION_WORKER_SOCKET_NAME.format(os.environ["WORKER_INDEX"])}"

# recreate socket on process restart
if os.path.exists(SOCKET_PATH):
    os.remove(SOCKET_PATH)

sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
sock.bind(SOCKET_PATH)

# set timeout for all recv operations
sock.settimeout(2)
# limit connections queue to 1
sock.listen(1)

sock.setblocking(False)

RetentionWorker(sock).run()
