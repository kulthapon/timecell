FROM timecell-ai-base

WORKDIR /app

ENV PYTHONPATH="/app"

RUN apt-get update && apt-get install -y curl

COPY . .

RUN mkdir -p models

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]