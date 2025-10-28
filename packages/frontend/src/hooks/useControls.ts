import { useEffect, useRef, RefObject } from "react";

export type KeysRef = RefObject<Set<string>>;

export function useControls(): {
    keysRef: KeysRef;
} {
    const keysRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            keysRef.current.add(e.key.toLowerCase());
        }

        function handleKeyUp(e: KeyboardEvent) {
            keysRef.current.delete(e.key.toLowerCase());
        }

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    return { keysRef };
}


