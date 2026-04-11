# Claude MCP (Model Context Protocol) 설정 방법

Claude Desktop 앱에서 MCP를 설정하여 로컬 파일 시스템이나 다른 도구들을 Claude와 연동할 수 있습니다.

## 1. 설정 파일 위치

Windows 환경에서 설정 파일은 다음 경로에 위치합니다:

`%APPDATA%\Claude\claude_desktop_config.json`

일반적으로 전체 경로는 다음과 같습니다:
`C:\Users\kgj12\AppData\Roaming\Claude\claude_desktop_config.json`

## 2. 설정 파일 생성 및 편집

위 경로에 폴더나 파일이 없다면 생성해야 합니다. 텍스트 에디터(VS Code, 메모장 등)를 사용하여 파일을 열고 다음 형식으로 내용을 작성합니다.

### 기본 설정 예시 (파일 시스템 접근 권한 부여)

이 설정은 Claude가 지정된 로컬 디렉토리에 접근할 수 있게 해줍니다.

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\kgj12\\Root\\main"
      ]
    }
  }
}
```

_위 예시에서 `C:\\Users\\kgj12\\Root\\main` 부분은 원하는 프로젝트 경로로 변경하세요._

## 3. 주요 MCP 서버 종류

필요한 기능에 따라 다른 MCP 서버를 추가할 수 있습니다.

### Git 연동 (GitHub 저장소 검색 등)

```json
{
  "mcpServers": {
    "git": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-git",
        "--repository",
        "path/to/git/repo"
      ]
    }
  }
}
```

### PostgreSQL 데이터베이스 연동

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://localhost/mydb"
      ]
    }
  }
}
```

## 4. 적용 방법

1. `claude_desktop_config.json` 파일을 저장합니다.
2. **Claude Desktop 앱을 완전히 종료하고 다시 시작**합니다.
3. Claude 입력창 오른쪽에 전기 플러그 모양의 아이콘(🔌)이 나타나면 성공적으로 연결된 것입니다.

## 주의사항

- `npx` 명령어를 사용하므로 Node.js가 설치되어 있어야 합니다.
- 경로에 역슬래시(`\`)를 사용할 때는 두 번(`\\`) 써야 합니다 (JSON 포맷 규칙).
