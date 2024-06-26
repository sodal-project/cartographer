include .env

IMAGE ?= sodal/cartographer-mvp
VNUM ?= v0.0.3

run-local:
	echo "Running for environment ${ENV}"
	docker-compose -f docker-compose.yml up

build-amd64:
	docker build -t ${IMAGE}:${VNUM}-amd64 --platform=linux/amd64 .

push-amd64:
	docker push ${IMAGE}:${VNUM}-amd64



