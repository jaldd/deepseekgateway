const fetch = require('node-fetch');

async function chatWithDeepSeek(message) {
  const response = await fetch('http://localhost:9083/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer local'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: message }
      ]
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// 使用示例
chatWithDeepSeek('你好，请帮我写一个 Hello World 程序')
  .then(reply => console.log('DeepSeek 回复:', reply))
  .catch(err => console.error('错误:', err));
