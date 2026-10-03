#!/bin/zsh
set -euo pipefail
cd "${0:A:h}"

mode=release
architectures=("$(uname -m)")
for option in "$@"; do
    case "$option" in
        --test) mode=test ;;
        --universal) architectures=(arm64 x86_64) ;;
        *) print -u2 "Unknown option: $option"; exit 1 ;;
    esac
done

build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
app_path="build/$mode/ContinuityPhoto.app"
mkdir -p "$app_path/Contents/MacOS"
cp src/Info.plist "$app_path/Contents/Info.plist"
version=$(node -p 'require("./manifest.json").version')
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $version" "$app_path/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $version" "$app_path/Contents/Info.plist"

clang_flags=(-fobjc-arc -Wall -Wextra)
swift_flags=()
extra_objects=()
if [[ "$mode" == test ]]; then
    clang_flags+=(-DPHOTO_SIMULATION)
    swift_flags+=(-D PHOTO_SIMULATION)
fi

for architecture in "${architectures[@]}"; do
    target="$architecture-apple-macos12.0"
    xcrun clang -target "$target" "${clang_flags[@]}" -c src/ContinuityBridge.m -o "$build_dir/bridge-$architecture.o"
    if [[ "$mode" == test ]]; then
        xcrun clang -target "$target" "${clang_flags[@]}" -c tests/SimulatedRequest.m -o "$build_dir/simulation-$architecture.o"
        extra_objects=("$build_dir/simulation-$architecture.o")
    fi
    xcrun swiftc -target "$target" "${swift_flags[@]}" src/PhotoHelper.swift \
        "$build_dir/bridge-$architecture.o" "${extra_objects[@]}" \
        -import-objc-header src/ContinuityBridge.h -framework AppKit \
        -o "$build_dir/helper-$architecture"
done

binaries=("$build_dir"/helper-*)
xcrun lipo -create "${binaries[@]}" -output "$app_path/Contents/MacOS/ContinuityPhoto"
codesign --force --sign - "$app_path"
print "Built $app_path (${architectures[*]})"
