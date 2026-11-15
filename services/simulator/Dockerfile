FROM aegis-analytics
USER root
WORKDIR /app
COPY app ./simulator
USER aegis
CMD ["uvicorn","simulator.main:app","--host","0.0.0.0","--port","8001"]
