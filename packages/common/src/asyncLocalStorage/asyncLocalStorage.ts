import {AsyncLocalStorage} from 'async_hooks';
import {NextFunction, Request, Response} from 'express';

export const als = <TStore>(id?: string) => {
    const als = new AsyncLocalStorage<TStore & {id?: string; requestId?: string}>();

    return {
        readAll: () => als.getStore(),
        read: (prop: keyof (TStore & {id?: string; requestId?: string})) => {
            const store = als.getStore();
            return store ? store[prop] : null;
        },
        run: <Callback>(store: TStore & {id?: string; requestId?: string}, callback: () => Promise<Callback>) => {
            return als.run({...store, id}, callback);
        },
        set: (store: Partial<TStore>) => {
            const currentStore = als.getStore();
            return store ? {...currentStore, ...store} : currentStore;
        },
        id: () => id,
        expressHook: (storeFn: () => TStore & {id?: string; requestId?: string}) => (req: Request, res: Response, next: NextFunction) => {
            const store = storeFn();
            als.run(store, () => next());
        },
    };
};

export type Als<T> = ReturnType<typeof als<T>>;
