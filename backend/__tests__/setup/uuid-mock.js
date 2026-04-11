// uuid v13+ ESM 모듈의 CJS 대체
const crypto = require('crypto');

module.exports = {
    v4: () => crypto.randomUUID(),
};
