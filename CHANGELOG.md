# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)

## 1.0.0 - 2026-10-31

### Breaking

- Registration in one bulk overwrite, and commands with no file are removed from discord including ones made some other way. deleted: true still works
- Only .js, .cjs, .mjs, and .ts files are loaded (not .d.ts), sorted by path.
- logger is any {info, warn, error}, and winston is no longer a peer dependency, types moved from the hand-written index to build dist/*.d.ts
- Errors from run, validations, autocomplete and event files are logged instead of becoming unhandled rejections.
- Command file with both run and subcommands, or with subcommands that don't match data, stops startup and names the file.

### Added

- The subcommands export: flat or grouped, checked against data at startup
- Context menu commands (user and message) run, and don't need a desc
- Exported types: CommandModule, RunContext, RunFunction, Subcommands, Validation, Logger, CommandHandlerOptions, LocalCommand
- Registration logs registered, edited and removed per command, and sends nothing when Discord already matches

### Changed

- One interactionCreate listener, which looks commands up by the type and name
- Event files are imported once, at startup. File that fails to import is logged and left out and file that throws doesn't stop the ones after it
- Activity entry point commands are kept during the overwrite

### Fixed

- Changes inside subcommands, options, permissions, contexts and nsfw now reach Discord
- Registration is awaited, and a failure is logged
- Event files are no longer imported again on every event

## [0.0.50] - 2023-06-11

### Changed

- Revert to 0.0.47 state due to unstable ESM imports in Windows
- Temporarily drop support for ESM

## [0.0.48] - 2023-06-08

### Fixed

- Fixed a bug where djs-commander couldn't be imported in ESM projects

## [0.0.47] - 2023-05-23

### Changed

- Remove automatic reply to commands when a command doesn't exist locally

## [0.0.46] - 2023-05-23

### Added

- Add winston logger | Feature credit: [Lenme-exe](https://github.com/Lenme-exe) [#6](https://github.com/notunderctrl/djs-commander/pull/6)

### Changed

- Update "registered command" message emoji from "👍" to "✅"

## [0.0.45] - 2023-04-6

### Fixed

- Property "type" not being set on option objects which are a result of the `SlashCommandBuilder` class.

## [0.0.44] - 2023-03-21

### Added

- Support for stopping event functions.
- TypeScript support for development.

## [0.0.43] - 2023-03-16

### Added

- Support for the following slash command properties:
  - `name_localizations`
  - `description_localizations`
  - `default_permission`,
  - `default_member_permissions`,
  - `dm_permission`,

### Fixed

- Options length not defaulting to 0 when commands are created using regular objects

## [0.0.42] - 2023-03-07

### Added

- Multiple arguments support for events

## [0.0.41] - 2023-03-07

### Fixed

- "deleted" property not working for commands.

## [0.0.40] - 2023-03-05

### Fixed

- Typings for TypeScript projects.

## [0.0.39] - 2023-02-24

### Fixed

- Incomplete `commandObj` in validation files

## [0.0.38] - 2023-02-20

### Fixed

- Undefined client object inside validation functions

## [0.0.37] - 2023-02-20

### Added

- Reflect v0.0.36 changes to README.md

## [0.0.36] - 2023-02-20

No breaking changes

### Added

- Client parameter to validation functions

### Changed

- Internal function naming

## [0.0.35] - 2023-02-20

### Added

- Link to documentation

## [0.0.34] - 2023-02-19

### Fixed

- Fix README.md validation return message.

## [0.0.33] - 2023-02-19

### Added

- Add a commands property for the CommandHandler instance
- Allow commands to have access to the CommandHandler instance

### Changed

- Opt for object destructuring in command parameters
- README.md examples.

### Fixed

- README.md examples.
