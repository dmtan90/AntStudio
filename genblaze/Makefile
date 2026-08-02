.PHONY: install test lint build clean

install:
	npm install

build:
	node server/node_modules/typescript/lib/tsc.js -p tsconfig.json --noEmit

test: build

lint: build

clean:
	rm -rf dist/ node_modules/
