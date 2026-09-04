FROM python:3.13.3-slim

RUN pip install --no-cache-dir pipenv

WORKDIR /video_recorder_service

COPY Pipfile.lock Pipfile ./

RUN pipenv install --system --deploy --ignore-pipfile --clear

COPY . .

RUN rm -f Pipfile.lock && rm -f Pipfile

RUN apt-get update \
    && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["tini", "--", "./entrypoint.sh"]
