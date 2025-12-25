declare module 'subsrt' {
    export function parse(content: string): Array<{
        start: number;
        end: number;
        text: string;
    }>;
}
