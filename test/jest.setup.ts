process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test_jwt_secret_change_in_production_min_32_chars_xxxxxxxxx';
process.env.JWT_REFRESH_SECRET ??= 'test_jwt_refresh_secret_change_in_production_min_32_chars_yyyyyyyy';
process.env.JWT_ACCESS_TTL ??= '15m';
process.env.JWT_REFRESH_TTL ??= '7d';
process.env.DATABASE_URL ??= 'postgresql://planify_user:planify_password@localhost:5432/planify_db?schema=public';
process.env.FRONTEND_URL ??= 'http://localhost:3001';
process.env.PORT ??= '4001';
