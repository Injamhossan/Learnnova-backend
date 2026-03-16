import fetch from 'node-fetch';

async function getYoutubeDuration(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  const videoId = (match && match[2].length === 11) ? match[2] : null;

  if (!videoId) {
    console.log('Invalid YouTube URL');
    return;
  }

  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });
    const html = await response.text();
    const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);

    if (durationMatch) {
      console.log('Duration Seconds:', parseInt(durationMatch[1], 10));
    } else {
        console.log('Duration not found. Writing HTML to backend/tmp_yt.html to inspect');
        const fs = require('fs');
        fs.writeFileSync('backend/tmp_yt.html', html);
    }
  } catch (error) {
    console.error('Failed to fetch duration:', error);
  }
}

getYoutubeDuration('https://www.youtube.com/watch?v=aqz-KE-bpKQ');
