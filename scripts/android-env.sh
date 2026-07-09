# android-env.sh — source this to put the Android SDK tools on your PATH.
#
#   source scripts/android-env.sh
#
# Assumes the SDK was bootstrapped by scripts/setup-android-sdk.sh into
# ./android_sdk (git-ignored). Safe to source from any working directory.

# Resolve repo root from this file's location (works when sourced).
_android_env_src="${BASH_SOURCE[0]:-${(%):-%N}}"
_android_env_dir="$(cd "$(dirname "$_android_env_src")/.." && pwd)"

export ANDROID_HOME="${ANDROID_HOME:-$_android_env_dir/android_sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

unset _android_env_src _android_env_dir

if command -v sdkmanager >/dev/null 2>&1; then
  echo "Android SDK on PATH (ANDROID_HOME=$ANDROID_HOME)"
else
  echo "warning: sdkmanager not found; run scripts/setup-android-sdk.sh first" >&2
fi
