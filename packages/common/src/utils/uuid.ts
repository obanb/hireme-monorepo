import {randomUUID} from 'crypto';

const generate = () => randomUUID();

export const uuid = {
    generate,
};
