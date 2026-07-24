import { useRef, useState } from "react";
import BottomNavigation from "@/components/bottom-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { IconMouse, IconAlertTriangle, IconDownload } from "@tabler/icons-react";
import { defaultVjoyButtonMap, commandLabels } from "@shared/vjoy-buttons";

// Sorted by button number, matching how the game's own control list reads.
const bindingRows = Object.entries(defaultVjoyButtonMap)
  .map(([command, button]) => ({ command, button, label: commandLabels[command] ?? command }))
  .sort((a, b) => a.button - b.button);

export default function SettingsPage() {
  // Mouse steer: upload -> edit -> download. Nothing here ever touches the
  // player's actual files directly — see mouse-steer.ts for why.
  const [mouseSteerFileName, setMouseSteerFileName] = useState<string>("");
  const [mouseSteerMessage, setMouseSteerMessage] = useState<string>("");
  const [mouseSteerSuccess, setMouseSteerSuccess] = useState<boolean | null>(null);
  const [editedControlsSii, setEditedControlsSii] = useState<string | null>(null);
  const [editingMouseSteer, setEditingMouseSteer] = useState(false);
  const mouseSteerFileInputRef = useRef<HTMLInputElement | null>(null);

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

          {/* vJoy button reference — this app's own command -> button
              mapping, always correct by construction since it's read
              directly from the same map that presses the buttons. Bind
              each action in ETS2's Options -> Controls to the matching
              vJoy button number shown here. */}
          <Card>
            <CardHeader>
              <CardTitle>Button Reference</CardTitle>
              <CardDescription>
                Bind each action below to the matching vJoy button number in
                ETS2's Options → Controls.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-surface-light overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead className="text-right">vJoy Button</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bindingRows.map(({ command, button, label }) => (
                      <TableRow key={command}>
                        <TableCell>{label}</TableCell>
                        <TableCell className="text-right font-mono">Button {button}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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

          <p className="text-xs text-center text-muted-foreground pt-2 pb-4">
            Work is still in progress to let you customize which buttons show,
            where they're placed, and how they're styled — this page will grow
            to cover that.
          </p>
        </div>
      </div>
      <BottomNavigation />
    </>
  );
}
