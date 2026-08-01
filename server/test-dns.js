import dotenv from 'dotenv';
import dns from 'dns';
import { promisify } from 'util';

dotenv.config();

const lookup = promisify(dns.lookup);
const resolve4 = promisify(dns.resolve4);

async function testDNS() {
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
        console.log('❌ DATABASE_URL not set');
        return;
    }

    try {
        const url = new URL(dbUrl);
        const hostname = url.hostname;

        console.log('=== DNS RESOLUTION TEST ===\n');
        console.log('Testing hostname:', hostname);
        console.log('');

        // Try DNS lookup
        console.log('Attempting DNS lookup...');
        try {
            const result = await lookup(hostname);
            console.log('✅ DNS Lookup successful!');
            console.log('IP Address:', result.address);
            console.log('Family:', result.family === 4 ? 'IPv4' : 'IPv6');
        } catch (error) {
            console.log('❌ DNS Lookup failed:', error.code || error.message);

            // Try alternative DNS resolution
            console.log('\nTrying alternative DNS resolution...');
            try {
                const addresses = await resolve4(hostname);
                console.log('✅ Alternative DNS resolution successful!');
                console.log('IP Addresses:', addresses);
            } catch (error2) {
                console.log('❌ Alternative DNS resolution also failed:', error2.code || error2.message);

                console.log('\n=== DIAGNOSIS ===');
                console.log('The hostname cannot be resolved to an IP address.');
                console.log('This usually means:');
                console.log('1. The Neon database project doesn\'t exist');
                console.log('2. The hostname in the connection string is incorrect');
                console.log('3. There\'s a typo in the connection string');
                console.log('\nPlease verify:');
                console.log('- Go to https://neon.tech and check your project exists');
                console.log('- Copy the connection string again from Neon dashboard');
                console.log('- Make sure you\'re using the "Pooled connection" string');
            }
        }

    } catch (error) {
        console.log('❌ Failed to parse DATABASE_URL:', error.message);
    }
}

testDNS();
