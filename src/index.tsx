import {
  ButtonItem,
  ConfirmModal,
  DropdownItem,
  PanelSection,
  PanelSectionRow,
  showModal,
  staticClasses,
} from "@decky/ui";
import { callable, definePlugin } from "@decky/api";
import { useEffect, useState } from "react";
import { MdFlip, MdMonitor, MdRotateLeft, MdRotateRight, MdScreenRotation } from "react-icons/md";

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
  { data: "normal", label: <span><MdScreenRotation style={{ marginRight: 6 }} />Normal</span> },
  { data: "left",   label: <span><MdRotateLeft style={{ marginRight: 6 }} />Rotated Left</span> },
  { data: "right",  label: <span><MdRotateRight style={{ marginRight: 6 }} />Rotated Right</span> },
  { data: "flip",   label: <span><MdFlip style={{ marginRight: 6 }} />Upside Down</span> },
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
      const disps = await getDisplays();
      setDisplays(disps);
      if (disps.length > 0) {
        const first = disps[0].connector;
        setSelectedConnector(first);
        const orientation = await getCurrentOrientation(first);
        if (orientation === "unsupported") {
          setUnsupported(true);
        } else {
          setSelectedOrientation(orientation);
        }
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedConnector) return;
    (async () => {
      const orientation = await getCurrentOrientation(selectedConnector);
      if (orientation === "unsupported") {
        setUnsupported(true);
      } else {
        setUnsupported(false);
        setSelectedOrientation(orientation);
      }
    })();
  }, [selectedConnector]);

  const handleApply = async () => {
    if (!selectedConnector) return;
    setApplying(true);
    setErrorMsg(null);
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

  return (
    <PanelSection title="Screen Rotation">
      <PanelSectionRow>
        <DropdownItem
          label="Display"
          rgOptions={displays.map((d) => ({ data: d.connector, label: d.label }))}
          selectedOption={selectedConnector}
          onChange={(opt) => setSelectedConnector(opt.data)}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <DropdownItem
          label="Orientation"
          rgOptions={ORIENTATION_OPTIONS}
          selectedOption={selectedOrientation}
          onChange={(opt) => setSelectedOrientation(opt.data)}
        />
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
