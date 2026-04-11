const express = require('express');
const logger = require('../logger');

// 헬퍼: Levenshtein Distance 유사도 계산 (0~1, 1이 완전 일치)
function calculateSimilarity(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    const distance = matrix[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    return 1 - distance / maxLength;
}

function createProductRoutes(db) {
    const router = express.Router();

    // TASK-506: 상품 매칭 API
    router.get('/match', async (req, res) => {
        const { destination } = req.query;

        try {
            if (typeof destination !== 'string' || destination.trim() === '') {
                return res.status(400).json({ error: '목적지가 필요합니다.' });
            }

            // 1. 정확한 목적지 매칭
            const exactMatch = await db.get(
                'SELECT * FROM products WHERE destination = ? AND status = ?',
                [destination, '활성']
            );

            if (exactMatch) {
                return res.json({
                    exact_match: exactMatch,
                    similar_matches: []
                });
            }

            // 2. 유사 목적지 검색 (LIKE 패턴)
            const similar = await db.all(
                'SELECT * FROM products WHERE destination LIKE ? AND status = ?',
                [`%${destination}%`, '활성']
            );

            if (similar.length > 0) {
                const scored = similar.map(p => ({
                    ...p,
                    similarity: calculateSimilarity(destination, p.destination)
                }));
                scored.sort((a, b) => b.similarity - a.similarity);

                return res.json({
                    exact_match: null,
                    similar_matches: scored
                });
            }

            // 3. 매칭 결과 없음
            res.json({
                exact_match: null,
                similar_matches: [],
                message: '일치하는 상품이 없습니다. 신규 상품을 생성할 수 있습니다.'
            });

        } catch (error) {
            logger.error('상품 매칭 오류:', error);
            res.status(500).json({ error: `상품 매칭 실패: ${error.message}` });
        }
    });

    return router;
}

module.exports = createProductRoutes;
