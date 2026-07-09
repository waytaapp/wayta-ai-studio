#!/usr/bin/env bash
#
# setup-android-sdk.sh
#
# Bootstraps the Android SDK command-line tools into ./android_sdk so that
#
#     android_sdk/cmdline-tools/latest/bin/sdkmanager --install "cmdline-tools;<version>"
#
# can be run. The android_sdk/ directory is git-ignored (see .gitignore); this
# script reproduces it from scratch on any machine or CI/web session.
#
# Requirements: bash, curl, unzip, and a JDK (JAVA_HOME set or `java` on PATH).
# JDK 17+ is recommended for recent command-line tools.
#
# Usage:
#   ./scripts/setup-android-sdk.sh                  # bootstrap + accept licenses
#   ./scripts/setup-android-sdk.sh --no-licenses    # bootstrap only
#
# After running, either `source scripts/android-env.sh` or export:
#   export ANDROID_HOME="$(pwd)/android_sdk"
#   export ANDROID_SDK_ROOT="$ANDROID_HOME"
#   export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

set -euo pipefail

# --- config ---------------------------------------------------------------
# Pin the command-line tools bootstrap package. Update the URL/version to move
# to a newer bootstrap; sdkmanager itself can then fetch any other version.
CMDLINE_TOOLS_ZIP_URL="${CMDLINE_TOOLS_ZIP_URL:-https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip}"

# Repo root = parent of this script's directory.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ANDROID_HOME="${ANDROID_HOME:-$REPO_ROOT/android_sdk}"
CMDLINE_DIR="$ANDROID_HOME/cmdline-tools"
LATEST_DIR="$CMDLINE_DIR/latest"

ACCEPT_LICENSES=1
[[ "${1:-}" == "--no-licenses" ]] && ACCEPT_LICENSES=0

# --- sanity checks --------------------------------------------------------
command -v curl  >/dev/null 2>&1 || { echo "error: curl is required" >&2; exit 1; }
command -v unzip >/dev/null 2>&1 || { echo "error: unzip is required" >&2; exit 1; }
if ! command -v java >/dev/null 2>&1 && [[ -z "${JAVA_HOME:-}" ]]; then
  echo "error: a JDK is required (set JAVA_HOME or put java on PATH)" >&2
  exit 1
fi

# --- bootstrap ------------------------------------------------------------
if [[ -x "$LATEST_DIR/bin/sdkmanager" ]]; then
  echo "sdkmanager already present at $LATEST_DIR/bin/sdkmanager"
else
  echo "Bootstrapping Android command-line tools into $ANDROID_HOME ..."
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT

  echo "  downloading $CMDLINE_TOOLS_ZIP_URL"
  curl -fsSL -o "$tmp_dir/cmdline-tools.zip" "$CMDLINE_TOOLS_ZIP_URL"

  echo "  extracting"
  unzip -q -o "$tmp_dir/cmdline-tools.zip" -d "$tmp_dir/extract"

  # The zip extracts to cmdline-tools/; sdkmanager expects it under
  # cmdline-tools/latest/ so it can self-update to newer versions.
  mkdir -p "$CMDLINE_DIR"
  rm -rf "$LATEST_DIR"
  mv "$tmp_dir/extract/cmdline-tools" "$LATEST_DIR"
  echo "  installed to $LATEST_DIR"
fi

export ANDROID_HOME
export ANDROID_SDK_ROOT="$ANDROID_HOME"
SDKMANAGER="$LATEST_DIR/bin/sdkmanager"

echo "sdkmanager version: $("$SDKMANAGER" --version 2>/dev/null || echo unknown)"

# --- licenses -------------------------------------------------------------
if [[ "$ACCEPT_LICENSES" -eq 1 ]]; then
  echo "Accepting SDK licenses ..."
  yes 2>/dev/null | "$SDKMANAGER" --licenses >/dev/null 2>&1 || true
  echo "Licenses accepted."
fi

cat <<EOF

Android SDK command-line tools are ready.

  sdkmanager: $SDKMANAGER
  ANDROID_HOME: $ANDROID_HOME

To use it in your shell:
  source "$SCRIPT_DIR/android-env.sh"

Example — the command this project targets:
  "$SDKMANAGER" --install "cmdline-tools;latest"

List available packages:
  "$SDKMANAGER" --list
EOF
