# decky-rotate-screen

A [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) plugin for rotating display orientation on **Bazzite** (and other rpm-ostree-based systems). Changes are applied as kernel boot arguments and take effect after a reboot.

## Requirements

- [Bazzite](https://bazzite.gg/) or another immutable Linux distro using `rpm-ostree`
- [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) installed

## Installation

Install via the Decky plugin store once published, or manually by following the steps below.

### Manual installation

1. **Download the plugin zip** from the [Releases](https://github.com/sanicki/decky-rotate-screen/releases) page. Click the release you want, then download the `.zip` file listed under **Assets**.

2. **Transfer the zip to your Steam Deck.** A few options:
   - Plug in a USB drive, copy the zip to it, then plug it into the Deck.
   - Use a service like Google Drive, Dropbox, or a Discord DM to send the file to yourself and download it in Desktop Mode using the Firefox browser.
   - If you know your Deck's IP address, copy it over the network with `scp` from another machine.

3. **Switch to Desktop Mode** on your Steam Deck (Steam button → Power → Switch to Desktop).

4. **Open Decky Loader** by clicking the `⚡` (lightning bolt) icon in the system tray at the bottom-right of the taskbar.

5. **Open the Decky store** by clicking the shopping bag icon at the top of the Decky sidebar.

6. **Install from zip:** click the package/box icon at the top-right of the store view (next to the search bar), then select the zip file you downloaded in step 1.

7. **Return to Gaming Mode** (double-click the "Return to Gaming Mode" shortcut on the Desktop).

The plugin will appear in the Quick Access Menu (`...` button) under the Decky plugins section.

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
