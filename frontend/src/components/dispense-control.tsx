import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrScanner } from "@/components/qr-scanner";
import { cn } from "@/lib/utils";
import { MAX_DISPENSE_ML, VOLUME_PRESETS } from "@/lib/constants";
import type { DispenseState } from "@/hooks/use-dispense";
import type { SystemStatus } from "@/types/api";
import { GlassWater, ScanLine } from "lucide-react";

interface DispenseControlProps {
  status: SystemStatus;
  dispenseState: DispenseState;
  errorMessage: string | null;
  onDispense: (amountMl: number, userToken: string) => void;
}

export function DispenseControl({
  status,
  dispenseState,
  errorMessage,
  onDispense,
}: DispenseControlProps) {
  const [selectedPreset, setSelectedPreset] = useState(1); // Default to 30ml
  const [customMl, setCustomMl] = useState("");
  const [userToken, setUserToken] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const tokenRef = useRef<HTMLInputElement>(null);

  const handleScan = useCallback((value: string) => {
    setUserToken(value);
    setScannerOpen(false);
  }, []);

  // Auto-fill user token when an NFC tag is tapped on the ESP32
  const prevNfcUid = useRef<string | undefined>(undefined);
  useEffect(() => {
    const uid = status.esp_status.nfc_uid;
    if (uid && uid !== prevNfcUid.current) {
      setUserToken(uid);
    }
    prevNfcUid.current = uid;
  }, [status.esp_status.nfc_uid]);

  const activeAmount = customMl ? parseInt(customMl, 10) || 0 : VOLUME_PRESETS[selectedPreset].ml;
  const isOverLimit = activeAmount > MAX_DISPENSE_ML;

  const isReady =
    status.esp_online &&
    status.esp_status.glass_present &&
    status.esp_status.state === "idle" &&
    activeAmount > 0 &&
    !isOverLimit &&
    dispenseState === "idle";

  const handlePresetClick = useCallback((index: number) => {
    setSelectedPreset(index);
    setCustomMl("");
  }, []);

  const handleCustomChange = useCallback((value: string) => {
    setCustomMl(value);
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!isReady) return;
      const token = userToken.trim() || "Guest";
      onDispense(activeAmount, token);
      setUserToken("");
    },
    [isReady, activeAmount, userToken, onDispense],
  );

  // Button label logic
  function getButtonLabel(): string {
    if (dispenseState === "pouring") return "DISPENSING...";
    if (dispenseState === "requesting") return "REQUESTING...";
    if (dispenseState === "error") return errorMessage ? `ERROR: ${errorMessage}` : "ERROR";
    if (!status.esp_online) return "SYSTEM OFFLINE";
    if (!status.esp_status.glass_present) return "PLACE GLASS";
    if (isOverLimit) return "EXCESS VOLUME";
    return "DISPENSE BEVERAGE";
  }

  const isErrorButton = dispenseState === "error" || !status.esp_online || isOverLimit;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Dispense Control
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* User Token Input */}
          <div className="relative">
            <Input
              ref={tokenRef}
              value={userToken}
              onChange={(e) => setUserToken(e.target.value)}
              placeholder="Scan ID or Enter Name"
              className="pr-11"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setScannerOpen((o) => !o)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-primary transition-colors hover:bg-muted hover:text-primary-foreground"
              title="Scan QR Code"
              aria-label="Scan QR code"
            >
              <ScanLine className="size-4 animate-pulse opacity-80" />
            </button>
          </div>

          {/* QR Scanner */}
          {scannerOpen && (
            <QrScanner
              onScan={handleScan}
              onClose={() => setScannerOpen(false)}
            />
          )}

          {/* Volume Selection */}
          <div className="space-y-2">
            <Label className="text-sm">Volume Selection</Label>

            {/* Segmented Control */}
            <div className="relative flex rounded-lg bg-muted p-1">
              {/* Sliding highlight */}
              <div
                className={cn(
                  "absolute top-1 left-1 h-[calc(100%-0.5rem)] rounded-md bg-primary shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.1)]",
                  customMl && "opacity-40",
                )}
                style={{
                  width: `calc(${100 / VOLUME_PRESETS.length}% - 0.25rem)`,
                  transform: `translateX(${selectedPreset * 100}%)`,
                }}
              />

              {VOLUME_PRESETS.map((preset, i) => (
                <button
                  key={preset.ml}
                  type="button"
                  onClick={() => handlePresetClick(i)}
                  className={cn(
                    "relative z-10 flex flex-1 flex-col items-center rounded-md py-2 text-sm font-medium transition-colors",
                    selectedPreset === i && !customMl
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {preset.label}
                  <span className="text-[0.65rem] font-normal opacity-70">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Volume Input */}
            <div className="relative flex items-center rounded-lg bg-muted shadow-inner">
              <Input
                type="number"
                inputMode="numeric"
                value={customMl}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="Custom Volume"
                className="border-0 bg-transparent pr-12 shadow-none focus-visible:ring-0"
                min={1}
                max={MAX_DISPENSE_ML}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/70">
                ML
              </span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!isReady}
            size="lg"
            className={cn(
              "w-full text-sm font-bold uppercase tracking-wider transition-all duration-300",
              isErrorButton && "border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20",
              !status.esp_online && "opacity-60 grayscale cursor-not-allowed",
              (dispenseState === "pouring" || dispenseState === "requesting") && "animate-pulse shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.5)] bg-primary border border-primary/50 text-primary-foreground",
            )}
          >
            <GlassWater className={cn("mr-2 size-4", (dispenseState === "pouring" && "animate-bounce"))} />
            {getButtonLabel()}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
