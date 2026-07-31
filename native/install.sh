#!/bin/zsh
set -euo pipefail
if [[ $# -ne 1 ]]; then
  print -u2 'Usage: ./install.sh <fixed-extension-id>'
  exit 64
fi
native_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$native_dir"
swift build -c release
host="$native_dir/.build/release/breadcrumbs-host"
extension_id="$1"
for base in \
  "$HOME/Library/Application Support/Google/Chrome" \
  "$HOME/Library/Application Support/Google/Chrome Dev" \
  "$HOME/Library/Application Support/Microsoft Edge" \
  "$HOME/Library/Application Support/Microsoft Edge Dev" \
  "$HOME/Library/Application Support/BraveSoftware/Brave-Browser"; do
  dir="$base/NativeMessagingHosts"
  mkdir -p "$dir"
  python3 - "$dir/dev.breadcrumbs.host.json" "$host" "$extension_id" <<'PY'
import json, sys
path, host, extension_id = sys.argv[1:]
with open(path, 'w') as f:
    json.dump({'name': 'dev.breadcrumbs.host', 'description': 'Breadcrumbs local companion', 'path': host, 'type': 'stdio', 'allowed_origins': [f'chrome-extension://{extension_id}/']}, f, indent=2)
PY
done
ln -sf "$native_dir/.build/release/breadcrumbsctl" "$native_dir/breadcrumbsctl"
print 'Installed Native Messaging manifests and breadcrumbsctl.'
