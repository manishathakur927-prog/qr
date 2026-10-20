#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  printf 'Usage: %s <archive.zip>\n' "${0##*/}" >&2
  exit 2
fi

if ! command -v unzip >/dev/null 2>&1; then
  printf 'Error: unzip is not installed or not available in PATH.\n' >&2
  exit 127
fi

archive=$1
if [[ ! -f "$archive" ]]; then
  printf 'Error: archive not found: %s\n' "$archive" >&2
  exit 1
fi

unzip "$archive" -d .
