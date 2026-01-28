import { useEffect, useState, useRef } from 'react';


export function usePollTimer(serverRemainingTime: number) {
    const [remainingTime, setRemainingTime] = useState<number>(serverRemainingTime);

    const syncTimeRef = useRef<number>(Date.now());
    const serverTimeRef = useRef<number>(serverRemainingTime);

    useEffect(() => {
        syncTimeRef.current = Date.now();
        serverTimeRef.current = serverRemainingTime;
        setRemainingTime(serverRemainingTime);
    }, [serverRemainingTime]);

    useEffect(() => {
        if (serverTimeRef.current <= 0) {
            setRemainingTime(0);
            return;
        }

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - syncTimeRef.current) / 1000);
            const remaining = Math.max(0, serverTimeRef.current - elapsed);
            setRemainingTime(remaining);

            if (remaining <= 0) {
                clearInterval(interval);
            }
        }, 100); 
        return () => clearInterval(interval);
    }, [serverRemainingTime]);

    return remainingTime;
}
