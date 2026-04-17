const fetch = require('node-fetch');

async function chatWithClaude(message) {
  const response = await fetch('http://localhost:9083/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'local',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: message }
      ]
    })
  });

  const data = await response.json();
  return data.content[0].text;
}

// 使用示例
chatWithClaude('你好，请帮我写一个 Hello World 程序')
  .then(reply => console.log('Claude 回复:', reply))
  .catch(err => console.error('错误:', err));
