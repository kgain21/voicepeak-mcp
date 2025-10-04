# VOICEPEAK MCP Server 設計書

## 概要
VOICEPEAK MCPサーバーは、Model Context Protocol (MCP) を使用してVOICEPEAKの音声合成機能をAIアシスタントから利用可能にするサーバーです。

## アーキテクチャ

### システム構成
```
MCPクライアント (Claude等)
    ↓ MCP Protocol (stdio)
voicepeak-mcp サーバー
    ↓ child_process.spawn
VOICEPEAK CLI (/Applications/voicepeak.app/Contents/MacOS/voicepeak)
    ↓
音声ファイル (.wav)
    ↓
afplay (macOS) / その他再生コマンド
```

### 技術スタック
- **Runtime**: Bun
- **Language**: TypeScript
- **MCP SDK**: @modelcontextprotocol/sdk
- **Audio**: VOICEPEAK CLI + afplay (macOS)

## 機能仕様

### 実装済みツール

#### 1. synthesize
テキストから音声ファイルを合成する。

**パラメータ:**
- `text` (必須): 合成するテキスト
- `narrator`: 話者名（"Tohoku Zunko", "Zundamon", "Tohoku Kiritan", "Tohoku Itako"）
- `emotion`: 感情パラメータ（オブジェクト形式、例: {happy: 50, sad: 30}）
- `speed`: 話速（50-200、デフォルト: 100）
- `pitch`: ピッチ（-300-300、デフォルト: 0）
- `outputPath`: 出力ファイルパス（省略時は一時ファイル）

#### 2. play
音声ファイルを再生する。

**パラメータ:**
- `filePath` (必須): 再生する音声ファイルのパス

#### 3. synthesize_and_play
テキストから音声を合成して即座に再生する。

**パラメータ:**
- synthesizeと同じ（outputPath除く）
- 一時ファイルは再生後に自動削除

#### 4. list_narrators
利用可能な話者リストを取得する。

**出力例:**
```
Tohoku Zunko
Zundamon
Tohoku Kiritan
Tohoku Itako
```

#### 5. list_emotions
指定した話者の感情パラメータリストを取得する。

**パラメータ:**
- `narrator` (必須): 話者名

**出力例 (Tohoku Zunko):**
```
sad
astonished
firm
live
soft
```

## VOICEPEAK CLI仕様

### 基本コマンド
```bash
/Applications/voicepeak.app/Contents/MacOS/voicepeak [OPTIONS]
```

### オプション
- `-s, --say <text>`: 合成するテキスト
- `-t, --text <file>`: テキストファイルから読み込み
- `-o, --out <file>`: 出力ファイルパス
- `-n, --narrator <name>`: 話者名
- `-e, --emotion <expr>`: 感情表現（例: happy=50,sad=30）
- `--speed <value>`: 話速（50-200）
- `--pitch <value>`: ピッチ（-300-300）
- `--list-narrator`: 話者リスト表示
- `--list-emotion <narrator>`: 感情リスト表示

## インストール方法

### NPX経由（推奨）
```bash
npx voicepeak-mcp@latest
```

### Bunx経由
```bash
bunx voicepeak-mcp
```

### ローカル開発
```bash
# 依存関係インストール
bun install

# 開発モード実行
bun run dev

# ビルド
bun run build
```

## MCP設定例

### Claude Desktop (claude_desktop_config.json)
```json
{
  "mcpServers": {
    "voicepeak": {
      "command": "npx",
      "args": ["voicepeak-mcp@latest"]
    }
  }
}
```

## プラットフォーム対応

### 現在対応
- macOS (開発・テスト済み)

### 将来対応予定
- Windows
  - VOICEPEAKパス: `C:\Program Files\VOICEPEAK\voicepeak.exe`（仮）
  - 音声再生: PowerShellまたはWindows Media Player

- Linux
  - VOICEPEAKパス: インストール方法による
  - 音声再生: aplay, paplay等

## 今後の拡張予定

### 機能追加
1. **ストリーミング音声合成**: リアルタイム音声生成
2. **バッチ処理**: 複数テキストの一括変換
3. **音声ファイル管理**: 生成履歴・キャッシュ機能
4. **感情パラメータプリセット**: よく使う感情設定の保存
5. **音声形式変換**: WAV以外の形式（MP3, OGG等）対応

### 技術改善
1. **エラーハンドリング強化**: VOICEPEAKプロセス異常終了時の対応
2. **パフォーマンス最適化**: 並列処理・キューイング
3. **設定ファイル対応**: VOICEPEAKパスのカスタマイズ
4. **Docker対応**: コンテナ環境での実行

## 開発メモ

### ディレクトリ構造
```
voicepeak-mcp/
├── src/
│   └── index.ts       # MCPサーバー実装
├── dist/              # ビルド出力
├── package.json       # プロジェクト設定
├── tsconfig.json      # TypeScript設定
├── CLAUDE.md          # 本ドキュメント
└── README.md          # ユーザー向けドキュメント
```

### デバッグ方法
VOICEPEAKのデバッグ出力は標準エラー出力に出力される。
必要に応じて`[debug]`行をフィルタリングして処理。

### 注意事項
- VOICEPEAKは商用ライセンスが必要
- 音声ファイルのサイズに注意（長文は分割推奨）
- プロセス管理に注意（ゾンビプロセス防止）