import dotenv from 'dotenv';

dotenv.config();

console.log('=== DATABASE URL VALIDATION ===\n');

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.log('❌ DATABASE_URL is not set in .env file');
    process.exit(1);
}

console.log('✅ DATABASE_URL is set');
console.log('Length:', dbUrl.length, 'characters\n');

// Parse the URL
try {
    const url = new URL(dbUrl);

    console.log('=== PARSED CONNECTION DETAILS ===\n');
    console.log('Protocol:', url.protocol);
    console.log('Username:', url.username ? '***' : '(empty)');
    console.log('Password:', url.password ? '***' : '(empty)');
    console.log('Hostname:', url.hostname);
    console.log('Port:', url.port || '(default)');
    console.log('Database:', url.pathname.slice(1));
    console.log('SSL Mode:', url.searchParams.get('sslmode') || '(not set)');

    console.log('\n=== VALIDATION ===\n');

    // Check protocol
    if (url.protocol === 'postgresql:' || url.protocol === 'postgres:') {
        console.log('✅ Protocol is correct');
    } else {
        console.log('❌ Protocol should be postgresql:// or postgres://');
    }

    // Check hostname format
    if (url.hostname.includes('neon.tech')) {
        console.log('✅ Hostname looks like a Neon database');
    } else {
        console.log('⚠️  Hostname doesn\'t look like a Neon database');
    }

    // Check if hostname has proper format
    if (url.hostname.match(/^ep-[a-z]+-[a-z]+-[a-z0-9]+(-pooler)?\..*\.aws\.neon\.tech$/)) {
        console.log('✅ Hostname format looks correct');
    } else {
        console.log('⚠️  Hostname format might be incorrect');
        console.log('   Expected: ep-xxx-xxx-xxx.region.aws.neon.tech');
        console.log('   Got:', url.hostname);
    }

    // Check credentials
    if (url.username && url.password) {
        console.log('✅ Username and password are set');
    } else {
        console.log('❌ Missing username or password');
    }

    // Check database name
    if (url.pathname && url.pathname !== '/') {
        console.log('✅ Database name is set');
    } else {
        console.log('❌ Database name is missing');
    }

    console.log('\n=== FULL HOSTNAME ===');
    console.log(url.hostname);

} catch (error) {
    console.log('❌ Failed to parse DATABASE_URL');
    console.log('Error:', error.message);
    console.log('\nThe URL should be in format:');
    console.log('postgresql://username:password@hostname/database?sslmode=require');
}
