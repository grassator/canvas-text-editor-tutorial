# Builds library for browser usage
build:
	node ./scripts/build.js

# Starts express server that serves stitched library
serve:
	node ./scripts/serve.js

# These aren't real targets so we need to list them here
.PHONY: build serve