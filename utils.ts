import { Product, Deal } from './types';

export const parseProductsCSV = (content: string): Omit<Product, 'id'>[] => {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));

    return lines.slice(1).map(line => {
        // Handle quoted values roughly (not perfect CSV parser but good enough for simple use)
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));

        const row: any = {};
        headers.forEach((h, i) => {
            if (values[i] !== undefined) row[h] = values[i];
        });

        // Fallback to index if headers don't match standard names
        return {
            name: row.name || values[0] || 'Unknown Product',
            weightKg: Number(row.weight) || Number(row.weightkg) || Number(values[1]) || 0,
            volumeM3: Number(row.volume) || Number(row.volumem3) || Number(values[2]) || 0,
            destination: row.destination || values[3] || '',
            readyDate: row.ready || row.readydate || values[4] || '',
            shipDeadline: row.ship || row.shipdeadline || values[5] || '',
            arrivalDeadline: row.arrival || row.arrivaldeadline || values[6] || '',
            restrictions: (row.restrictions || values[7] || '').split(';').map((r: string) => r.trim()).filter((r: string) => r)
        };
    });
};

export const parseDealsCSV = (content: string): Omit<Deal, 'id'>[] => {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));

    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((h, i) => {
            if (values[i] !== undefined) row[h] = values[i];
        });

        return {
            carrierName: row.carrier || row.carriername || values[0] || 'Unknown Carrier',
            containerType: row.type || row.containertype || values[1] || 'Standard',
            maxWeightKg: Number(row.maxweight) || Number(row.maxweightkg) || Number(values[2]) || 0,
            maxVolumeM3: Number(row.maxvolume) || Number(row.maxvolumem3) || Number(values[3]) || 0,
            cost: Number(row.cost) || Number(values[4]) || 0,
            transitTimeDays: Number(row.time) || Number(row.transittime) || Number(values[5]) || 0,
            destination: row.destination || values[6] || '',
            availableFrom: row.available || row.availablefrom || values[7] || new Date().toISOString().split('T')[0],
            restrictions: (row.restrictions || values[8] || '').split(';').map((r: string) => r.trim()).filter((r: string) => r)
        };
    });
};
