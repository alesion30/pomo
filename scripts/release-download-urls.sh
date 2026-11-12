#!/usr/bin/env bash
# latest.json の各 URL を、同じ Release の asset の browser_download_url に置き換えて上げ直す。
set -euo pipefail
tag="$1"
dir="$(mktemp -d)"
trap 'rm -rf "$dir"' EXIT
gh release download "$tag" --pattern latest.json --dir "$dir"
gh api "repos/$GH_REPO/releases/tags/$tag" --jq '[.assets[] | {(.url): .browser_download_url}] | add' > "$dir/urls.json"
jq --slurpfile urls "$dir/urls.json" '.platforms |= map_values(.url = ($urls[0][.url] // .url))' "$dir/latest.json" > "$dir/fixed.json"
mv "$dir/fixed.json" "$dir/latest.json"
gh release upload "$tag" "$dir/latest.json" --clobber
jq -r '.platforms[].url' "$dir/latest.json"
