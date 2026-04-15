// Character blocklist configuration
export const BLOCKED_CHARS = (process.env.BLOCKED_CHARS || '\"\\{[}]\n\r\t').split('');

export interface ValidationError {
    field: string;
    char: string;
    charName: string;
    position?: number;
}

export function validateCardText(text: string, field: string): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const char of BLOCKED_CHARS) {
        const index = text.indexOf(char);
        if (index !== -1) {
            errors.push({
                field,
                char,
                charName: getCharacterName(char),
                position: index
            });
        }
    }

    return errors;
}

export function getCharacterName(char: string): string {
    const names: Record<string, string> = {
        '"': 'double quote',
        '\\': 'backslash',
        '{': 'curly brace (open)',
        '}': 'curly brace (close)',
        '[': 'square bracket (open)',
        ']': 'square bracket (close)',
        '\n': 'newline',
        '\r': 'carriage return',
        '\t': 'tab'
    };
    return names[char] || 'unknown character';
}

export function getBlockedCharactersList() {
    return BLOCKED_CHARS.map(char => ({
        char,
        name: getCharacterName(char),
        escaped: char === '\n' ? '\\n' : char === '\r' ? '\\r' : char === '\t' ? '\\t' : char
    }));
}
