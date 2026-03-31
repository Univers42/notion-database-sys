SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := dev

NODE_STAMP := node_modules/.package-lock-stamp
WASM_OUTPUT := src/lib/engine/pkg/formula_engine.js
ENGINE_SOURCES := $(shell find src/lib/engine/src -type f | sort)

.PHONY: dev deps wasm doctor help

dev: $(NODE_STAMP) $(WASM_OUTPUT)
	@bash scripts/run-with-node.sh npm run dev

deps: $(NODE_STAMP) $(WASM_OUTPUT)

wasm: $(WASM_OUTPUT)

doctor:
	@bash scripts/run-with-node.sh node -v
	@bash scripts/run-with-node.sh npm -v
	@bash scripts/ensure-rust.sh
	@PATH="$$HOME/.cargo/bin:$$PATH" rustc --version
	@PATH="$$HOME/.cargo/bin:$$PATH" cargo --version
	@PATH="$$HOME/.cargo/bin:$$PATH" wasm-pack --version

help:
	@printf '%s\n' \
		'make           Install missing dependencies, ensure pkg/, and start Vite' \
		'make dev       Same as default target' \
		'make deps      Install/update project dependencies without starting Vite' \
		'make wasm      Build src/lib/engine/pkg only when Rust inputs changed' \
		'make doctor    Print the toolchain versions used by the project'

$(NODE_STAMP): package.json package-lock.json .nvmrc scripts/common.sh scripts/run-with-node.sh
	@mkdir -p node_modules
	@bash scripts/run-with-node.sh npm install
	@touch $@

$(WASM_OUTPUT): src/lib/engine/Cargo.toml src/lib/engine/Cargo.lock scripts/common.sh scripts/ensure-rust.sh scripts/build-wasm.sh $(ENGINE_SOURCES)
	@bash scripts/build-wasm.sh