const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: '여행사 관리 시스템 API',
            version: '1.0.0',
            description: '여행세상 관리 시스템 RESTful API 문서',
        },
        servers: [
            { url: process.env.APP_URL || 'http://localhost:5000', description: '개발 서버' },
        ],
        components: {
            securitySchemes: {
                sessionAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'connect.sid',
                    description: '세션 쿠키 인증 (POST /api/auth/login으로 획득)',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        role: { type: 'string', enum: ['admin', 'user'] },
                        profile_image: { type: 'string', nullable: true },
                        provider: { type: 'string' },
                        last_login_at: { type: 'string', format: 'date-time', nullable: true },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                Invoice: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        invoice_number: { type: 'string', example: 'INV-20260222-001' },
                        recipient: { type: 'string' },
                        invoice_date: { type: 'string', format: 'date' },
                        description: { type: 'string', nullable: true },
                        calculation_mode: { type: 'string', enum: ['simple', 'advanced'] },
                        flight_schedule_id: { type: 'string', nullable: true },
                        bank_account_id: { type: 'string', nullable: true },
                        base_price_per_person: { type: 'number', nullable: true },
                        total_participants: { type: 'integer', nullable: true },
                        total_travel_cost: { type: 'number', nullable: true },
                        deposit_amount: { type: 'number', nullable: true },
                        deposit_description: { type: 'string', nullable: true },
                        additional_items: { type: 'string', nullable: true, description: 'JSON 배열 (advanced 모드)' },
                        balance_due: { type: 'number', nullable: true },
                        total_amount: { type: 'number' },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                FlightSchedule: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        group_id: { type: 'string', nullable: true },
                        group_name: { type: 'string' },
                        airline: { type: 'string' },
                        flight_number: { type: 'string', example: 'KE123', nullable: true },
                        departure_date: { type: 'string', format: 'date' },
                        departure_airport: { type: 'string' },
                        departure_time: { type: 'string', example: '09:00' },
                        arrival_date: { type: 'string', format: 'date' },
                        arrival_airport: { type: 'string' },
                        arrival_time: { type: 'string', example: '13:00' },
                        passengers: { type: 'integer' },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                BankAccount: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        bank_name: { type: 'string' },
                        account_number: { type: 'string' },
                        account_holder: { type: 'string' },
                        is_default: { type: 'integer', enum: [0, 1] },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                Schedule: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        group_name: { type: 'string', nullable: true },
                        event_date: { type: 'string', format: 'date', nullable: true },
                        location: { type: 'string', nullable: true },
                        transport: { type: 'string', nullable: true },
                        time: { type: 'string', nullable: true },
                        schedule: { type: 'string' },
                        meals: { type: 'string', nullable: true },
                        color: { type: 'string', default: '#7B61FF' },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                CostCalculation: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        code: { type: 'string', example: 'COST-2026-02-001' },
                        name: { type: 'string' },
                        destination: { type: 'string', nullable: true },
                        departure_date: { type: 'string', format: 'date', nullable: true },
                        arrival_date: { type: 'string', format: 'date', nullable: true },
                        nights: { type: 'integer', nullable: true },
                        days: { type: 'integer', nullable: true },
                        adults: { type: 'integer', nullable: true },
                        children: { type: 'integer', nullable: true },
                        infants: { type: 'integer', nullable: true },
                        tc: { type: 'integer', nullable: true },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
        security: [{ sessionAuth: [] }],
    },
    apis: [
        './routes/*.js',
        './server.js',
        './swagger-defs.js',
    ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
