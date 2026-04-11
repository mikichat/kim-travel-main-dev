// 모든 테스트 파일 실행 전에 인트라넷 DB를 인메모리로 초기화
import { getIntranetDb, closeIntranetDb } from '../../db/intranet';

beforeAll(async () => {
  process.env.INTRANET_DB_PATH = ':memory:';
  await closeIntranetDb();
  await getIntranetDb(); // 인메모리 DB에 모든 테이블 자동 생성
});
