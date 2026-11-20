import { useState } from "react";
import { useApp } from "../../container";

/** Diagnostics for the plugin host: what loaded, what failed, what is configurable. */
export function PluginStatus() {
    const { plugins, settingsService } = useApp();
    const [settings] = useState(() => settingsService.list());

    return (
        <aside className="space-y-6 rounded-xl border bg-card p-5 text-sm shadow-xs">
            <section className="space-y-2">
                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Plugin host
                </h2>
                <ul className="space-y-1">
                    {plugins.loaded.map((id) => (
                        <li key={id} className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            <code className="text-xs">{id}</code>
                        </li>
                    ))}
                    {plugins.failed.map((failure) => (
                        <li
                            key={failure.pluginId}
                            className="flex items-start gap-2 text-destructive"
                            title={failure.reason}
                        >
                            <span className="mt-1 size-2 shrink-0 rounded-full bg-destructive" />
                            <span className="text-xs">
                                {failure.pluginId}: {failure.reason}
                            </span>
                        </li>
                    ))}
                    {plugins.loaded.length === 0 &&
                    plugins.failed.length === 0 ? (
                        <li className="text-xs text-muted-foreground">
                            No plugins registered.
                        </li>
                    ) : null}
                </ul>
            </section>

            <section className="space-y-2">
                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Settings
                </h2>
                {settings.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                        No plugin settings declared.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {settings.map((setting) => (
                            <li key={setting.key}>
                                <div className="flex justify-between gap-2">
                                    <span className="text-xs">
                                        {setting.label}
                                    </span>
                                    <code className="text-xs text-muted-foreground">
                                        {String(setting.value)}
                                    </code>
                                </div>
                                <code className="text-[10px] text-muted-foreground">
                                    {setting.key}
                                </code>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="space-y-1 text-xs text-muted-foreground">
                <h2 className="text-xs font-semibold tracking-wide uppercase">
                    Shortcuts
                </h2>
                <p>
                    <kbd className="rounded border bg-muted px-1">Ctrl</kbd> +{" "}
                    <kbd className="rounded border bg-muted px-1">K</kbd>{" "}
                    command palette
                </p>
                <p>Enter captures · Shift+Enter adds a line when editing</p>
            </section>
        </aside>
    );
}
