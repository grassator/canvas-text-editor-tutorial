# Builds library for browser usage
build:
	node ./scripts/build.js

# Starts express server that serves stitched library
serve:
	node ./scripts/serve.js

# Runs Mocha test suite
test:
	@./node_modules/.bin/mocha -r should -r sinon

# These aren't real targets so we need to list them here
.PHONY: test build serve