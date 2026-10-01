FROM python:3.13-slim

WORKDIR /app

COPY . /app

ENV PYTHONUNBUFFERED=1 \
    FORCE_HOST=0.0.0.0 \
    FORCE_PORT=8080 \
    FORCE_AUTO_OPEN=0 \
    FORCE_PUBLIC=1

EXPOSE 8080

CMD ["python", "force_server.py"]
