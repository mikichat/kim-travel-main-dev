#!/usr/bin/env node

/**
 * Gemini CLI Tool
 * 터미널에서 Gemini와 직접 대화할 수 있는 도구입니다.
 *
 * 사용법: node util/gemini_cli.js
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const readline = require('readline');
const path = require('path');
const dotenv = require('dotenv');
// backend/.env 파일 로드 시도
const result = dotenv.config({ path: path.join(__dirname, '../backend/.env') });

if (result.error) {
  // 실패 시 루트 .env 시도 (백업)
  dotenv.config({ path: path.join(__dirname, '../.env') });
}

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('Error: GEMINI_API_KEY가 .env 파일에 설정되어 있지 않습니다.');
  process.exit(1);
}

// --- 동적 모델 선택 기능 ---
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
      return flashModels[0];
    } else {
      return "gemini-pro"; // Fallback
    }
  } catch (error) {
    return "gemini-pro"; // Fallback
  }
}

// 메인 실행 함수
(async () => {
  const modelName = await getLatestFlashModel(apiKey);
  console.log(`사용 모델: ${modelName}`);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Gemini> '
  });

  console.log('--- Gemini CLI Mode ---');
  console.log('Gemini와 대화를 시작하세요. (종료하려면 "exit" 또는 Ctrl+C)');

  // 채팅 세션 시작
  let chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: "당신은 터미널에서 실행되는 유용한 AI 어시스턴트입니다. 한국어로 간결하게 답변해주세요." }],
      },
      {
        role: "model",
        parts: [{ text: "네, 알겠습니다. 무엇을 도와드릴까요?" }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 1000,
    },
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    if (input.toLowerCase() === 'exit') {
      console.log('대화를 종료합니다.');
      rl.close();
      process.exit(0);
    }

    if (input) {
      try {
        if (input.startsWith('/')) {
          console.log('알림: CLI 모드에서는 슬래시 명령어가 지원되지 않을 수 있습니다.');
        }

        process.stdout.write('생성 중...');
        const result = await chat.sendMessage(input);
        const response = await result.response;
        const text = response.text();

        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        console.log(text);
      } catch (error) {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        console.error('오류 발생:', error.message);
      }
    }
    rl.prompt();
  }).on('close', () => {
    process.exit(0);
  });

})(); // Async wrapper end
