# Contributing to MMO Server Documentation

## Documentation Structure

This project maintains documentation in multiple languages and locations for different purposes:

### Root Directory (`/`)
- **Purpose**: Quick reference and essential project information
- **Audience**: Developers getting started, quick lookups
- **Files**: Main README, attributions, roadmap status, key implementation summaries

### `documents/en/` - English Documentation
- **Purpose**: Comprehensive technical documentation in English
- **Audience**: International developers, detailed technical reference
- **Content**: Full implementation guides, API references, architecture docs

### `documents/zh/` - Chinese Documentation
- **Purpose**: Comprehensive technical documentation in Chinese
- **Audience**: Chinese-speaking developers, detailed technical reference
- **Content**: Full implementation guides, API references, architecture docs

### `client/` - Client Documentation
- **Purpose**: Client-specific guides and examples
- **Audience**: Frontend developers, client integration
- **Content**: Client features, usage examples, setup guides

### `config/` - Configuration Documentation
- **Purpose**: Configuration and data file documentation
- **Audience**: DevOps, system administrators
- **Content**: Configuration guides, data format specifications

## Documentation Standards

### File Naming
- Use `PascalCase` for main documentation files (e.g., `ImplementationSummary.md`)
- Use `kebab-case` for technical files (e.g., `voice-integration.md`)
- Maintain consistent names across languages

### Content Guidelines
- **English**: Use American English spelling and conventions
- **Chinese**: Use simplified Chinese characters
- **Technical Writing**: Be concise, use examples, include code snippets
- **Cross-references**: Link to related documentation sections

### Multi-language Synchronization
- Keep English and Chinese versions synchronized
- Major updates should be reflected in both languages
- Note version differences if content diverges

## Adding New Documentation

### 1. Choose Location
- **Root**: Only for essential, high-level project information
- **documents/en/zh**: For detailed technical documentation
- **Component directories**: For component-specific documentation

### 2. Create Both Languages
When adding new documentation:
1. Create English version in `documents/en/`
2. Create Chinese version in `documents/zh/`
3. Update `documents/DOCUMENT_INDEX.md`

### 3. Update Index
Always update `documents/DOCUMENT_INDEX.md` when adding new documentation files.

## Maintenance Tasks

### Regular Checks
- [ ] Verify English/Chinese documentation synchronization
- [ ] Check for broken links in documentation
- [ ] Update DOCUMENT_INDEX.md when files are added/removed
- [ ] Review and update outdated information

### Tools
- Use the `organize-docs.ps1` script for duplicate detection
- Run `.\organize-docs.ps1 -Action scan` to check for issues

## Pull Request Guidelines

### Documentation Changes
- Include both language versions if applicable
- Update DOCUMENT_INDEX.md
- Test links and references
- Follow the established naming conventions

### Code Changes with Documentation
- Update relevant documentation for code changes
- Add examples for new features
- Update API references

## Translation Tasks

### Missing Chinese Translations
Several English documents need Chinese translations. See `documents/DOCUMENTATION_ORGANIZATION.md` for the complete list.

### Translation Guidelines
- Maintain technical accuracy
- Use consistent terminology
- Follow the same structure as English versions
- Include code examples in both languages when applicable
- Update `documents/DOCUMENT_INDEX.md` after completing translations

## Getting Help

- Check `documents/DOCUMENT_INDEX.md` for navigation
- Use `organize-docs.ps1` for organization tasks:
  - `.\organize-docs.ps1 -Action consistency` - Check translation status
  - `.\organize-docs.ps1 -Action scan` - Scan for duplicates and issues
- Refer to existing files for style and structure examples

---

*Last updated: October 16, 2025*