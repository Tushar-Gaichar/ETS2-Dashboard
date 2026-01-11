import BottomNavigation from "@/components/bottom-navigation";

export default function SettingsPage() {
  return (
    <>
      <div className="min-h-screen bg-dark text-white p-4 pb-20">
        <div className="bg-surface rounded-lg p-6 text-center border border-surface-light">
          <h2 className="text-lg font-semibold mb-2">Settings</h2>
          <p className="text-muted-foreground">
            This feature is being developed and will be available once it’s ready.
          </p>
        </div>
      </div>
      <BottomNavigation />
    </>
  );
}
