import glob
import os
import re
import shlex
import subprocess

import decky

BUILTIN_PREFIXES = ("eDP", "DSI", "LVDS")

ORIENTATION_MAP = {
    "normal": None,           # stock — removes override
    "left":   "left_side_up",
    "right":  "right_side_up",
    "flip":   "upside_down",
}

REVERSE_ORIENTATION_MAP = {v: k for k, v in ORIENTATION_MAP.items() if v}


def _clean_env() -> dict:
    # PyInstaller (used by Decky) sets LD_LIBRARY_PATH to its temp dir and
    # bundles its own OpenSSL libs. System binaries like rpm-ostree then load
    # the wrong OpenSSL version. Stripping LD_LIBRARY_PATH fixes this.
    env = os.environ.copy()
    env.pop("LD_LIBRARY_PATH", None)
    return env


def _rpm_ostree_available() -> bool:
    result = subprocess.run(["which", "rpm-ostree"], capture_output=True, env=_clean_env())
    return result.returncode == 0


class Plugin:

    async def get_displays(self) -> list:
        try:
            displays = []
            external_count = 0
            for status_path in sorted(glob.glob("/sys/class/drm/*/status")):
                try:
                    with open(status_path) as f:
                        if f.read().strip() != "connected":
                            continue
                except OSError:
                    continue
                dir_name = os.path.basename(os.path.dirname(status_path))
                connector = re.sub(r"^card\d+-", "", dir_name)
                if connector.startswith(BUILTIN_PREFIXES):
                    label = f"Built-in Display ({connector})"
                else:
                    external_count += 1
                    label = f"External Display {external_count} ({connector})"
                displays.append({"connector": connector, "label": label})
            return displays
        except Exception as e:
            decky.logger.error(f"get_displays error: {e}")
            return []

    async def get_current_orientation(self, connector: str) -> str:
        try:
            if not _rpm_ostree_available():
                return "unsupported"
            result = subprocess.run(
                ["rpm-ostree", "kargs"],
                capture_output=True, text=True, check=True, env=_clean_env()
            )
            pattern = rf"video={re.escape(connector)}:panel_orientation=(\w+)"
            match = re.search(pattern, result.stdout)
            if match:
                return REVERSE_ORIENTATION_MAP.get(match.group(1), "normal")
            return "normal"
        except Exception as e:
            decky.logger.error(f"get_current_orientation error: {e}")
            return "normal"

    async def set_orientation(self, connector: str, orientation: str) -> dict:
        try:
            if orientation not in ORIENTATION_MAP:
                return {"success": False, "error": f"Invalid orientation: {orientation}"}
            if not _rpm_ostree_available():
                return {"success": False, "error": "rpm-ostree not found. This plugin requires Bazzite."}

            result = subprocess.run(
                ["rpm-ostree", "kargs"],
                capture_output=True, text=True, check=True, env=_clean_env()
            )

            pattern = rf"video={re.escape(connector)}:panel_orientation=\S+"
            existing = re.findall(pattern, result.stdout)

            cmd = ["rpm-ostree", "kargs"]
            for entry in existing:
                cmd += ["--delete", entry]
            kernel_value = ORIENTATION_MAP[orientation]
            if kernel_value is not None:
                cmd += ["--append", f"video={connector}:panel_orientation={kernel_value}"]

            if not existing and kernel_value is None:
                return {"success": True, "error": None}

            decky.logger.info(f"Running: {' '.join(cmd)}")

            # rpm-ostree kargs (write) requires Polkit to see an active logind session.
            # The plugin runs as root via the _root flag, but root launched from a
            # systemd service has no active user session — Polkit denies the write.
            # Running as the desktop user (DECKY_USER) satisfies the session check.
            user = os.environ.get("DECKY_USER", "deck")
            shell_cmd = " ".join(shlex.quote(a) for a in cmd)
            proc = subprocess.run(
                ["runuser", "-l", user, "-c", shell_cmd],
                capture_output=True, text=True, env=_clean_env()
            )
            if proc.returncode != 0:
                decky.logger.error(f"set_orientation failed: {proc.stderr}")
                return {"success": False, "error": proc.stderr or "rpm-ostree kargs failed"}

            return {"success": True, "error": None}
        except subprocess.CalledProcessError as e:
            decky.logger.error(f"set_orientation CalledProcessError: {e.stderr}")
            return {"success": False, "error": e.stderr or str(e)}
        except Exception as e:
            decky.logger.error(f"set_orientation error: {e}")
            return {"success": False, "error": str(e)}

    async def reboot(self) -> None:
        try:
            subprocess.run(["systemctl", "reboot"], check=True, env=_clean_env())
        except Exception as e:
            decky.logger.error(f"reboot error: {e}")

    async def _main(self):
        decky.logger.info("decky-rotate-screen loaded")

    async def _unload(self):
        decky.logger.info("decky-rotate-screen unloaded")

    async def _uninstall(self):
        decky.logger.info("decky-rotate-screen uninstalled")
