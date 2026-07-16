# TMAP POI 지도

사용자가 POI(Point of Interest)를 지도에서 조회하고, 현재 위치를 기준으로 TMAP 도보 경로를 안내받는 Node.js/Express 애플리케이션입니다.

프로젝트 템플릿을 기반으로 엑셀 Import, PostgreSQL 현행화, 위치 추적, TMAP REST API 프록시, API 응답 표준화 및 자동 테스트를 구현했습니다.

## 주요 기능

### POI 엑셀 Import 및 DB 현행화

- `.xlsx` 파일의 첫 번째 시트를 읽습니다.
- `title`, `latitude`, `longitude` 컬럼과 좌표 범위를 검증합니다.
- 업로드 전에 파일명과 유효 POI 건수를 미리 확인합니다.
- 저장을 확정하면 트랜잭션 안에서 기존 `tb_poi` 데이터를 모두 삭제하고 새 데이터만 저장합니다.
- 저장 완료 후 삭제한 기존 건수와 새로 저장한 건수를 안내합니다.
- 유효하지 않은 행은 행 번호와 함께 400 응답으로 반환합니다.

### 지도 및 위치

- Leaflet 기반 지도에 POI를 표시합니다.
- 현재 위치는 `public/images/pin-red.svg`로 표시합니다.
- POI는 `public/images/pin-location.svg`로 표시합니다.
- `navigator.geolocation.watchPosition()`으로 현재 위치를 지속 추적합니다.
- `내 위치` 버튼을 누르면 빨간 현재 위치 마커를 지도 중앙으로 이동합니다.
- 검색 결과 목록 또는 지도 마커를 선택하면 해당 POI가 지도 중앙에 오도록 이동합니다.
- `새로고침` 버튼은 DB에서 POI 데이터를 다시 불러와 마커를 갱신합니다.

### TMAP API 활용

- POI 선택 시 TMAP 역지오코딩으로 주소 정보를 조회합니다.
- 현재 위치와 POI 사이의 TMAP 보행자 경로를 표시합니다.
- 총 거리, 예상 시간, 단계별 도보 안내 문구를 패널에 표시합니다.
- TMAP API Key는 서버 환경 변수에서만 읽고, 브라우저 HTML/JavaScript에는 전달하지 않습니다.

## 요구사항 대응

| 과제 요구사항 | 구현 방식 |
| --- | --- |
| 엑셀 파일 업로드 | `multer` 메모리 업로드 + `xlsx` 파싱 |
| 기존 DB 데이터 무시 및 현행화 | `BEGIN` → `TRUNCATE` → `INSERT` → `COMMIT` |
| 현재 위치 지속 추적 | `navigator.geolocation.watchPosition()` |
| 마커 이미지 적용 | `pin-red.svg`, `pin-location.svg` Leaflet icon |
| 선택 마커 지도 중앙 이동 | `map.setView()` 및 popup auto-pan 비활성화 |
| refresh로 DB 재조회 | `GET /api/pois` 재호출 후 marker layer 재생성 |
| TMAP 정보 노출 | 역지오코딩 주소, 보행자 경로, 거리/시간/안내 문구 |
| API Key 브라우저 미노출 | 서버 프록시 + `.env` 환경 변수 |

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| Runtime | Node.js v22.16.0 |
| Server | Express 4 |
| View | EJS |
| Database | PostgreSQL, `pg` |
| Excel | `xlsx`, `multer` |
| Map | Leaflet, OpenStreetMap 타일 |
| Navigation / Address | TMAP REST API |
| Test | Node.js built-in test runner (`node --test`) |

> 지도 렌더링은 Leaflet으로 처리하고, 민감한 API Key가 필요한 TMAP 기능은 서버에서만 호출합니다. 따라서 TMAP Key가 브라우저에 노출되지 않습니다.

## 프로젝트 구조

```text
.
├─ app.js                         # Express 앱, dotenv, 공통 오류 처리
├─ config.json                    # 템플릿 DB 연결 설정
├─ .env                           # 실제 TMAP API Key (Git ignore)
├─ .env.example                   # 환경 변수 예시
├─ app
│  ├─ routes/index.js             # 화면/API 라우팅 및 업로드 설정
│  ├─ controllers/indexController.js
│  │                              # HTTP 요청/응답만 담당
│  ├─ services
│  │  ├─ poiService.js            # 엑셀 검증, POI import/preview
│  │  └─ tmapService.js           # TMAP 역지오코딩/보행자 경로 호출
│  ├─ models/indexModel.js        # POI 테이블, 조회, 트랜잭션 저장
│  ├─ utils
│  │  ├─ apiResponse.js           # API 성공/오류 응답 형식
│  │  ├─ coordinate.js            # 좌표 파싱 및 범위 검증
│  │  └─ httpError.js             # HTTP 상태 코드 오류 생성
│  └─ views/index.ejs             # 지도, POI 검색, import, 경로 UI
├─ public
│  ├─ images/pin-red.svg          # 현재 위치 마커
│  ├─ images/pin-location.svg     # POI 마커
│  └─ stylesheets/style.css       # 지도 UI 스타일
└─ test                           # 서비스/모델 자동 테스트
```

## 실행 전 준비

### 1. 의존성 설치

```bash
npm install
```

### 2. TMAP 환경 변수 설정

`.env.example`을 복사해 `.env` 파일을 만들고 실제 키를 설정합니다.

```bash
copy .env.example .env
```

```env
TMAP_API_KEY=your-tmap-api-key
```

`.env`는 `.gitignore`에 포함되어 있어 커밋되지 않습니다.

### 3. PostgreSQL 준비

PostgreSQL을 실행하고 `config.json`의 접속 정보와 일치하는 역할/데이터베이스를 준비합니다.

```sql
CREATE ROLE pgadmin WITH LOGIN PASSWORD 'your-password';
CREATE DATABASE "codingTest" OWNER pgadmin;
```

템플릿의 `config.json` 예시는 다음 DB를 사용합니다.

```json
{
  "host": "localhost",
  "user": "pgadmin",
  "port": "5432",
  "database": "codingTest"
}
```

첫 POI 조회 또는 Import 시 `tb_poi` 테이블, 제약조건, 인덱스가 자동으로 보장됩니다.

### 4. 서버 실행

```bash
npm start
```

기본 주소는 다음과 같습니다.

```text
http://localhost:3535/index
```

이미 3535 포트를 사용 중이면 환경 변수로 포트를 변경할 수 있습니다.

```powershell
$env:PORT=3536
npm start
```

## 사용 흐름

### 1. POI Import

1. 지도 좌측 하단의 `엑셀 Import` 버튼을 누릅니다.
2. `tb_poi.xlsx` 파일을 선택합니다.
3. 파일명과 유효 POI 건수를 확인합니다.
4. `DB에 저장` 버튼으로 저장을 확정합니다.
5. 기존 데이터 삭제 및 새 데이터 저장 결과를 확인합니다.

엑셀의 첫 번째 시트는 아래 헤더 형식을 사용합니다.

| title | latitude | longitude |
| --- | ---: | ---: |
| 오각정길 | 37.5311545 | 126.9646995 |

### 2. POI 조회 및 안내

1. 브라우저 위치 권한을 허용합니다.
2. 검색창에서 POI 이름을 검색하거나 지도 마커를 선택합니다.
3. 선택된 POI는 지도 중앙으로 이동하고, 좌표·주소 정보를 팝업에 표시합니다.
4. 팝업의 `TMAP 도보 경로 보기`를 누릅니다.
5. 지도 경로 선과 우측 도보 경로 안내 패널을 확인합니다.

## 데이터베이스 설계

### `tb_poi`

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `BIGSERIAL` | 기본 키 |
| `title` | `VARCHAR(255)` | POI 이름 |
| `latitude` | `DOUBLE PRECISION` | 위도 |
| `longitude` | `DOUBLE PRECISION` | 경도 |
| `created_at` | `TIMESTAMPTZ` | 저장 시각 |

### 데이터 무결성 및 성능

```sql
CHECK (latitude BETWEEN -90 AND 90)
CHECK (longitude BETWEEN -180 AND 180)
CREATE INDEX idx_tb_poi_title_id ON tb_poi (title, id)
```

엑셀 Import는 다음 트랜잭션 흐름으로 동작합니다.

```text
BEGIN
  → 테이블/제약조건/인덱스 보장
  → 기존 행 수 조회
  → TRUNCATE TABLE tb_poi RESTART IDENTITY
  → 500건 단위 INSERT
COMMIT
```

실패 시 `ROLLBACK`되어 일부 데이터만 저장되는 상태를 방지합니다.

## API 명세

모든 API는 동일한 성공 응답 형식을 사용합니다.

```json
{
  "success": true,
  "message": "",
  "resultData": {},
  "resultCnt": 0
}
```

오류 응답은 다음 형식입니다.

```json
{
  "success": false,
  "message": "오류 내용",
  "resultData": null,
  "resultCnt": 0
}
```

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/index` | 지도 화면 |
| `GET` | `/api/pois?search=` | DB POI 목록 조회 |
| `POST` | `/api/pois/import/preview` | 엑셀 사전 검증 및 유효 행 수 조회 |
| `POST` | `/api/pois/import` | 기존 POI 삭제 후 엑셀 데이터 저장 |
| `GET` | `/api/tmap/reverse-geocoding` | TMAP 역지오코딩 프록시 |
| `POST` | `/api/tmap/pedestrian-route` | TMAP 보행자 경로 프록시 |

### Import 오류 예시

```json
{
  "success": false,
  "message": "엑셀의 title, latitude, longitude 컬럼을 확인해 주세요.",
  "resultData": null,
  "resultCnt": 0,
  "invalidRows": [4, 8]
}
```

### 보행자 경로 요청 예시

```json
{
  "startLat": 37.5295,
  "startLng": 126.9655,
  "endLat": 37.5311545,
  "endLng": 126.9646995,
  "endName": "오각정길"
}
```

## API Key 보안 처리

TMAP API Key는 서버에서만 사용합니다.

```text
Browser
  → /api/tmap/*
Express Server
  → TMAP_API_KEY를 appKey 요청 헤더에 추가
TMAP API
```

- 브라우저 소스에 `TMAP_API_KEY`를 삽입하지 않습니다.
- `config.json`이나 EJS 렌더링 데이터로 키를 전달하지 않습니다.
- 실제 키는 Git ignore 대상인 `.env`에만 보관합니다.
- TMAP 키가 없으면 서버는 503 오류를 반환합니다.

## 테스트

```bash
npm test
```

Node.js 기본 테스트 러너로 다음을 검증합니다.

| 테스트 | 검증 내용 |
| --- | --- |
| `test/poiService.test.js` | 정상 엑셀 파싱, 유효 행 수 preview, 잘못된 좌표 거절 |
| `test/indexModel.test.js` | 트랜잭션, 기존 데이터 삭제, 제약조건/인덱스 적용, batch insert |
| `test/tmapService.test.js` | 키 미설정 시 503, 서버 헤더를 통한 TMAP 키 전달 |

## 템플릿 이후 작업 이력

| 구분 | 내용 |
| --- | --- |
| 지도/POI 기본 기능 | Leaflet 지도, 마커, 현재 위치 추적, 검색, 새로고침 구현 |
| Excel Import | 업로드, 사전 검증, 원자적 DB 현행화, 결과 피드백 구현 |
| TMAP 연동 | 서버 프록시, 역지오코딩, 보행자 경로, 단계별 안내 구현 |
| 보안 | `.env` 기반 TMAP Key 관리 및 브라우저 미노출 |
| 구조 개선 | Controller → Service 분리, 공통 오류/좌표/API 응답 유틸리티 추가 |
| 데이터 품질 | 위도/경도 DB 제약조건 및 제목/ID 인덱스 추가 |
| 품질 검증 | `node --test` 기반 자동 테스트 추가 |

## 참고 사항

- 위치 추적은 HTTPS 또는 `localhost` 환경에서 브라우저 권한을 허용해야 정상 동작합니다.
- PostgreSQL이 실행되지 않으면 POI 조회 API는 DB 연결 안내 메시지를 반환합니다.
- 업로드 파일은 `.xlsx`만 허용하며 최대 10MB까지 업로드할 수 있습니다.
