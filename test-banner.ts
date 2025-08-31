import chalk from 'chalk';

function getBannerContent(): string {
  const title = '╔══════════════════════════════════════╗';
  const titleText = '║            LLM-CLI v1.0.0           ║';
  const subtitle = '║  Agente de programação para Ollama  ║';
  const footer = '╚══════════════════════════════════════╝';
  const colors = ['#8B5CF6', '#7C3AED', '#6D28D9'];
  
  const gradientText = (text: string) => {
    return text.split('').map((char, i) => {
      const colorIndex = Math.floor(i / 3) % colors.length;
      return chalk.hex(colors[colorIndex])(char);
    }).join('');
  };
  
  const lines = [
    gradientText(title),
    gradientText(titleText),
    gradientText(subtitle),
    gradientText(footer),
    ''
  ];
  
  return lines.join('\n');
}

// Test the banner
console.clear();
console.log(getBannerContent());
console.log('Banner test complete!');
