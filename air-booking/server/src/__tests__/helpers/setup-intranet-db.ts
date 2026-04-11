/**
 * 테스트용 인메모리 인트라넷 DB 셋업 헬퍼
 *
 * jest.config.ts에서 INTRANET_DB_PATH=:memory: 설정 후,
 * getIntranetDb()를 호출하면 인메모리 DB에 모든 테이블이 자동 생성됩니다.
 */
import { getIntranetDb, closeIntranetDb } from '../../db/intranet';

export async function setupIntranetTestDb() {
  // 기존 연결 닫기 (다른 테스트에서 열어놓은 경우)
  await closeIntranetDb();
  // 인메모리 DB로 재연결 + 테이블 자동 생성
  const db = await getIntranetDb();
  // 기본 테스트 사용자 삽입
  await db.run(
    "INSERT OR IGNORE INTO air_users (email, password_hash, name, role) VALUES ('test@test.com', 'hash', 'Test', 'admin')"
  );
}

export async function teardownIntranetTestDb() {
  await closeIntranetDb();
}
