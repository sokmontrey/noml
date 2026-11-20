import { Effect } from "effect";
import { useState } from "react";
import { Button } from "@noml/ui";
import { useApp } from "../../container";

interface CaptureBarProps {
    onCaptured(): void;
}

/**
 * Quick capture. The input is routed through the plugin capture pipeline, so
 * the UI does not know which plugin (if any) will claim it.
 */
export function CaptureBar({ onCaptured }: CaptureBarProps) {
    const { captureService } = useApp();
    const [text, setText] = useState("");
    const [status, setStatus] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if (!text.trim() || busy) return;
        setBusy(true);
        setStatus(null);
        try {
            const note = await Effect.runPromise(
                captureService.capture({
                    source: "composer",
                    payload: { text },
                }),
            );
            if (!note) {
                setStatus("No plugin claimed that input.");
                return;
            }
            setText("");
            onCaptured();
        } catch (error) {
            setStatus(error instanceof Error ? error.message : String(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-2">
            <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={(event) => {
                    event.preventDefault();
                    void submit();
                }}
            >
                <input
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Capture a thought…"
                    className="min-w-0 flex-1 rounded-lg border bg-card px-4 py-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                />
                <Button type="submit" size="lg" disabled={busy || !text.trim()}>
                    {busy ? "Capturing…" : "Capture"}
                </Button>
            </form>
            {status ? (
                <p className="text-xs text-destructive">{status}</p>
            ) : null}
        </div>
    );
}
