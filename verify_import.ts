
import { parseProductsCSV } from './services/importService';
import { ProductFormFactor, CSVMapping } from './types';
import * as fs from 'fs';
import * as path from 'path';

const mockFormFactors: ProductFormFactor[] = [
    { id: 'FF-1', name: 'IBC 1000', description: '' },
    { id: 'FF-2', name: 'CSD 210', description: '' },
    { id: 'FF-3', name: 'CSD 200', description: '' },
    { id: 'FF-4', name: 'CSP 25', description: '' },
    { id: 'FF-5', name: 'IBC 970', description: '' },
    { id: 'FF-6', name: 'CSD 190', description: '' },
    { id: 'FF-7', name: 'CSD 170', description: '' },
    { id: 'FF-8', name: 'CSD 180', description: '' },
    { id: 'FF-9', name: 'CSD 220', description: '' },
    { id: 'FF-10', name: 'OSD 200', description: '' },
    { id: 'FF-11', name: 'OSD 210', description: '' },
    { id: 'FF-12', name: 'OSP 25', description: '' },
    { id: 'FF-13', name: 'CSP 20', description: '' },
    { id: 'FF-14', name: 'IBC 920', description: '' },
    { id: 'FF-15', name: 'IBC 1030', description: '' },
    { id: 'FF-16', name: 'CSD 220', description: '' },
];

const defaultMapping: CSVMapping = {
    country: "Ship To: Country",
    quantity: "Number of Packages",
    weight: "Gross Weight",
    incoterms: ["Incoterms", "Incoterms (Part 2)"],
    restrictions: ["Temp. Control (Description)", "DG: Hazard Note 1"],
    groupingFields: ["customerNum", "salesOrg"],
    customFields: {
        customerNum: "Ship To: Customer Number",
        shipToName: "Ship To: Name",
        salesOrg: "Sales Organization",
        description: "Material Description",
        shippingType: "Shipping Type: Description"
    }
};

const csvPath = path.join(process.cwd(), 'csv/EXPORT.csv');
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
    groupingFields: [...defaultMapping.groupingFields, "country"]
};

console.log('\nTesting Custom Mapping (Grouping by Country)...');
const resultCustom = parseProductsCSV(csvContent, mockFormFactors, customMapping);
if (resultCustom.products.length > 0) {
    console.log('Sample Product Destination:', resultCustom.products[0].destination);
}
