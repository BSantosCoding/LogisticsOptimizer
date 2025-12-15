
import { parseLocaleNumber } from '../utils/numberParser';

const testCases = [
    // Standard US
    { input: '1,234.56', expected: 1234.56 },
    { input: '1,000,000', expected: 1000000 },
    { input: '1,000', expected: 1000 }, // Ambiguous, but looks like thousands
    { input: '1.5', expected: 1.5 },

    // EU
    { input: '1.234,56', expected: 1234.56 },
    { input: '1.000.000', expected: 1000000 },
    { input: '100.100,20', expected: 100100.20 }, // User specific case
    { input: '100,2', expected: 100.2 }, // Comma decimal

    // ambiguous single comma
    { input: '123,456', expected: 123456 }, // Look like thousands
    { input: '12,34', expected: 12.34 }, // Looks like decimal

    // Plain
    { input: '1234.56', expected: 1234.56 },
    { input: '1234', expected: 1234 },

    // Garbage
    { input: '', expected: undefined },
    { input: undefined, expected: undefined },
];

let failed = false;

console.log('Running Number Parser Tests...\n');

testCases.forEach(({ input, expected }) => {
    const result = parseLocaleNumber(input);
    const pass = result === expected;
    if (!pass) {
        console.error(`[FAIL] Input: "${input}" | Expected: ${expected} | Got: ${result}`);
        failed = true;
    } else {
        console.log(`[PASS] Input: "${input}" -> ${result}`);
    }
});

if (failed) {
    console.error('\nTests FAILED');
    process.exit(1);
} else {
    console.log('\nAll tests PASSED');
    process.exit(0);
}
