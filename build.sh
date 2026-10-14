docker build -t tamilmv-indexer-proxy:test .
docker run --rm -p 5000:5000 -v "$PWD/testdb:/app/database" tamilmv-indexer-proxy:test