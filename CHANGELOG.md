# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project does **not** adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.3-test21] - 2023-02-25

### Added

-   A new team of contributors joined the project!
-   Even better, we are happy to welcome a new partner: Johanniter Akademie NRW, Campus Münster der Johanniter-Unfall-Hilfe e.V. (JUH).
-   Simulated regions are new elements on the map that behave similar to viewports.
    -   They have a flexible simulation framework for defining behaviors.
    -   These can contain personnel, vehicles, material and patients.
-   Added customizable pages for imprint and privacy notice.
-   The frontend now displays the current software version and shows a feedback button on most pages.
-   Added [CHANGELOG.md](./CHANGELOG.md), a [release and versioning guide](./README.md#releases) and release actions.

### Changed

-   Elements that are dragged to the map can be deleted or added to a transfer point directly instead of having to drop and move them.
-   Various internal refactoring:
    -   Marked VS Code configs as examples.
    -   Introduced uniform abstract representation for positions.
    -   Added property for type distinction to all objects in the state.
    -   Moved lots of functionality from `OlMapManager` to feature managers.

### Fixed

-   Moving the map no longer closes popups but can be closed with ESC.
-   Minor dependency updates
-   Updated deprecated actions

[Unreleased]: https://github.com/Nils1729/digital-fuesim-manv/compare/1.2.3-test21...HEAD
[1.2.3-test21]: https://github.com/Nils1729/digital-fuesim-manv/compare/71d13f1cceac98128c9b6e0174b5a65943c1347d...1.2.3-test21
