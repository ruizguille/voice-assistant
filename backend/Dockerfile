FROM python:3.12-slim as requirements-stage

WORKDIR /tmp

RUN pip install poetry
RUN poetry self add poetry-plugin-export
COPY ./pyproject.toml ./poetry.lock* /tmp/
RUN poetry export -f requirements.txt --output requirements.txt --without-hashes --without local 

FROM python:3.12-slim

WORKDIR /home

COPY --from=requirements-stage /tmp/requirements.txt /home/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /home/requirements.txt

COPY ./app /home/app

CMD ["fastapi", "run", "app/main.py", "--port", "80"]