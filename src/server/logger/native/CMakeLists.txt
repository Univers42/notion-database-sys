# ── CMakeLists.txt for libcpp_logger N-API native addon ───────────────────────
# Built with cmake-js: npx cmake-js compile -d src/server/logger/native
#
# This links against the full libcpp library (libftpp.a) which provides:
#   - core::Observer<TEvent>    (observer pattern)
#   - log::ILogger + decorators (logger + timestamp/color decorators)
#   - TermStyle + StyleSheet    (terminal styling + dracula theme)
#   - TermWriter               (buffered markdown-to-terminal renderer)
#   - Srgb                     (24-bit color)
# ──────────────────────────────────────────────────────────────────────────────

cmake_minimum_required(VERSION 3.14)
project(libcpp_logger LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# ── Find required packages ────────────────────────────────────────────────────
find_package(Threads REQUIRED)

# ── cmake-js integration ─────────────────────────────────────────────────────
# cmake-js injects CMAKE_JS_INC and CMAKE_JS_LIB at configure time.
include_directories(${CMAKE_JS_INC})

# ── libcpp (libftpp) ─────────────────────────────────────────────────────────
set(LIBCPP_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../../../lib/libcpp")
set(LIBCPP_INCLUDE "${LIBCPP_ROOT}/include")

# Glob all libcpp source files — build them directly into the addon
# (avoids a separate pre-build step for the .a file)
file(GLOB_RECURSE LIBCPP_SOURCES "${LIBCPP_ROOT}/src/*.cpp")

# ── node-addon-api (header-only) ─────────────────────────────────────────────
# cmake-js sets NODE_ADDON_API_DIR if node-addon-api is available
execute_process(
  COMMAND node -p "require('node-addon-api').include"
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
  OUTPUT_VARIABLE NODE_ADDON_API_DIR
  OUTPUT_STRIP_TRAILING_WHITESPACE
)
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})

# ── The native addon ─────────────────────────────────────────────────────────
add_library(libcpp_logger SHARED
  binding.cpp
  ${LIBCPP_SOURCES}
)

target_include_directories(libcpp_logger PRIVATE
  ${LIBCPP_INCLUDE}
  ${NODE_ADDON_API_DIR}
  ${CMAKE_JS_INC}
)

target_link_libraries(libcpp_logger
  ${CMAKE_JS_LIB}
  Threads::Threads
)

# N-API does not use exceptions by default; node-addon-api needs this
target_compile_definitions(libcpp_logger PRIVATE NAPI_DISABLE_CPP_EXCEPTIONS)

# cmake-js expects the output to be a .node file
set_target_properties(libcpp_logger PROPERTIES
  PREFIX ""
  SUFFIX ".node"
)
