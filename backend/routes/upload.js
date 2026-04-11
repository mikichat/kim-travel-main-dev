const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const xlsx = require('xlsx');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { extractText } = require('unpdf');
const mammoth = require('mammoth');
const hwpParser = require('hwp.js');
const logger = require('../logger');

// 파일 업로드를 위한 uploads 폴더 경로 (backend/uploads/)
const uploadDir = path.join(__dirname, '..', 'uploads');

// Multer 설정: 업로드된 파일을 backend/uploads/ 디렉토리에 저장
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const safeName = file.originalname.replace(/[/\\]/g, '_');
        cb(null, Date.now() + '-' + safeName);
    }
});

// 허용 파일 확장자 및 MIME 타입 검증
const ALLOWED_FILE_TYPES = {
    '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    '.xls': ['application/vnd.ms-excel'],
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    '.hwp': ['application/x-hwp', 'application/haansofthwp', 'application/octet-stream']
};

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = Object.keys(ALLOWED_FILE_TYPES);
    if (!allowedExts.includes(ext)) {
        return cb(new Error(`지원하지 않는 파일 형식입니다: ${ext}`), false);
    }
    const allowedMimes = ALLOWED_FILE_TYPES[ext];
    if (!allowedMimes.includes(file.mimetype)) {
        logger.warn(`파일 MIME 불일치: ${file.originalname} (${file.mimetype}), 확장자: ${ext}`);
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: fileFilter
}); // 20MB 제한 + 파일 타입 필터

// --- Gemini 동적 모델 선택 ---
async function getLatestFlashModel(apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Google AI 모델 목록 API 호출 실패: ${response.statusText}`);
        }
        const data = await response.json();

        const flashModels = data.models
            .map(m => m.name.replace('models/', ''))
            .filter(name => /gemini-\d+(\.\d+)?-flash/.test(name))
            .sort()
            .reverse();

        if (flashModels.length > 0) {
            logger.info(`최신 Flash 모델 선택: ${flashModels[0]}`);
            return flashModels[0];
        } else {
            throw new Error("사용 가능한 Gemini Flash 모델을 찾을 수 없습니다.");
        }
    } catch (error) {
        logger.error("최신 모델을 가져오는 중 오류 발생:", error);
        const fallbackModel = "gemini-1.5-flash";
        logger.warn(`기본 모델(${fallbackModel})을 사용합니다.`);
        return fallbackModel;
    }
}

// 파일을 Generative Part로 변환하는 헬퍼 함수
async function fileToGenerativePart(filePath, mimeType) {
    const fileBuffer = await fs.promises.readFile(filePath);
    return {
        inlineData: {
            data: fileBuffer.toString("base64"),
            mimeType
        },
    };
}

// HWP 파일에서 텍스트 추출 (hwp.js 사용)
async function extractHwpText(filePath) {
    const buf = await fs.promises.readFile(filePath);
    const arr = new Uint8Array(buf);
    const hwpDocument = hwpParser.parse(arr, { type: 'array' });

    const lines = [];

    function extractParagraphText(paragraph) {
        if (!paragraph.content) return '';
        let text = '';
        for (const char of paragraph.content) {
            if (typeof char.value === 'string') {
                text += char.value;
            } else if (typeof char.value === 'number') {
                if (char.value === 13 || char.value === 10) {
                    // newline - 무시
                } else if (char.value === 9) {
                    text += '\t'; // 탭
                } else if (char.value > 31) {
                    text += String.fromCharCode(char.value);
                }
            }
        }
        return text.trim();
    }

    function extractTableText(control) {
        if (!control.content || !Array.isArray(control.content)) return;
        for (const row of control.content) {
            if (!Array.isArray(row)) continue;
            const cellTexts = [];
            for (const cell of row) {
                if (!cell) continue;
                const paragraphs = cell.items || cell.content || [];
                if (!Array.isArray(paragraphs)) continue;
                const cellLines = [];
                for (const para of paragraphs) {
                    const t = extractParagraphText(para);
                    if (t) cellLines.push(t);
                }
                cellTexts.push(cellLines.join(' '));
            }
            const rowText = cellTexts.filter(t => t).join('\t');
            if (rowText.trim()) lines.push(rowText.trim());
        }
    }

    for (const section of hwpDocument.sections) {
        if (!section.content) continue;
        for (const paragraph of section.content) {
            const text = extractParagraphText(paragraph);
            if (text) lines.push(text);

            if (paragraph.controls) {
                for (const control of paragraph.controls) {
                    if (control.content && Array.isArray(control.content)) {
                        extractTableText(control);
                    }
                }
            }
        }
    }
    return lines.join('\n');
}

/**
 * 여행 상품 텍스트(견적서/확정서)를 파싱하여 구조화된 데이터로 변환
 */
function parseProductText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const result = {
        type: 'quotation',
        destination: '',
        travelDates: { from: '', to: '' },
        duration: 0,
        pax: { total: 0, paid: 0, foc: 0 },
        roomConfig: '',
        groupName: '',
        guide: { name: '', phone: '' },
        hotel: { name: '', roomType: '', rooms: 0, nights: 0 },
        vehicle: { type: '', count: 0 },
        inclusions: '',
        exclusions: '',
        costs: { hotel: 0, meals: 0, entrance: 0, guide: 0, vehicle: 0, handling: 0, other: 0, total: 0, perPerson: 0 },
        itinerary: []
    };

    const hotels = [];
    const inclusionParts = [];

    const norm = (s) => s.replace(/\s+/g, '');

    const fullText = lines.join(' ');

    const starMatch = fullText.match(/★(.+?)★/);
    if (starMatch) result.destination = starMatch[1].replace(/[_\s]+/g, ' ').trim();

    const circleMatch = fullText.match(/⊙\s*(.+?)\s*⊙/);
    if (circleMatch && !result.destination) result.destination = circleMatch[1].replace(/\d+박\d+일.*/, '').replace(/\s+/g, ' ').trim();

    const durMatch = fullText.match(/(\d+)\s*박\s*(\d+)\s*일/);
    if (durMatch) {
        result.duration = parseInt(durMatch[2]);
        result.hotel.nights = parseInt(durMatch[1]);
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const cols = line.split('\t').map(c => c.trim());
        const n = norm(line);

        const isItinerary = /^제\s*\d+\s*일|^\d+\s*일\s*차|^DAY\s*\d+|^HTL|^HOTEL\s*:|^REMARK/i.test(line);

        if (/^견\s*적\s*서/.test(n)) result.type = 'quotation';
        if (/^확\s*정\s*서/.test(n)) result.type = 'confirmation';

        if (!result.destination) {
            const titleM = line.match(/([가-힣,·&\s]+)\s*\d+박\d+일/) || line.match(/^[A-Z]{2}\s+(.+?)\s*\d+일/);
            if (titleM) result.destination = titleM[1].replace(/\s+/g, ' ').trim();
        }

        if (/^ATTN/i.test(line) && !result.groupName) {
            const m = line.match(/ATTN\s*:?\s*(.+?)(?:\s+FROM|\s*$)/i);
            if (m) result.groupName = m[1].trim();
        }

        if (/^수\s*신/.test(n) && !result.groupName) {
            for (const c of cols) {
                const cl = c.replace(/\s+/g, '');
                if (cl && !/^수신$|작성|날짜|DATE/i.test(cl)) {
                    result.groupName = c.replace(/[貴中]/g, '').trim();
                    break;
                }
            }
        }

        if (/피켓|단체명|그룹명/.test(n) && !result.groupName) {
            const val = cols.filter(c => !/피켓|단체명|그룹명/.test(norm(c))).join(' ').trim();
            if (val) result.groupName = val;
        }

        if (/여행기간|기간/.test(n) && !result.travelDates.from) {
            const dateCol = cols.find(c => /\d{4}/.test(c)) || line;
            let dm = dateCol.match(/(\d{4})[년.\-/]\s*(\d{1,2})[월.\-/]\s*(\d{1,2})[일]?\s*[~～]\s*(?:(\d{4})[년.\-/])?\s*(\d{1,2})[월.\-/]\s*(\d{1,2})/);
            if (dm) {
                result.travelDates.from = `${dm[1]}-${dm[2].padStart(2,'0')}-${dm[3].padStart(2,'0')}`;
                result.travelDates.to = `${dm[4]||dm[1]}-${dm[5].padStart(2,'0')}-${dm[6].padStart(2,'0')}`;
            } else {
                dm = dateCol.match(/(\d{4})\s*년?\s*\.?\s*(\d{1,2})\s*월?\s*(\d{1,2})\s*일/);
                if (dm) {
                    result.travelDates.from = `${dm[1]}-${dm[2].padStart(2,'0')}-${dm[3].padStart(2,'0')}`;
                    if (result.duration) {
                        const d = new Date(result.travelDates.from);
                        d.setDate(d.getDate() + result.duration - 1);
                        result.travelDates.to = d.toISOString().split('T')[0];
                    }
                }
            }
        }

        if (/인원|PAX|행사인원/.test(n) && !result.pax.total && !isItinerary) {
            const paxM = line.match(/(\d+)\s*\+\s*(\d+)/) || line.match(/(\d+)\s*PAX/i);
            if (paxM) {
                result.pax.paid = parseInt(paxM[1]);
                result.pax.foc = paxM[2] !== undefined ? parseInt(paxM[2]) : 0;
                result.pax.total = result.pax.paid + result.pax.foc;
            }
        }

        if (/객실|룸타입/.test(n) && !result.roomConfig) {
            const val = cols.filter(c => !/객\s*실|룸\s*타\s*입/.test(norm(c))).join(' ').trim();
            if (val) result.roomConfig = val;
            const bracketM = line.match(/\[(.+?(트윈|트리플|싱글|더블).+?)\]/);
            if (bracketM) result.roomConfig = bracketM[1];
        }

        if (/여행경비|1인당|경비|지상비/.test(n) && !result.costs.perPerson) {
            const costM = line.match(/\$\s*([\d,]+)/) || line.match(/([\d,]+)\s*\$/);
            if (costM) result.costs.perPerson = parseFloat(costM[1].replace(/,/g, ''));
        }

        const nNoArrow = n.replace(/[➜→▶⇨]/g, '');
        if ((/^사용호텔/.test(nNoArrow) || /^호텔/.test(nNoArrow)) && !/호텔식|호텔투숙|호텔조식/.test(nNoArrow) && !isItinerary) {
            const hotelVal = cols.filter(c => !/사?\s*용?\s*호\s*텔|^[➜→▶⇨]$/.test(norm(c).replace(/[➜→▶⇨]/g, ''))).join(' ')
                .replace(/[➜→▶⇨]/g, '').trim();
            if (hotelVal) {
                const hotelMatches = [...hotelVal.matchAll(/([가-힣]{2,}(?:\s+[가-힣]+)*)\s*:\s*([^:]+?)(?=\s+[가-힣]{2,}(?:\s+[가-힣]+)*\s*:|$)/g)];
                if (hotelMatches.length > 0) {
                    for (const m of hotelMatches) {
                        hotels.push({ city: m[1].replace(/\s+/g, ''), name: m[2].trim() });
                    }
                } else {
                    hotels.push({ city: '', name: hotelVal });
                }
            }
            for (let j = i + 1; j < lines.length; j++) {
                const nxt = lines[j];
                const nxtN = norm(nxt);
                if (/항공|택스|포함|불포함|쇼핑|옵션|기타|비자|차량|견적|경비|인원/.test(nxtN)) break;
                const nxtCols = nxt.split('\t').map(c => c.trim()).filter(c => c);
                if (nxtCols.length >= 1 && nxtCols[0].length <= 10) {
                    hotels.push({ city: nxtCols[0].replace(/\s+/g, ''), name: nxtCols.slice(1).join(' ') || nxtCols[0] });
                    i = j;
                } else break;
            }
        }

        if (/^HOTEL\s*:/i.test(line)) {
            const hName = line.replace(/^HOTEL\s*:\s*/i, '').trim();
            if (hName && !hotels.find(h => h.name === hName)) {
                hotels.push({ city: '', name: hName });
            }
        }

        if (/차\s*량/.test(n) && !isItinerary && !result.vehicle.type) {
            const vMatch = line.match(/(\d+)\s*인승/);
            if (vMatch) {
                result.vehicle.type = vMatch[0];
            } else if (/리무진/.test(line)) {
                result.vehicle.type = '리무진';
            } else if (/전용/.test(line)) {
                result.vehicle.type = '전용차량';
            }
            result.vehicle.count = 1;
        }

        if (/가\s*이\s*드/.test(n) && !isItinerary && !result.guide.name) {
            if (!/미팅|팁|포함|한국어|일정|기사/.test(line)) {
                const phoneMch = line.match(/[+]?\d[\d\s-]{7,}/);
                if (phoneMch) result.guide.phone = phoneMch[0].replace(/\s+/g, '').trim();
                const cleaned = line.replace(/가\s*이\s*드|GUIDE|전화|연락처|부장|과장|차장|대리/gi, '').replace(/[+]?\d[\d\s-]{7,}/, '');
                const nameParts = cleaned.split(/[\t,:]/).map(p => p.trim()).filter(p => p && p.length >= 2 && p.length <= 10 && /[가-힣]/.test(p));
                if (nameParts.length > 0) result.guide.name = nameParts[0];
            }
        }

        if (/포함사항/.test(n) && !/불포함/.test(n)) {
            const val = cols.filter(c => !/포\s*함\s*사\s*항/.test(norm(c))).join(' ').replace(/[◉●▶➜→]/g, '').trim();
            if (val) inclusionParts.push(val);
        }
        if (/기사|가이드팁/.test(n) && /포함/.test(line) && !isItinerary) {
            inclusionParts.push(line.replace(/[➜→▶]/g, '').trim());
        }

        if (/불포함/.test(n)) {
            const val = cols.filter(c => !/불?\s*포\s*함\s*사?\s*항?/.test(norm(c))).join(' ').replace(/[◉●➤➜→▶]/g, '').trim();
            if (val) result.exclusions = val;
        }

        if (/총경비|합계|TOTAL/i.test(n) && !isItinerary) {
            const costM = line.match(/\$?\s*([\d,]+\.?\d*)/);
            if (costM) result.costs.total = parseFloat(costM[1].replace(/,/g, ''));
        }

        const itinM = line.match(/^제\s*(\d+)\s*일|^(\d+)\s*일\s*차|^DAY\s*(\d+)/i);
        if (itinM) {
            const dayNum = parseInt(itinM[1] || itinM[2] || itinM[3]);
            let schedule;
            let meals = '';
            if (cols.length >= 5) {
                meals = cols[cols.length - 1] || '';
                if (/조:|중:|석:|호텔식|현지식/.test(meals)) {
                    schedule = cols.slice(1, -1).join(' | ');
                } else {
                    schedule = cols.slice(1).join(' | ');
                    meals = '';
                }
            } else {
                schedule = cols.slice(1).join(' | ');
            }
            result.itinerary.push({ day: dayNum, date: '', schedule, meals });
        }
    }

    if (hotels.length > 0) {
        result.hotel.name = hotels.map(h => h.city ? `[${h.city}] ${h.name}` : h.name).join(' / ');
    }
    if (inclusionParts.length > 0) {
        result.inclusions = inclusionParts.join(', ');
    }

    if (!result.duration) {
        const dayM = fullText.match(/(\d+)\s*일(?!\s*[차자자])/);
        if (dayM) result.duration = parseInt(dayM[1]);
    }
    if (result.travelDates.from && !result.travelDates.to && result.duration) {
        const d = new Date(result.travelDates.from);
        d.setDate(d.getDate() + result.duration - 1);
        result.travelDates.to = d.toISOString().split('T')[0];
    }
    if (!result.duration && result.travelDates.from && result.travelDates.to) {
        const d1 = new Date(result.travelDates.from);
        const d2 = new Date(result.travelDates.to);
        if (!isNaN(d1) && !isNaN(d2)) result.duration = Math.round((d2 - d1) / (1000*60*60*24)) + 1;
    }
    if (!result.costs.total && result.costs.perPerson && result.pax.total) {
        result.costs.total = result.costs.perPerson * result.pax.total;
    }
    if (result.guide.name && result.guide.phone) result.type = 'confirmation';

    return result;
}

// 파일 형식별 텍스트 추출 함수
async function extractTextFromFile(filePath, fileExtension) {
    switch (fileExtension.toLowerCase()) {
        case '.xlsx':
        case '.xls': {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            return xlsx.utils.sheet_to_html(worksheet, { header: '' });
        }

        case '.pdf':
            try {
                const pdfBuffer = await fs.promises.readFile(filePath);
                const { text } = await extractText(pdfBuffer);
                return text;
            } catch (pdfError) {
                logger.error('PDF 텍스트 추출 오류:', pdfError);
                throw new Error(`PDF 파일 처리 중 오류가 발생했습니다: ${pdfError.message}`, { cause: pdfError });
            }

        case '.docx':
        case '.doc': {
            const docBuffer = await fs.promises.readFile(filePath);
            const docResult = await mammoth.extractRawText({ buffer: docBuffer });
            return docResult.value;
        }

        case '.hwp':
            try {
                return await extractHwpText(filePath);
            } catch (e) {
                logger.error(`HWP 파일 파싱 오류 (${filePath}):`, e);
                return '';
            }

        default:
            throw new Error(`지원하지 않는 파일 형식입니다: ${fileExtension}`);
    }
}

function createUploadRoutes({ uploadRateLimit, getDbInstance }) {
    const router = express.Router();
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // POST /api/upload: 다양한 형식의 파일을 받아 처리하는 메인 로직
    router.post('/upload', uploadRateLimit, upload.single('schedule_file'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
        }

        const filePath = req.file.path;
        const groupName = req.body.group_name;
        const fileExtension = path.extname(req.file.originalname).toLowerCase();
        const mimeType = req.file.mimetype;

        if (!groupName) {
            await fs.promises.unlink(filePath);
            return res.status(400).json({ error: '그룹명을 입력해주세요.' });
        }

        if (groupName.length > 200) {
            await fs.promises.unlink(filePath);
            return res.status(400).json({ error: '그룹명은 200자를 초과할 수 없습니다.' });
        }

        if (!process.env.GEMINI_API_KEY) {
            await fs.promises.unlink(filePath);
            return res.status(503).json({ error: 'AI 분석 기능이 설정되지 않았습니다. 관리자에게 문의하세요.' });
        }

        try {
            const modelName = await getLatestFlashModel(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: modelName });

            let result;
            const jsonPrompt = `
                각 일정 항목을 다음 키를 가진 JSON 배열로 만들어주세요:

                {
                    "event_date": "YYYY-MM-DD 형식의 날짜",
                    "location": "지역/장소",
                    "transport": "교통편 (예: OZ123편, 전용차량 등)",
                    "time": "시간 (예: 09:00, 09:00-18:00 등)",
                    "schedule": "세부 일정 내용",
                    "meals": "식사 정보 (예: 조:호텔식, 중:현지식, 석:한식)"
                }

                중요한 규칙:
                - 날짜는 반드시 'YYYY-MM-DD' 형식으로 통일해 주세요.
                - 병합된 셀이나 여러 줄에 걸친 내용은 각 행마다 개별 항목으로 나누어 주세요.
                - 일정 내용에서 시간, 교통편, 식사 정보를 추출해서 해당 필드에 넣어주세요.
                - 정보가 없는 필드는 빈 문자열("")로 설정하세요.
                - JSON 배열만 반환하고, \`\`\`json 같은 마크다운은 절대 추가하지 마세요.
                - 모든 필드는 문자열(string) 타입이어야 합니다.
            `;

            if (fileExtension === '.pdf') {
                const prompt = `
                    첨부된 PDF 여행 일정표 파일을 분석해서, ${jsonPrompt}
                `;
                const filePart = await fileToGenerativePart(filePath, mimeType);
                result = await model.generateContent([prompt, filePart]);
            } else {
                const extractedText = await extractTextFromFile(filePath, fileExtension);
                const isTableFormat = ['.xlsx', '.xls'].includes(fileExtension);
                const dataLabel = isTableFormat ? 'HTML 테이블 데이터' : '텍스트 데이터';

                const prompt = `
                    다음은 여행 일정표 ${dataLabel}입니다.
                    ${isTableFormat ? 'HTML 구조(특히 colspan과 rowspan으로 병합된 셀)를 주의 깊게 분석해서,' : '텍스트에서 일정 정보를 추출해서,'}
                    ${jsonPrompt}

                    [데이터]
                    ${extractedText}
                `;
                result = await model.generateContent(prompt);
            }

            const response = result.response;

            if (!response) {
                logger.error("Gemini API 응답이 없습니다. 전체 결과:", result);
                if (result.promptFeedback) {
                    logger.error("프롬프트 피드백:", result.promptFeedback);
                    return res.status(400).json({
                        error: `데이터 생성에 실패했습니다. API 차단 사유: ${result.promptFeedback.blockReason}`
                    });
                }
                return res.status(500).json({ error: 'Gemini API에서 유효한 응답을 받지 못했습니다.' });
            }

            const responseText = response.text();
            const jsonString = responseText.replace(/```json|```/g, '').trim();

            let scheduleData;
            try {
                scheduleData = JSON.parse(jsonString);
            } catch (_e) {
                logger.error("Gemini가 반환한 텍스트가 유효한 JSON이 아닙니다:", jsonString);
                return res.status(500).json({
                    error: '데이터 형식 변환에 실패했습니다.',
                    details: jsonString.substring(0, 200)
                });
            }

            const dbInstance = getDbInstance();
            if (!dbInstance) {
                return res.status(500).json({ error: '데이터베이스가 초기화되지 않았습니다.' });
            }

            let saved_count = 0;
            const errors = [];

            for (const item of scheduleData) {
                try {
                    await dbInstance.run(
                        'INSERT INTO schedules (group_name, event_date, location, transport, time, schedule, meals) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [
                            groupName,
                            item.event_date || null,
                            item.location || null,
                            item.transport || null,
                            item.time || null,
                            item.schedule || null,
                            item.meals || null
                        ]
                    );
                    saved_count++;
                } catch (err) {
                    logger.error('일정 저장 중 오류:', err);
                    errors.push({ item, error: err.message });
                }
            }

            res.json({
                success: true,
                message: `총 ${scheduleData.length}개의 일정 중 ${saved_count}개가 저장되었습니다.`,
                saved: saved_count,
                total: scheduleData.length,
                errors: errors.length > 0 ? errors : undefined,
                group_name: groupName
            });

        } catch (error) {
            logger.error("업로드 처리 중 오류 발생:", error);
            res.status(500).json({
                error: '서버 내부 오류가 발생했습니다.',
                details: error.message
            });
        } finally {
            try {
                await fs.promises.unlink(filePath);
            } catch (e) {
                logger.error('임시 파일 삭제 실패:', e);
            }
        }
    });

    // POST /api/parse-product-file: HWP/엑셀 → 상품 데이터 파싱
    router.post('/parse-product-file', upload.single('product_file'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
        }

        const filePath = req.file.path;
        const fileExtension = path.extname(req.file.originalname).toLowerCase();

        try {
            let extractedText = '';

            if (fileExtension === '.hwp') {
                extractedText = await extractHwpText(filePath);
            } else if (fileExtension === '.hwpx') {
                const hwpxBuffer = await fs.promises.readFile(filePath);
                extractedText = hwpxBuffer.toString('utf8');
            } else {
                await fs.promises.unlink(filePath);
                return res.status(400).json({ error: `지원하지 않는 파일 형식: ${fileExtension}` });
            }

            if (!extractedText || extractedText.trim().length < 10) {
                await fs.promises.unlink(filePath);
                return res.status(400).json({
                    error: 'HWP 파일에서 텍스트를 추출할 수 없습니다.'
                });
            }

            const parsedData = parseProductText(extractedText);
            await fs.promises.unlink(filePath);
            res.json({ success: true, data: parsedData });

        } catch (error) {
            logger.error('상품 파일 파싱 오류:', error);
            try { await fs.promises.unlink(filePath); } catch (_) { /* 파일이 이미 삭제됨 */ }
            res.status(500).json({ error: `파일 파싱 실패: ${error.message}` });
        }
    });

    // POST /api/passport-ocr/scan: 여권 OCR 프록시 (tourworld1/landing 서버로 전달)
    router.post('/passport-ocr/scan', async (req, res) => {
        const OCR_SERVER = process.env.OCR_SERVER_URL || 'http://localhost:5505';
        try {
            const ocrRes = await fetch(`${OCR_SERVER}/api/passport-ocr/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req.body)
            });
            const data = await ocrRes.json();
            res.status(ocrRes.status).json(data);
        } catch (error) {
            logger.error('OCR 프록시 오류:', error);
            res.status(502).json({ error: 'OCR 서버 연결 실패' });
        }
    });

    return router;
}

module.exports = { createUploadRoutes, uploadDir };
