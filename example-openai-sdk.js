const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: 'local',
  baseURL: 'http://localhost:9083/v1'
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'user', content: '你好，请帮我写一个 Hello World 程序' }
    ]
  });

  console.log(completion.choices[0].message.content);
}

main();
