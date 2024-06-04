FROM python:3.12-slim as requirements-stage

WORKDIR /tmp

RUN pip install poetry
COPY ./pyproject.toml ./poetry.lock* /tmp/
RUN poetry export -f requirements.txt --output requirements.txt --without-hashes --without local 

FROM python:3.12-slim

WORKDIR /home

COPY --from=requirements-stage /tmp/requirements.txt /home/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /home/requirements.txt

COPY ./app /home/app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]