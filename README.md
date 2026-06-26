# decky-rotate-screen

A [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) plugin for rotating display orientation on **Bazzite** (and other rpm-ostree-based systems). Changes are applied as kernel boot arguments and take effect after a reboot.

## Requirements

- [Bazzite](https://bazzite.gg/) or another immutable Linux distro using `rpm-ostree`
- [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) installed

## Installation

Install via the Decky plugin store once published, or manually by following the steps below.

### Manual installation

This can be done entirely in Gaming Mode — no Desktop Mode required.

1. **Get the zip URL.** On a phone or computer, go to the [Releases](https://github.com/sanicki/decky-rotate-screen/releases) page, click the latest release, and copy the URL of the `.zip` file listed under **Assets**. It will look like:
   ```
   https://github.com/sanicki/decky-rotate-screen/releases/download/v<version>/decky-rotate-screen.zip
   ```
   Keep this URL handy — you'll need to type or paste it on your Deck in the next steps.

2. **Open the Quick Access Menu** on your Steam Deck by pressing the `...` (three-dot) button on the right side of the device.

3. **Open Decky settings** by clicking the plug icon at the bottom of the Quick Access Menu to enter the Decky section, then click the **gear icon** (⚙) at the top right.

4. **Navigate to Developer settings** and select **Install Plugin from URL**.

5. **Enter the zip URL** from step 1 and confirm. Decky will download and install the plugin automatically.

The plugin will appear in the Quick Access Menu under the Decky plugins section.

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
