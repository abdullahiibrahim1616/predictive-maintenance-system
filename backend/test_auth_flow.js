/**
 * Automated Verification Test for Authentication & Database Fixes
 */
const http = require('http');

async function makeRequest(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, headers: res.headers, body: parsed });
                } catch {
                    resolve({ status: res.statusCode, headers: res.headers, raw: data });
                }
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Starting Auth & Database Verification Tests...');
    const app = require('./src/server');
    const initDatabase = require('./src/database/dbInit');

    const adminEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.DEMO_ADMIN_EMAIL || 'admin@localhost.test').trim().toLowerCase();
    const demoPassword = (process.env.DEMO_PASSWORD || 'ChangeMe!2026').trim();

    await initDatabase();

    const server = app.listen(5099, async () => {
        console.log('📡 Test server running on port 5099');
        let passed = 0;
        let failed = 0;

        function assert(condition, message) {
            if (condition) {
                console.log(`  ✅ PASS: ${message}`);
                passed++;
            } else {
                console.error(`  ❌ FAIL: ${message}`);
                failed++;
            }
        }

        try {
            // TEST 1: Health check
            const healthRes = await makeRequest({
                hostname: 'localhost', port: 5099, path: '/api/v1/health', method: 'GET'
            });
            assert(healthRes.status === 200 && healthRes.body.status === 'UP', 'Health check returns status UP');

            // TEST 2: Wrong password rejection (No Ghost Login)
            const badLogin = await makeRequest({
                hostname: 'localhost', port: 5099, path: '/api/v1/auth/login', method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, { email: adminEmail, password: 'incorrect_password_xyz' });
            assert(badLogin.status === 401 && badLogin.body.success === false, 'Invalid credentials return HTTP 401 Unauthorized');

            // TEST 3: Legitimate Login & Token Issuance
            const goodLogin = await makeRequest({
                hostname: 'localhost', port: 5099, path: '/api/v1/auth/login', method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, { email: adminEmail, password: demoPassword });
            assert(goodLogin.status === 200 && goodLogin.body.success === true, 'Valid login returns HTTP 200 OK');
            assert(!!goodLogin.body.token && !!goodLogin.body.refreshToken, 'Login response contains both token and refreshToken');

            const authToken = goodLogin.body.token;
            const refreshToken = goodLogin.body.refreshToken;

            // TEST 4: Session Restoration via /auth/me
            const meRes = await makeRequest({
                hostname: 'localhost', port: 5099, path: '/api/v1/auth/me', method: 'GET',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            assert(meRes.status === 200 && meRes.body.user.email === adminEmail, '/auth/me restores valid user profile');

            // TEST 5: Rejected access without token
            const unauthRes = await makeRequest({
                hostname: 'localhost', port: 5099, path: '/api/v1/auth/me', method: 'GET'
            });
            assert(unauthRes.status === 401, 'Request without token returns 401 Access Denied');

            // TEST 6: Token Refresh Endpoint
            const refreshRes = await makeRequest({
                hostname: 'localhost', port: 5099, path: '/api/v1/auth/refresh', method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, { refreshToken });
            assert(refreshRes.status === 200 && refreshRes.body.token, 'Refresh token generates new access token');

            // TEST 6B: Refresh token cannot be used as an access token
            const refreshUsedAsAccess = await makeRequest({
                hostname: 'localhost', port: 5099, path: '/api/v1/auth/me', method: 'GET',
                headers: { 'Authorization': `Bearer ${refreshToken}` }
            });
            assert(refreshUsedAsAccess.status === 403, 'Refresh token rejected when used against protected route');

            // TEST 7: Change Password Complexity Enforcement
            const weakChange = await makeRequest({
                hostname: 'localhost', port: 5099, path: '/api/v1/auth/change-password', method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }
            }, { currentPassword: demoPassword, newPassword: 'weak' });
            assert(weakChange.status === 400 && weakChange.body.error.includes('8 characters'), 'Weak password rejected with 400 Bad Request');

            // TEST 8: Change Password with Incorrect Current Password
            const wrongCurrentChange = await makeRequest({
                hostname: 'localhost', port: 5099, path: '/api/v1/auth/change-password', method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }
            }, { currentPassword: 'wrong_current_pass', newPassword: 'NewSecurePassword2026!' });
            assert(wrongCurrentChange.status === 401, 'Incorrect current password rejected with 401');

            console.log(`\n📊 Summary: ${passed} Passed, ${failed} Failed`);
        } catch (testErr) {
            console.error('Test execution error:', testErr);
        } finally {
            server.close(() => {
                console.log('📡 Test server closed.');
                process.exit(0);
            });
        }
    });
}

runTests();
