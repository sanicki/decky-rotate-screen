# decky-rotate-screen

A [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) plugin for rotating display orientation on **Bazzite** (and other rpm-ostree-based systems). Changes are applied as kernel boot arguments and take effect after a reboot.

## Requirements

- [Bazzite](https://bazzite.gg/) or another immutable Linux distro using `rpm-ostree`
- [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) installed

## Installation

Install via the Decky plugin store once published, or manually:

1. Download the latest release zip from the [Releases](https://github.com/sanicki/decky-rotate-screen/releases) page.
2. In Decky Loader, go to the store → Install from zip.

## Usage

1. Open the Quick Access Menu (`...` button on Steam Deck).
2. Navigate to the decky-rotate-screen plugin.
3. Select the **Display** you want to configure.
4. Select the desired **Orientation**.
5. Press **Apply**.
6. When prompted, choose **Reboot Now** or **Later** — the change takes effect after reboot.

## Orientations

| Label | Kernel value |
|-------|-------------|
| Normal | *(removes override)* |
| Rotated Left | `left_side_up` |
| Rotated Right | `right_side_up` |
| Upside Down | `upside_down` |

## How it works

The plugin stages a kernel argument of the form:

```
video=<connector>:panel_orientation=<value>
```

using `rpm-ostree kargs`. On the next boot, the kernel applies the hardware rotation at the DRM/KMS level before the display server starts, which means the rotation works even on the boot/login screen.

Selecting **Normal** removes any existing orientation override for that display.

## Building from source

```bash
pnpm install
pnpm run build
```

The built plugin is in `dist/`.

## License

BSD-3-Clause
