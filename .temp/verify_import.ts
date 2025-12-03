
import { parseProductsCSV } from '../services/importService';
import { ProductFormFactor, CSVMapping } from '../types';
import * as fs from 'fs';
import * as path from 'path';

const mockFormFactors: ProductFormFactor[] = [
    { id: 'FF-1', name: 'IBC 1000', description: '' },
    { id: 'FF-2', name: 'CSD 210', description: '' },
    { id: 'FF-3', name: 'CSD 200', description: '' },
    { id: 'FF-4', name: 'CSP 25', description: '' },
];

const defaultMapping: CSVMapping = {
    customerNum: "Ship To: Customer Number",
    country: "Ship To: Country",
    shipToName: "Ship To: Name",
    incoterms: "Incoterms",
    incoterms2: "Incoterms (Part 2)",
    salesOrg: "Sales Organization",
    quantity: "Number of Packages",
    description: "Material Description",
    tempControl: "Temp. Control (Description)",
    groupingFields: ["customerNum", "incoterms", "incoterms2", "salesOrg"]
};

const csvPath = path.join(__dirname, '../csv/EXPORT.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

console.log('Testing Default Mapping...');
const result = parseProductsCSV(csvContent, mockFormFactors, defaultMapping);

console.log(`Imported ${result.products.length} products.`);
console.log(`Missing Form Factors: ${result.productsWithMissingFF.length}`);

if (result.products.length > 0) {
    console.log('Sample Product:', JSON.stringify(result.products[0], null, 2));
}

// Test Custom Mapping (Simulate a change)
// Let's say we want to group by Country as well
const customMapping: CSVMapping = {
    ...defaultMapping,
    groupingFields: ["customerNum", "incoterms", "incoterms2", "salesOrg", "country"]
};

console.log('\nTesting Custom Mapping (Grouping by Country)...');
const resultCustom = parseProductsCSV(csvContent, mockFormFactors, customMapping);
if (resultCustom.products.length > 0) {
    console.log('Sample Product Destination:', resultCustom.products[0].destination);
}
