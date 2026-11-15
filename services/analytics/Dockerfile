FROM python:3.11.13-slim-bookworm
ENV PYTHONUNBUFFERED=1 MPLCONFIGDIR=/tmp/matplotlib OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1
WORKDIR /app
COPY requirements.lock.txt ./
RUN pip install --no-cache-dir -r requirements.lock.txt && useradd -m aegis
COPY app ./app
COPY tests ./tests
USER aegis
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000"]
