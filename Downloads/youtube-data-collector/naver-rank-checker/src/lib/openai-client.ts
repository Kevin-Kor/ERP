import OpenAI from 'openai';
import type { ContentGenerateParams, GeneratedContent } from '@/types/cafe';

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
  }
  return new OpenAI({ apiKey });
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  informational: '객관적이고 신뢰감 있는 정보 전달 톤으로 작성하세요. 독자가 유용한 정보를 얻을 수 있도록 구체적인 내용을 포함하세요.',
  conversational: '친근하고 편안한 대화체로 작성하세요. 독자에게 말하듯이 자연스럽게 쓰세요.',
  promotional: '매력적이고 설득력 있는 홍보 톤으로 작성하세요. 장점을 부각하되 과장하지 마세요.',
  review: '솔직하고 상세한 리뷰 톤으로 작성하세요. 장단점을 균형 있게 다루세요.',
};

const LENGTH_CONFIG: Record<string, { chars: number; maxTokens: number }> = {
  short: { chars: 300, maxTokens: 600 },
  medium: { chars: 800, maxTokens: 1500 },
  long: { chars: 1500, maxTokens: 2800 },
};

const SYSTEM_PROMPT = `당신은 네이버 카페에 게시할 한국어 콘텐츠를 작성하는 전문 작가입니다.
다음 규칙을 따라주세요:

1. 첫 번째 줄에 제목을 작성하세요. 제목에는 HTML 태그를 사용하지 마세요.
2. 두 번째 줄은 반드시 빈 줄로 두세요.
3. 세 번째 줄부터 본문을 작성하세요.
4. 본문은 HTML 형식으로 작성하되, 다음 태그만 사용하세요:
   - <p>, <br>, <b>, <strong>, <i>, <em>, <u>
   - <h3>, <h4>
   - <ul>, <ol>, <li>
   - <a href="...">
   - <blockquote>
5. <script>, <style>, <iframe>, <img>, <div>, <span> 태그는 절대 사용하지 마세요.
6. 자연스럽고 읽기 쉬운 한국어로 작성하세요.
7. 제공된 키워드를 자연스럽게 본문에 포함시키세요.
8. 소제목, 목록, 강조 등을 활용하여 가독성을 높이세요.`;

export async function generateContent(
  params: ContentGenerateParams
): Promise<GeneratedContent> {
  const client = getClient();
  const { topic, keywords, tone, lengthPreference, additionalInstructions } = params;

  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.informational;
  const lengthConfig = LENGTH_CONFIG[lengthPreference] || LENGTH_CONFIG.medium;

  const userPrompt = [
    `주제: ${topic}`,
    `키워드: ${keywords.join(', ')}`,
    `톤: ${toneInstruction}`,
    `길이: 약 ${lengthConfig.chars}자 내외로 작성하세요.`,
    additionalInstructions ? `추가 지시사항: ${additionalInstructions}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: lengthConfig.maxTokens,
  });

  const output = response.choices[0]?.message?.content;
  if (!output) {
    throw new Error('AI 응답이 비어 있습니다.');
  }

  // Parse title (first line) and content (rest)
  const lines = output.split('\n');
  const title = lines[0].replace(/^#+\s*/, '').trim();

  // Find first non-empty line after title
  let contentStartIndex = 1;
  while (contentStartIndex < lines.length && lines[contentStartIndex].trim() === '') {
    contentStartIndex++;
  }
  const content = lines.slice(contentStartIndex).join('\n').trim();

  const wordCount = content.replace(/<[^>]*>/g, '').length;
  const tokensUsed = response.usage?.total_tokens || 0;

  return {
    title,
    content,
    wordCount,
    tokensUsed,
  };
}
