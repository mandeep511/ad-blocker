#!/bin/bash
# Download baseline filter lists for bundling with the extension

BUNDLED_DIR="filters/bundled"
mkdir -p "$BUNDLED_DIR"

echo "Downloading EasyList..."
curl -sL "https://easylist.to/easylist/easylist.txt" -o "$BUNDLED_DIR/easylist.txt"

echo "Downloading EasyPrivacy..."
curl -sL "https://easylist.to/easylist/easyprivacy.txt" -o "$BUNDLED_DIR/easyprivacy.txt"

echo "Downloading uBlock Filters (Ads)..."
curl -sL "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt" -o "$BUNDLED_DIR/ublock-ads.txt"

echo "Done. Filter list sizes:"
wc -l "$BUNDLED_DIR"/*.txt
