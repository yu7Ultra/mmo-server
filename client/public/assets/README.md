# MMO Game Assets

This directory contains all visual assets for the MMO game client.

## Quick Start

- **Asset Documentation**: See [ASSETS.md](./ASSETS.md) for comprehensive documentation
- **Asset Catalog**: See [assets-manifest.json](./assets-manifest.json) for complete metadata
- **Validation**: Run `node validate-assets.cjs` to verify asset integrity

## Structure

```
assets/
├── characters/      # 7 character sprites (64x64)
├── skills/          # 10 skill icons and effects (64x64 and 32x32)
├── ui/              # 8 UI elements (various sizes)
├── items/           # 8 item/equipment icons (32x32)
└── environment/     # 6 terrain tiles (32x32)
```

**Total**: 39 assets across 5 categories

## Current Status

⚠️ **Placeholder Assets**: The current assets are programmatically generated placeholders for development purposes.

For production use, replace with proper game assets. See [ASSETS.md](./ASSETS.md#recommended-production-asset-sources) for recommended sources.

## Validation

All assets have been validated:
- ✅ All 39 assets are present and valid PNG files
- ✅ Dimensions match specifications
- ✅ Complete metadata in manifest
- ✅ No orphaned files

Run validation:
```bash
node validate-assets.cjs
```

## License

**Placeholder Assets**: CC0 1.0 Universal (Public Domain)  
**Production Assets**: See individual licenses in assets-manifest.json

## Documentation

For detailed information, see [ASSETS.md](./ASSETS.md).
