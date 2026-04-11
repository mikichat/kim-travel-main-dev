# VS Code 확장 뷰 컨테이너 오류 해결 방법

## 문제
```
뷰 컨테이너 'claude-sidebar-secondary'이(가) 없으므로 이 컨테이너에 등록된 모든 뷰가 '탐색기'에 추가됩니다.
```

## 원인
VS Code 확장 "Claude Code for VS Code"가 `claude-sidebar-secondary`라는 뷰 컨테이너에 뷰를 등록하려고 하지만, 해당 컨테이너가 확장의 `package.json`에 정의되어 있지 않습니다.

## 해결 방법

### 방법 1: 확장 업데이트 (권장)
1. VS Code에서 `Ctrl+Shift+X` (또는 `Cmd+Shift+X` on Mac)를 눌러 확장 마켓플레이스를 엽니다
2. "Claude Code" 확장을 검색합니다
3. 업데이트가 있으면 "업데이트" 버튼을 클릭합니다
4. VS Code를 재시작합니다

### 방법 2: 확장 재설치
1. VS Code에서 `Ctrl+Shift+X`를 눌러 확장 마켓플레이스를 엽니다
2. "Claude Code" 확장을 검색합니다
3. 확장 옆의 톱니바퀴 아이콘을 클릭하고 "제거"를 선택합니다
4. VS Code를 재시작합니다
5. 다시 확장을 설치합니다

### 방법 3: 확장 수동 수정 (개발자용)
확장이 로컬에서 개발 중인 경우:

1. 확장 디렉토리 찾기:
   - Windows: `%USERPROFILE%\.vscode\extensions\anthropic.claude-code-*`
   - Mac/Linux: `~/.vscode/extensions/anthropic.claude-code-*`

2. 확장의 `package.json` 파일을 엽니다

3. `viewContainers` 섹션에 다음을 추가합니다:
```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "claude-sidebar-secondary",
          "title": "Claude Secondary",
          "icon": "resources/icon.svg"
        }
      ]
    },
    "views": {
      "claude-sidebar-secondary": [
        {
          "id": "claudeView",
          "name": "Claude View",
          "when": "true"
        }
      ]
    }
  }
}
```

4. VS Code를 재시작합니다

### 방법 4: 임시 해결책
경고 메시지는 기능에는 영향을 주지 않습니다. 뷰가 탐색기에 표시되더라도 정상적으로 작동합니다. 
다만 경고를 없애려면 위의 방법 중 하나를 시도하세요.

## 확인 방법
1. VS Code를 재시작한 후
2. 출력 패널(`Ctrl+Shift+U`)에서 경고 메시지가 사라졌는지 확인합니다
3. 사이드바에서 뷰가 올바른 위치에 표시되는지 확인합니다

## 추가 정보
- 이 문제는 확장의 버전 불일치나 설정 오류로 발생할 수 있습니다
- 최신 버전의 확장을 사용하는 것이 가장 좋은 해결책입니다
- 문제가 계속되면 확장 개발자에게 이슈를 보고하세요

