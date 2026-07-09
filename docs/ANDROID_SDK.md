# Android SDK command-line tools

This repo can bootstrap the Android SDK command-line tools locally so you can run
`sdkmanager`, `avdmanager`, `adb`, etc. The downloaded SDK lives in `android_sdk/`,
which is **git-ignored** — it is reproduced on demand, never committed.

## Requirements

- `bash`, `curl`, `unzip`
- A JDK (JDK 17+ recommended). Set `JAVA_HOME` or have `java` on your `PATH`.

## Setup

```bash
./scripts/setup-android-sdk.sh
```

This downloads the command-line tools into
`android_sdk/cmdline-tools/latest/` and accepts the SDK licenses. It is
idempotent — re-running it when the tools are already present is a no-op
(licenses are re-accepted). Pass `--no-licenses` to skip the license step.

Put the tools on your `PATH` for the current shell:

```bash
source scripts/android-env.sh
```

This exports `ANDROID_HOME` / `ANDROID_SDK_ROOT` and adds
`cmdline-tools/latest/bin`, `platform-tools`, and `emulator` to `PATH`.

## Installing packages

Once set up, the `sdkmanager` binary is at
`android_sdk/cmdline-tools/latest/bin/sdkmanager`. Install packages with:

```bash
# self-update / install a specific command-line-tools version
android_sdk/cmdline-tools/latest/bin/sdkmanager --install "cmdline-tools;latest"

# common Android build/runtime packages
android_sdk/cmdline-tools/latest/bin/sdkmanager --install \
  "platform-tools" \
  "platforms;android-35" \
  "build-tools;35.0.0"
```

List everything available (or already installed):

```bash
android_sdk/cmdline-tools/latest/bin/sdkmanager --list
android_sdk/cmdline-tools/latest/bin/sdkmanager --list_installed
```

The `cmdline-tools;<version>` values above come from `sdkmanager --list`;
`latest` currently resolves to `21.0`.

## Notes

- The bootstrap package URL is pinned in `scripts/setup-android-sdk.sh`
  (`CMDLINE_TOOLS_ZIP_URL`); override it via the environment to use a
  different bootstrap.
- `sdkmanager` requires the tools to live under `cmdline-tools/latest/` so it
  can self-update; the setup script places them there for you.
