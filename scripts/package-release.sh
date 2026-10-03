#!/bin/zsh
set -euo pipefail
cd "${0:A:h:h}"

: "${CODESIGN_IDENTITY:?Set CODESIGN_IDENTITY to your Developer ID Application certificate name}"
: "${NOTARY_PROFILE:?Set NOTARY_PROFILE to a notarytool keychain profile}"
if [[ "$CODESIGN_IDENTITY" != "Developer ID Application:"* ]]; then
    print -u2 "Public releases require a Developer ID Application certificate."
    exit 1
fi

npm ci
npm run build
npm run format:check
npm run test:native
npm test
npm run build:helper

app_path=build/release/ContinuityPhoto.app
mkdir -p dist
codesign --force --options runtime --timestamp --sign "$CODESIGN_IDENTITY" "$app_path"
codesign --verify --deep --strict "$app_path"
ditto -c -k --keepParent "$app_path" dist/notarization.zip
xcrun notarytool submit dist/notarization.zip --keychain-profile "$NOTARY_PROFILE" --wait
xcrun stapler staple "$app_path"
xcrun stapler validate "$app_path"
spctl --assess --type execute --verbose "$app_path"
ditto -c -k --keepParent "$app_path" dist/ContinuityPhoto-macOS.zip
cp main.js manifest.json dist/
(cd dist && shasum -a 256 main.js manifest.json ContinuityPhoto-macOS.zip > SHA256SUMS)
print 'Release assets are in dist/'
