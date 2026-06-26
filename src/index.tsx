import {
  ButtonItem,
  ConfirmModal,
  Menu,
  MenuItem,
  PanelSection,
  PanelSectionRow,
  showContextMenu,
  showModal,
  staticClasses,
} from "@decky/ui";
import { callable, definePlugin } from "@decky/api";
import { useEffect, useState } from "react";
import { MdMonitor } from "react-icons/md";

interface Display {
  connector: string;
  label: string;
}

interface SetOrientationResult {
  success: boolean;
  error: string | null;
}

const getDisplays = callable<[], Display[]>("get_displays");
const getCurrentOrientation = callable<[connector: string], string>("get_current_orientation");
const setOrientation = callable<[connector: string, orientation: string], SetOrientationResult>("set_orientation");
const reboot = callable<[], void>("reboot");

const ORIENTATION_OPTIONS = [
  { data: "normal", label: "Normal" },
  { data: "left",   label: "Rotated Left" },
  { data: "right",  label: "Rotated Right" },
  { data: "flip",   label: "Upside Down" },
];

function Content() {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);
  const [selectedOrientation, setSelectedOrientation] = useState<string>("normal");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const disps = await getDisplays();
        setDisplays(disps);
        if (disps.length > 0) {
          const first = disps[0].connector;
          setSelectedConnector(first);
          try {
            const orientation = await getCurrentOrientation(first);
            if (orientation === "unsupported") {
              setUnsupported(true);
            } else {
              setSelectedOrientation(orientation);
            }
          } catch (e) {
            setErrorMsg(`Failed to read current orientation: ${e}`);
          }
        }
      } catch (e) {
        setErrorMsg(`Failed to detect displays: ${e}`);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedConnector) return;
    (async () => {
      try {
        const orientation = await getCurrentOrientation(selectedConnector);
        if (orientation === "unsupported") {
          setUnsupported(true);
        } else {
          setUnsupported(false);
          setSelectedOrientation(orientation);
        }
      } catch (e) {
        setErrorMsg(`Failed to read orientation: ${e}`);
      }
    })();
  }, [selectedConnector]);

  const handleApply = async () => {
    if (!selectedConnector) return;
    setApplying(true);
    setErrorMsg(null);
    try {
      const result = await setOrientation(selectedConnector, selectedOrientation);
      setApplying(false);
      if (!result.success) {
        setErrorMsg(result.error ?? "Unknown error");
        return;
      }
      showModal(
        <ConfirmModal
          strTitle="Reboot Required"
          strDescription="Reboot now to apply the screen orientation change?"
          strOKButtonLabel="Reboot Now"
          strCancelButtonLabel="Later"
          onOK={() => reboot()}
        />
      );
    } catch (e) {
      setApplying(false);
      setErrorMsg(`Failed to apply: ${e}`);
    }
  };

  if (loading) {
    return (
      <PanelSection title="Screen Rotation">
        <PanelSectionRow>
          <span>Loading displays...</span>
        </PanelSectionRow>
      </PanelSection>
    );
  }

  if (unsupported) {
    return (
      <PanelSection title="Screen Rotation">
        <PanelSectionRow>
          <span style={{ color: "#f4a261" }}>
            This plugin requires Bazzite or another rpm-ostree-based system.
          </span>
        </PanelSectionRow>
      </PanelSection>
    );
  }

  if (displays.length === 0) {
    return (
      <PanelSection title="Screen Rotation">
        <PanelSectionRow>
          <span>No connected displays detected.</span>
        </PanelSectionRow>
      </PanelSection>
    );
  }

  const currentDisplayLabel = displays.find(d => d.connector === selectedConnector)?.label ?? selectedConnector ?? "";
  const currentOrientationLabel = ORIENTATION_OPTIONS.find(o => o.data === selectedOrientation)?.label ?? selectedOrientation;

  return (
    <PanelSection title="Screen Rotation">
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          disabled={displays.length <= 1}
          onClick={(e: MouseEvent) => {
            showContextMenu(
              <Menu label="Display" cancelText="Cancel" onCancel={() => {}}>
                {displays.map((d) => (
                  <MenuItem
                    key={d.connector}
                    selected={d.connector === selectedConnector}
                    onSelected={() => setSelectedConnector(d.connector)}
                  >
                    {d.label}
                  </MenuItem>
                ))}
              </Menu>,
              e.currentTarget as EventTarget
            );
          }}
        >
          Display: {currentDisplayLabel}
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={(e: MouseEvent) => {
            showContextMenu(
              <Menu label="Orientation" cancelText="Cancel" onCancel={() => {}}>
                {ORIENTATION_OPTIONS.map((opt) => (
                  <MenuItem
                    key={opt.data}
                    selected={opt.data === selectedOrientation}
                    onSelected={() => setSelectedOrientation(opt.data)}
                  >
                    {opt.label}
                  </MenuItem>
                ))}
              </Menu>,
              e.currentTarget as EventTarget
            );
          }}
        >
          Orientation: {currentOrientationLabel}
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={handleApply} disabled={applying}>
          {applying ? "Applying..." : "Apply"}
        </ButtonItem>
      </PanelSectionRow>
      {errorMsg && (
        <PanelSectionRow>
          <span style={{ color: "#e63946" }}>{errorMsg}</span>
        </PanelSectionRow>
      )}
    </PanelSection>
  );
}

export default definePlugin(() => {
  return {
    name: "decky-rotate-screen",
    titleView: <div className={staticClasses.Title}>Rotate Screen</div>,
    content: <Content />,
    icon: <MdMonitor />,
    onDismount() {},
  };
});
