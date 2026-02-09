#!/bin/sh
# Start script for Railway - uses PORT env var
npx serve -s dist -l tcp://0.0.0.0:${PORT:-3000}
