import { createContext, useContext } from "react";
import type { AppContainer } from "./bootstrap";

const AppContext = createContext<AppContainer | null>(null);

export const AppProvider = AppContext.Provider;

export function useApp(): AppContainer {
    const container = useContext(AppContext);
    if (!container) {
        throw new Error("useApp must be used inside <AppProvider>");
    }
    return container;
}
