#!/bin/bash

set -e

if [[ $DISABLE_DATA_PERSISTENCE -eq 0 ]]
then
S3_DISABLE_INITIALIZATION=1 alembic upgrade head
fi

echo "ws timeout - $UVICORN_WS_TIMEOUT"

if [[ $ENABLE_MEMORY_TRACE -eq 1 ]]
then
memray run -o dump.bin -m gunicorn --bind $UVICORN_HOST:$UVICORN_PORT -w 1 -k main.CustomUvicornWorker main:app
else
gunicorn --bind $UVICORN_HOST:$UVICORN_PORT -w 1 -k main.CustomUvicornWorker --keep-alive 5 main:app
fi
