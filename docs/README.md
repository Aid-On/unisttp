# @aid-on/unisttp

## 概要

`@aid-on/unisttp`は、Cloudflare Workers AIとGroqの音声認識APIを統一インターフェースで利用できるライブラリです。WhisperモデルによるSpeech-to-Text機能を、プロバイダーを問わず同一のAPIで実装できます。

## 主な特徴

- **統一インターフェース**: Cloudflare Workers AI、Groq APIの透過的切り替え
- **Whisperモデル対応**: 最新のWhisper音声認識モデル
- **多言語サポート**: 日本語を含む多言語音声認識
- **ストリーミング対応**: リアルタイム音声処理
- **エラーハンドリング**: 堅牢な例外処理とフォールバック
- **型安全性**: TypeScriptによる完全な型サポート

## アーキテクチャ

### プロバイダー統一アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Audio Input   │    │     unisttp     │    │    Providers    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ File Upload     │───►│ Unified STT     │───►│ Cloudflare AI   │
│ Microphone      │    │ Interface       │    │ Groq Whisper    │
│ Stream          │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## APIリファレンス

### 基本的な使用方法

```typescript
import { createSTTProvider } from '@aid-on/unisttp';

// Cloudflare Workers AI使用
const cloudflareSTT = createSTTProvider({
  provider: 'cloudflare',
  ai: env.AI  // Cloudflare Workers AI binding
});

// Groq API使用
const groqSTT = createSTTProvider({
  provider: 'groq',
  apiKey: env.GROQ_API_KEY
});

// 音声ファイルの変換
const audioFile = await request.arrayBuffer();
const transcription = await cloudflareSTT.transcribe(audioFile, {
  language: 'ja',  // 日本語指定
  model: 'whisper-1'
});

console.log('認識結果:', transcription.text);
```

### プロバイダー切り替え

```typescript
import { createSTTProvider, STTProvider } from '@aid-on/unisttp';

class AdaptiveSTTService {
  private providers: STTProvider[] = [];

  constructor(env: any) {
    // 複数プロバイダーの初期化
    this.providers = [
      createSTTProvider({
        provider: 'cloudflare',
        ai: env.AI
      }),
      createSTTProvider({
        provider: 'groq',
        apiKey: env.GROQ_API_KEY
      })
    ];
  }

  async transcribeWithFallback(audio: ArrayBuffer, options?: any) {
    for (const provider of this.providers) {
      try {
        const result = await provider.transcribe(audio, options);
        return result;
      } catch (error) {
        console.warn(`Provider ${provider.name} failed:`, error);
        continue;
      }
    }
    
    throw new Error('All STT providers failed');
  }
}
```

### ストリーミング音声認識

```typescript
import { createSTTProvider } from '@aid-on/unisttp';

const sttProvider = createSTTProvider({
  provider: 'groq',
  apiKey: env.GROQ_API_KEY,
  streaming: true
});

// WebSocket経由でリアルタイム音声認識
async function handleWebSocketSTT(websocket: WebSocket) {
  const audioChunks: ArrayBuffer[] = [];
  
  websocket.addEventListener('message', async (event) => {
    if (event.data instanceof ArrayBuffer) {
      audioChunks.push(event.data);
      
      // 一定サイズたまったら認識実行
      if (audioChunks.length >= 10) {
        const combinedAudio = combineAudioChunks(audioChunks);
        
        try {
          const result = await sttProvider.transcribe(combinedAudio, {
            language: 'auto-detect',
            partialResults: true
          });
          
          // 部分結果をクライアントに送信
          websocket.send(JSON.stringify({
            type: 'partial_transcription',
            text: result.text,
            confidence: result.confidence
          }));
          
          audioChunks.length = 0;  // バッファクリア
          
        } catch (error) {
          console.error('Streaming STT error:', error);
        }
      }
    }
  });
}
```

## 使用例

### ボイスメモアプリ

```typescript
// src/voice-memo-app.ts
import { createSTTProvider } from '@aid-on/unisttp';

export class VoiceMemoApp {
  private stt = createSTTProvider({
    provider: 'cloudflare',
    ai: this.env.AI
  });

  async processVoiceMemo(audioFile: File, userId: string) {
    try {
      // 音声をArrayBufferに変換
      const audioBuffer = await audioFile.arrayBuffer();
      
      // 音声認識実行
      const transcription = await this.stt.transcribe(audioBuffer, {
        language: 'ja',
        model: 'whisper-1',
        prompt: '音声メモの内容を正確に文字起こししてください。',
        temperature: 0.1  // 正確性重視
      });
      
      // メモをデータベースに保存
      const memo = await this.saveMemo({
        userId,
        originalFileName: audioFile.name,
        transcription: transcription.text,
        confidence: transcription.confidence,
        duration: transcription.duration,
        language: transcription.language,
        createdAt: new Date()
      });
      
      return {
        success: true,
        memo,
        audioSizeKB: Math.round(audioBuffer.byteLength / 1024),
        processingTimeMs: transcription.processingTime
      };
      
    } catch (error) {
      console.error('Voice memo processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async searchMemos(userId: string, query: string) {
    // 音声検索：クエリを音声認識し、テキスト検索と組み合わせ
    const memos = await this.getUserMemos(userId);
    
    const results = memos.filter(memo => 
      memo.transcription.toLowerCase().includes(query.toLowerCase())
    );
    
    return results;
  }

  private async saveMemo(memoData: any) {
    // データベース保存ロジック
    return { id: crypto.randomUUID(), ...memoData };
  }

  private async getUserMemos(userId: string) {
    // ユーザーメモ取得ロジック
    return [];
  }
}
```

### 多言語会議文字起こし

```typescript
// src/meeting-transcription.ts
import { createSTTProvider } from '@aid-on/unisttp';

export class MeetingTranscriptionService {
  private stt = createSTTProvider({
    provider: 'groq',
    apiKey: process.env.GROQ_API_KEY
  });

  async transcribeMeeting(
    audioSegments: ArrayBuffer[], 
    participants: Array<{ id: string; name: string; language: string }>
  ) {
    const transcriptions = [];
    
    for (let i = 0; i < audioSegments.length; i++) {
      const segment = audioSegments[i];
      const participant = participants[i % participants.length];
      
      try {
        const result = await this.stt.transcribe(segment, {
          language: participant.language,
          model: 'whisper-large-v3',
          prompt: `話者: ${participant.name}の発言を文字起こししてください。`
        });
        
        transcriptions.push({
          segmentIndex: i,
          participant: participant,
          transcription: result.text,
          confidence: result.confidence,
          startTime: i * 30,  // 30秒セグメント想定
          endTime: (i + 1) * 30,
          language: result.language
        });
        
      } catch (error) {
        console.error(`Segment ${i} transcription failed:`, error);
        transcriptions.push({
          segmentIndex: i,
          participant: participant,
          transcription: '[音声認識エラー]',
          confidence: 0,
          error: error.message
        });
      }
    }
    
    return this.generateMeetingReport(transcriptions);
  }

  private generateMeetingReport(transcriptions: any[]) {
    const report = {
      summary: this.generateSummary(transcriptions),
      fullTranscription: this.combineTranscriptions(transcriptions),
      participantStats: this.calculateParticipantStats(transcriptions),
      languageBreakdown: this.analyzeLanguages(transcriptions),
      qualityMetrics: this.calculateQualityMetrics(transcriptions)
    };
    
    return report;
  }

  private generateSummary(transcriptions: any[]): string {
    const allText = transcriptions
      .filter(t => t.confidence > 0.7)  // 高信頼度のみ
      .map(t => t.transcription)
      .join(' ');
    
    // 簡単なキーワード抽出（実際はLLMを使用）
    const keywords = this.extractKeywords(allText);
    return `会議の主なトピック: ${keywords.slice(0, 5).join(', ')}`;
  }

  private combineTranscriptions(transcriptions: any[]): string {
    return transcriptions
      .map(t => `[${t.startTime}s-${t.endTime}s] ${t.participant.name}: ${t.transcription}`)
      .join('\n');
  }

  private calculateParticipantStats(transcriptions: any[]) {
    const stats = {};
    
    transcriptions.forEach(t => {
      const participantId = t.participant.id;
      if (!stats[participantId]) {
        stats[participantId] = {
          name: t.participant.name,
          totalWords: 0,
          speakingTime: 0,
          averageConfidence: 0
        };
      }
      
      stats[participantId].totalWords += t.transcription.split(' ').length;
      stats[participantId].speakingTime += 30;  // セグメント長
      stats[participantId].averageConfidence = 
        (stats[participantId].averageConfidence + t.confidence) / 2;
    });
    
    return Object.values(stats);
  }

  private analyzeLanguages(transcriptions: any[]) {
    const languageCount = {};
    
    transcriptions.forEach(t => {
      if (t.language) {
        languageCount[t.language] = (languageCount[t.language] || 0) + 1;
      }
    });
    
    return languageCount;
  }

  private calculateQualityMetrics(transcriptions: any[]) {
    const confidences = transcriptions.map(t => t.confidence).filter(c => c > 0);
    const averageConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const errorRate = transcriptions.filter(t => t.error).length / transcriptions.length;
    
    return {
      averageConfidence,
      errorRate,
      totalSegments: transcriptions.length,
      successfulSegments: confidences.length
    };
  }

  private extractKeywords(text: string): string[] {
    // 簡単なキーワード抽出（実際の実装ではTF-IDFやLLMを使用）
    const stopWords = new Set(['は', 'が', 'を', 'に', 'で', 'と', 'の', 'a', 'an', 'the', 'and', 'or']);
    const words = text.toLowerCase().split(/\s+/);
    const wordCount = {};
    
    words.forEach(word => {
      if (word.length > 2 && !stopWords.has(word)) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .map(([word]) => word);
  }
}
```

### 音声コマンドシステム

```typescript
// src/voice-command-system.ts
import { createSTTProvider } from '@aid-on/unisttp';

export class VoiceCommandSystem {
  private stt = createSTTProvider({
    provider: 'cloudflare',
    ai: this.env.AI
  });

  private commands = new Map([
    ['open', this.handleOpenCommand],
    ['close', this.handleCloseCommand],
    ['search', this.handleSearchCommand],
    ['navigate', this.handleNavigateCommand],
    ['create', this.handleCreateCommand]
  ]);

  async processVoiceCommand(audioData: ArrayBuffer) {
    try {
      const transcription = await this.stt.transcribe(audioData, {
        language: 'ja',
        model: 'whisper-1',
        prompt: '音声コマンドを認識してください。「開く」「閉じる」「検索」「移動」「作成」などの指示語に注意してください。',
        temperature: 0.0  // 確実性を最優先
      });

      const command = this.parseCommand(transcription.text);
      
      if (command) {
        const result = await this.executeCommand(command);
        return {
          success: true,
          recognizedText: transcription.text,
          command: command,
          result: result,
          confidence: transcription.confidence
        };
      } else {
        return {
          success: false,
          recognizedText: transcription.text,
          error: 'コマンドを認識できませんでした',
          confidence: transcription.confidence
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private parseCommand(text: string): any | null {
    const normalized = text.toLowerCase().trim();
    
    // パターンマッチング
    const patterns = [
      { regex: /(開く|オープン|open)\s*(.*)/, action: 'open', param: 2 },
      { regex: /(閉じる|クローズ|close)\s*(.*)/, action: 'close', param: 2 },
      { regex: /(検索|サーチ|search)\s*(.+)/, action: 'search', param: 2 },
      { regex: /(移動|ナビゲート|navigate)\s*(.+)/, action: 'navigate', param: 2 },
      { regex: /(作成|新規|create)\s*(.+)/, action: 'create', param: 2 }
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern.regex);
      if (match) {
        return {
          action: pattern.action,
          parameter: pattern.param ? match[pattern.param].trim() : null,
          originalText: text
        };
      }
    }

    return null;
  }

  private async executeCommand(command: any) {
    const handler = this.commands.get(command.action);
    if (handler) {
      return await handler.call(this, command.parameter);
    }
    
    throw new Error(`Unknown command: ${command.action}`);
  }

  private async handleOpenCommand(parameter: string) {
    // アプリケーション/ファイル/ウェブページを開く
    const targets = {
      'ファイル': () => this.openFileDialog(),
      'ブラウザ': () => this.openBrowser(),
      'メモ': () => this.openNotesApp(),
      'カレンダー': () => this.openCalendar()
    };

    const target = Object.keys(targets).find(key => 
      parameter.includes(key)
    );

    if (target) {
      return await targets[target]();
    }

    return { message: `"${parameter}"を開こうとしましたが、対応するアクションが見つかりません` };
  }

  private async handleSearchCommand(parameter: string) {
    // 検索の実行
    return {
      message: `"${parameter}"を検索します`,
      searchQuery: parameter,
      searchResults: await this.performSearch(parameter)
    };
  }

  private async handleNavigateCommand(parameter: string) {
    // ページ/画面遷移
    const destinations = {
      'ホーム': '/home',
      'プロフィール': '/profile', 
      '設定': '/settings',
      'ダッシュボード': '/dashboard'
    };

    const destination = Object.keys(destinations).find(key =>
      parameter.includes(key)
    );

    if (destination) {
      return {
        message: `${destination}ページに移動します`,
        redirectUrl: destinations[destination]
      };
    }

    return { message: `"${parameter}"への移動先が見つかりません` };
  }

  private async handleCreateCommand(parameter: string) {
    // 新規作成
    const createTargets = {
      'ドキュメント': () => this.createDocument(),
      'メモ': () => this.createNote(),
      'イベント': () => this.createEvent(),
      'タスク': () => this.createTask()
    };

    const target = Object.keys(createTargets).find(key =>
      parameter.includes(key)
    );

    if (target) {
      return await createTargets[target]();
    }

    return { message: `"${parameter}"の作成方法が分かりません` };
  }

  // Helper methods
  private async performSearch(query: string) {
    // 実際の検索実装
    return [`${query}に関する結果1`, `${query}に関する結果2`];
  }

  private async createDocument() {
    return { message: '新規ドキュメントを作成しました', documentId: crypto.randomUUID() };
  }

  // 他のhelper methodsも同様に実装...
}
```

## 設定オプション

### STTプロバイダー設定

```typescript
interface STTProviderConfig {
  // プロバイダー選択
  provider: 'cloudflare' | 'groq';
  
  // Cloudflare設定
  ai?: Ai;  // Workers AI binding
  
  // Groq設定
  apiKey?: string;
  baseURL?: string;
  
  // 共通オプション
  timeout?: number;
  retries?: number;
  streaming?: boolean;
}

interface TranscriptionOptions {
  // 言語設定
  language?: string | 'auto-detect';
  
  // モデル設定
  model?: 'whisper-1' | 'whisper-large-v3';
  
  // 品質設定
  temperature?: number;      // 0.0-1.0
  prompt?: string;          // コンテキストプロンプト
  
  // 出力設定
  format?: 'json' | 'text' | 'srt' | 'vtt';
  partialResults?: boolean; // ストリーミング用
  
  // 処理設定
  maxDuration?: number;     // 最大音声長（秒）
  chunkSize?: number;       // ストリーミング用チャンクサイズ
}
```

## パフォーマンス考慮事項

### 音声データ最適化

```typescript
// 音声ファイル前処理
class AudioOptimizer {
  async optimizeForSTT(audioBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    // 1. フォーマット変換（必要に応じて）
    const optimized = await this.convertToOptimalFormat(audioBuffer);
    
    // 2. 音量正規化
    const normalized = await this.normalizeVolume(optimized);
    
    // 3. ノイズ除去
    const denoised = await this.removeNoise(normalized);
    
    // 4. サンプリングレート最適化
    const resampled = await this.resample(denoised, 16000); // 16kHz推奨
    
    return resampled;
  }

  async splitLongAudio(audioBuffer: ArrayBuffer, chunkDurationSec = 30): Promise<ArrayBuffer[]> {
    // 長い音声を分割して並列処理
    const chunks = [];
    const chunkSize = this.calculateChunkSize(audioBuffer, chunkDurationSec);
    
    for (let i = 0; i < audioBuffer.byteLength; i += chunkSize) {
      const chunk = audioBuffer.slice(i, i + chunkSize);
      chunks.push(chunk);
    }
    
    return chunks;
  }
}
```

### プロバイダー選択最適化

```typescript
// 用途別プロバイダー選択
class STTProviderSelector {
  selectOptimalProvider(useCase: string, audioLength: number, language: string) {
    const strategies = {
      'real-time': {
        provider: 'groq',
        reason: '低レイテンシ'
      },
      'batch-processing': {
        provider: 'cloudflare',
        reason: 'コスト効率'
      },
      'high-accuracy': {
        provider: 'groq',
        model: 'whisper-large-v3',
        reason: '高精度'
      },
      'multilingual': {
        provider: 'cloudflare',
        reason: '多言語対応'
      }
    };

    // 音声長による調整
    if (audioLength > 300) {  // 5分以上
      return { ...strategies['batch-processing'] };
    }

    return strategies[useCase] || strategies['real-time'];
  }
}
```