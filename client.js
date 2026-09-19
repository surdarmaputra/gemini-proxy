import fs from 'fs';

async function requestImageFromProxy(promptText) {
  console.log(`Requesting image generation for prompt: "${promptText}"...`);

  try {
    const response = await fetch('http://localhost:3000/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptText })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Proxy Error:', result);
      return;
    }

    const parts = result.candidates?.[0]?.content?.parts || [];
    let imageSaved = false;

    for (const part of parts) {
      if (part.inlineData) {
        const buffer = Buffer.from(part.inlineData.data, 'base64');
        const filename = `generated_${Date.now()}.png`;

        fs.writeFileSync(filename, buffer);
        console.log(`Image saved to ./${filename}`);
        imageSaved = true;
      } else if (part.text) {
        console.log('Model text output:', part.text);
      }
    }

    if (!imageSaved) {
      console.log('Request completed, but no image data was found in response parts.');
    }
  } catch (err) {
    console.error('Request failed:', err.message);
  }
}

requestImageFromProxy('A futuristic cyberpunk city illuminated by neon lights at sunset, digital art');
