import { useEffect, useRef, useState } from "react";
import BottomNavigation from "@/components/bottom-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { IconFileUpload, IconMouse, IconAlertTriangle, IconDownload } from "@tabler/icons-react";

interface ParsedBinding {
  action: string;
  raw: string;
  device?: string;
  button?: number;
}

export default function SettingsPage() {
  const [bindings, setBindings] = useState<ParsedBinding[]>([]);
  const [bindingsMessage, setBindingsMessage] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Mouse steer: upload -> edit -> download. Nothing here ever touches the
  // player's actual files directly — see mouse-steer.ts for why.
  const [mouseSteerFileName, setMouseSteerFileName] = useState<string>("");
  const [mouseSteerMessage, setMouseSteerMessage] = useState<string>("");
  const [mouseSteerSuccess, setMouseSteerSuccess] = useState<boolean | null>(null);
  const [editedControlsSii, setEditedControlsSii] = useState<string | null>(null);
  const [editingMouseSteer, setEditingMouseSteer] = useState(false);
  const mouseSteerFileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-detect an existing controls.sii on load, so there's something to
  // show even before the user manually uploads one.
  useEffect(() => {
    fetch("/api/controls-bindings")
      .then((r) => r.json())
      .then((d) => setBindings(d?.bindings ?? []))
      .catch(() => {});
  }, []);

  const handleUploadControls = async (file: File | null) => {
    if (!file) return;
    try {
      setUploading(true);
      const text = await file.text();
      const res = await fetch("/api/controls-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setBindings(data.bindings ?? []);
        setBindingsMessage(`Loaded ${data.mappings} binding(s) from controls.sii`);
      } else {
        setBindingsMessage(data?.message || "Failed to load controls.sii");
      }
    } catch {
      setBindingsMessage("Failed to load controls.sii");
    } finally {
      setUploading(false);
      setTimeout(() => setBindingsMessage(""), 3000);
    }
  };

  const handleMouseSteerUpload = async (file: File | null) => {
    if (!file) return;
    setMouseSteerFileName(file.name);
    setEditedControlsSii(null);
    setMouseSteerMessage("");
    setEditingMouseSteer(true);
    try {
      const text = await file.text();
      const res = await fetch("/api/mouse-steer/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      setMouseSteerSuccess(res.ok && data.success);
      setMouseSteerMessage(data?.message || (res.ok ? "Done" : "Failed"));
      if (res.ok && data.success && data.updatedContent) {
        setEditedControlsSii(data.updatedContent);
      }
    } catch {
      setMouseSteerSuccess(false);
      setMouseSteerMessage("Failed to reach the server");
    } finally {
      setEditingMouseSteer(false);
    }
  };

  const handleDownloadEdited = () => {
    if (!editedControlsSii) return;
    const blob = new Blob([editedControlsSii], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "controls.sii";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="min-h-screen bg-dark text-white p-4 pb-20">
        <div className="max-w-md mx-auto space-y-4">
          <h1 className="text-xl font-bold mb-2">Settings</h1>

          {/* Controls.sii bindings reference */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <IconFileUpload className="mr-2 h-5 w-5" />
                Control Bindings
              </CardTitle>
              <CardDescription>
                Load your controls.sii to see which in-game action is bound to
                which button — use this to confirm your ETS2 binds line up
                with the vJoy buttons this app presses. This is read-only: it
                doesn't change your bindings, only displays them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                type="file"
                accept=".sii,.txt,text/plain"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => handleUploadControls(e.target.files?.[0] || null)}
              />
              <Button
                variant="outline"
                className="w-full bg-[#1b82d8] text-white hover:bg-[#166db8] border-transparent"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? "Loading…" : "Load controls.sii"}
              </Button>

              {bindingsMessage && (
                <div className="bg-primary/20 border border-primary/30 rounded-lg p-3 text-center">
                  <span className="text-sm">{bindingsMessage}</span>
                </div>
              )}

              {bindings.length > 0 ? (
                <div className="rounded-lg border border-surface-light overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Binding</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bindings.map((b, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{b.action}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {b.device && b.button !== undefined ? `${b.device} · button ${b.button}` : b.raw}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No bindings loaded yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Mouse steer with vJoy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <IconMouse className="mr-2 h-5 w-5" />
                Mouse Steer with vJoy
              </CardTitle>
              <CardDescription>
                Switching ETS2's input to keyboard+vJoy normally disables
                mouse steering entirely. This re-enables it alongside vJoy by
                editing c_mousesteer / c_relatsteer in your profile's
                controls.sii — there's no in-game menu option for this.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert>
                <IconAlertTriangle className="h-4 w-4" />
                <AlertTitle>Before you upload</AlertTitle>
                <AlertDescription>
                  <ol className="list-decimal list-inside space-y-1 mt-1">
                    <li>
                      In ETS2, at the title screen, open your profile and turn
                      off <strong>Steam Cloud</strong> for it — otherwise Steam
                      Cloud can sync the old file right back over this edit.
                    </li>
                    <li>Close ETS2 completely.</li>
                    <li>
                      Find that profile's <code>controls.sii</code> on disk and
                      upload it below.
                    </li>
                    <li>
                      Download the edited file this gives you back, and use it
                      to replace the original in that same profile folder.
                    </li>
                  </ol>
                </AlertDescription>
              </Alert>

              <input
                type="file"
                accept=".sii,.txt,text/plain"
                className="hidden"
                ref={mouseSteerFileInputRef}
                onChange={(e) => handleMouseSteerUpload(e.target.files?.[0] || null)}
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={editingMouseSteer}
                onClick={() => mouseSteerFileInputRef.current?.click()}
              >
                {editingMouseSteer
                  ? "Editing…"
                  : mouseSteerFileName
                  ? `Uploaded: ${mouseSteerFileName}`
                  : "Upload your profile's controls.sii"}
              </Button>

              {mouseSteerMessage && (
                <div
                  className={`rounded-lg p-3 text-center text-sm border ${
                    mouseSteerSuccess
                      ? "bg-primary/20 border-primary/30"
                      : "bg-destructive/20 border-destructive/30"
                  }`}
                >
                  {mouseSteerMessage}
                </div>
              )}

              {editedControlsSii && (
                <Button className="w-full" onClick={handleDownloadEdited}>
                  <IconDownload className="mr-2 h-4 w-4" />
                  Download edited controls.sii
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <BottomNavigation />
    </>
  );
}