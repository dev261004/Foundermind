```
cd foundermind_backend
```

```
poetry run celery -A foundermind_backend worker --loglevel=info
```

# Command to start Redis
```
docker compose up -d
```

# Verify Redis is running

```
docker compose ps
```

#Test connection (very useful for Celery)

```
docker exec -it <container_name> redis-cli ping
```

