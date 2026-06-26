# decky-rotate-screen

A [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) plugin for rotating display orientation on **Bazzite** (and other rpm-ostree-based systems). Changes are applied as kernel boot arguments and take effect after a reboot.

## Requirements

- [Bazzite](https://bazzite.gg/) or another immutable Linux distro using `rpm-ostree`
- [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) installed

## Installation

Install via the Decky plugin store once published, or manually by following the steps below.

### One-time permission setup (required)

The plugin needs `sudo` access to run `rpm-ostree kargs` and `systemctl reboot` without a password prompt. This is a one-time step done in Desktop Mode.

1. Switch to **Desktop Mode**.
2. Open **Konsole** (or any terminal).
3. Run the following command, replacing `your-username` with your actual Bazzite username:

```bash
echo "your-username ALL=(root) NOPASSWD: /usr/bin/rpm-ostree kargs *
your-username ALL=(root) NOPASSWD: /usr/bin/systemctl reboot" | sudo tee /etc/sudoers.d/decky-rotate-screen && sudo chmod 440 /etc/sudoers.d/decky-rotate-screen
```

> **Note:** If you're not sure of your username, run `whoami` in the terminal first.

You only need to do this once. If you skip this step, the plugin will display the exact command to run when you press **Apply**.

### Manual installation

This can be done entirely in Gaming Mode — no Desktop Mode required for the plugin install itself.

1. **Enable Developer Mode in Decky** (one-time setup). Open the Quick Access Menu (`...` button), navigate to the Decky section, open **Settings** (gear icon ⚙), and enable **Developer Mode**. This unlocks the manual install options used in the steps below.

2. **In Decky Settings, go to the Developer section.** You will see two options for installing a plugin manually — choose whichever suits you:

   **Option A — Install from URL** (no file download needed):
   - On another device, go to the [Releases](https://github.com/sanicki/decky-rotate-screen/releases) page, click the latest release, and copy the URL of the `.zip` file under **Assets**. It will look like:
     ```
     https://github.com/sanicki/decky-rotate-screen/releases/download/v<version>/decky-rotate-screen.zip
     ```
   - Select **Install Plugin from URL** in Decky, enter the URL, and confirm. Decky will download and install the plugin automatically.

   **Option B — Install from zip**:
   - In Desktop Mode, download the `.zip` from the [Releases](https://github.com/sanicki/decky-rotate-screen/releases) page.
   - Select **Install Plugin from ZIP** in Decky and browse to the downloaded file.

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
