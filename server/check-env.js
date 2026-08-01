import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

console.log('=== Environment Check ===\n');

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
const envExists = fs.existsSync(envPath);

console.log('.env file exists:', envExists);

if (envExists) {
    const stats = fs.statSync(envPath);
    console.log('.env file size:', stats.size, 'bytes');
    console.log('.env last modified:', stats.mtime);
}

console.log('\n=== Environment Variables ===\n');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL;
    console.log('DATABASE_URL length:', url.length);

    // Extract hostname without showing full URL
    try {
        const match = url.match(/@([^\/]+)/);
        if (match) {
            console.log('Database hostname:', match[1]);
        }

        // Check if it starts with postgresql://
        console.log('Starts with postgresql://:', url.startsWith('postgresql://'));

        // Check for SSL mode
        console.log('Contains sslmode:', url.includes('sslmode'));
    } catch (e) {
        console.log('Error parsing URL:', e.message);
    }
}

console.log('\nPORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS);
