# 프로젝트 다이어그램

## 1. 유스케이스 다이어그램

```mermaid
flowchart LR
    User[사용자]

    subgraph System[감정 일기 시스템]
        UC1((회원가입))
        UC2((로그인))
        UC3((로그인 상태 확인))
        UC4((토큰 재발급))
        UC5((월별 일기 조회))
        UC6((일기 상세 조회))
        UC7((일기 작성))
        UC8((일기 수정))
        UC9((일기 삭제))
        UC10((로그아웃))
    end

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC9
    User --> UC10

    UC3 -. 인증 실패 시 .-> UC4
    UC5 -. 인증 필요 .-> UC3
    UC6 -. 인증 필요 .-> UC3
    UC7 -. 인증 필요 .-> UC3
    UC8 -. 인증 필요 .-> UC3
    UC9 -. 인증 필요 .-> UC3
    UC10 -. 인증 필요 .-> UC3
```

## 2. 시퀀스 다이어그램

### 2-1. 로그인과 보호 라우트 진입

```mermaid
sequenceDiagram
    actor U as 사용자
    participant L as Login/UserLogin
    participant A as Axios API
    participant S as Express Server
    participant DB as User DB
    participant P as ProtectedRoute
    participant C as UserContext/App

    U->>L: 아이디/비밀번호 입력 후 로그인
    L->>A: POST /api/login
    A->>S: 로그인 요청
    S->>DB: 사용자 조회 및 비밀번호 검증
    DB-->>S: 사용자 정보 반환
    S-->>A: access/refresh 토큰 발급
    Note over S,A: 모바일은 JSON 토큰 반환\nPC는 httpOnly 쿠키 저장
    A-->>L: 로그인 성공 응답
    L->>P: "/" 경로 이동
    P->>A: GET /api/me

    alt access token 유효
        A->>S: 사용자 정보 요청
        S-->>A: user 반환
        A-->>P: 인증 성공
        P->>C: setUser(user)
        P-->>U: Home 진입 허용
    else access token 만료/없음
        P->>A: POST /api/refresh
        A->>S: refresh token 전달
        S->>DB: refresh token 검증
        DB-->>S: 사용자 확인
        S-->>A: 새 access/refresh 발급
        P->>A: GET /api/me 재시도
        A->>S: 사용자 정보 재요청
        S-->>A: user 반환
        A-->>P: 인증 성공
        P->>C: setUser(user)
        P-->>U: Home 진입 허용
    end
```

### 2-2. 일기 작성/조회 흐름

```mermaid
sequenceDiagram
    actor U as 사용자
    participant H as Home/App
    participant E as Editor/New
    participant A as Axios API
    participant S as Express Server
    participant D as Diary DB

    U->>H: 홈 진입
    H->>A: POST /api/diary
    A->>S: 사용자 일기 목록 요청
    S->>D: user_id 기준 조회
    D-->>S: diaries 반환
    S-->>A: diaries 응답
    A-->>H: 상태 초기화(INIT)
    H-->>U: 월별 일기 목록 표시

    U->>E: 새 일기 작성 화면 진입
    U->>E: 날짜/감정/내용 입력 후 저장
    E->>A: POST /api/create_diary
    A->>S: 일기 생성 요청
    S->>D: diary insert
    D-->>S: 저장 성공
    S-->>A: 성공 메시지
    A-->>E: 응답 반환
    E->>H: CREATE dispatch 후 홈 이동
    H-->>U: 목록 갱신 결과 표시
```

### 2-3. 일기 수정/삭제 흐름

```mermaid
sequenceDiagram
    actor U as 사용자
    participant V as Diary/Edit
    participant A as Axios API
    participant S as Express Server
    participant D as Diary DB
    participant H as App State

    U->>V: 일기 상세에서 수정 화면 진입

    alt 수정
        U->>V: 내용 변경 후 저장
        V->>A: POST /api/update_diary
        A->>S: id + user_id 기반 수정 요청
        S->>D: 해당 일기 update
        D-->>S: 수정 결과
        S-->>A: 성공 또는 404
        A-->>V: 응답 반환
        V->>H: UPDATE dispatch
        H-->>U: 수정된 목록 반영
    else 삭제
        U->>V: 삭제 확인
        V->>A: POST /api/delete_diary
        A->>S: id + user_id 기반 삭제 요청
        S->>D: 해당 일기 delete
        D-->>S: 삭제 결과
        S-->>A: 성공 또는 404
        A-->>V: 응답 반환
        V->>H: DELETE dispatch
        H-->>U: 삭제된 목록 반영
    end
```

## 3. 활동 다이어그램

### 3-1. 인증 기반 서비스 이용 활동

```mermaid
flowchart TD
    A([시작]) --> B[사용자가 보호 페이지 접근]
    B --> C[ProtectedRoute에서 /api/me 호출]
    C --> D{access token 유효?}

    D -- 예 --> E[UserContext에 사용자 저장]
    E --> F[App에서 /api/diary 호출]
    F --> G[일기 목록 로드]
    G --> H[홈 화면 표시]

    D -- 아니오 --> I[/api/refresh 호출]
    I --> J{refresh token 유효?}
    J -- 예 --> K[새 access/refresh 발급]
    K --> C
    J -- 아니오 --> L[로그인 페이지로 이동]
    L --> M([종료])

    H --> N{사용자 액션 선택}
    N -- 작성 --> O[일기 작성 저장]
    N -- 상세 조회 --> P[일기 상세 보기]
    N -- 수정 --> Q[일기 수정 저장]
    N -- 삭제 --> R[일기 삭제]
    N -- 로그아웃 --> S[토큰 제거 및 사용자 초기화]

    O --> H
    P --> H
    Q --> H
    R --> H
    S --> M
```

### 3-2. 회원가입 활동

```mermaid
flowchart TD
    A([시작]) --> B[회원가입 정보 입력]
    B --> C[POST /api/register 요청]
    C --> D{필수값 누락?}
    D -- 예 --> E[400 에러 반환]
    E --> F[오류 메시지 표시]
    F --> G([종료])

    D -- 아니오 --> H{중복 ID 존재?}
    H -- 예 --> I[409 에러 반환]
    I --> F

    H -- 아니오 --> J[비밀번호 해시 처리]
    J --> K[users 테이블에 저장]
    K --> L[회원가입 성공 응답]
    L --> M[로그인 페이지 이동]
    M --> G
```

PC: `httpOnly cookie`
모바일: `localStorage + Authorization header`
