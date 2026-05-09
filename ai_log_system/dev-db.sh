#!/bin/bash

echo "🚀 Starting PostgreSQL containers..."

docker run -d \
  --name event-receiver-pg \
  -p 5433:5432 \
  -e POSTGRES_DB=event_receiver_db \
  -e POSTGRES_USER=root \
  -e POSTGRES_PASSWORD=root \
  postgres:latest

docker run -d \
  --name event-analyzer-pg \
  -p 5434:5432 \
  -e POSTGRES_DB=event_analyzer_db \
  -e POSTGRES_USER=root \
  -e POSTGRES_PASSWORD=root \
  postgres:latest

docker run -d \
  --name solution-pg \
  -p 5435:5432 \
  -e POSTGRES_DB=solution_generator_db \
  -e POSTGRES_USER=root \
  -e POSTGRES_PASSWORD=root \
  postgres:latest

docker run -d \
  --name report-pg \
  -p 5436:5432 \
  -e POSTGRES_DB=report_generator_db \
  -e POSTGRES_USER=root \
  -e POSTGRES_PASSWORD=root \
  postgres:latest

echo "✅ All PostgreSQL containers started!"
``