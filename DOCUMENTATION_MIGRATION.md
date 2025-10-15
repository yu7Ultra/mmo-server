# Documentation Migration Guide

This guide explains the new documentation structure for the MMO Server project.

## What Changed?

All documentation has been reorganized from the root directory into a structured `documents/` directory with language-specific subdirectories.

## New Structure

```
documents/
├── README.md                    # Main documentation index
├── en/                          # English documentation
│   ├── README.md                # English docs index
│   ├── FEATURES.md              # Feature documentation
│   ├── PERFORMANCE.md           # Performance guide
│   ├── USAGE_EXAMPLES.md        # Usage examples
│   ├── VOICE_INTEGRATION.md     # Voice integration guide
│   ├── VOICE_CLIENT_EXAMPLE.md  # Voice client examples
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── CLIENT_ENHANCEMENT_SUMMARY.md
│   └── VOICE_IMPLEMENTATION_SUMMARY.md
├── zh/                          # Chinese documentation (中文文档)
│   ├── README.md                # Chinese docs index
│   ├── CLIENT_README.md         # Client README (Chinese)
│   ├── CLIENT_FEATURES.md       # Client features guide
│   ├── CLIENT_USAGE_EXAMPLES.md # Client usage examples
│   ├── MINIPLEX_DOCS_CN.md      # Miniplex ECS docs
│   └── POWERSHELL_HELP.md       # PowerShell help
└── images/                      # Documentation images
    ├── README.md                # Image guidelines
    └── architecture-overview.svg # Architecture diagram
```

## File Mapping

### From Root to documents/en/

| Old Location (Root) | New Location |
|---------------------|--------------|
| `FEATURES.md` | `documents/en/FEATURES.md` |
| `PERFORMANCE.md` | `documents/en/PERFORMANCE.md` |
| `USAGE_EXAMPLES.md` | `documents/en/USAGE_EXAMPLES.md` |
| `VOICE_INTEGRATION.md` | `documents/en/VOICE_INTEGRATION.md` |
| `VOICE_CLIENT_EXAMPLE.md` | `documents/en/VOICE_CLIENT_EXAMPLE.md` |
| `IMPLEMENTATION_SUMMARY.md` | `documents/en/IMPLEMENTATION_SUMMARY.md` |
| `CLIENT_ENHANCEMENT_SUMMARY.md` | `documents/en/CLIENT_ENHANCEMENT_SUMMARY.md` |
| `VOICE_IMPLEMENTATION_SUMMARY.md` | `documents/en/VOICE_IMPLEMENTATION_SUMMARY.md` |

### From Root/Client to documents/zh/

| Old Location | New Location |
|--------------|--------------|
| `MINIPLEX_DOCS_CN.md` | `documents/zh/MINIPLEX_DOCS_CN.md` |
| `client/README.md` | `documents/zh/CLIENT_README.md` (also kept in client/) |
| `client/FEATURES.md` | `documents/zh/CLIENT_FEATURES.md` (also kept in client/) |
| `client/USAGE_EXAMPLES.md` | `documents/zh/CLIENT_USAGE_EXAMPLES.md` (also kept in client/) |
| `help.md` | `documents/zh/POWERSHELL_HELP.md` |

**Note**: Client documentation files remain in `client/` directory but now include references to the `documents/zh/` versions.

## How to Access Documentation

### Main Entry Point
Start at [documents/README.md](./documents/README.md) for the complete documentation index.

### English Documentation
Browse [documents/en/](./documents/en/) or start with [documents/en/README.md](./documents/en/README.md)

### Chinese Documentation (中文文档)
浏览 [documents/zh/](./documents/zh/) 或从 [documents/zh/README.md](./documents/zh/README.md) 开始

### Quick Access from Root README
The main [README.md](./README.md) has been updated with quick links to important documentation.

## Benefits of New Structure

1. **Language Separation**: Clear separation between English and Chinese documentation
2. **Better Organization**: Related documents grouped together
3. **Image Support**: Dedicated `images/` directory for diagrams and screenshots
4. **Scalability**: Easy to add new languages or documentation categories
5. **Discovery**: Comprehensive README files for easy navigation
6. **Clean Root**: Root directory is no longer cluttered with multiple documentation files

## For Contributors

When adding new documentation:

1. **Choose the right directory**:
   - English docs → `documents/en/`
   - Chinese docs → `documents/zh/`
   - Images → `documents/images/`

2. **Update index files**:
   - Add your document to the appropriate README.md
   - Update `documents/README.md` if adding a major document

3. **Use relative links**:
   - Within same directory: `[Link](./FILE.md)`
   - To other directories: `[Link](../en/FILE.md)`
   - To images: `![Alt](../images/image.png)`

4. **Follow naming conventions**:
   - Use `UPPER_SNAKE_CASE.md` for documentation files
   - Use `lowercase-with-hyphens.png` for images

## Examples

### Linking to Documentation

From root README:
```markdown
[Feature Documentation](./documents/en/FEATURES.md)
```

From within documents/en/:
```markdown
[Performance Guide](./PERFORMANCE.md)
[Chinese Client Docs](../zh/CLIENT_README.md)
```

From within documents/zh/:
```markdown
[English Features](../en/FEATURES.md)
```

### Adding Images

1. Place image in `documents/images/`
2. Reference in documentation:
```markdown
![Architecture Diagram](../images/architecture-overview.svg)
```

## Migration Timeline

- **Completed**: All files moved and reorganized
- **Updated**: Main README.md with new links
- **Updated**: Client documentation with cross-references
- **Created**: Comprehensive README files for each directory
- **Added**: Sample architecture diagram

## Support

If you encounter broken links or missing documentation, please:
1. Check the file mapping table above
2. Look in the appropriate language directory (en/ or zh/)
3. Check the README.md files for navigation
4. Open an issue if documentation is truly missing
