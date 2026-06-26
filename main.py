import glob
import os
import re
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

SUDOERS_PATH = "/etc/sudoers.d/decky-rotate-screen"


def _sudoers_content(username: str) -> str:
    return (
        f"{username} ALL=(root) NOPASSWD: /usr/bin/rpm-ostree kargs *\n"
        f"{username} ALL=(root) NOPASSWD: /usr/bin/systemctl reboot\n"
    )


def _setup_msg(username: str) -> str:
    content = _sudoers_content(username).strip()
    return (
        "One-time setup required. In Desktop Mode, open Konsole and run:\n"
        f"echo '{content}' | sudo tee {SUDOERS_PATH} "
        f"&& sudo chmod 440 {SUDOERS_PATH}"
    )


def _current_username() -> str:
    # LOGNAME/USER reflect the logged-in user even when the process is
    # spawned by a service running as a different UID.
    return os.environ.get("LOGNAME") or os.environ.get("USER") or "deck"


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

            decky.logger.info(f"Running (UID={os.geteuid()}): {' '.join(cmd)}")
            proc = subprocess.run(
                ["sudo", "-n"] + cmd,
                capture_output=True, text=True, env=_clean_env()
            )
            if proc.returncode != 0:
                err = proc.stderr.strip()
                decky.logger.error(f"set_orientation failed (UID={os.geteuid()}): {err}")
                # Sudo not configured — guide user through one-time setup
                if not err or "password" in err.lower() or "sudoers" in err.lower() or "not allowed" in err.lower():
                    return {"success": False, "error": _setup_msg(_current_username())}
                return {"success": False, "error": err}

            return {"success": True, "error": None}
        except subprocess.CalledProcessError as e:
            decky.logger.error(f"set_orientation CalledProcessError: {e.stderr}")
            return {"success": False, "error": e.stderr or str(e)}
        except Exception as e:
            decky.logger.error(f"set_orientation error: {e}")
            return {"success": False, "error": str(e)}

    async def reboot(self) -> None:
        try:
            subprocess.run(
                ["sudo", "-n", "systemctl", "reboot"],
                check=True, env=_clean_env()
            )
        except Exception as e:
            decky.logger.error(f"reboot error: {e}")

    async def _main(self):
        uid = os.geteuid()
        decky.logger.info(f"decky-rotate-screen loaded (UID={uid})")
        if uid == 0:
            try:
                username = _current_username()
                with open(SUDOERS_PATH, "w") as f:
                    f.write(_sudoers_content(username))
                os.chmod(SUDOERS_PATH, 0o440)
                decky.logger.info(f"Sudoers rule installed for user '{username}' at {SUDOERS_PATH}")
            except Exception as e:
                decky.logger.warning(f"Could not install sudoers rule: {e}")
        else:
            decky.logger.warning(
                f"_root flag ineffective (UID={uid}) — sudoers rule not installed automatically"
            )

    async def _unload(self):
        decky.logger.info("decky-rotate-screen unloaded")

    async def _uninstall(self):
        try:
            os.remove(SUDOERS_PATH)
        except Exception:
            pass
        decky.logger.info("decky-rotate-screen uninstalled")
